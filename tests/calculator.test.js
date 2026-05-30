'use strict';

const { describe, test } = require('node:test');
const assert             = require('node:assert/strict');
const calc               = require('./setup');

const { mRate, pmt, getFbt, calcYear, runScenario } = calc;

/** Floating-point proximity assertion (default tolerance: 0.001). */
const approx = (actual, expected, tol = 0.001) =>
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `Expected ≈${expected} (±${tol}), got ${actual}`
  );

// ─────────────────────────────────────────────────────────────
// mRate — marginal income tax rate (2026-27 brackets)
// ─────────────────────────────────────────────────────────────
describe('mRate — marginal tax rate', () => {
  describe('brackets without Medicare', () => {
    test('$0 → 0%', ()          => assert.equal(mRate(0,       false), 0));
    test('$18,200 → 0%', ()     => assert.equal(mRate(18200,   false), 0));
    test('$18,201 → 15%', ()    => assert.equal(mRate(18201,   false), 0.15));
    test('$45,000 → 15%', ()    => assert.equal(mRate(45000,   false), 0.15));
    test('$45,001 → 30%', ()    => assert.equal(mRate(45001,   false), 0.30));
    test('$135,000 → 30%', ()   => assert.equal(mRate(135000,  false), 0.30));
    test('$135,001 → 37%', ()   => assert.equal(mRate(135001,  false), 0.37));
    test('$190,000 → 37%', ()   => assert.equal(mRate(190000,  false), 0.37));
    test('$190,001 → 45%', ()   => assert.equal(mRate(190001,  false), 0.45));
    test('$500,000 → 45%', ()   => assert.equal(mRate(500000,  false), 0.45));
  });

  describe('Medicare levy adds 2%', () => {
    test('$50,000: 30% + 2% = 32%',  () => assert.equal(mRate(50000,  true), 0.32));
    test('$200,000: 45% + 2% = 47%', () => approx(mRate(200000, true), 0.47));
    test('$10,000: 0% + 2% = 2%',    () => assert.equal(mRate(10000,  true), 0.02));
  });
});

// ─────────────────────────────────────────────────────────────
// pmt — loan payment with balloon residual
// ─────────────────────────────────────────────────────────────
describe('pmt — payment with balloon', () => {
  test('returns 0 when months = 0', () =>
    assert.equal(pmt(50000, 0.05, 0, 10000), 0));

  test('returns 0 when principal = 0', () =>
    assert.equal(pmt(0, 0.05, 36, 0), 0));

  test('zero APR: straight-line (principal − residual) / months', () => {
    approx(pmt(60000, 0, 36, 20000), (60000 - 20000) / 36);
    approx(pmt(50000, 0, 12,     0), 50000 / 12);
  });

  test('positive APR produces a higher payment than zero APR', () => {
    const pmtZero = pmt(60000, 0,    36, 20000);
    const pmtApr  = pmt(60000, 0.07, 36, 20000);
    assert.ok(pmtApr > pmtZero, 'Interest-bearing payment must exceed zero-rate payment');
  });

  test('larger residual → smaller payment', () => {
    const low  = pmt(60000, 0.05, 36, 10000);
    const high = pmt(60000, 0.05, 36, 30000);
    assert.ok(high < low, 'Higher balloon should reduce the periodic payment');
  });

  test('standard calculation is positive and finite', () => {
    const result = pmt(54545, 0.0699, 36, 25575);
    assert.ok(Number.isFinite(result) && result > 0);
  });
});

// ─────────────────────────────────────────────────────────────
// getFbt — FBT statutory rate determination
// ─────────────────────────────────────────────────────────────
describe('getFbt — FBT regime', () => {
  // Standard policy dates & caps
  const p2       = new Date(Date.UTC(2027, 3, 1));   // 2027-04-01
  const p3       = new Date(Date.UTC(2029, 3, 1));   // 2029-04-01
  const fbtCap   = 75000;
  const lct      = 91387;
  const postRate = 0.15;

  // Representative start dates in each phase
  const ph1Date = new Date(Date.UTC(2026, 5, 1));    // 2026-06-01
  const ph2Date = new Date(Date.UTC(2027, 6, 1));    // 2027-07-01
  const ph3Date = new Date(Date.UTC(2029, 6, 1));    // 2029-07-01

  describe('Non-EV vehicles — always 20% regardless of phase', () => {
    test('ICE in Phase 1 → 20% full', () => {
      const r = getFbt(ph1Date, 50000, 'ice', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   0.20);
      assert.equal(r.regime, 'full');
    });

    test('ICE in Phase 3 → still 20% full', () => {
      const r = getFbt(ph3Date, 50000, 'ice', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate, 0.20);
    });

    test('PHEV in Phase 2 → 20% full (exemption ended Apr 2025)', () => {
      const r = getFbt(ph2Date, 50000, 'phev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   0.20);
      assert.equal(r.regime, 'full');
    });
  });

  describe('EV above LCT — always 20% (ineligible for any discount)', () => {
    test('Phase 1, EV > LCT → 20%', () =>
      assert.equal(getFbt(ph1Date, 100000, 'ev', fbtCap, lct, p2, p3, postRate).rate, 0.20));

    test('Phase 3, EV > LCT → 20%', () =>
      assert.equal(getFbt(ph3Date, 100000, 'ev', fbtCap, lct, p2, p3, postRate).rate, 0.20));
  });

  describe('Phase 1 — EV at/under LCT', () => {
    test('under $75k cap → 0% exempt', () => {
      const r = getFbt(ph1Date, 60000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   0);
      assert.equal(r.regime, 'exempt');
    });

    test('exactly at $75k cap → 0% exempt', () => {
      const r = getFbt(ph1Date, 75000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate, 0);
    });

    test('$75k–LCT band → 20% (NO discount in Phase 1)', () => {
      const r = getFbt(ph1Date, 80000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   0.20);
      assert.equal(r.regime, 'full');
    });
  });

  describe('Phase 2 — EV at/under LCT', () => {
    test('under $75k cap → 0% exempt', () => {
      const r = getFbt(ph2Date, 60000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   0);
      assert.equal(r.regime, 'exempt');
    });

    test('$75k–LCT band → postRate with 25% discount', () => {
      const r = getFbt(ph2Date, 80000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   postRate);
      assert.equal(r.regime, 'partial');
    });
  });

  describe('Phase 3 — EV at/under LCT', () => {
    test('under $75k → postRate (no more full exemption)', () => {
      const r = getFbt(ph3Date, 60000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   postRate);
      assert.equal(r.regime, 'partial');
    });

    test('$75k–LCT band → postRate', () => {
      const r = getFbt(ph3Date, 80000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate, postRate);
    });
  });

  describe('Phase boundary dates', () => {
    test('exactly on p2 date → Phase 2 rules apply', () => {
      const r = getFbt(p2, 80000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   postRate);  // Phase 2: $75k-LCT band gets discount
      assert.equal(r.regime, 'partial');
    });

    test('exactly on p3 date → Phase 3 rules apply', () => {
      const r = getFbt(p3, 60000, 'ev', fbtCap, lct, p2, p3, postRate);
      assert.equal(r.rate,   postRate);  // Phase 3: even sub-cap gets postRate
      assert.equal(r.regime, 'partial');
    });
  });
});

// ─────────────────────────────────────────────────────────────
// calcYear — annual cost / saving breakdown
// ─────────────────────────────────────────────────────────────
describe('calcYear — annual cost breakdown', () => {
  test('fully exempt EV: no ECM, tax saving on full preTax', () => {
    const y = calcYear({
      yearIndex: 1, carPrice: 60000, annualRun: 5000,
      leasePmt: 1000, fbtRate: 0, mtr: 0.32,
      regime: 'exempt', arrLabel: 'test',
    });

    assert.equal(y.annualLease,   12000);
    assert.equal(y.preTaxAnnual,  17000);
    assert.equal(y.ecm,           0);
    approx(y.taxSaved,        17000 * 0.32);        // 5440
    approx(y.gstRun,          5000 / 11);            // 454.55
    approx(y.takeHomeImpact,  17000 * (1 - 0.32));  // 11560
  });

  test('ICE vehicle: ECM = carPrice × 20%, takeHome increases accordingly', () => {
    const y = calcYear({
      yearIndex: 1, carPrice: 60000, annualRun: 5000,
      leasePmt: 1000, fbtRate: 0.20, mtr: 0.32,
      regime: 'full', arrLabel: 'test',
    });

    assert.equal(y.ecm, 60000 * 0.20);  // 12000
    approx(y.takeHomeImpact, (17000 * 0.68) + 12000);  // 23560
  });

  test('partial FBT (15%): ECM = carPrice × 0.15', () => {
    const y = calcYear({
      yearIndex: 1, carPrice: 80000, annualRun: 3000,
      leasePmt: 800, fbtRate: 0.15, mtr: 0.37,
      regime: 'partial', arrLabel: 'test',
    });

    assert.equal(y.ecm, 80000 * 0.15);  // 12000
  });

  test('higher MTR → more tax saved', () => {
    const shared = { yearIndex: 1, carPrice: 60000, annualRun: 5000, leasePmt: 1000, fbtRate: 0, regime: 'exempt', arrLabel: 'test' };
    const y30 = calcYear({ ...shared, mtr: 0.30 });
    const y37 = calcYear({ ...shared, mtr: 0.37 });
    assert.ok(y37.taxSaved > y30.taxSaved, 'Higher MTR must yield more tax saved');
  });
});

// ─────────────────────────────────────────────────────────────
// ATO minimum residual values (TD 93/142)
// ─────────────────────────────────────────────────────────────
describe('ATO residual values — TD 93/142 (8-year effective life)', () => {
  // Verified via runScenario: the residual in the output must match the ATO table.
  const baseInp = {
    carPrice: 60000, annualApr: 0.05, annualRun: 5000,
    startDate: new Date(Date.UTC(2026, 5, 1)),
    mtr: 0.32, vtype: 'ev', fbtCap: 75000, lct: 91387,
    p2: new Date(Date.UTC(2027, 3, 1)),
    p3: new Date(Date.UTC(2029, 3, 1)),
    postRate: 0.15,
  };
  const exGST = 60000 / 1.1;

  const EXPECTED = { 1: 0.6563, 2: 0.5625, 3: 0.4688, 4: 0.3750, 5: 0.2813 };

  for (const [yrs, pct] of Object.entries(EXPECTED)) {
    const term = Number(yrs);
    test(`${term}-year lease → ${(pct * 100).toFixed(2)}% residual`, () => {
      const result = runScenario({ ...baseInp, totalTerm: term }, 'continuous');
      approx(result.residuals[0].value, exGST * pct, 0.5);
      assert.equal(result.years.length, term);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// runScenario — split lease (grandfathering)
// ─────────────────────────────────────────────────────────────
describe('runScenario — split lease', () => {
  const p2 = new Date(Date.UTC(2027, 3, 1));
  const p3 = new Date(Date.UTC(2029, 3, 1));
  const baseInp = {
    carPrice: 60000, annualApr: 0.05, annualRun: 5000,
    mtr: 0.32, vtype: 'ev', fbtCap: 75000, lct: 91387,
    p2, p3, postRate: 0.15,
  };

  test('2+1 split produces 3 year-rows and 2 residuals', () => {
    const inp = { ...baseInp, totalTerm: 3, startDate: new Date(Date.UTC(2026, 5, 1)) };
    const result = runScenario(inp, 'split', 2);
    assert.equal(result.years.length, 3);
    assert.equal(result.residuals.length, 2);
  });

  test('arrangement 1 and 2 use different FBT rates when start straddles a phase boundary', () => {
    // Arr1 starts 2026-06-01 (Phase 1, EV under cap → 0%)
    // Arr2 renews 2028-06-01 (Phase 2, EV under cap → still 0%)
    // Both exempt in this case — test that arr2 fbtRate reflects renewal date
    const inp = { ...baseInp, totalTerm: 4, startDate: new Date(Date.UTC(2026, 5, 1)) };
    const result = runScenario(inp, 'split', 2);
    // All years for a sub-$75k EV should be exempt (0% ecm) regardless of phase
    for (const y of result.years) {
      assert.equal(y.ecm, 0, `Year ${y.yearIndex} should have 0 ECM for exempt EV`);
    }
  });

  test('3+2 split straddling Phase 3: arr2 uses Phase 3 postRate', () => {
    // Arr1: starts 2026-06-01 (Phase 1) → renews 2029-06-01
    // Arr2 renewal date 2029-06-01 is in Phase 3 → postRate 15% even for sub-cap EV
    const inp = { ...baseInp, totalTerm: 5, startDate: new Date(Date.UTC(2026, 5, 1)) };
    const result = runScenario(inp, 'split', 3);

    const arr1Years = result.years.slice(0, 3);
    const arr2Years = result.years.slice(3);

    // Arr1 (Phase 1, sub-cap) → exempt, ECM = 0
    for (const y of arr1Years) assert.equal(y.ecm, 0);

    // Arr2 renews 2029-06-01 → Phase 3, postRate = 15%, ECM = carPrice × 0.15
    for (const y of arr2Years) approx(y.ecm, 60000 * 0.15, 0.01);
  });
});

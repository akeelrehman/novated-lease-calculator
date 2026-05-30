/* ══ TAX BRACKETS 2026-27 ══
   $0–$18,200:        0%
   $18,201–$45,000:  15%  (cut from 16% from 1 Jul 2026)
   $45,001–$135,000: 30%
   $135,001–$190,000: 37%
   $190,001+:        45%
   + 2% Medicare levy if applicable
   Returns MARGINAL rate only (rate on the top dollar of income).
*/
function mRate(taxableIncome, medicare) {
  let r = taxableIncome <= 18200  ? 0    :
          taxableIncome <= 45000  ? 0.15 :
          taxableIncome <= 135000 ? 0.30 :
          taxableIncome <= 190000 ? 0.37 : 0.45;
  return medicare ? r + 0.02 : r;
}

/* ══ PMT WITH BALLOON (correct finance formula) ══
   P = principal (ex-GST)
   r = APR / 12  (monthly rate)
   n = term in months
   RV = residual value (balloon)
   Payment = (P − RV / (1+r)^n) × r / (1 − (1+r)^−n)
*/
function pmt(principal, annualApr, months, residualVal) {
  if (months <= 0 || principal <= 0) return 0;
  if (annualApr === 0) return (principal - residualVal) / months;
  const r  = annualApr / 12;
  const pv = Math.pow(1 + r, -months);
  return (principal - residualVal * pv) * r / (1 - pv);
}

/* ══ FBT REGIME ══
   Determines the statutory rate locked in at arrangement start.
   ICE / PHEV: always 20%.
   EV phase schedule:
     Phase 1 (< phase2Date):
       ≤ fbtCap           → 0%  (fully exempt)
       fbtCap–lctThresh   → 20% (no discount in Phase 1)
       > lctThresh        → 20% (ineligible)
     Phase 2 (>= phase2Date, < phase3Date):
       ≤ fbtCap           → 0%
       fbtCap–lctThresh   → postRate (25% discount)
       > lctThresh        → 20%
     Phase 3 (>= phase3Date):
       ≤ lctThresh        → postRate
       > lctThresh        → 20%
*/
function getFbt(startDate, carPrice, vtype, fbtCap, lct, p2, p3, postRate) {
  if (vtype === 'ice')  return { rate: 0.20, regime: 'full',    label: 'Full 20%',             desc: 'Petrol/diesel — full 20% statutory rate, ECM required' };
  if (vtype === 'phev') return { rate: 0.20, regime: 'full',    label: 'Full 20%',             desc: 'PHEV — exemption ended 1 Apr 2025, full 20% rate applies' };
  if (carPrice > lct)   return { rate: 0.20, regime: 'full',    label: 'Above LCT',            desc: `EV exceeds LCT (${fmtAUD(lct)}) — full 20%, no discount` };

  if (startDate >= p3) return { rate: postRate, regime: 'partial', label: `Phase 3 — ${fmtPct(postRate)}`, desc: `Phase 3 — 25% FBT discount (${fmtPct(postRate)} statutory rate)` };

  if (startDate >= p2) {
    if (carPrice <= fbtCap) return { rate: 0, regime: 'exempt', label: 'Fully Exempt',        desc: `Phase 2 — under $${(fbtCap/1000).toFixed(0)}k cap, 0% statutory rate` };
    return { rate: postRate, regime: 'partial', label: '25% Discount',                        desc: `Phase 2 — $${(fbtCap/1000).toFixed(0)}k–LCT band, 25% discount (${fmtPct(postRate)} stat. rate)` };
  }

  // Phase 1
  if (carPrice <= fbtCap) return { rate: 0, regime: 'exempt',  label: 'Fully Exempt',         desc: `Phase 1 — under $${(fbtCap/1000).toFixed(0)}k cap, 0% statutory rate` };
  return { rate: 0.20, regime: 'full', label: 'No Discount (Phase 1)',                        desc: `Phase 1 — $${(fbtCap/1000).toFixed(0)}k–LCT has NO discount before ${p2.toISOString().slice(0,10)}` };
}

/* ══ YEAR BLOCK ══
   One year of cost/saving calculation.

   Key values:
     leasePmt      = monthly lease repayment (pure finance)
     annualLease   = leasePmt × 12
     annualRun     = annual running costs (packaged pre-tax)
     preTaxAnnual  = annualLease + annualRun  (total salary sacrificed pre-tax)
     ecm           = carPrice × fbtRate       (post-tax employee contribution to zero employer FBT)
     taxSaved      = preTaxAnnual × mtr       (income tax saved)
     gstRun        = annualRun / 11           (GST saving on running costs)
     takeHomeImpact = (preTaxAnnual × (1 − mtr)) + ecm
                   = the actual money less in your bank per year
     Note: when fully exempt, ecm=0 so takeHomeImpact = preTaxAnnual × (1−mtr)
*/
function calcYear({ yearIndex, carPrice, annualRun, leasePmt, fbtRate, mtr, regime, arrLabel }) {
  const annualLease    = leasePmt * 12;
  const preTaxAnnual   = annualLease + annualRun;
  const ecm            = carPrice * fbtRate;
  const taxSaved       = preTaxAnnual * mtr;
  const gstRun         = annualRun / 11;
  const takeHomeImpact = (preTaxAnnual * (1 - mtr)) + ecm;
  return { yearIndex, regime, arrLabel, leasePmt, annualLease, annualRun, preTaxAnnual, ecm, taxSaved, gstRun, takeHomeImpact };
}

/* ══ SCENARIO ENGINE ══
   mode='continuous': single unbroken arrangement.
   mode='split':      firstYears + (total−firstYears), two separate arrangements.

   Residual logic (per TD 93/142):
     Continuous: one balloon = carExGST × ATO_RES[totalTerm]
     Split:
       First balloon  = carExGST × ATO_RES[firstYears]   (due at renewal)
       Second balloon = carExGST × ATO_RES[totalTerm]     (due at lease end)
       Second principal = first balloon (refinancing the mid-term residual)
*/
function runScenario(inp, mode, firstYears) {
  const { carPrice, annualApr, totalTerm, startDate, annualRun, mtr, vtype, fbtCap, lct, p2, p3, postRate } = inp;
  const exGST   = carPrice / 1.1;
  const gstSave = carPrice - exGST;
  const years   = [];
  let   residuals = [];

  if (mode === 'continuous') {
    const resPct = ATO_RES[totalTerm] ?? (0.75 - 0.75 / 8 * totalTerm);
    const resVal = exGST * resPct;
    const months = totalTerm * 12;
    const p      = pmt(exGST, annualApr, months, resVal);
    const fbt    = getFbt(startDate, carPrice, vtype, fbtCap, lct, p2, p3, postRate);
    for (let y = 1; y <= totalTerm; y++) {
      years.push(calcYear({ yearIndex: y, carPrice, annualRun, leasePmt: p, fbtRate: fbt.rate, mtr, regime: fbt.regime, arrLabel: 'Arrangement 1 (continuous)' }));
    }
    residuals = [{ label: `End of Yr ${totalTerm} (lease end)`, value: resVal, note: `${(resPct*100).toFixed(2)}% of ${fmtAUD(exGST)} (financed value)` }];

  } else {
    const secYears = totalTerm - firstYears;
    const res1Pct  = ATO_RES[firstYears] ?? (0.75 - 0.75 / 8 * firstYears);
    const res1Val  = exGST * res1Pct;
    const months1  = firstYears * 12;
    const p1       = pmt(exGST, annualApr, months1, res1Val);
    const fbt1     = getFbt(startDate, carPrice, vtype, fbtCap, lct, p2, p3, postRate);
    for (let y = 1; y <= firstYears; y++) {
      years.push(calcYear({ yearIndex: y, carPrice, annualRun, leasePmt: p1, fbtRate: fbt1.rate, mtr, regime: fbt1.regime, arrLabel: `Arrangement 1 of 2 (${firstYears}yr)` }));
    }

    const renewDate = addMonths(startDate, firstYears * 12);
    const res2Pct   = ATO_RES[totalTerm] ?? (0.75 - 0.75 / 8 * totalTerm);
    const res2Val   = exGST * res2Pct;
    const months2   = secYears * 12;
    const p2v       = pmt(res1Val, annualApr, months2, res2Val); // principal = first balloon
    const fbt2      = getFbt(renewDate, carPrice, vtype, fbtCap, lct, p2, p3, postRate);
    for (let y = 1; y <= secYears; y++) {
      years.push(calcYear({ yearIndex: firstYears + y, carPrice, annualRun, leasePmt: p2v, fbtRate: fbt2.rate, mtr, regime: fbt2.regime, arrLabel: `Arrangement 2 of 2 (${secYears}yr renewal)` }));
    }

    residuals = [
      { label: `End of Yr ${firstYears} (mid-term balloon)`, value: res1Val, note: `${(res1Pct*100).toFixed(2)}% of ${fmtAUD(exGST)} — due at renewal` },
      { label: `End of Yr ${totalTerm} (final balloon)`,      value: res2Val, note: `${(res2Pct*100).toFixed(2)}% of ${fmtAUD(exGST)} — due at lease end` },
    ];
  }

  const T = years.reduce((a, y) => ({
    preTax:    a.preTax    + y.preTaxAnnual,
    ecm:       a.ecm       + y.ecm,
    taxSaved:  a.taxSaved  + y.taxSaved,
    gstRun:    a.gstRun    + y.gstRun,
    takeHome:  a.takeHome  + y.takeHomeImpact,
    leaseCost: a.leaseCost + y.annualLease,
    runCost:   a.runCost   + y.annualRun,
  }), { preTax: 0, ecm: 0, taxSaved: 0, gstRun: 0, takeHome: 0, leaseCost: 0, runCost: 0 });

  T.totalSavings  = T.taxSaved + gstSave + T.gstRun;
  T.gstSaveP      = gstSave;
  T.firstLeasePmt = years[0].leasePmt;

  return { years, totals: T, residuals };
}

/* ══ INPUT COLLECTOR ══ */
function collectInp() {
  const salary    = parseFloat(document.getElementById('salary').value)    || 0;
  const otherSS   = parseFloat(document.getElementById('otherSS').value)   || 0;
  const medicare  = document.getElementById('medicare').checked;
  const carPrice  = parseFloat(document.getElementById('carPrice').value)  || 0;
  const totalTerm = parseInt(document.getElementById('leaseTerm').value)   || 3;
  const annualApr = (parseFloat(document.getElementById('apr').value) || 0) / 100;
  const fbtCap    = parseFloat(document.getElementById('fbtCap').value)    || 75000;
  const lct       = parseFloat(document.getElementById('lctThreshold').value) || 91387;
  const postRate  = (parseFloat(document.getElementById('postRate').value) || 15) / 100;
  const annualRun =
    (parseFloat(document.getElementById('rcElec').value)      || 0) +
    (parseFloat(document.getElementById('rcInsurance').value) || 0) +
    (parseFloat(document.getElementById('rcRego').value)      || 0) +
    (parseFloat(document.getElementById('rcService').value)   || 0) +
    (parseFloat(document.getElementById('rcTyres').value)     || 0) +
    (parseFloat(document.getElementById('rcRoadside').value)  || 0);

  const taxableIncome = salary - otherSS * 12;
  const mtr = mRate(taxableIncome, medicare);

  return {
    salary, otherSS, medicare, carPrice, totalTerm, annualApr,
    fbtCap, lct, postRate, annualRun,
    startDate: parseDate(document.getElementById('startDate').value),
    p2:        parseDate(document.getElementById('phase2Date').value),
    p3:        parseDate(document.getElementById('phase3Date').value),
    taxableIncome, mtr, vtype: vehicleType,
  };
}

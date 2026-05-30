/* ══ MAIN ENGINE ══ */
function runEngine() {
  const inp = collectInp();

  checkSandboxDefaults();

  const alertsBox = document.getElementById('alertsBox');
  if (!inp.carPrice || inp.carPrice < 1000) {
    alertsBox.style.display = 'flex';
    alertsBox.innerHTML = `<div class="alert warn"><b>⚠ Enter a valid driveaway price</b> (at least $1,000) to see your lease calculations.</div>`;
    return;
  }
  if (!inp.salary || inp.salary < 1) {
    alertsBox.style.display = 'flex';
    alertsBox.innerHTML = `<div class="alert warn"><b>⚠ Enter a gross annual salary</b> to calculate your marginal tax rate and savings.</div>`;
    return;
  }

  updateSplitOpts(inp.totalTerm);

  const fbt     = getFbt(inp.startDate, inp.carPrice, inp.vtype, inp.fbtCap, inp.lct, inp.p2, inp.p3, inp.postRate);
  const resultA = runScenario(inp, 'continuous', null);
  const { totals: tA, years: yA } = resultA;

  // ── KPIs ──
  const fbtColors = { exempt: 'green', partial: 'amber', full: 'danger' };
  document.getElementById('kpiFbt').textContent    = fbt.label;
  document.getElementById('kpiFbt').className      = `kpi-val ${fbtColors[fbt.regime] || 'danger'}`;
  document.getElementById('kpiFbtSub').textContent = fbt.desc;

  const freqLabel = FREQ_LABEL[payFreq];
  document.getElementById('kpiPayLabel').textContent      = `${freqLabel} Finance Pymt`;
  document.getElementById('kpiPayFinance').textContent    = fmtP(yA[0].leasePmt);
  document.getElementById('kpiPayFinanceSub').textContent = 'Pure lease repayment (ex-running costs)';

  const totalMonthly = yA[0].leasePmt + inp.annualRun / 12;
  document.getElementById('kpiPayTotalLabel').textContent = `${freqLabel} Pre-Tax Total`;
  document.getElementById('kpiPayTotal').textContent      = fmtP(totalMonthly);

  const thMonthly = yA[0].takeHomeImpact / 12;
  document.getElementById('kpiTakeHomeLabel').textContent = `${freqLabel} Take-Home Impact`;
  document.getElementById('kpiTakeHome').textContent      = fmtP(thMonthly);
  document.getElementById('kpiTakeHomeSub').textContent   = `Actual reduction to net pay${tA.ecm > 0 ? ' (incl. ECM)' : ''}`;

  document.getElementById('kpiMtr').textContent = fmtPct(inp.mtr);
  document.getElementById('kpiGst').textContent = fmtAUD(inp.carPrice - inp.carPrice / 1.1);

  // ── Alerts ──
  renderAlerts(inp, fbt);

  // ── Savings note ──
  renderSavingsNote(inp, tA);

  // ── Option A ──
  const startStr = inp.startDate.toLocaleDateString('en-AU');
  const endStr   = addMonths(inp.startDate, inp.totalTerm * 12).toLocaleDateString('en-AU');
  document.getElementById('optATitle').textContent = `${inp.totalTerm}-Year Continuous Lease`;
  document.getElementById('optADesc').textContent  = `${startStr} → ${endStr}  ·  ${fmtPct(inp.annualApr)} APR`;
  renderResiduals('residualChipsA', resultA.residuals);

  document.getElementById('optATotalSavings').textContent = fmtAUD(tA.totalSavings);
  document.getElementById('optATotalNote').textContent    = `= Tax ${fmtAUD(tA.taxSaved)} + GST purchase ${fmtAUD(tA.gstSaveP)} + GST running ${fmtAUD(tA.gstRun)}`;
  document.getElementById('optATaxSaved').textContent     = fmtAUD(tA.taxSaved);
  document.getElementById('optAEcm').textContent          = fmtAUD(tA.ecm);

  const exGST    = inp.carPrice / 1.1;
  const resPct   = ATO_RES[inp.totalTerm] ?? (0.75 - 0.75 / 8 * inp.totalTerm);
  const resVal   = exGST * resPct;
  const interest = yA[0].leasePmt * 12 * inp.totalTerm - (exGST - resVal);
  const net      = tA.totalSavings - Math.max(0, interest) - tA.ecm;
  const netEl    = document.getElementById('optANet');
  netEl.textContent = fmtAUD(net);
  netEl.className   = `opt-kpi-val ${net >= 0 ? 'green' : 'danger'}`;

  renderLedger('ledgerA', yA);
  renderCostBd(resultA, inp);

  // ── Comparison ──
  const splitVal = document.getElementById('splitSelect').value || '';
  if (splitVal && splitVal !== 'na') {
    const firstYrs = parseInt(splitVal.split('+')[0]);
    const secYrs   = inp.totalTerm - firstYrs;
    const resultB  = runScenario(inp, 'split', firstYrs);
    const aWins    = tA.totalSavings >= resultB.totals.totalSavings;

    const startStr2 = inp.startDate.toLocaleDateString('en-AU');
    const endStr2   = addMonths(inp.startDate, inp.totalTerm * 12).toLocaleDateString('en-AU');
    const renewStr  = addMonths(inp.startDate, firstYrs * 12).toLocaleDateString('en-AU');

    const dataA = { result: resultA, label: `Option A — ${inp.totalTerm}yr Continuous`,    color: 'green', win: aWins,  sub: `${startStr2} → ${endStr2}  ·  ${fmtPct(inp.annualApr)} APR` };
    const dataB = { result: resultB, label: `Option B — ${firstYrs}yr + ${secYrs}yr Split`, color: 'amber', win: !aWins, sub: `Renewal on ${renewStr}` };

    const ordered = aWins ? [dataA, dataB] : [dataB, dataA];

    const grid = document.getElementById('compareGrid');
    grid.innerHTML = '<div id="scWinner"></div><div id="scLoser"></div>';
    renderScenCard('scWinner', ordered[0].result, ordered[0].label, ordered[0].color, true,  ordered[0].sub);
    renderScenCard('scLoser',  ordered[1].result, ordered[1].label, ordered[1].color, false, ordered[1].sub);

    renderVerdict(resultA, resultB, firstYrs, secYrs);
  } else {
    document.getElementById('compareGrid').innerHTML =
      `<div style="padding:18px;text-align:center;color:var(--text-3);font-size:.79rem">Select a split structure above to compare.</div>`;
  }
} /* end runEngine */

/* ══ EVENT WIRING ══ */
[
  'salary', 'otherSS', 'medicare', 'carPrice', 'startDate', 'leaseTerm', 'apr', 'residualPct',
  'fbtCap', 'lctThreshold', 'phase2Date', 'phase3Date', 'postRate',
  'rcElec', 'rcInsurance', 'rcRego', 'rcService', 'rcTyres', 'rcRoadside',
].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', runEngine);
});

document.getElementById('leaseTerm').addEventListener('change', function () {
  const p = ATO_RES[parseInt(this.value)];
  if (p && !userEditedResidual) document.getElementById('residualPct').value = (p * 100).toFixed(2);
  runEngine();
});

document.getElementById('residualPct').addEventListener('input', function () {
  const ato = ATO_RES[parseInt(document.getElementById('leaseTerm').value)];
  userEditedResidual = ato ? Math.abs(parseFloat(this.value) - ato * 100) > 0.01 : true;
});

window.addEventListener('DOMContentLoaded', () => {
  updateSplitOpts(3);
  runEngine();
  const saved = localStorage.getItem('theme');
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('light');
  }
});

/* ══ CSV EXPORT ══ */
function exportCSV(mode) {
  const inp      = collectInp();
  const rA       = runScenario(inp, 'continuous', null);
  const splitVal = document.getElementById('splitSelect').value || '';
  const firstY   = splitVal && splitVal !== 'na' ? parseInt(splitVal.split('+')[0]) : null;
  const rB       = firstY ? runScenario(inp, 'split', firstY) : null;

  const header = [
    'Scenario', 'Year', 'Arrangement',
    'Finance Pmt/mo ($)', 'Annual Lease ($)', 'Annual Running ($)',
    'Pre-Tax/yr ($)', 'Take-Home Impact/yr ($)', 'ECM Post-Tax/yr ($)',
    'FBT Regime', 'Tax Saved/yr ($)',
  ].join(',');

  const rows = [];
  const addR = (label, r) => {
    r.years.forEach(y => rows.push([
      label, y.yearIndex, `"${y.arrLabel}"`,
      y.leasePmt.toFixed(2), y.annualLease.toFixed(2), y.annualRun.toFixed(2),
      y.preTaxAnnual.toFixed(2), y.takeHomeImpact.toFixed(2), y.ecm.toFixed(2),
      y.regime, y.taxSaved.toFixed(2),
    ].join(',')));
    const t = r.totals;
    rows.push([
      `${label} TOTALS`, '', '',
      '', t.leaseCost.toFixed(2), t.runCost.toFixed(2),
      t.preTax.toFixed(2), t.takeHome.toFixed(2), t.ecm.toFixed(2),
      '', t.taxSaved.toFixed(2),
    ].join(','));
    rows.push('');
  };

  addR(`Option A (${inp.totalTerm}yr continuous)`, rA);
  if (rB && mode !== 'A') addR(`Option B (${splitVal} split)`, rB);

  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `novated_lease_${inp.startDate.toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

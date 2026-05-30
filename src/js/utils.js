/* ══ FORMATTING UTILS ══ */
const fmtAUD = v => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(v);

const fmtPct = v => (v * 100).toFixed(1) + '%';

/** Convert a monthly amount to the currently selected pay frequency display amount. */
function fmtP(monthlyAmt) {
  return fmtAUD(monthlyAmt / (FREQ_DIV[payFreq] || 1));
}

/* ══ DATE UTILS ══ */
function parseDate(s) {
  if (!s) return new Date(0);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

/* ══ STATE ══ */
let vehicleType        = 'ev';
let payFreq            = 'fortnightly';
let userEditedResidual = false;

/* ══ POLICY DEFAULTS (2026 Budget) ══ */
const SANDBOX_DEFAULTS = {
  fbtCap:   75000,
  lct:      91387,
  phase2:  '2027-04-01',
  phase3:  '2029-04-01',
  postRate: 15,
};

/* ══ PAYMENT FREQUENCY ══ */
const FREQ_DIV   = { weekly: 52/12, fortnightly: 26/12, monthly: 1 };
const FREQ_LABEL = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' };

/* ══ ATO MINIMUM RESIDUALS — TD 93/142 (8-yr effective life) ══ */
const ATO_RES = { 1: 0.6563, 2: 0.5625, 3: 0.4688, 4: 0.3750, 5: 0.2813 };

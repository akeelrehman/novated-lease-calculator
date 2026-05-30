# Novated Lease Calculator

> **Australia 2026 · ATO Compliant · v2.1**

A client-side single-page web app that models the true financial impact of a novated vehicle lease under Australian tax law. No server, no login, no external data — every calculation runs entirely in the browser.

**Live app → [akeelrehman.github.io/novated-lease-calculator](https://akeelrehman.github.io/novated-lease-calculator)**

---

## What it answers

1. How much does a novated lease actually cost out of my pocket, and what do I save?
2. Does the cost of borrowing eat up the tax benefit?

---

## Features

- **Correct PMT formula** — present-value annuity with balloon/residual, not an approximation
- **2026 Budget FBT phase schedule** — all three phases with correct dates and price bands
- **ATO minimum residual values** — pre-populated from TD 93/142 (8-year effective life)
- **Split-lease comparison** — side-by-side Option A (continuous) vs Option B (split structure), with grandfathering applied correctly at each renewal date
- **All vehicle types** — BEV (phases apply), PHEV (full 20% since Apr 2025), ICE (full 20% always)
- **Running costs packaging** — electricity, insurance, rego, servicing, tyres, roadside (pre-tax during exempt periods)
- **ECM (Employee Contribution Method)** — auto-calculated when FBT rate > 0%
- **Net benefit vs cash** — savings minus interest cost minus ECM, so you see the true bottom line
- **Policy Sandbox** — tweak FBT cap, LCT threshold, phase dates and post-phase rate to stress-test scenarios
- **PDF report** — full programmatic PDF (jsPDF + AutoTable) with no browser print quirks
- **CSV export** — raw year-by-year data for both options
- **Dark / light theme** — persisted in localStorage

---

## Regulatory baseline

| Rule | Source |
|---|---|
| FBT statutory formula (taxable value = base × rate) | FBTAA 1986 s.7 |
| ATO minimum residual values | TD 93/142 |
| 2026 Budget FBT phase schedule | Budget 2026-27 Paper No.2 — Electric Car Discount |
| Income tax brackets 2026-27 | ATO |
| Grandfathering (rate locks at commencement; renewal = new arrangement) | ATO grandfathering policy |

### 2026 FBT phase schedule (BEV only)

| Phase | Date range | EV ≤ $75k | EV $75k–LCT | EV > LCT |
|---|---|---|---|---|
| 1 | Now → 31 Mar 2027 | 0% exempt | 20% (no discount) | 20% |
| 2 | 1 Apr 2027 → 31 Mar 2029 | 0% exempt | 15% (25% discount) | 20% |
| 3 | 1 Apr 2029 onwards | 15% (25% discount) | 15% (25% discount) | 20% |

PHEVs lost their exemption on 1 April 2025 and always attract the full 20% rate.

### Income tax brackets (2026-27)

| Taxable income | Rate |
|---|---|
| $0 – $18,200 | 0% |
| $18,201 – $45,000 | 15% |
| $45,001 – $135,000 | 30% |
| $135,001 – $190,000 | 37% |
| $190,001+ | 45% |
| Medicare Levy | +2% (optional) |

---

## Project structure

```
novated-lease-calculator/
├── src/
│   ├── template.html        # HTML shell with BUILD:CSS / BUILD:JS markers
│   ├── css/
│   │   ├── tokens.css       # Design tokens & light theme
│   │   ├── base.css         # Reset, layout, typography
│   │   └── components.css   # Cards, tables, KPIs, comparison view
│   └── js/
│       ├── config.js        # State, policy defaults, ATO residual table
│       ├── utils.js         # Formatting helpers, date utilities
│       ├── calculator.js    # mRate, pmt, getFbt, calcYear, runScenario
│       ├── renderer.js      # All DOM rendering functions
│       ├── pdf.js           # Programmatic PDF generation (jsPDF)
│       ├── export.js        # CSV export
│       ├── ui.js            # View switching, theme, vehicle/freq selectors
│       └── app.js           # Main engine, event wiring, DOMContentLoaded
├── tests/
│   ├── setup.js             # Node VM test harness (loads src files without a browser)
│   └── calculator.test.js   # 45 unit tests (Node built-in test runner)
├── app.html                 # Built output — the deployable single-file app
├── build.js                 # Build script: concatenates src/ → app.html
├── watch.js                 # File watcher: rebuilds on any src/ change
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Actions: push main → deploy app.html to Pages
```

---

## Development

**Prerequisites:** Node.js ≥ 20 (no npm dependencies for the app itself).

```bash
# One-time build
npm run build        # → writes app.html

# Watch mode (rebuilds on every src/ save)
npm run watch

# Run tests (45 unit tests, Node built-in runner)
npm test
```

The build inlines all CSS and JS into a single self-contained `app.html`. Open it directly in a browser — no server needed.

---

## Tests

45 unit tests cover all critical calculation logic using Node's built-in test runner:

| Suite | What's tested |
|---|---|
| `mRate` | All 5 tax brackets × with/without Medicare levy |
| `pmt` | Zero APR straight-line, boundary inputs, interest vs no-interest direction, balloon effect |
| `getFbt` | ICE/PHEV always-20%, EV above LCT, all 3 phase periods, exact boundary dates |
| `calcYear` | ECM=0 for exempt, ECM for ICE/partial, tax-saved math, MTR ordering |
| ATO residuals | All 5 lease terms validated against TD 93/142 via `runScenario` |
| Split lease | Row counts, FBT grandfathering across phase boundaries (incl. Phase 3 straddle) |

---

## Deployment

Pushes to `main` automatically build and deploy to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml). The workflow copies `app.html` to `_site/index.html` and uploads it as a Pages artifact.

---

## Disclaimer

General information only — not financial or tax advice. Always consult a registered tax agent before making financial decisions.

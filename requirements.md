# Novated Lease Calculator — Functional Requirements

**Document version:** 1.0  
**Application version:** v2.1  
**Last updated:** May 2026  
**Status:** Implemented

---

## 1. Overview

A client-side, single-file HTML web application that models the financial impact of a novated vehicle lease under Australian tax law. The application is intended for personal use and public sharing. It requires no server, no login, and no external data — all calculations run entirely in the browser.

The core purpose is to answer two questions plainly:

1. How much does a novated lease actually cost out of my pocket, and what do I save?
2. Does the cost of borrowing eat up the tax benefit?

---

## 2. Regulatory & Compliance Baseline

All calculations must conform to the following ATO rules and 2026 Budget legislative changes. These are not configurable defaults — they are the correct baseline, with user-adjustable overrides in the Policy Sandbox for stress-testing only.

### 2.1 FBT Statutory Formula

- FBT is calculated using the statutory formula method: **taxable value = base value × statutory rate**
- Base value = driveaway price including GST (ATO definition for the statutory formula)
- Stamp duty and registration are excluded from the base value
- Source: FBTAA 1986 s.7

### 2.2 2026 Budget FBT Phase Schedule (BEV only)

| Phase | Date Range | EV ≤ $75k | EV $75k–LCT | EV > LCT |
|-------|-----------|-----------|-------------|----------|
| 1 | Now → 31 Mar 2027 | 0% (fully exempt) | 20% (no discount) | 20% |
| 2 | 1 Apr 2027 → 31 Mar 2029 | 0% (still exempt) | 15% (25% discount) | 20% |
| 3 | 1 Apr 2029 onwards | 15% (25% discount) | 15% (25% discount) | 20% |

- Source: Budget 2026-27 Paper No. 2 — Electric Car Discount

### 2.3 Grandfathering Rule

- The FBT statutory rate applicable at the **commencement date** of a lease arrangement is locked in for the full term of that arrangement
- A **lease renewal is a new arrangement** — it captures the FBT rate current at the renewal date, not the original start date
- Source: ATO grandfathering policy for novated leases

### 2.4 Vehicle Type FBT Treatment

| Vehicle Type | FBT Treatment |
|---|---|
| BEV (Battery Electric Vehicle) | Phase schedule above applies |
| Hydrogen fuel-cell vehicle | Same as BEV |
| PHEV (Plug-in Hybrid) | Full 20% — exemption ended 1 April 2025 |
| ICE (Petrol / Diesel) | Always full 20%, no discount ever |

### 2.5 ATO Minimum Residual Values (TD 93/142)

Based on an 8-year effective life: minimum residual % = 75% − (75%/8 × years elapsed)

| Lease Term | Minimum Residual |
|---|---|
| 1 year | 65.63% |
| 2 years | 56.25% |
| 3 years | 46.88% |
| 4 years | 37.50% |
| 5 years | 28.13% |

For a split lease, the **total accumulated lease period** determines the final balloon residual per TD 93/142 Example 3. The mid-term balloon uses the residual for the first segment's duration only.

### 2.6 Income Tax Brackets (2026-27)

| Taxable Income | Rate |
|---|---|
| $0 – $18,200 | 0% |
| $18,201 – $45,000 | 15% (reduced from 16% from 1 July 2026) |
| $45,001 – $135,000 | 30% |
| $135,001 – $190,000 | 37% |
| $190,001+ | 45% |
| Medicare Levy | +2% (optional, on by default) |

The application uses the **marginal rate** — the rate on the top slice of income — as the saving rate for each additional dollar of salary sacrifice.

### 2.7 GST Treatment

- The lease company claims back the GST on the vehicle purchase as an input tax credit, which is passed to the employee
- Financed (base) amount = driveaway price ÷ 1.1 (ex-GST)
- GST saving on vehicle purchase = driveaway price − ex-GST amount
- Running costs are also GST-inclusive; employer claims back 1/11 of running costs as a GST saving

### 2.8 Employee Contribution Method (ECM)

When FBT applies (statutory rate > 0%), the employee must make a post-tax contribution equal to the annual taxable value to reduce the employer's FBT liability to zero:

- **Annual ECM = car base value (driveaway incl. GST) × statutory rate**
- This is a post-tax cash outflow, separate from the pre-tax salary sacrifice
- When FBT rate = 0% (fully exempt), ECM = $0

### 2.9 Running Costs Packaging

During FBT-exempt periods, the following running costs may be packaged pre-tax alongside the lease repayments:

- Electricity / fuel
- Insurance
- Registration and CTP
- Servicing
- Tyres
- Roadside assistance

---

## 3. Calculation Engine

### 3.1 PMT Formula (Lease Repayment)

The monthly lease repayment is calculated using the present-value annuity formula adjusted for a balloon/residual payment:

```
Monthly Payment = (P − RV / (1+r)^n) × r / (1 − (1+r)^−n)
```

Where:
- P = principal (driveaway price ex-GST)
- r = monthly interest rate (APR ÷ 12)
- n = total lease months
- RV = residual value (P × residual %)

This is the standard banking PMT formula. The alternative form that adds `(RV × r)` separately is incorrect and must not be used.

### 3.2 Annual Year-Block Calculation

For each year of the lease, the following are computed:

| Output | Formula |
|---|---|
| Annual lease cost | Monthly payment × 12 |
| Annual running costs | Sum of all running cost inputs |
| Pre-tax salary sacrifice | Annual lease cost + annual running costs |
| ECM post-tax | Car base value × FBT statutory rate |
| Income tax saved | Pre-tax salary sacrifice × marginal tax rate |
| GST saving on running | Annual running costs ÷ 11 |
| Take-home pay impact | (Pre-tax × (1 − MTR)) + ECM |

Take-home pay impact is the **actual reduction in net pay** — the number that appears less in the employee's bank account. This is distinct from the pre-tax deduction amount.

### 3.3 Total Savings Composition

**Total Savings = Income tax saved + GST saving on vehicle purchase + GST saving on running costs**

This must be clearly decomposed in the UI and any reports. Total savings is not the same as income tax saved alone.

### 3.4 Net Benefit vs Cash Purchase

**Net Benefit = Total Savings − Total Interest Cost − Total ECM Post-Tax**

Where total interest cost = total lease payments − (principal − residual value).

This answers whether the novated lease is financially better than simply purchasing the vehicle with after-tax income.

### 3.5 Split Lease Finance

For a split lease (two sequential arrangements):

- **First arrangement:** financed on the full ex-GST principal; residual = ATO minimum for the first segment's term
- **Second arrangement:** principal = first arrangement's residual value (the mid-term balloon is refinanced); final balloon = ATO minimum based on **total accumulated term**
- Each arrangement independently determines its FBT regime from its own commencement date (no grandfathering from first to second)

---

## 4. Input Specification

### 4.1 User Profile

| Input | Type | Default | Notes |
|---|---|---|---|
| Gross annual salary | Number | $120,000 | Used to determine marginal tax rate |
| Other pre-tax salary sacrifice ($/month) | Number | $0 | e.g. super top-up; reduces taxable income before vehicle calculation |
| Include 2% Medicare Levy | Boolean | On | Adds 2% to marginal rate when checked |

### 4.2 Vehicle Type Selector

Three mutually exclusive options: **Electric (BEV)**, **Plug-in Hybrid**, **Petrol / Diesel**. Default: Electric (BEV). Determines which FBT rules apply.

### 4.3 Vehicle & Lease Finance

| Input | Type | Default | Notes |
|---|---|---|---|
| Driveaway price (incl. GST) | Number | $64,000 | Base for both FBT calculation and financing |
| Lease start date | Date | 15/03/2027 | Determines which FBT phase locks in |
| Lease term | Select | 3 years | 1–5 years; auto-populates ATO minimum residual |
| Finance APR | Number | 9.5% | Annual percentage rate; typical market range 7–12% |
| Residual % | Number | 46.88% | Pre-populated from ATO table on term change; user-editable |
| Show payments as | Toggle | Fortnightly | Weekly / Fortnightly / Monthly; affects all payment displays |

### 4.4 Annual Running Costs

Six separate line items, all pre-tax packaged during exempt periods:

- Electricity / Charging (or Fuel for ICE/PHEV)
- Insurance
- Registration & CTP
- Servicing
- Tyres
- Roadside Assistance

### 4.5 Policy Sandbox

User-adjustable parameters for stress-testing. Defaults match confirmed 2026 Budget. The section is **collapsed by default** — clicking the card header expands it. A `▶/▼` chevron indicates the open/closed state.

| Input | Default | Notes |
|---|---|---|
| Full exempt FBT cap ($) | $75,000 | Budget 2026 threshold |
| LCT fuel-efficient threshold ($) | $91,387 | CPI-indexed; 2025-26 value |
| Phase 2 start date | 1 Apr 2027 | When $75k–LCT band gets 25% discount |
| Phase 3 start date | 1 Apr 2029 | When all eligible EVs get 25% discount |
| Post-phase-3 statutory rate (%) | 15% | 25% discount from 20% base rate |

---

## 5. Output Specification

### 5.1 KPI Tiles (always visible, top of dashboard)

Six tiles, updated in real time:

1. **FBT Status** — regime label and description (e.g. "Fully Exempt — Phase 1, under $75k cap")
2. **[Freq] Finance Payment** — pure lease repayment only, at selected payment frequency
3. **[Freq] Total Pre-Tax Deduction** — finance + running costs combined
4. **[Freq] Take-Home Pay Impact** — actual bank account reduction per period
5. **Marginal Tax Rate** — computed rate including Medicare if applicable
6. **GST Saving (Purchase)** — one-time saving from employer's input tax credit

### 5.2 Savings Clarification Note

A persistent info block that explains: **Total Savings = Tax saved + GST purchase + GST running**. This must be visible whenever any savings figure is displayed, to prevent misreading tax saved as total savings.

### 5.3 Option A — Single View (default tab)

Shows the continuous lease for the full selected term. Contains:

- Lease title (e.g. "3-Year Continuous Lease"), date range, APR
- **Balloon payment callout** — amount, percentage, and due date
- Four summary KPI tiles: Total Savings (with decomposition note), Income Tax Saved, ECM Post-Tax Total, Net Benefit vs Cash
- **Year-by-year ledger table** with columns: Year, [Freq] Finance Payment, [Freq] Total Pre-Tax, [Freq] Take-Home Impact, ECM Post-Tax/yr, FBT Status pill, Tax Saved/yr
- **"Is the lending cost eating your tax saving?" breakdown** — itemised savings vs costs with net result and plain-English verdict

### 5.4 Option B — Compare Split Structure (second tab)

Activated by selecting the Compare tab. Contains:

- **Split structure selector** — dropdown populated with all valid splits for the chosen term (e.g. for 3 years: 1+2, 2+1; for 4 years: 1+3, 2+2, 3+1)
- **Variance Analysis panel** — rendered first, before the individual scenario cards; plain English explanation of which option is better and why
- **Winner scenario card** — rendered first (better option, green border, ⭐ badge)
- **Loser scenario card** — rendered second (lesser option)

Each scenario card contains:
- Label, date range / renewal date, APR
- Four summary KPIs: Total Savings, Income Tax Saved, [Freq] Finance Payment (Yr 1), ECM Post-Tax Total
- **Balloon payment chip(s)** — Option A shows one; Option B shows two (mid-term + final)
- Full year-by-year ledger table

### 5.5 Alert Banners

Conditional alerts displayed below the KPI row when triggered:

| Condition | Severity | Message |
|---|---|---|
| PHEV selected | Danger | Exemption ended 1 Apr 2025; full 20% applies |
| ICE selected | Info | Full 20% statutory rate; ECM required |
| EV price > LCT threshold | Danger | Not eligible for any discount |
| EV price in $75k–LCT band, start before 1 Apr 2027 | Danger | No discount in Phase 1 for this band |
| EV price in $75k–LCT band, start on/after 1 Apr 2027 | Warning | 25% discount available from Phase 2 |
| Split renewal falls in worse FBT phase | Warning | Renewal loses grandfathering, ECM increases |

---

## 6. Layout & Responsiveness

### 6.1 Screen Layout

- Two-column grid: fixed 400px input panel (left) + fluid dashboard (right)
- Collapses to single column below 960px viewport width
- Dashboard right column uses `minmax(0, 1fr)` to prevent horizontal overflow at any viewport width
- All scenario cards are full-width (single column), never side-by-side — prevents horizontal overflow on narrow screens and in PDF

### 6.2 Design System

- Dark theme throughout: background `#0d0f14`, surface `#13161d`, raised `#1a1e28`
- Accent colours: green (`#4ade80`) for savings/positive, amber (`#fbbf24`) for warnings/caution, red (`#f87171`) for danger/negative, blue (`#60a5fa`) for payment amounts
- Typography: Syne (display/headings), DM Mono (numbers and codes), DM Sans (body)

### 6.3 Real-Time Updates

All outputs update immediately on any input change with no submit button. Event listeners attached to all input and select elements.

---

## 7. Payment Frequency

All payment figures (KPI tiles, ledger columns, scenario card summaries) must respect the selected frequency:

| Frequency | Divisor from monthly |
|---|---|
| Weekly | 12/52 (monthly ÷ 52×12) |
| Fortnightly | 12/26 |
| Monthly | 1 (no conversion) |

Default: Fortnightly. Column headers in ledger tables update to reflect the selected label.

---

## 8. CSV Export

Available from both Option A (single button) and Compare view (exports both scenarios). CSV columns:

- Scenario, Year, Arrangement, Finance Pmt/mo ($), Annual Lease ($), Annual Running ($), Pre-Tax/yr ($), Take-Home Impact/yr ($), ECM Post-Tax/yr ($), FBT Regime, Tax Saved/yr ($)

Each scenario ends with a TOTALS row. File name: `novated_lease_YYYY-MM-DD.csv`

---

## 9. PDF Report Generation

The PDF is generated programmatically using jsPDF + jsPDF-AutoTable. Browser `window.print()` is not used. The PDF must be self-contained and consistent regardless of the browser used to generate it.

### 9.1 Page Structure

| Page | Contents |
|---|---|
| 1 | Title block · Configuration Summary table · Key Metrics Snapshot (8 KPI tiles) |
| 2 | Option A — full continuous lease · Balloon chip · 4-column KPI summary · Ledger table · Cost breakdown table |
| 3 (if split selected) | Split structure heading · Variance Analysis · Winner scenario (residuals, KPIs, ledger) · Loser scenario (residuals, KPIs, ledger) |
| Final | Disclaimer & Sources |

### 9.2 Design

- Dark theme applied consistently to all pages including pages added by `addPage()` — each new page must fill the full page rectangle with the background colour before rendering content
- A4 portrait, 14mm left/right margins
- Page header on pages 2+: application name (left) and generation date (right) with a dividing rule
- `checkY()` helper ensures no section heading or KPI row is orphaned at the bottom of a page
- Tables paginate automatically via autoTable's built-in overflow handling

### 9.3 Content Order (PDF)

Variance Analysis always precedes the individual scenario comparisons. Winner is always rendered before loser. This matches the screen layout order.

---

## 10. Disclaimer Requirements

The following disclaimer must appear in the application footer (screen) and as the final section of every PDF:

- General information only — not financial or tax advice
- Always consult a registered tax agent
- Sources: ATO FBTAA 1986 s.7, TD 93/142, Budget 2026-27 Paper No. 2, ATO Income Tax Rates 2026-27, ATO Electric Cars Exemption
- Key assumptions listed explicitly, including: FBT base definition, ECM formula, residual basis, tax bracket year, split renewal = new arrangement

---

## 11. Tooling & Testing

### 11.1 Unit Tests

- Runner: Node.js built-in test runner (`node --test`)
- Location: `tests/calculator.test.js`
- Harness: `tests/setup.js` (Node VM sandbox — loads src modules without a browser)
- Coverage: `mRate`, `pmt`, `getFbt`, `calcYear`, ATO residuals, split-lease finance

### 11.2 E2E Tests

- Runner: Playwright (`@playwright/test`)
- Location: `tests/e2e/app.spec.js`
- Browser: headless Chromium
- Server: `npx http-server` started automatically by Playwright’s `webServer` option on port 8080
- Config: `playwright.config.js`
- Scenarios covered: page load, Policy Sandbox collapse/expand, vehicle type switching, KPI tile population, theme toggle

### 11.3 Pre-Commit Hook

- Location: `.githooks/pre-commit`
- Activated via: `npm install` → `prepare` script runs `git config core.hooksPath .githooks`
- Sequence: unit tests → build → E2E tests
- Commit is blocked if any step exits non-zero

### 11.4 VS Code MCP (Playwright)

- Config: `.vscode/mcp.json`
- Exposes the `@playwright/mcp` server to the Copilot agent for browser-based tasks

---

## 12. Known Limitations & Out of Scope

| Item | Status |
|---|---|
| Stamp duty and registration variations by state | Out of scope (excluded from FBT base; too complex to model per-state accurately) |
| Salary packaging administration fees | Out of scope (varies by employer and provider) |
| Novated lease establishment fees | Not modelled as a fixed amount; noted in variance analysis as a structural cost advantage of continuous over split |
| FBT year vs income tax year differences | Simplified: calculations use calendar years aligned to lease start date |
| Multiple employees / fleet | Out of scope; single-person calculator |
| Pre-2026 lease calculations | Out of scope; 2026-27 tax brackets used throughout |
| PHEVs purchased before 1 Apr 2025 | Out of scope; all PHEV calculations assume full 20% rate |

---

## 12. Change Log

| Version | Changes |
|---|---|
| v1.0 | Initial build — EV only, continuous lease, basic savings calculation |
| v2.0 | Added: payment frequency toggle (weekly/fortnightly/monthly), single-option main view with compare tab, configurable split structure selector (all valid splits for given term), residual amounts displayed per arrangement, vehicle type selector (BEV/PHEV/ICE) |
| v2.1 | Fixed: PMT formula (correct present-value balloon form), FBT phase logic for $75k–LCT band in Phase 1 (no discount, previously incorrect), split lease residual basis (TD 93/142 total accumulated period), ECM logic (post-tax separate from pre-tax, not blended). Added: take-home pay impact KPI and ledger column, total savings decomposition note, programmatic PDF generation (jsPDF + autoTable replacing browser print), compare layout changed to full-width vertical stack (winner first, then loser) |
| v2.2 | Added: Policy Sandbox collapsed by default (chevron toggle); Playwright E2E test suite (13 tests, headless Chromium); pre-commit hook (unit + E2E, blocks commit on failure); `.vscode/mcp.json` (Playwright MCP for Copilot agent) |
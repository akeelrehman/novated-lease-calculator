/* ══ SANDBOX DEFAULTS CHECK ══ */
function checkSandboxDefaults() {
  const modified =
    parseFloat(document.getElementById('fbtCap').value)        !== SANDBOX_DEFAULTS.fbtCap    ||
    parseFloat(document.getElementById('lctThreshold').value)  !== SANDBOX_DEFAULTS.lct       ||
    document.getElementById('phase2Date').value                !== SANDBOX_DEFAULTS.phase2    ||
    document.getElementById('phase3Date').value                !== SANDBOX_DEFAULTS.phase3    ||
    parseFloat(document.getElementById('postRate').value)      !== SANDBOX_DEFAULTS.postRate;
  const badge = document.getElementById('sandboxModifiedBadge');
  if (badge) badge.classList.toggle('hidden', !modified);
}

/* ══ PILL HTML ══ */
function pill(regime) {
  if (regime === 'exempt')  return `<span class="status-pill pill-exempt">Exempt 0%</span>`;
  if (regime === 'partial') return `<span class="status-pill pill-partial">Partial 15%</span>`;
  return `<span class="status-pill pill-exposed">Full 20%</span>`;
}

/* ══ RENDER RESIDUAL CHIPS ══ */
function renderResiduals(id, residuals) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = residuals.map(r => `
    <div class="residual-chip">
      <div class="residual-chip-label">${r.label}</div>
      <div class="residual-chip-val">${fmtAUD(r.value)}</div>
      <div class="residual-chip-note">${r.note}</div>
    </div>`).join('');
}

/* ══ RENDER LEDGER (Option A single view) ══ */
function renderLedger(tbodyId, years) {
  const freq = FREQ_LABEL[payFreq];
  document.getElementById('ledgerColFinance').textContent  = `${freq} Finance`;
  document.getElementById('ledgerColTotal').textContent    = `${freq} Total Pre-Tax`;
  document.getElementById('ledgerColTakeHome').textContent = `${freq} Take-Home Impact`;

  document.getElementById(tbodyId).innerHTML = years.map(y => {
    const monthlyTotal = y.leasePmt + y.annualRun / 12;
    const monthlyTH    = y.takeHomeImpact / 12;
    return `<tr>
      <td>Yr ${y.yearIndex}<br><span style="font-size:.62rem;color:var(--text-3);font-weight:300">${y.arrLabel}</span></td>
      <td style="color:var(--blue)">${fmtP(y.leasePmt)}</td>
      <td style="color:var(--blue)">${fmtP(monthlyTotal)}</td>
      <td style="color:var(--warn)">${fmtP(monthlyTH)}</td>
      <td style="color:${y.ecm > 0 ? 'var(--warn)' : 'var(--text-3)'}">${fmtAUD(y.ecm)}</td>
      <td>${pill(y.regime)}</td>
      <td style="color:var(--accent)">${fmtAUD(y.taxSaved)}</td>
    </tr>`;
  }).join('');
}

/* ══ RENDER SCENARIO CARD (comparison view) ══ */
function renderScenCard(id, result, label, colorClass, isWinner, subline) {
  const { years, totals, residuals } = result;
  const el = document.getElementById(id);
  if (!el) return;

  const resHTML = residuals.map(r => `
    <div class="residual-chip">
      <div class="residual-chip-label">${r.label}</div>
      <div class="residual-chip-val">${fmtAUD(r.value)}</div>
      <div class="residual-chip-note">${r.note}</div>
    </div>`).join('');

  const freq  = FREQ_LABEL[payFreq];
  const tRows = years.map(y => {
    const monthlyTotal = y.leasePmt + y.annualRun / 12;
    const monthlyTH    = y.takeHomeImpact / 12;
    return `<tr>
      <td>Yr ${y.yearIndex}<br><span style="font-size:.6rem;color:var(--text-3);font-weight:300">${y.arrLabel}</span></td>
      <td style="color:var(--blue)">${fmtP(y.leasePmt)}</td>
      <td style="color:var(--blue)">${fmtP(monthlyTotal)}</td>
      <td style="color:var(--warn)">${fmtP(monthlyTH)}</td>
      <td style="color:${y.ecm > 0 ? 'var(--warn)' : 'var(--text-3)'}">${fmtAUD(y.ecm)}</td>
      <td>${pill(y.regime)}</td>
      <td style="color:var(--accent)">${fmtAUD(y.taxSaved)}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="scenario-card ${isWinner ? 'winner' : 'loser'}">
      <div class="scenario-head">
        <div>
          <div class="sc-label ${colorClass}">${label}</div>
          <div style="font-size:.7rem;color:var(--text-2);margin-top:2px">${subline}</div>
        </div>
        ${isWinner ? '<span class="winner-tag">⭐ Better option</span>' : ''}
      </div>
      <div class="sc-kpis">
        <div>
          <div class="sc-kpi-label">Total Savings</div>
          <div class="sc-kpi-val accent">${fmtAUD(totals.totalSavings)}</div>
          <div style="font-size:.6rem;color:var(--text-3);margin-top:1px">Tax + GST purchase + GST running</div>
        </div>
        <div>
          <div class="sc-kpi-label">Income Tax Saved</div>
          <div class="sc-kpi-val accent">${fmtAUD(totals.taxSaved)}</div>
        </div>
        <div>
          <div class="sc-kpi-label">${freq} Finance (Yr 1)</div>
          <div class="sc-kpi-val">${fmtP(years[0].leasePmt)}</div>
        </div>
        <div>
          <div class="sc-kpi-label">ECM Post-Tax Total</div>
          <div class="sc-kpi-val ${totals.ecm > 0 ? 'warn' : ''}">${fmtAUD(totals.ecm)}</div>
        </div>
      </div>
      <div class="sc-residuals">${resHTML}</div>
      <div class="ledger-wrap">
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>${freq} Finance</th>
              <th>${freq} Total Pre-Tax</th>
              <th>${freq} Take-Home Impact</th>
              <th>ECM/yr</th>
              <th>FBT</th>
              <th>Tax Saved/yr</th>
            </tr>
          </thead>
          <tbody>${tRows}</tbody>
        </table>
      </div>
    </div>`;
}

/* ══ RENDER COST BREAKDOWN ══ */
function renderCostBd(resultA, inp) {
  const { totals, years } = resultA;
  const body = document.getElementById('costBdBody');
  if (!body) return;

  const exGST      = inp.carPrice / 1.1;
  const resPct     = ATO_RES[inp.totalTerm] ?? (0.75 - 0.75 / 8 * inp.totalTerm);
  const resVal     = exGST * resPct;
  const totalPmts  = years[0].leasePmt * 12 * inp.totalTerm;
  const interest   = totalPmts - (exGST - resVal);
  const net        = totals.totalSavings - Math.max(0, interest) - totals.ecm;
  const isWorth    = net >= 0;

  body.innerHTML = `
    <div class="cost-row"><span class="cost-label">Income tax saved (${inp.totalTerm}yr)</span><span class="cost-val pos">+${fmtAUD(totals.taxSaved)}</span></div>
    <div class="cost-row"><span class="cost-label">GST saving on vehicle purchase</span><span class="cost-val pos">+${fmtAUD(totals.gstSaveP)}</span></div>
    <div class="cost-row"><span class="cost-label">GST saving on running costs (1/11 of running)</span><span class="cost-val pos">+${fmtAUD(totals.gstRun)}</span></div>
    <div style="font-size:.69rem;color:var(--text-3);margin:-2px 0 2px;padding-left:2px">= Total Savings ${fmtAUD(totals.totalSavings)}</div>
    <hr class="cost-div"/>
    <div class="cost-row"><span class="cost-label">Finance interest cost (${fmtPct(inp.annualApr)} APR)</span><span class="cost-val neg">−${fmtAUD(Math.max(0, interest))}</span></div>
    <div class="cost-row"><span class="cost-label">ECM post-tax contributions</span><span class="cost-val neg">−${fmtAUD(totals.ecm)}</span></div>
    <hr class="cost-div"/>
    <div class="cost-row cost-total">
      <span class="cost-label">Net financial benefit vs. paying cash from after-tax income</span>
      <span class="cost-val ${isWorth ? 'pos' : 'neg'}">${isWorth ? '+' : ''}${fmtAUD(net)}</span>
    </div>
    <div class="cost-note">
      ${isWorth
        ? `<span style="color:var(--accent)">✓ Tax and GST savings outweigh the lending cost.</span> At ${fmtPct(inp.annualApr)} APR the novated lease beats buying with after-tax cash by ${fmtAUD(net)}.`
        : `<span style="color:var(--danger)">⚠ The lending cost + ECM exceed the tax saving.</span> At ${fmtPct(inp.annualApr)} APR, consider negotiating a lower rate — or switch to an EV to eliminate ECM.`
      }${totals.ecm > 0 ? ` ECM post-tax of ${fmtAUD(totals.ecm)} is required because FBT applies.` : ''}
    </div>`;
}

/* ══ RENDER ALERTS ══ */
function renderAlerts(inp, fbt) {
  const box  = document.getElementById('alertsBox');
  const msgs = [];
  if (inp.vtype === 'phev') msgs.push({ t: 'danger', h: `<b>⛔ PHEV — FBT exemption ended 1 April 2025.</b> PHEVs now attract the full 20% statutory rate. ECM post-tax contributions are required and reduce the overall benefit significantly.` });
  if (inp.vtype === 'ice')  msgs.push({ t: 'info',   h: `<b>ℹ Petrol/Diesel — full 20% FBT statutory rate.</b> ECM post-tax contributions are required to zero out employer FBT. Tax savings still exist from salary sacrifice but are partially offset.` });
  if (inp.vtype === 'ev' && inp.carPrice > inp.lct)
    msgs.push({ t: 'danger', h: `<b>⛔ EV exceeds LCT threshold (${fmtAUD(inp.lct)}).</b> Not eligible for any FBT discount. Full 20% applies — ECM required.` });
  else if (inp.vtype === 'ev' && inp.carPrice > inp.fbtCap && inp.startDate < inp.p2)
    msgs.push({ t: 'danger', h: `<b>⚠ EV in $${(inp.fbtCap/1000).toFixed(0)}k–LCT band before 1 Apr 2027.</b> No FBT discount exists for this band in Phase 1. Waiting until 1 Apr 2027 would unlock the 25% Phase 2 discount.` });
  else if (inp.vtype === 'ev' && inp.carPrice > inp.fbtCap)
    msgs.push({ t: 'warn',   h: `<b>⚠ EV above $${(inp.fbtCap/1000).toFixed(0)}k cap.</b> From 1 Apr 2027 this vehicle qualifies for a 25% FBT discount (${fmtPct(inp.postRate)} statutory rate). ECM contributions still required.` });

  box.style.display = msgs.length ? 'flex' : 'none';
  box.innerHTML = msgs.map(m => `<div class="alert ${m.t}">${m.h}</div>`).join('');
}

/* ══ RENDER SAVINGS CLARIFICATION NOTE ══ */
function renderSavingsNote(inp, totals) {
  const el = document.getElementById('savingsNote');
  el.style.display = 'block';
  el.innerHTML = `<strong style="color:var(--accent)">How Total Savings is calculated:</strong>
    Income tax saved (${fmtAUD(totals.taxSaved)}) + GST saving on vehicle purchase (${fmtAUD(totals.gstSaveP)}) + GST saving on running costs (${fmtAUD(totals.gstRun)}) = <strong>${fmtAUD(totals.totalSavings)}</strong>. &nbsp;·&nbsp;
    The "take-home pay impact" shows how much less you receive each ${FREQ_LABEL[payFreq].toLowerCase()} — it equals the pre-tax deduction after your income tax saving, ${totals.ecm > 0 ? 'plus the ECM post-tax contribution.' : 'with no ECM (fully FBT-exempt).'}`;
}

/* ══ RENDER VERDICT ══ */
function renderVerdict(rA, rB, firstYrs, secYrs) {
  const el    = document.getElementById('verdictText');
  const delta = Math.abs(rA.totals.totalSavings - rB.totals.totalSavings);
  const diff  = rA.years[0].regime !== rB.years.find(y => y.arrLabel.includes('2 of 2'))?.regime;
  if (delta < 50) {
    el.innerHTML = `<strong>⚖ Near-equivalent.</strong> Both structures produce almost the same result (Δ < $50). The continuous lease is simpler — one application, one set of establishment fees, no mid-term residual to refinance.`;
    return;
  }
  if (rA.totals.totalSavings > rB.totals.totalSavings) {
    el.innerHTML = `<span class="green"><strong>Option A (${rA.years.length}yr continuous)</strong></span> saves <strong>${fmtAUD(delta)}</strong> more than the ${firstYrs}+${secYrs}yr split.`
      + (diff ? ` The renewal falls into a different (worse) FBT phase, increasing ECM post-tax costs.` : ` Both arrangements land in the same FBT phase; the advantage is structural — avoiding a second set of finance fees and mid-term residual refinancing.`);
  } else {
    el.innerHTML = `<span class="amber"><strong>Option B (${firstYrs}yr + ${secYrs}yr split)</strong></span> saves <strong>${fmtAUD(delta)}</strong> more. This typically occurs when the renewal date lands in a more favourable policy phase. Verify the renewal FBT regime applies as expected.`;
  }
}

/* ══ UPDATE SPLIT DROPDOWN ══ */
function updateSplitOpts(totalTerm) {
  const sel  = document.getElementById('splitSelect');
  const prev = sel.value;
  sel.innerHTML = '';
  if (totalTerm <= 1) {
    sel.innerHTML = '<option value="na" disabled>N/A — 1yr cannot be split</option>';
    return;
  }
  for (let f = 1; f < totalTerm; f++) {
    const opt = document.createElement('option');
    opt.value       = `${f}+${totalTerm - f}`;
    opt.textContent = `${f} yr + ${totalTerm - f} yr`;
    sel.appendChild(opt);
  }
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
}

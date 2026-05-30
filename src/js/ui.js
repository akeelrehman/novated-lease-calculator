/* ══ POLICY SANDBOX COLLAPSE ══ */
function toggleSandbox() {
  const body    = document.getElementById('sandboxBody');
  const chevron = document.getElementById('sandboxChevron');
  const isOpen  = !body.classList.contains('collapsed');
  body.classList.toggle('collapsed', isOpen);
  chevron.textContent = isOpen ? '▶' : '▼';
}

/* ══ VIEW SWITCHING ══ */
function switchView(view) {
  document.getElementById('viewSingle').classList.toggle('hidden', view !== 'single');
  document.getElementById('viewCompare').classList.toggle('hidden', view !== 'compare');
  document.getElementById('tabA').classList.toggle('active', view === 'single');
  document.getElementById('tabB').classList.toggle('active', view === 'compare');
}

/* ══ PAYMENT FREQUENCY ══ */
function setFreq(freq) {
  payFreq = freq;
  ['weekly', 'fortnightly', 'monthly'].forEach(f =>
    document.getElementById(`freq-${f}`).classList.toggle('active', f === freq)
  );
  runEngine();
}

/* ══ VEHICLE TYPE ══ */
function setVehicleType(vtype) {
  vehicleType = vtype;
  const styles = { ev: 'vt-ev', phev: 'vt-phev', ice: 'vt-ice' };
  ['ev', 'phev', 'ice'].forEach(t => {
    const btn = document.getElementById(`vt-${t}`);
    btn.className = 'vtype-btn' + (t === vtype ? ` ${styles[t]}` : '');
  });
  const lbl  = document.getElementById('fuelLabel');
  const note = document.getElementById('vtypeNote');
  if (vtype === 'ev') {
    lbl.textContent  = 'Electricity / Charging ($)';
    note.textContent = 'BEVs & hydrogen fuel-cell vehicles: eligible for FBT exemption under the 2026 Budget phase schedule.';
    note.style.color = '';
  } else {
    lbl.textContent  = 'Fuel ($)';
    note.textContent = vtype === 'phev'
      ? 'PHEVs lost the FBT exemption on 1 April 2025 and now attract the full 20% statutory rate (ECM required).'
      : 'Petrol/diesel vehicles always attract the full 20% FBT statutory rate. ECM post-tax contributions are required.';
    note.style.color = 'var(--danger)';
  }
  runEngine();
}

/* ══ THEME ══ */
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const icon = document.getElementById('themeIcon');
  const lbl  = document.getElementById('themeLabel');
  if (theme === 'light') {
    icon.textContent = '🌙';
    lbl.textContent  = 'Dark mode';
  } else {
    icon.textContent = '☀️';
    lbl.textContent  = 'Light mode';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('theme', next);
}

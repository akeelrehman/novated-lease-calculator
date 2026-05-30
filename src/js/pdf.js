/* ══ PDF GENERATION — programmatic, clean, portrait A4 ══
   Order: Config summary → KPI snapshot → Option A full →
          Cost breakdown → [if split selected] Variance
          analysis → Winner → Loser → Disclaimer
*/
function generatePDF() {
  const btn = document.getElementById('pdfBtn');
  btn.textContent = '⏳ Generating…';
  btn.disabled = true;
  // Small delay so the browser can repaint the button state
  setTimeout(() => {
    try { _buildPDF(); }
    catch (e) { console.error(e); }
    finally {
      btn.textContent = '⬇ Download PDF Report';
      btn.disabled = false;
    }
  }, 60);
}

function _buildPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297;  // A4 portrait
  const ML = 14, MR = 14;    // left/right margins
  const CW = PW - ML - MR;   // content width = 182mm
  let y = 0;                  // current Y cursor

  // Colour palette (dark theme approximated in print colours)
  const C = {
    bg:      [13,  15,  20 ],
    surface: [19,  22,  29 ],
    raised:  [26,  30,  40 ],
    border:  [37,  42,  56 ],
    text:    [232, 236, 244],
    text2:   [139, 145, 168],
    text3:   [85,  92,  117],
    accent:  [74,  222, 128],
    warn:    [251, 191, 36 ],
    danger:  [248, 113, 113],
    blue:    [96,  165, 250],
    white:   [255, 255, 255],
  };

  const inp      = collectInp();
  const rA       = runScenario(inp, 'continuous', null);
  const splitVal = document.getElementById('splitSelect').value || '';
  const hasSplit = splitVal && splitVal !== 'na';
  const firstYrs = hasSplit ? parseInt(splitVal.split('+')[0]) : null;
  const rB       = hasSplit ? runScenario(inp, 'split', firstYrs) : null;
  const fbt      = getFbt(inp.startDate, inp.carPrice, inp.vtype, inp.fbtCap, inp.lct, inp.p2, inp.p3, inp.postRate);
  const freq     = FREQ_LABEL[payFreq];
  const startStr = inp.startDate.toLocaleDateString('en-AU');
  const endStr   = addMonths(inp.startDate, inp.totalTerm * 12).toLocaleDateString('en-AU');

  // ── Inner helpers ──

  function newPage() {
    doc.addPage();
    y = 14;
    doc.setFontSize(7); doc.setTextColor(...C.text3);
    doc.text('Novated Lease Calculator — Australia 2026', ML, 8);
    doc.text(`Generated ${new Date().toLocaleDateString('en-AU')}`, PW - MR, 8, { align: 'right' });
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    doc.line(ML, 10, PW - MR, 10);
  }

  function checkY(needed) {
    if (y + needed > PH - 14) newPage();
  }

  function sectionHeading(title) {
    checkY(12);
    doc.setFillColor(...C.raised);
    doc.roundedRect(ML, y, CW, 8, 1, 1, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.accent);
    doc.text(title, ML + 4, y + 5.5);
    y += 11;
  }

  function kpiRow(items) {
    const n = items.length;
    const w = CW / n;
    checkY(18);
    items.forEach((item, i) => {
      const x = ML + i * w;
      doc.setFillColor(...C.surface);
      doc.roundedRect(x, y, w - 2, 16, 1, 1, 'F');
      doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
      doc.roundedRect(x, y, w - 2, 16, 1, 1, 'S');
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text3);
      doc.text(item.label.toUpperCase(), x + 3, y + 4.5);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(item.color || C.accent));
      doc.text(item.value, x + 3, y + 11);
      if (item.sub) {
        doc.setFontSize(5.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.text3);
        doc.text(item.sub, x + 3, y + 14.5, { maxWidth: w - 5 });
      }
    });
    y += 19;
  }

  function residualChips(residuals) {
    if (!residuals.length) return;
    checkY(14);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text3);
    doc.text('BALLOON PAYMENT(S) DUE AT END OF LEASE', ML, y);
    y += 3;
    const w = CW / residuals.length;
    residuals.forEach((r, i) => {
      const x = ML + i * w;
      doc.setFillColor(...C.raised);
      doc.roundedRect(x, y, w - 3, 12, 1, 1, 'F');
      doc.setFontSize(5.5); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text3);
      doc.text(r.label.toUpperCase(), x + 3, y + 4);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.warn);
      doc.text(fmtAUD(r.value), x + 3, y + 9);
    });
    y += 15;
  }

  function ledgerTable(years) {
    const tableData = years.map(yr => [
      `Yr ${yr.yearIndex}\n${yr.arrLabel}`,
      fmtP(yr.leasePmt),
      fmtP(yr.leasePmt + yr.annualRun / 12),
      fmtP(yr.takeHomeImpact / 12),
      fmtAUD(yr.ecm),
      yr.regime === 'exempt' ? 'Exempt 0%' : yr.regime === 'partial' ? 'Partial 15%' : 'Full 20%',
      fmtAUD(yr.taxSaved),
    ]);

    doc.autoTable({
      startY: y,
      margin: { left: ML, right: MR },
      head: [[
        'Year',
        `${freq} Finance`,
        `${freq} Total`,
        `${freq} Take-Home Impact`,
        'ECM Post-Tax/yr',
        'FBT Status',
        'Tax Saved/yr',
      ]],
      body: tableData,
      styles: {
        fontSize: 7.5, font: 'helvetica', cellPadding: 2.5,
        overflow: 'linebreak', fillColor: C.surface,
        textColor: C.text2, lineColor: C.border, lineWidth: 0.2,
      },
      headStyles: { fillColor: C.raised, textColor: C.text3, fontSize: 6.5, fontStyle: 'bold', halign: 'left' },
      columnStyles: {
        0: { cellWidth: 28, textColor: C.text },
        1: { cellWidth: 24, textColor: C.blue,   halign: 'right' },
        2: { cellWidth: 24, textColor: C.blue,   halign: 'right' },
        3: { cellWidth: 28, textColor: C.warn,   halign: 'right' },
        4: { cellWidth: 26,                      halign: 'right' },
        5: { cellWidth: 22,                      halign: 'center' },
        6: { cellWidth: 30, textColor: C.accent, halign: 'right' },
      },
      alternateRowStyles: { fillColor: C.bg },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const v = data.cell.raw;
          if (v === 'Exempt 0%')   data.cell.styles.textColor = C.accent;
          else if (v === 'Partial 15%') data.cell.styles.textColor = C.warn;
          else                     data.cell.styles.textColor = C.danger;
        }
      },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  function summaryKpiBar(totals, years) {
    const exGST    = inp.carPrice / 1.1;
    const resPct   = ATO_RES[inp.totalTerm] ?? (0.75 - 0.75 / 8 * inp.totalTerm);
    const interest = years[0].leasePmt * 12 * inp.totalTerm - (exGST - exGST * resPct);
    const net      = totals.totalSavings - Math.max(0, interest) - totals.ecm;
    kpiRow([
      { label: 'Total Savings',       value: fmtAUD(totals.totalSavings), sub: 'Tax + GST purchase + GST running', color: C.accent },
      { label: 'Income Tax Saved',    value: fmtAUD(totals.taxSaved),     sub: 'From pre-tax sacrifice',           color: C.accent },
      { label: 'ECM Post-Tax Total',  value: fmtAUD(totals.ecm),          sub: 'Required when FBT applies',        color: totals.ecm > 0 ? C.warn : C.text3 },
      { label: 'Net Benefit vs Cash', value: fmtAUD(net),                 sub: 'After interest & ECM costs',       color: net >= 0 ? C.accent : C.danger },
    ]);
  }

  function costBreakdownTable(result) {
    const { totals, years } = result;
    const exGST    = inp.carPrice / 1.1;
    const resPct   = ATO_RES[inp.totalTerm] ?? (0.75 - 0.75 / 8 * inp.totalTerm);
    const resVal   = exGST * resPct;
    const interest = years[0].leasePmt * 12 * inp.totalTerm - (exGST - resVal);
    const net      = totals.totalSavings - Math.max(0, interest) - totals.ecm;
    const isWorth  = net >= 0;

    const rows = [
      ['Income tax saved',               fmtAUD(totals.taxSaved),          'SAVING'  ],
      ['GST saving on vehicle purchase', fmtAUD(totals.gstSaveP),          'SAVING'  ],
      ['GST saving on running costs',    fmtAUD(totals.gstRun),            'SAVING'  ],
      ['Finance interest cost',          `−${fmtAUD(Math.max(0,interest))}`,'COST'   ],
      ['ECM post-tax contributions',     `−${fmtAUD(totals.ecm)}`,         'COST'    ],
      ['Net financial benefit vs cash',  fmtAUD(net),                      isWorth ? 'POSITIVE' : 'NEGATIVE'],
    ];

    doc.autoTable({
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Item', 'Amount', '']],
      body: rows,
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 2.5, fillColor: C.surface, textColor: C.text2, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.raised, textColor: C.text3, fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 22, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const tag = data.row.raw[2];
          if (data.column.index === 1) {
            if (tag === 'SAVING')    data.cell.styles.textColor = C.accent;
            else if (tag === 'COST') data.cell.styles.textColor = C.danger;
            else if (tag === 'POSITIVE') { data.cell.styles.textColor = C.accent; data.cell.styles.fontSize = 9; }
            else { data.cell.styles.textColor = C.danger; data.cell.styles.fontSize = 9; }
          }
          if (data.column.index === 2) data.cell.styles.textColor = C.text3;
          if (data.row.index === 3 || data.row.index === 5) {
            data.cell.styles.lineWidths = { top: 0.5 };
            data.cell.styles.lineColor = C.border;
          }
        }
      },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  function verdictBlock(rA, rB, firstYrs, secYrs) {
    const delta = Math.abs(rA.totals.totalSavings - rB.totals.totalSavings);
    const aWins = rA.totals.totalSavings >= rB.totals.totalSavings;
    const diff  = rA.years[0].regime !== rB.years.find(yr => yr.arrLabel.includes('2 of 2'))?.regime;

    let text;
    if (delta < 50) {
      text = 'Both structures produce nearly identical total savings (difference < $50). The continuous lease is simpler — one application, one set of establishment fees, no mid-term residual refinancing.';
    } else if (aWins) {
      text = `Option A (${rA.years.length}yr continuous) saves ${fmtAUD(delta)} more than the ${firstYrs}+${secYrs}yr split.`
           + (diff ? ' The renewal falls into a different (worse) FBT phase, increasing ECM post-tax costs.'
                   : ' Both arrangements land in the same FBT phase; the advantage is structural — one set of finance fees, no mid-term residual refinancing.');
    } else {
      text = `Option B (${firstYrs}yr + ${secYrs}yr split) saves ${fmtAUD(delta)} more. This typically occurs when the renewal date lands in a more favourable policy phase. Verify the renewal FBT regime applies as expected.`;
    }

    checkY(20);
    doc.setFillColor(...C.raised);
    doc.roundedRect(ML, y, CW, 16, 1.5, 1.5, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text3);
    doc.text('Δ VARIANCE ANALYSIS', ML + 4, y + 5);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text2);
    const lines = doc.splitTextToSize(text, CW - 8);
    doc.text(lines, ML + 4, y + 10);
    y += Math.max(18, 8 + lines.length * 4);
  }

  // ═══════════════════════════════════════
  // PAGE 1 — Header + Config + KPI summary
  // ═══════════════════════════════════════
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PW, PH, 'F');

  y = 14;
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text('Novated Lease Calculator', ML, y);
  y += 7;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text2);
  doc.text('Australia 2026  ·  ATO Compliant  ·  General information only — not financial advice', ML, y);
  y += 4;
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  y += 7;

  sectionHeading('Configuration Summary');
  const vtypeStr = inp.vtype === 'ev' ? 'Electric BEV' : inp.vtype === 'phev' ? 'Plug-in Hybrid' : 'Petrol/Diesel';
  const configRows = [
    ['Vehicle Type',   vtypeStr,                    'Gross Salary',          fmtAUD(inp.salary)      ],
    ['Driveaway Price', fmtAUD(inp.carPrice),        'Taxable Income',        fmtAUD(inp.taxableIncome)],
    ['Lease Term',     `${inp.totalTerm} years`,     'Marginal Tax Rate',     fmtPct(inp.mtr)         ],
    ['Lease Start',    startStr,                     'Finance APR',           fmtPct(inp.annualApr)   ],
    ['FBT Status',     fbt.label,                   'Annual Running',         fmtAUD(inp.annualRun)   ],
    ['LCT Threshold',  fmtAUD(inp.lct),             'FBT Cap (full exempt)', fmtAUD(inp.fbtCap)      ],
  ];
  doc.autoTable({
    startY: y,
    margin: { left: ML, right: MR },
    body: configRows,
    styles: { fontSize: 8, font: 'helvetica', cellPadding: 2.5, fillColor: C.surface, textColor: C.text, lineColor: C.border, lineWidth: 0.2 },
    columnStyles: {
      0: { textColor: C.text3, fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 52, fontStyle: 'bold' },
      2: { textColor: C.text3, fontStyle: 'bold', cellWidth: 38 },
      3: { cellWidth: 54, fontStyle: 'bold' },
    },
    theme: 'grid',
    alternateRowStyles: { fillColor: C.raised },
  });
  y = doc.lastAutoTable.finalY + 6;

  sectionHeading('Key Metrics Snapshot');
  const thMonthly = rA.years[0].takeHomeImpact / 12;
  kpiRow([
    { label: 'FBT Status',              value: fbt.label,                                              sub: fbt.desc.substring(0, 40) + '…', color: fbt.regime === 'exempt' ? C.accent : fbt.regime === 'partial' ? C.warn : C.danger },
    { label: `${freq} Finance Payment`, value: fmtP(rA.years[0].leasePmt),                            sub: 'Pure lease repayment (ex-running)', color: C.blue  },
    { label: `${freq} Pre-Tax Total`,   value: fmtP(rA.years[0].leasePmt + inp.annualRun / 12),        sub: 'Finance + running costs',          color: C.blue  },
    { label: `${freq} Take-Home Impact`,value: fmtP(thMonthly),                                        sub: 'Actual reduction to net pay',      color: C.warn  },
  ]);
  kpiRow([
    { label: 'Total Savings',         value: fmtAUD(rA.totals.totalSavings), sub: `Tax ${fmtAUD(rA.totals.taxSaved)} + GST purchase ${fmtAUD(rA.totals.gstSaveP)} + GST running ${fmtAUD(rA.totals.gstRun)}`, color: C.accent },
    { label: 'Income Tax Saved',      value: fmtAUD(rA.totals.taxSaved),     sub: 'From pre-tax salary sacrifice', color: C.accent },
    { label: 'GST Saving (Purchase)', value: fmtAUD(inp.carPrice - inp.carPrice / 1.1), sub: 'Employer claims input tax credit', color: C.accent },
    { label: 'Marginal Tax Rate',     value: fmtPct(inp.mtr),                sub: 'Incl. Medicare if applicable', color: C.warn },
  ]);

  // ═══════════════════════════════════════
  // OPTION A — Full Continuous Lease
  // ═══════════════════════════════════════
  newPage();
  sectionHeading(`Option A — ${inp.totalTerm}-Year Continuous Lease`);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text2);
  doc.text(`${startStr} → ${endStr}  ·  ${fmtPct(inp.annualApr)} APR  ·  Arrangement 1 of 1 (unbroken)`, ML, y);
  y += 7;

  residualChips(rA.residuals);
  summaryKpiBar(rA.totals, rA.years);
  ledgerTable(rA.years);

  sectionHeading('Is the Lending Cost Eating Your Tax Saving?');
  costBreakdownTable(rA);

  // ═══════════════════════════════════════
  // OPTION B — Split Lease (if selected)
  // ═══════════════════════════════════════
  if (hasSplit && rB) {
    const secYrs   = inp.totalTerm - firstYrs;
    const aWins    = rA.totals.totalSavings >= rB.totals.totalSavings;
    const renewStr = addMonths(inp.startDate, firstYrs * 12).toLocaleDateString('en-AU');

    newPage();
    sectionHeading(`Split Lease Comparison — ${firstYrs}yr + ${secYrs}yr Structure`);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text2);
    doc.text(`Split: Arrangement 1 starts ${startStr} · Renewal (new arrangement) on ${renewStr}`, ML, y);
    y += 4;
    doc.setFontSize(7.5); doc.setTextColor(...C.warn);
    doc.text('A renewal is a new arrangement — it captures the FBT rate active at the renewal date (no grandfathering from the original start).', ML, y, { maxWidth: CW });
    y += 8;

    verdictBlock(rA, rB, firstYrs, secYrs);
    y += 2;

    const winner = aWins
      ? { result: rA, label: `Option A — ${inp.totalTerm}yr Continuous (BETTER OPTION)` }
      : { result: rB, label: `Option B — ${firstYrs}yr + ${secYrs}yr Split (BETTER OPTION)` };
    const loser  = aWins
      ? { result: rB, label: `Option B — ${firstYrs}yr + ${secYrs}yr Split` }
      : { result: rA, label: `Option A — ${inp.totalTerm}yr Continuous` };

    checkY(10);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.accent);
    doc.text(winner.label, ML, y);
    y += 6;
    residualChips(winner.result.residuals);
    summaryKpiBar(winner.result.totals, winner.result.years);
    ledgerTable(winner.result.years);

    checkY(10);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text2);
    doc.text(loser.label, ML, y);
    y += 6;
    residualChips(loser.result.residuals);
    summaryKpiBar(loser.result.totals, loser.result.years);
    ledgerTable(loser.result.years);
  }

  // ═══════════════════════════════════════
  // DISCLAIMER (always last)
  // ═══════════════════════════════════════
  checkY(35);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text3);
  doc.text('Disclaimer & Sources', ML, y); y += 4;
  doc.setFont('helvetica', 'normal');
  const disclaimer = `General information only — not financial or tax advice. Always consult a registered tax agent.\n\nSources: ATO FBTAA 1986 s.7 (statutory formula) · TD 93/142 (residual values) · Budget 2026-27 Paper No.2 — Electric Car Discount · ATO Income Tax Rates 2026-27 · AusTax.tools FBT Electric Car Discount Reform May 2026.\n\nKey assumptions: FBT base = driveaway price incl. GST. Stamp duty & rego excluded. Running costs pre-tax when FBT-exempt. ECM post-tax = car base × statutory rate. Residuals per TD 93/142 (8-yr effective life). Tax brackets: 2026-27 legislated rates. Split renewal = new arrangement. PHEV: exemption ended 1 Apr 2025. Total Savings = income tax saved + GST on vehicle + GST on running costs. Take-home impact = pre-tax deduction × (1 − MTR) + ECM.`;
  const dLines = doc.splitTextToSize(disclaimer, CW);
  doc.setTextColor(...C.text3);
  doc.text(dLines, ML, y);

  // Save
  const dateStr = inp.startDate.toISOString().slice(0, 10);
  doc.save(`Novated_Lease_Report_${dateStr}.pdf`);
}

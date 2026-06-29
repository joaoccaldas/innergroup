import { ACCOUNT_HIERARCHY } from '../model.js';
import { renderBar, renderLine } from '../charts.js';
import { money, percent, annual, escapeHtml } from '../ui.js';

let activeTab = 'pnl';
let granularity = 'monthly';

function periods(months) {
  if (granularity === 'annual') return ['Helår'];
  if (granularity === 'quarterly') return ['Q1','Q2','Q3','Q4'];
  return months;
}

function aggregate(values, pointInTime = false) {
  const source = values || Array(12).fill(0);
  if (granularity === 'annual') return [pointInTime ? Number(source[11] || 0) : annual(source)];
  if (granularity === 'quarterly') {
    return Array.from({ length: 4 }, (_, quarter) => {
      const slice = source.slice(quarter * 3, quarter * 3 + 3);
      return pointInTime ? Number(slice[2] || 0) : annual(slice);
    });
  }
  return source;
}

function cells(values, pointInTime = false) {
  return aggregate(values, pointInTime).map(value => `<td class="${value < 0 ? 'bad' : ''}">${money(value)}</td>`).join('');
}

function pnlTable(model, months) {
  const header = periods(months);
  const rows = [];
  ACCOUNT_HIERARCHY.forEach(item => {
    const values = model.categories[item.key] || model.pnl[item.key] || Array(12).fill(0);
    const rowClass = item.children ? 'row-subtotal' : item.formula ? 'row-total' : '';
    rows.push(`<tr class="${rowClass}" data-group="${item.key}"><td>${item.children ? `<button class="expand-button" data-toggle-group="${item.key}" aria-label="Expandera">▾</button>` : ''}${escapeHtml(item.label)}</td>${cells(values)}<td>${money(annual(values))}</td></tr>`);
    if (item.children) {
      item.children.forEach(child => {
        const childValues = model.categories[child.key] || Array(12).fill(0);
        rows.push(`<tr data-parent="${item.key}"><td style="padding-left:40px">${escapeHtml(child.label)}</td>${cells(childValues)}<td>${money(annual(childValues))}</td></tr>`);
      });
    }
  });
  return `<div class="table-wrap"><table><thead><tr><th>Resultaträkning</th>${header.map(label => `<th>${label}</th>`).join('')}<th>Helår</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function cashTable(model, months) {
  const rows = [
    ['Kundinbetalningar inkl. moms', model.cashFlow.receipts, false],
    ['Leverantörsbetalningar inkl. moms', model.cashFlow.supplierPayments.map(value => -value), false],
    ['Löner och personal', model.cashFlow.payrollPayments.map(value => -value), false],
    ['Momsbetalningar', model.cashFlow.vatPayments.map(value => -value), false],
    ['Skattebetalningar', model.cashFlow.taxPayments.map(value => -value), false],
    ['Periodens kassaflöde', model.cashFlow.netCashFlow, false],
    ['Utgående kassa', model.cashFlow.closingCash, true]
  ];
  return `<div class="table-wrap"><table><thead><tr><th>Kassaflöde</th>${periods(months).map(label => `<th>${label}</th>`).join('')}<th>Helår / årsslut</th></tr></thead><tbody>${rows.map(([label, values, point]) => `<tr class="${label.includes('Utgående') || label.includes('Periodens') ? 'row-total' : ''}"><td>${label}</td>${cells(values, point)}<td>${money(point ? values[11] : annual(values))}</td></tr>`).join('')}</tbody></table></div>`;
}

function balanceTable(model, months) {
  const rows = [
    ['TILLGÅNGAR', null, true],
    ['Kassa och bank', model.balance.cash],
    ['Kundfordringar', model.balance.accountsReceivable],
    ['Upplupen intäkt', model.balance.contractAsset],
    ['Anläggningstillgångar', model.balance.fixedAssets],
    ['Övriga tillgångar', model.balance.otherAssets],
    ['Summa tillgångar', model.balance.totalAssets, true],
    ['EGET KAPITAL OCH SKULDER', null, true],
    ['Leverantörsskulder', model.balance.accountsPayable],
    ['Förutbetalda intäkter', model.balance.deferredRevenue],
    ['Momsskuld', model.balance.vatLiability],
    ['Skatteskuld', model.balance.taxLiability],
    ['Lån', model.balance.loans],
    ['Övriga skulder', model.balance.otherLiabilities],
    ['Eget kapital', model.balance.equity],
    ['Summa eget kapital och skulder', model.balance.totalEquityLiabilities, true],
    ['Balanskontroll', model.balance.check, true]
  ];
  return `<div class="table-wrap"><table><thead><tr><th>Balansräkning</th>${periods(months).map(label => `<th>${label}</th>`).join('')}<th>Årsslut</th></tr></thead><tbody>${rows.map(([label, values, total]) => values ? `<tr class="${total ? 'row-total' : ''}"><td>${label}</td>${cells(values, true)}<td>${money(values[11])}</td></tr>` : `<tr class="row-subtotal"><td colspan="${periods(months).length + 2}">${label}</td></tr>`).join('')}</tbody></table></div>`;
}

function analysisPanel(model, scenarios, state) {
  const averageProjectContribution = state.projects.length
    ? state.projects.reduce((total, project) => total + (Number(project.price || 0) - Number(project.directCostPerUnit || 0)), 0) / state.projects.length
    : 0;
  const projectGap = averageProjectContribution > 0 ? model.analytics.revenueGapToBreakEven / averageProjectContribution : null;
  return `
    <div class="grid kpis">
      <article class="card"><span class="kpi-label">Break-even intäkt</span><div class="kpi-value">${money(model.analytics.breakEvenRevenue, true)}</div><span class="kpi-delta">Täckningsgrad ${percent(model.analytics.contributionMargin)}</span></article>
      <article class="card"><span class="kpi-label">Intäktsgap</span><div class="kpi-value">${money(model.analytics.revenueGapToBreakEven, true)}</div><span class="kpi-delta">${projectGap === null ? 'Lägg till projektpriser för volymanalys' : `${Math.ceil(projectGap)} genomsnittsprojekt`}</span></article>
      <article class="card"><span class="kpi-label">Lägsta kassa</span><div class="kpi-value ${model.analytics.minCash < 0 ? 'bad' : 'good'}">${money(model.analytics.minCash, true)}</div><span class="kpi-delta">Månad ${model.analytics.minCashMonth + 1}</span></article>
      <article class="card"><span class="kpi-label">Första positiva kassaflödesmånad</span><div class="kpi-value">${model.analytics.cashPositiveMonth >= 0 ? model.analytics.cashPositiveMonth + 1 : '–'}</div><span class="kpi-delta">Efter senast stängda period</span></article>
    </div>
    <section class="grid two section">
      <article class="card"><div class="card-header"><div><h3>Resultat per scenario</h3><p>Helårsintäkt och EBIT.</p></div></div><div class="chart-box"><canvas id="analysis-scenario"></canvas></div></article>
      <article class="card"><div class="card-header"><div><h3>Likviditetsrisk</h3><p>Utgående kassa månad för månad.</p></div></div><div class="chart-box"><canvas id="analysis-cash"></canvas></div></article>
    </section>
  `;
}

function compliancePanel(context) {
  const { compliance, state, model } = context;
  const checklist = state.compliance.checklist;
  const labels = {
    bankReconciled: 'Bank avstämd', receivablesReviewed: 'Kundfordringar granskade', payablesReviewed: 'Leverantörsskulder granskade',
    vatReconciled: 'Moms avstämd', payrollReconciled: 'Lön och arbetsgivaravgifter avstämda', fixedAssetsReviewed: 'Anläggningsregister granskat',
    accrualsReviewed: 'Periodiseringar granskade', equityReviewed: 'Eget kapital granskat', taxReviewed: 'Skatt beräknad',
    boardApproved: 'Styrelsen har godkänt', signed: 'Årsredovisningen signerad', filed: 'Inlämnad'
  };
  return `
    <div class="grid kpis">
      <article class="card"><span class="kpi-label">Inlämningsdeadline</span><div class="kpi-value">${compliance.deadline.toLocaleDateString('sv-SE')}</div><span class="kpi-delta ${compliance.daysRemaining < 30 ? 'bad' : ''}">${compliance.daysRemaining} dagar kvar</span></article>
      <article class="card"><span class="kpi-label">Total beredskap</span><div class="kpi-value">${Math.round(compliance.overallScore * 100)}%</div><span class="kpi-delta">K2-prototyp</span></article>
      <article class="card"><span class="kpi-label">Balanskontroll</span><div class="kpi-value ${model.dataQuality.balanceCheck >= 1 ? 'bad' : 'good'}">${money(model.dataQuality.balanceCheck)}</div><span class="kpi-delta">Ska vara nära noll</span></article>
      <article class="card"><span class="kpi-label">Ej mappade rader</span><div class="kpi-value ${model.dataQuality.unmappedActualRows ? 'bad' : 'good'}">${model.dataQuality.unmappedActualRows}</div><span class="kpi-delta">Kräver kontomappning</span></article>
    </div>
    <section class="grid two section">
      <article class="card">
        <div class="card-header"><div><h3>Årsavslutschecklista</h3><p>Guidning för små K2-bolag. Detta ersätter inte professionell bedömning eller Bolagsverkets inlämning.</p></div></div>
        <div class="alert-list">${Object.entries(checklist).map(([key, checked]) => `<label class="alert ${checked ? 'good' : ''}"><input type="checkbox" data-checklist="${key}" ${checked ? 'checked' : ''}> ${escapeHtml(labels[key] || key)}</label>`).join('')}</div>
      </article>
      <article class="card">
        <div class="card-header"><div><h3>Automatiska kontroller</h3><p>Direkt från bokförings- och prognosmotorn.</p></div></div>
        <div class="alert-list">${compliance.checks.map(check => `<div class="alert ${check.ok ? 'good' : 'bad'}"><strong>${check.ok ? 'OK' : 'Kontrollera'}</strong><br>${escapeHtml(check.label)}</div>`).join('')}</div>
      </article>
    </section>
  `;
}

export function renderReports(context) {
  const { model, scenarios, months, state } = context;
  const panels = {
    pnl: pnlTable(model, months),
    cash: cashTable(model, months),
    balance: balanceTable(model, months),
    analysis: analysisPanel(model, scenarios, state),
    compliance: compliancePanel(context)
  };
  const html = `
    <section class="card">
      <div class="card-header"><div><h2>Rapportpaket ${model.year}</h2><p>${state.scenarios[model.scenarioKey].label}. Stängda månader visar utfall och öppna månader visar forecast.</p></div><span class="pill">Actual + Forecast</span></div>
      <div class="toolbar">
        <label class="field"><span>Periodvy</span><select id="report-granularity"><option value="monthly" ${granularity === 'monthly' ? 'selected' : ''}>Månad</option><option value="quarterly" ${granularity === 'quarterly' ? 'selected' : ''}>Kvartal</option><option value="annual" ${granularity === 'annual' ? 'selected' : ''}>Helår</option></select></label>
      </div>
      <div class="tabs">
        ${[['pnl','Resultat'],['cash','Kassaflöde'],['balance','Balans'],['analysis','Analys'],['compliance','Årsavslut']].map(([key, label]) => `<button class="tab ${activeTab === key ? 'active' : ''}" data-report-tab="${key}">${label}</button>`).join('')}
      </div>
      <div id="report-panel">${panels[activeTab]}</div>
    </section>
  `;
  return {
    html,
    afterRender() {
      document.getElementById('report-granularity')?.addEventListener('change', event => { granularity = event.target.value; context.rerender(); });
      document.querySelectorAll('[data-report-tab]').forEach(button => button.addEventListener('click', () => { activeTab = button.dataset.reportTab; context.rerender(); }));
      document.querySelectorAll('[data-toggle-group]').forEach(button => button.addEventListener('click', () => {
        const group = button.dataset.toggleGroup;
        const children = document.querySelectorAll(`[data-parent="${group}"]`);
        const hidden = [...children].every(row => row.style.display === 'none');
        children.forEach(row => { row.style.display = hidden ? '' : 'none'; });
        button.textContent = hidden ? '▾' : '▸';
      }));
      if (activeTab === 'analysis') {
        const labels = Object.keys(scenarios).map(key => state.scenarios[key].label);
        renderBar('analysis-scenario', labels, [
          { label: 'Intäkt', data: Object.values(scenarios).map(item => item.analytics.totalRevenue), backgroundColor: '#8ea493' },
          { label: 'EBIT', data: Object.values(scenarios).map(item => item.analytics.totalEBIT), backgroundColor: '#e8a77b' }
        ]);
        renderLine('analysis-cash', months, Object.entries(scenarios).map(([key, item]) => ({ label: state.scenarios[key].label, data: item.cashFlow.closingCash, borderColor: { downside:'#a94f45', mostLikely:'#b77932', upside:'#477a5b' }[key], tension:.3 })));
      }
      if (activeTab === 'compliance') {
        document.querySelectorAll('[data-checklist]').forEach(input => input.addEventListener('change', () => {
          context.mutate(draft => { draft.compliance.checklist[input.dataset.checklist] = input.checked; }, 'Checklista uppdaterad.');
        }));
      }
    }
  };
}

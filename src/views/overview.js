import { renderLine, renderBar, renderDoughnut, scenarioPalette } from '../charts.js';
import { money, percent, annual } from '../ui.js';

function alertMarkup(model) {
  const items = [];
  if (model.analytics.minCash < 0) {
    items.push(`<div class="alert bad"><strong>Finansieringsgap</strong><br>Kassan blir negativ i ${model.analytics.minCashMonth + 1}:a månaden. Lägsta nivå: ${money(model.analytics.minCash)}.</div>`);
  } else {
    items.push(`<div class="alert good"><strong>Likviditeten håller</strong><br>Lägsta prognostiserade kassa är ${money(model.analytics.minCash)}.</div>`);
  }
  if (model.analytics.revenueGapToBreakEven > 0) {
    items.push(`<div class="alert"><strong>Break-even gap</strong><br>Ytterligare ${money(model.analytics.revenueGapToBreakEven)} i intäkt behövs med nuvarande marginal.</div>`);
  } else {
    items.push(`<div class="alert good"><strong>Över break-even</strong><br>Planerad intäkt överstiger beräknad break-even.</div>`);
  }
  if (model.dataQuality.unmappedActualRows > 0) {
    items.push(`<div class="alert bad"><strong>Datakvalitet</strong><br>${model.dataQuality.unmappedActualRows} bokföringsrader saknar mappning.</div>`);
  }
  return items.join('');
}

export function renderOverview(context) {
  const { model, scenarios, state, compliance, months } = context;
  const revenueMix = [
    ['Program', annual(model.categories.programme || [])],
    ['Konsult', annual(model.categories.consulting || [])],
    ['Workshop', annual(model.categories.workshop || [])],
    ['Events', annual(model.categories.events || [])],
    ['Coaching', annual(model.categories.coaching || [])],
    ['Övrigt', annual(model.categories.otherRevenue || [])],
    ['Egen insats', annual(model.categories.egenInsats || [])]
  ].filter(item => item[1] !== 0);
  const closingCash = model.analytics.yearEndCash;
  const ebitMargin = model.analytics.totalRevenue ? model.analytics.totalEBIT / model.analytics.totalRevenue : 0;
  const filingDate = compliance.deadline.toLocaleDateString('sv-SE');
  const readiness = Math.round(compliance.overallScore * 100);

  const html = `
    <section class="hero">
      <div>
        <p class="eyebrow">INNER GROUP · ${model.year} · ${state.scenarios[model.scenarioKey].label.toUpperCase()}</p>
        <h2>Se hela ekonomin som en sammanhängande berättelse.</h2>
        <p>Utfallet, projekten och antagandena bygger automatiskt resultat, kassaflöde, balansräkning och årsavslutsberedskap.</p>
      </div>
      <div class="hero-callout">
        <span class="kpi-label">Beräknad helårsintäkt</span>
        <strong>${money(model.analytics.totalRevenue)}</strong>
        <span>${model.analytics.revenueGapToBreakEven > 0 ? `${money(model.analytics.revenueGapToBreakEven)} kvar till break-even` : 'Planen är över break-even'}</span>
      </div>
    </section>

    <section class="grid kpis">
      <article class="card"><span class="kpi-label">Intäkter</span><div class="kpi-value">${money(model.analytics.totalRevenue, true)}</div><span class="kpi-delta">Helår ${model.year}</span></article>
      <article class="card"><span class="kpi-label">EBIT</span><div class="kpi-value ${model.analytics.totalEBIT < 0 ? 'bad' : 'good'}">${money(model.analytics.totalEBIT, true)}</div><span class="kpi-delta">Marginal ${percent(ebitMargin)}</span></article>
      <article class="card"><span class="kpi-label">Utgående kassa</span><div class="kpi-value ${closingCash < 0 ? 'bad' : ''}">${money(closingCash, true)}</div><span class="kpi-delta">Min ${money(model.analytics.minCash, true)}</span></article>
      <article class="card"><span class="kpi-label">Årsavslutsberedskap</span><div class="kpi-value">${readiness}%</div><span class="kpi-delta">Deadline ${filingDate}</span></article>
    </section>

    <section class="grid two section">
      <article class="card">
        <div class="card-header"><div><h3>Resultatets utveckling</h3><p>Intäkt, bruttovinst och EBIT per månad.</p></div></div>
        <div class="chart-box"><canvas id="overview-pnl"></canvas></div>
      </article>
      <article class="card">
        <div class="card-header"><div><h3>Kassans utveckling</h3><p>Tre scenarier, fullt länkade till betalningstiming och kostnader.</p></div></div>
        <div class="chart-box"><canvas id="overview-cash"></canvas></div>
      </article>
    </section>

    <section class="grid two section">
      <article class="card">
        <div class="card-header"><div><h3>Intäktsmix</h3><p>Vilka affärer som bär planen.</p></div></div>
        <div class="chart-box"><canvas id="overview-mix"></canvas></div>
      </article>
      <article class="card">
        <div class="card-header"><div><h3>Vad behöver uppmärksamhet?</h3><p>Automatiska signaler från modellen.</p></div></div>
        <div class="alert-list">${alertMarkup(model)}</div>
      </article>
    </section>

    <section class="card section">
      <div class="card-header"><div><h3>Scenarioöversikt</h3><p>Worst, most likely och best case på samma ekonomiska motor.</p></div><button class="button soft" data-go-scenarios>Öppna känslighetsanalys</button></div>
      <div class="scenario-strip">
        ${Object.entries(scenarios).map(([key, item]) => `
          <article class="scenario-card" data-scenario="${key}">
            <strong>${state.scenarios[key].label}</strong>
            <div class="metric"><span>Intäkt</span><b>${money(item.analytics.totalRevenue, true)}</b></div>
            <div class="metric"><span>EBIT</span><b>${money(item.analytics.totalEBIT, true)}</b></div>
            <div class="metric"><span>Årsslutskassa</span><b>${money(item.analytics.yearEndCash, true)}</b></div>
          </article>
        `).join('')}
      </div>
    </section>
  `;

  return {
    html,
    afterRender() {
      renderLine('overview-pnl', months, [
        { label: 'Intäkt', data: model.pnl.revenue, borderColor: '#30483d', backgroundColor: 'rgba(48,72,61,.12)', tension: .35, fill: true },
        { label: 'Bruttovinst', data: model.pnl.grossProfit, borderColor: '#8ea493', tension: .35 },
        { label: 'EBIT', data: model.pnl.ebit, borderColor: '#e8a77b', tension: .35 }
      ]);
      const colors = scenarioPalette();
      renderLine('overview-cash', months, Object.entries(scenarios).map(([key, item]) => ({
        label: state.scenarios[key].label,
        data: item.cashFlow.closingCash,
        borderColor: colors[key],
        tension: .35,
        borderWidth: key === 'mostLikely' ? 3 : 2
      })));
      if (revenueMix.length) renderDoughnut('overview-mix', revenueMix.map(item => item[0]), revenueMix.map(item => item[1]));
      else renderBar('overview-mix', ['Ingen plan ännu'], [{ label: 'Intäkt', data: [0], backgroundColor: '#dce8de' }]);
      document.querySelector('[data-go-scenarios]')?.addEventListener('click', () => context.setView('scenarios'));
    }
  };
}

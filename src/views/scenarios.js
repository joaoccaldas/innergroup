import { renderBar, renderLine, scenarioPalette } from '../charts.js';
import { money, percent, escapeHtml } from '../ui.js';

function scenarioEditor(key, assumptions) {
  return `
    <form class="scenario-card" data-scenario-form="${key}" data-scenario="${key}">
      <strong>${escapeHtml(assumptions.label)}</strong>
      <label class="field"><span>Intäkt mot bas</span><input name="revenueMultiplier" type="number" step="0.01" min="0" value="${Number(assumptions.revenueMultiplier || 1)}"></label>
      <label class="field"><span>Direkt kostnad mot bas</span><input name="directCostMultiplier" type="number" step="0.01" min="0" value="${Number(assumptions.directCostMultiplier || 1)}"></label>
      <label class="field"><span>Fasta kostnader mot bas</span><input name="fixedCostMultiplier" type="number" step="0.01" min="0" value="${Number(assumptions.fixedCostMultiplier || 1)}"></label>
      <label class="field"><span>Extra kundförsening, mån</span><input name="collectionDelayMonths" type="number" step="1" min="0" max="12" value="${Number(assumptions.collectionDelayMonths || 0)}"></label>
      <label class="field"><span>Extra betalningsförsening, mån</span><input name="paymentDelayMonths" type="number" step="1" min="0" max="12" value="${Number(assumptions.paymentDelayMonths || 0)}"></label>
      <button class="button small" type="submit">Spara scenario</button>
    </form>
  `;
}

function scenarioComparison(state, scenarios) {
  return `
    <div class="scenario-strip">
      ${Object.entries(scenarios).map(([key, model]) => {
        const assumptions = state.scenarios[key];
        const ebitMargin = model.analytics.totalRevenue ? model.analytics.totalEBIT / model.analytics.totalRevenue : 0;
        return `
          <article class="scenario-card" data-scenario="${key}">
            <strong>${escapeHtml(assumptions.label)}</strong>
            <div class="metric"><span>Intäkt</span><b>${money(model.analytics.totalRevenue)}</b></div>
            <div class="metric"><span>EBIT</span><b class="${model.analytics.totalEBIT < 0 ? 'bad' : 'good'}">${money(model.analytics.totalEBIT)}</b></div>
            <div class="metric"><span>EBIT-marginal</span><b>${percent(ebitMargin)}</b></div>
            <div class="metric"><span>Årets resultat</span><b>${money(model.analytics.totalNetIncome)}</b></div>
            <div class="metric"><span>Lägsta kassa</span><b class="${model.analytics.minCash < 0 ? 'bad' : ''}">${money(model.analytics.minCash)}</b></div>
            <div class="metric"><span>Årsslutskassa</span><b>${money(model.analytics.yearEndCash)}</b></div>
            <div class="metric"><span>Eget kapital</span><b>${money(model.balance.equity[11])}</b></div>
            <div class="metric"><span>Break-even gap</span><b>${money(model.analytics.revenueGapToBreakEven)}</b></div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

export function renderScenarios(context) {
  const { state, scenarios, months } = context;
  const html = `
    <section class="card">
      <div class="card-header">
        <div><h2>Automatiska scenarier ${state.selectedYear}</h2><p>Den inmatade planen är most likely. Worst och best case skapas med länkade volym-, pris-, kostnads- och betalningsantaganden.</p></div>
        <span class="pill">P&amp;L · Cash · Balance</span>
      </div>
      ${scenarioComparison(state, scenarios)}
    </section>

    <section class="grid two section">
      <article class="card">
        <div class="card-header"><div><h3>Helårsutfall</h3><p>Intäkt, EBIT och årets resultat.</p></div></div>
        <div class="chart-box"><canvas id="scenario-results"></canvas></div>
      </article>
      <article class="card">
        <div class="card-header"><div><h3>Kassakurva</h3><p>Betalningsförseningar kan göra ett lönsamt scenario likviditetsnegativt.</p></div></div>
        <div class="chart-box"><canvas id="scenario-cash"></canvas></div>
      </article>
    </section>

    <section class="card section">
      <div class="card-header"><div><h3>Scenarioantaganden</h3><p>Multiplikator 1,00 betyder samma som den ursprungliga planen. 0,80 betyder 20% lägre och 1,18 betyder 18% högre.</p></div></div>
      <div class="scenario-strip">
        ${Object.entries(state.scenarios).map(([key, assumptions]) => scenarioEditor(key, assumptions)).join('')}
      </div>
    </section>

    <section class="card section">
      <div class="card-header"><div><h3>Känslighetsmatris</h3><p>Hur EBIT påverkas av intäktsnivå och kostnadsnivå.</p></div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Intäkt / fasta kostnader</th><th>90%</th><th>100%</th><th>110%</th></tr></thead>
        <tbody>
          ${[0.8,1,1.2].map(revenueFactor => `
            <tr><td><strong>${Math.round(revenueFactor * 100)}% intäkt</strong></td>
              ${[0.9,1,1.1].map(costFactor => {
                const base = scenarios.mostLikely;
                const estimatedRevenue = base.analytics.totalRevenue * revenueFactor;
                const estimatedDirect = base.pnl.directCosts.reduce((a,b)=>a+b,0) * revenueFactor;
                const fixed = base.analytics.fixedCosts * costFactor;
                const ebit = estimatedRevenue - estimatedDirect - fixed;
                return `<td class="${ebit < 0 ? 'bad' : 'good'}">${money(ebit)}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    </section>
  `;

  return {
    html,
    afterRender() {
      const colors = scenarioPalette();
      renderBar('scenario-results', Object.keys(scenarios).map(key => state.scenarios[key].label), [
        { label: 'Intäkt', data: Object.values(scenarios).map(model => model.analytics.totalRevenue), backgroundColor: '#8ea493' },
        { label: 'EBIT', data: Object.values(scenarios).map(model => model.analytics.totalEBIT), backgroundColor: '#e8a77b' },
        { label: 'Årets resultat', data: Object.values(scenarios).map(model => model.analytics.totalNetIncome), backgroundColor: '#30483d' }
      ]);
      renderLine('scenario-cash', months, Object.entries(scenarios).map(([key, model]) => ({
        label: state.scenarios[key].label,
        data: model.cashFlow.closingCash,
        borderColor: colors[key],
        tension: .35,
        borderWidth: key === 'mostLikely' ? 3 : 2
      })));
      document.querySelectorAll('[data-scenario-form]').forEach(form => form.addEventListener('submit', event => {
        event.preventDefault();
        const key = form.dataset.scenarioForm;
        const data = new FormData(form);
        context.save(draft => {
          Object.assign(draft.scenarios[key], {
            revenueMultiplier: Number(data.get('revenueMultiplier') || 1),
            directCostMultiplier: Number(data.get('directCostMultiplier') || 1),
            fixedCostMultiplier: Number(data.get('fixedCostMultiplier') || 1),
            collectionDelayMonths: Number(data.get('collectionDelayMonths') || 0),
            paymentDelayMonths: Number(data.get('paymentDelayMonths') || 0)
          });
        }, `${state.scenarios[key].label} uppdaterat.`);
      }));
    }
  };
}

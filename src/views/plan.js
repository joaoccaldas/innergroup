import { escapeHtml, field, selectField, monthOptions, money, annual, toast } from '../ui.js';

const revenueTypes = [
  { value: 'programme', label: 'Program' },
  { value: 'consulting', label: 'Konsultarvode' },
  { value: 'workshop', label: 'Workshop / keynote' },
  { value: 'events', label: 'Event' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'otherRevenue', label: 'Övrig intäkt' }
];

function targetFor(state, year) {
  return state.targets.find(item => Number(item.year) === Number(year)) || {
    year, annualRevenue: 0, directCostRatio: 0.15, opexAnnual: 0, personnelAnnual: 0,
    depreciationAnnual: 0, financialNetAnnual: 0,
    monthlyWeights: Array(12).fill(1 / 12)
  };
}

function targetMarkup(target) {
  return `
    <form id="target-form" class="card">
      <div class="card-header"><div><h3>Helårsdriven plan</h3><p>Snabb modellering av helårsbudget eller forecast. Modellen fasar beloppen per månad och bygger tre scenarier automatiskt.</p></div><span class="pill">Driver model</span></div>
      <div class="form-grid">
        ${field('Helårsintäkt', 'annualRevenue', target.annualRevenue, 'number', 'min="0" step="1000"')}
        ${field('Direkt kostnad %', 'directCostRatio', Number(target.directCostRatio || 0) * 100, 'number', 'min="0" max="100" step="0.1"')}
        ${field('Driftskostnader helår', 'opexAnnual', target.opexAnnual, 'number', 'min="0" step="1000"')}
        ${field('Personalkostnader helår', 'personnelAnnual', target.personnelAnnual, 'number', 'min="0" step="1000"')}
        ${field('Avskrivningar helår', 'depreciationAnnual', target.depreciationAnnual, 'number', 'min="0" step="1000"')}
        ${field('Finansnetto helår', 'financialNetAnnual', target.financialNetAnnual, 'number', 'step="1000"')}
      </div>
      <div class="section">
        <h3>Månadsfördelning</h3>
        <p class="muted">Ange procent per månad. Summan normaliseras automatiskt till 100%.</p>
        <div class="form-grid">
          ${target.monthlyWeights.map((weight, index) => field(contextMonth(index), `weight-${index}`, (Number(weight || 0) * 100).toFixed(1), 'number', 'min="0" step="0.1"')).join('')}
        </div>
      </div>
      <div class="section"><button class="button" type="submit">Spara helårsplan</button></div>
    </form>
  `;
}

function contextMonth(index) {
  return ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][index];
}

function projectFormMarkup(year) {
  return `
    <form id="project-form" class="card">
      <div class="card-header"><div><h3>Lägg till projekt eller intäktskälla</h3><p>Intäkt, leverans, fakturering, moms, kundbetalning och direkt kostnad hålls separata.</p></div></div>
      <input type="hidden" name="year" value="${year}">
      <div class="form-grid">
        ${field('Projektnamn', 'name', '', 'text', 'required placeholder="Ex. Leadership Programme A"')}
        ${selectField('Intäktstyp', 'revenueSubCategory', revenueTypes, 'programme')}
        ${field('Kund', 'customer', '', 'text', 'placeholder="Valfritt"')}
        ${selectField('Status', 'status', [
          { value: 'pipeline', label: 'Pipeline' }, { value: 'committed', label: 'Bekräftat' }, { value: 'completed', label: 'Genomfört' }
        ], 'pipeline')}
        ${field('Antal', 'count', 1, 'number', 'min="0" step="1" required')}
        ${field('Pris per projekt', 'price', 0, 'number', 'min="0" step="1000" required')}
        ${field('Sannolikhet %', 'probability', 100, 'number', 'min="0" max="100" step="1"')}
        ${field('Direkt kostnad per projekt', 'directCostPerUnit', 0, 'number', 'min="0" step="1000"')}
        <label class="field"><span>Startmånad</span><select name="startMonth">${monthOptions(1)}</select></label>
        <label class="field"><span>Slutmånad</span><select name="endMonth">${monthOptions(1)}</select></label>
        ${selectField('Intäktsfasning', 'phasing', [
          { value: 'even', label: 'Jämnt över leveransperiod' }, { value: 'custom', label: 'Egen månadsprofil' }
        ], 'even')}
        ${selectField('Fakturering', 'invoiceTiming', [
          { value: 'onDelivery', label: 'Samma som intäktsfasning' }, { value: 'upfront', label: '100% vid start' }, { value: 'thirtySeventy', label: '30% start / 70% slut' }
        ], 'onDelivery')}
        ${field('Kundens betalningsförskjutning, mån', 'collectionDelayMonths', 1, 'number', 'min="0" max="12" step="1"')}
        ${field('Leverantörsbetalning, mån', 'supplierDelayMonths', 0, 'number', 'min="0" max="12" step="1"')}
        ${field('Moms %', 'vatRate', 25, 'number', 'min="0" max="100" step="1"')}
      </div>
      <div class="section"><button class="button" type="submit">Lägg till projekt</button></div>
    </form>
  `;
}

function projectsMarkup(projects) {
  if (!projects.length) return '<div class="empty">Inga projekt har lagts till för året.</div>';
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Projekt</th><th>Typ</th><th>Status</th><th>Antal</th><th>Pris</th><th>Sannolikhet</th><th>Period</th><th>Viktad intäkt</th><th></th></tr></thead>
        <tbody>
          ${projects.map(project => `
            <tr>
              <td><strong>${escapeHtml(project.name)}</strong><br><small>${escapeHtml(project.customer || '')}</small></td>
              <td>${escapeHtml(revenueTypes.find(item => item.value === project.revenueSubCategory)?.label || project.revenueSubCategory)}</td>
              <td><span class="pill">${escapeHtml(project.status)}</span></td>
              <td>${Number(project.count || 0)}</td>
              <td>${money(project.price)}</td>
              <td>${Math.round(Number(project.probability || 0) * 100)}%</td>
              <td>${contextMonth(Number(project.startMonth || 1) - 1)}–${contextMonth(Number(project.endMonth || 1) - 1)}</td>
              <td>${money(Number(project.count || 0) * Number(project.price || 0) * Number(project.probability || 0))}</td>
              <td><button class="button danger small" data-delete-project="${escapeHtml(project.id)}">Ta bort</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function fixedCostFormMarkup(year) {
  return `
    <form id="fixed-cost-form" class="card section">
      <div class="card-header"><div><h3>Återkommande kostnad</h3><p>Lägg till fasta kostnader som ska fasas jämnt över året.</p></div></div>
      <input type="hidden" name="year" value="${year}">
      <div class="form-grid">
        ${field('Kostnadsnamn', 'name', '', 'text', 'required placeholder="Ex. Google Workspace"')}
        ${selectField('Kategori', 'category', [
          { value: 'opex', label: 'Driftskostnad' }, { value: 'personnel', label: 'Personalkostnad' },
          { value: 'depreciation', label: 'Avskrivning' }, { value: 'financialNet', label: 'Finansnetto' }
        ], 'opex')}
        ${selectField('Underkategori', 'subCategory', [
          { value: 'technology', label: 'Teknik' }, { value: 'marketing', label: 'Marknadsföring' },
          { value: 'administration', label: 'Administration' }, { value: 'professional', label: 'Externa tjänster' },
          { value: 'salary', label: 'Löner' }, { value: 'socialFees', label: 'Sociala avgifter' }, { value: 'otherOpex', label: 'Övrigt' }
        ], 'technology')}
        ${field('Årsbelopp', 'annualAmount', 0, 'number', 'min="0" step="1000" required')}
        ${field('Moms %', 'vatRate', 25, 'number', 'min="0" max="100" step="1"')}
        ${field('Betalningsförskjutning, mån', 'paymentDelayMonths', 0, 'number', 'min="0" max="12" step="1"')}
      </div>
      <div class="section"><button class="button" type="submit">Lägg till kostnad</button></div>
    </form>
  `;
}

function fixedCostsMarkup(costs) {
  if (!costs.length) return '<div class="empty">Inga fasta kostnadsrader har lagts till.</div>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Kostnad</th><th>Kategori</th><th>Helår</th><th>Moms</th><th></th></tr></thead>
      <tbody>${costs.map(cost => `
        <tr><td>${escapeHtml(cost.name)}</td><td>${escapeHtml(cost.subCategory || cost.category)}</td><td>${money(annual(cost.monthly))}</td><td>${Math.round(Number(cost.vatRate || 0) * 100)}%</td><td><button class="button danger small" data-delete-cost="${escapeHtml(cost.id)}">Ta bort</button></td></tr>
      `).join('')}</tbody>
    </table></div>
  `;
}

export function renderPlan(context) {
  const { state } = context;
  const year = Number(state.selectedYear);
  const mode = state.planModeByYear[year] || 'projects';
  const target = targetFor(state, year);
  const projects = state.projects.filter(item => Number(item.year) === year);
  const fixedCosts = state.fixedCosts.filter(item => Number(item.year) === year);
  const html = `
    <section class="card">
      <div class="card-header"><div><h2>Planeringsmetod ${year}</h2><p>Välj snabb helårsmodell eller detaljerad projektmodell. Båda använder samma rapport- och scenarioarkitektur.</p></div></div>
      <div class="toolbar">
        <label class="field"><span>Metod</span><select id="plan-mode">
          <option value="target" ${mode === 'target' ? 'selected' : ''}>Helårsdriven plan</option>
          <option value="projects" ${mode === 'projects' ? 'selected' : ''}>Projekt och kostnadsdrivare</option>
        </select></label>
        <label class="field"><span>Senast stängda månad</span><select id="last-closed-month">
          <option value="-1" ${Number(state.lastClosedMonthByYear[year] ?? -1) === -1 ? 'selected' : ''}>Ingen, hela året är plan</option>
          ${Array.from({ length: 12 }, (_, index) => `<option value="${index}" ${Number(state.lastClosedMonthByYear[year] ?? -1) === index ? 'selected' : ''}>${contextMonth(index)}</option>`).join('')}
        </select><small>Stängda månader hämtas från utfall. Öppna månader kommer från planen.</small></label>
      </div>
    </section>
    <section class="section">${mode === 'target' ? targetMarkup(target) : projectFormMarkup(year)}</section>
    ${mode === 'projects' ? `
      <section class="card section"><div class="card-header"><div><h3>Projektportfölj ${year}</h3><p>${projects.length} projekt eller intäktsdrivare.</p></div></div>${projectsMarkup(projects)}</section>
      ${fixedCostFormMarkup(year)}
      <section class="card section"><div class="card-header"><div><h3>Fasta kostnader ${year}</h3></div></div>${fixedCostsMarkup(fixedCosts)}</section>
    ` : ''}
  `;

  return {
    html,
    afterRender() {
      document.getElementById('plan-mode')?.addEventListener('change', event => {
        context.mutate(draft => { draft.planModeByYear[year] = event.target.value; }, 'Planeringsmetod uppdaterad.');
      });
      document.getElementById('last-closed-month')?.addEventListener('change', event => {
        context.mutate(draft => { draft.lastClosedMonthByYear[year] = Number(event.target.value); }, 'Stängd period uppdaterad.');
      });
      document.getElementById('target-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const weights = Array.from({ length: 12 }, (_, index) => Number(data.get(`weight-${index}`) || 0) / 100);
        context.save(draft => {
          const existing = draft.targets.find(item => Number(item.year) === year);
          const next = {
            year,
            annualRevenue: Number(data.get('annualRevenue') || 0),
            directCostRatio: Number(data.get('directCostRatio') || 0) / 100,
            opexAnnual: Number(data.get('opexAnnual') || 0),
            personnelAnnual: Number(data.get('personnelAnnual') || 0),
            depreciationAnnual: Number(data.get('depreciationAnnual') || 0),
            financialNetAnnual: Number(data.get('financialNetAnnual') || 0),
            monthlyWeights: weights
          };
          if (existing) Object.assign(existing, next); else draft.targets.push(next);
        }, 'Helårsplan sparad.');
      });
      document.getElementById('project-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const startMonth = Number(data.get('startMonth'));
        const endMonth = Math.max(startMonth, Number(data.get('endMonth')));
        context.save(draft => {
          draft.projects.push({
            id: crypto.randomUUID(), year, name: String(data.get('name') || ''), customer: String(data.get('customer') || ''),
            revenueSubCategory: String(data.get('revenueSubCategory') || 'otherRevenue'), status: String(data.get('status') || 'pipeline'),
            count: Number(data.get('count') || 0), price: Number(data.get('price') || 0), probability: Number(data.get('probability') || 0) / 100,
            directCostPerUnit: Number(data.get('directCostPerUnit') || 0), directCostSubCategory: 'otherDirect', startMonth, endMonth,
            phasing: String(data.get('phasing') || 'even'), invoiceTiming: String(data.get('invoiceTiming') || 'onDelivery'),
            collectionDelayMonths: Number(data.get('collectionDelayMonths') || 0), supplierDelayMonths: Number(data.get('supplierDelayMonths') || 0),
            vatRate: Number(data.get('vatRate') || 0) / 100
          });
        }, 'Projekt tillagt.');
      });
      document.getElementById('fixed-cost-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const annualAmount = Number(data.get('annualAmount') || 0);
        context.save(draft => {
          draft.fixedCosts.push({
            id: crypto.randomUUID(), year, name: String(data.get('name') || ''), category: String(data.get('category') || 'opex'),
            subCategory: String(data.get('subCategory') || 'otherOpex'), monthly: Array(12).fill(annualAmount / 12),
            vatRate: Number(data.get('vatRate') || 0) / 100, paymentDelayMonths: Number(data.get('paymentDelayMonths') || 0)
          });
        }, 'Kostnadsdrivare tillagd.');
      });
      document.querySelectorAll('[data-delete-project]').forEach(button => button.addEventListener('click', () => {
        context.mutate(draft => { draft.projects = draft.projects.filter(item => item.id !== button.dataset.deleteProject); }, 'Projekt borttaget.');
      }));
      document.querySelectorAll('[data-delete-cost]').forEach(button => button.addEventListener('click', () => {
        context.mutate(draft => { draft.fixedCosts = draft.fixedCosts.filter(item => item.id !== button.dataset.deleteCost); }, 'Kostnad borttagen.');
      }));
    }
  };
}

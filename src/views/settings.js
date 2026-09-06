import { exportState, importState, resetState } from '../storage.js';
import { field, selectField, downloadText, toast, escapeHtml } from '../ui.js';
import { createDefaultState } from '../model.js';

export function renderSettings(context) {
  const { state } = context;
  const company = state.company;
  const opening = company.opening;
  const html = `
    <section class="grid two">
      <form id="company-form" class="card">
        <div class="card-header"><div><h2>Bolag och räkenskapsår</h2><p>Grundinställningar för rapportering och årsavslutsberedskap.</p></div></div>
        <div class="form-grid">
          ${field('Bolagsnamn', 'name', company.name, 'text', 'required')}
          ${field('Organisationsnummer', 'organisationNumber', company.organisationNumber, 'text')}
          ${selectField('Valuta', 'currency', ['SEK','EUR','USD'], company.currency)}
          ${selectField('Språk', 'language', [{ value:'sv',label:'Svenska' },{ value:'en',label:'English' }], company.language)}
          ${field('Räkenskapsårets start', 'fiscalYearStart', company.fiscalYearStart, 'date')}
          ${field('Räkenskapsårets slut', 'fiscalYearEnd', company.fiscalYearEnd, 'date')}
          ${field('Standardmoms %', 'vatRate', Number(company.vatRate || 0) * 100, 'number', 'min="0" max="100" step="1"')}
          ${selectField('Momsperiod', 'vatFrequencyMonths', [{value:1,label:'Månad'},{value:3,label:'Kvartal'},{value:12,label:'År'}], company.vatFrequencyMonths)}
          ${field('Bolagsskatt %', 'taxRate', Number(company.taxRate || 0) * 100, 'number', 'min="0" max="100" step="0.1"')}
          ${selectField('Regelverk', 'framework', ['K2','K3'], state.compliance.framework)}
        </div>
        <div class="section"><button class="button" type="submit">Spara bolagsinställningar</button></div>
      </form>

      <form id="opening-form" class="card">
        <div class="card-header"><div><h2>Ingående balans</h2><p>Startpunkt för den länkade balans- och kassaflödesmodellen.</p></div></div>
        <div class="form-grid">
          ${field('Kassa och bank', 'cash', opening.cash, 'number', 'step="1"')}
          ${field('Kundfordringar', 'accountsReceivable', opening.accountsReceivable, 'number', 'step="1"')}
          ${field('Anläggningstillgångar', 'fixedAssets', opening.fixedAssets, 'number', 'step="1"')}
          ${field('Övriga tillgångar', 'otherAssets', opening.otherAssets, 'number', 'step="1"')}
          ${field('Leverantörsskulder', 'accountsPayable', opening.accountsPayable, 'number', 'step="1"')}
          ${field('Momsskuld', 'vatLiability', opening.vatLiability, 'number', 'step="1"')}
          ${field('Skatteskuld', 'taxLiability', opening.taxLiability, 'number', 'step="1"')}
          ${field('Lån', 'loans', opening.loans, 'number', 'step="1"')}
          ${field('Övriga skulder', 'otherLiabilities', opening.otherLiabilities, 'number', 'step="1"')}
          ${field('Eget kapital', 'equity', opening.equity, 'number', 'step="1"')}
        </div>
        <div class="section"><button class="button" type="submit">Spara ingående balans</button></div>
      </form>
    </section>

    <section class="grid two section">
      <article class="card">
        <div class="card-header"><div><h3>Data och backup</h3><p>Prototypdata lagras lokalt i webbläsaren.</p></div></div>
        <div class="toolbar">
          <button class="button" id="export-backup">Exportera backup</button>
          <label class="button ghost">Importera backup<input id="import-backup" type="file" accept="application/json" hidden></label>
          <button class="button danger" id="reset-app">Återställ prototyp</button>
        </div>
      </article>
      <article class="card">
        <div class="card-header"><div><h3>Modellkontrakt</h3><p>Maskinläsbara definitioner som gör modellen reproducerbar.</p></div></div>
        <div class="alert-list">
          <a class="alert good" href="schema/actuals.schema.json" target="_blank"><strong>Actuals JSON Schema</strong><br>Kanoniskt importformat.</a>
          <a class="alert good" href="data/account-mapping.json" target="_blank"><strong>BAS-kontomappning</strong><br>Standardiserad rapportklassificering.</a>
          <a class="alert good" href="data/actuals-template.csv" download><strong>CSV-mall</strong><br>Praktisk importmall.</a>
        </div>
      </article>
    </section>

    <section class="card section">
      <div class="card-header"><div><h3>Ansvarsgräns</h3><p>Det här är ett management- och prototypverktyg.</p></div></div>
      <p>Appen hjälper användaren att förstå och kontrollera planering, utfall, likviditet och årsavslutsberedskap. Den ersätter inte det juridiska bokföringssystemet, professionell redovisningsbedömning, underskrift eller inlämning till svenska myndigheter.</p>
    </section>
  `;

  return {
    html,
    afterRender() {
      document.getElementById('company-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        context.save(draft => {
          Object.assign(draft.company, {
            name: String(data.get('name') || ''), organisationNumber: String(data.get('organisationNumber') || ''),
            currency: String(data.get('currency') || 'SEK'), language: String(data.get('language') || 'sv'),
            fiscalYearStart: String(data.get('fiscalYearStart') || ''), fiscalYearEnd: String(data.get('fiscalYearEnd') || ''),
            vatRate: Number(data.get('vatRate') || 0) / 100, vatFrequencyMonths: Number(data.get('vatFrequencyMonths') || 3),
            taxRate: Number(data.get('taxRate') || 0) / 100
          });
          draft.compliance.framework = String(data.get('framework') || 'K2');
        }, 'Bolagsinställningar sparade.');
      });
      document.getElementById('opening-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        context.save(draft => {
          Object.keys(draft.company.opening).forEach(key => { draft.company.opening[key] = Number(data.get(key) || 0); });
        }, 'Ingående balans sparad.');
      });
      document.getElementById('export-backup')?.addEventListener('click', () => {
        downloadText(`innergroup-financial-studio-${new Date().toISOString().slice(0,10)}.json`, exportState(state), 'application/json');
      });
      document.getElementById('import-backup')?.addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          context.replaceState(importState(await file.text()));
          toast('Backup importerad.');
        } catch (error) {
          toast(`Import misslyckades: ${error.message}`);
        }
      });
      document.getElementById('reset-app')?.addEventListener('click', () => {
        if (!window.confirm('Återställ all lokal prototypdata?')) return;
        resetState();
        context.replaceState(createDefaultState());
        toast('Prototypen återställd.');
      });
    }
  };
}

import { escapeHtml } from '../ui.js';

const i18n = {
  sv: {
    title: 'Välkommen till Inner Group Financial Studio',
    subtitle: 'Ett lokalt, länkat planeringsverktyg för din budget, utfall, kassaflöde och scenarier.',
    steps: [
      { number: '01', heading: 'Planera', text: 'Börja med att fylla i årets budget. Du kan använda en snabb helårsdriven modell eller lägga till enskilda projekt och kostnadsdrivare.' },
      { number: '02', heading: 'Fyll i utfall', text: 'Ladda bokföringsdata som CSV eller SIE, eller lägg till utfallsrader manuellt. Stängda månader hämtas automatiskt från utfallen.' },
      { number: '03', heading: 'Se rapporter', text: 'Resultaträkning, kassaflöde, balansräkning och årsavslutskontroller byggs automatiskt utifrån samma ekonomiska motor.' },
      { number: '04', heading: 'Prova scenarier', text: 'Worst case, most likely och best case räknas om direkt när du ändrar antaganden. Jämför alltid mot basbudgeten.' }
    ],
    note: 'Allt sparas automatiskt i webbläsaren. Ingen data lämnar din dator utan att du väljer det.',
    languageLabel: 'Språk / Language',
    startButton: 'Kom igång'
  },
  en: {
    title: 'Welcome to Inner Group Financial Studio',
    subtitle: 'A local, linked planning tool for your budget, actuals, cash flow and scenarios.',
    steps: [
      { number: '01', heading: 'Plan', text: 'Start by filling in this year\'s budget. Use a quick full-year model or add individual projects and cost drivers.' },
      { number: '02', heading: 'Add actuals', text: 'Import bookkeeping data as CSV or SIE, or add actual rows manually. Closed months are automatically derived from your actuals.' },
      { number: '03', heading: 'View reports', text: 'P&L, cash flow, balance sheet and year-end readiness are built automatically from the same financial engine.' },
      { number: '04', heading: 'Run scenarios', text: 'Worst case, most likely and best case recalculate instantly when you change assumptions. Always compare against the baseline budget.' }
    ],
    note: 'Everything is saved automatically in your browser. No data leaves your device unless you choose to export it.',
    languageLabel: 'Language / Språk',
    startButton: 'Get started'
  }
};

export function renderWelcome(context) {
  const language = context.state.company.language || 'sv';
  const t = i18n[language] || i18n.sv;

  const html = `
    <section class="card welcome-card">
      <div class="card-header">
        <div>
          <h1>${escapeHtml(t.title)}</h1>
          <p>${escapeHtml(t.subtitle)}</p>
        </div>
      </div>

      <div class="toolbar">
        <label class="field">
          <span>${escapeHtml(t.languageLabel)}</span>
          <select id="welcome-language">
            <option value="sv" ${language === 'sv' ? 'selected' : ''}>Svenska</option>
            <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
          </select>
        </label>
      </div>

      <div class="steps-grid">
        ${t.steps.map(step => `
          <article class="step-card">
            <span class="step-number">${escapeHtml(step.number)}</span>
            <h3>${escapeHtml(step.heading)}</h3>
            <p>${escapeHtml(step.text)}</p>
          </article>
        `).join('')}
      </div>

      <p class="muted">${escapeHtml(t.note)}</p>

      <div class="section">
        <button class="button" id="welcome-start">${escapeHtml(t.startButton)}</button>
      </div>
    </section>
  `;

  return {
    html,
    afterRender() {
      document.getElementById('welcome-language')?.addEventListener('change', event => {
        context.mutate(draft => {
          draft.company.language = event.target.value;
        }, 'Språk uppdaterat.');
      });
      document.getElementById('welcome-start')?.addEventListener('click', () => {
        context.markWelcomed();
        context.setView('overview');
      });
      if (location.hash === '#start') {
        context.markWelcomed();
        context.setView('overview');
      }
    }
  };
}

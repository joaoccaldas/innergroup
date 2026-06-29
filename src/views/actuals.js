import { parseActualsCsv, validateRows } from '../actuals.js';
import { parseSie } from '../sie.js';
import { escapeHtml, money, toast } from '../ui.js';

async function parseFile(file) {
  const text = await file.text();
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.se') || lower.endsWith('.si') || lower.endsWith('.sie')) return parseSie(text, file.name);
  return parseActualsCsv(text, file.name);
}

function summaryMarkup(rows) {
  if (!rows.length) return '<div class="empty">Inga utfallsrader har importerats.</div>';
  const years = [...new Set(rows.map(row => row.year))].sort();
  const sources = [...new Set(rows.map(row => row.sourceSystem).filter(Boolean))];
  const debit = rows.reduce((total, row) => total + Number(row.debit || 0), 0);
  const credit = rows.reduce((total, row) => total + Number(row.credit || 0), 0);
  const validation = validateRows(rows);
  return `
    <div class="grid kpis">
      <article class="card"><span class="kpi-label">Transaktionsrader</span><div class="kpi-value">${rows.length}</div><span class="kpi-delta">${years.join(', ')}</span></article>
      <article class="card"><span class="kpi-label">Debet</span><div class="kpi-value">${money(debit, true)}</div><span class="kpi-delta">Kontroll mot kredit</span></article>
      <article class="card"><span class="kpi-label">Kredit</span><div class="kpi-value">${money(credit, true)}</div><span class="kpi-delta">Skillnad ${money(debit - credit)}</span></article>
      <article class="card"><span class="kpi-label">Ej mappade</span><div class="kpi-value ${validation.unmapped ? 'bad' : 'good'}">${validation.unmapped}</div><span class="kpi-delta">Källor: ${escapeHtml(sources.join(', ') || 'lokal import')}</span></article>
    </div>
  `;
}

function rowsMarkup(rows, year) {
  const filtered = rows.filter(row => Number(row.year) === Number(year)).slice(-200).reverse();
  if (!filtered.length) return '<div class="empty">Inga rader för valt år.</div>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Datum</th><th>Verifikation</th><th>Konto</th><th>Text</th><th>Debet</th><th>Kredit</th><th>Klassificering</th></tr></thead>
      <tbody>${filtered.map(row => `
        <tr>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.voucherId)}</td>
          <td><strong>${escapeHtml(row.accountCode)}</strong><br><small>${escapeHtml(row.accountName)}</small></td>
          <td>${escapeHtml(row.description)}</td>
          <td>${row.debit ? money(row.debit) : ''}</td>
          <td>${row.credit ? money(row.credit) : ''}</td>
          <td>${row.classification?.statement === 'unknown' ? '<span class="pill bad">Ej mappad</span>' : `<span class="pill">${escapeHtml(row.classification.category)}</span>`}</td>
        </tr>
      `).join('')}</tbody>
    </table></div>
  `;
}

function manualForm(year) {
  return `
    <form id="manual-actual-form" class="card section">
      <div class="card-header"><div><h3>Lägg till en utfallsrad</h3><p>För korrigeringar och prototyptest. Bokföringssystemet förblir system of record.</p></div></div>
      <div class="form-grid">
        <label class="field"><span>Datum</span><input name="date" type="date" value="${year}-01-31" required></label>
        <label class="field"><span>Verifikation</span><input name="voucherId" value="MAN-1" required></label>
        <label class="field"><span>Konto</span><input name="accountCode" pattern="[0-9]{4,8}" required></label>
        <label class="field"><span>Kontonamn</span><input name="accountName"></label>
        <label class="field wide"><span>Beskrivning</span><input name="description"></label>
        <label class="field"><span>Debet</span><input name="debit" type="number" step="0.01" min="0" value="0"></label>
        <label class="field"><span>Kredit</span><input name="credit" type="number" step="0.01" min="0" value="0"></label>
      </div>
      <div class="section"><button class="button" type="submit">Lägg till rad</button></div>
    </form>
  `;
}

export function renderActuals(context) {
  const { state } = context;
  const year = Number(state.selectedYear);
  const yearRows = state.actuals.filter(row => Number(row.year) === year);
  const html = `
    <section class="card">
      <div class="card-header">
        <div><h2>Ladda bokföringsutfall</h2><p>CSV är det kanoniska formatet. SIE4 kan läsas direkt för snabb prototyptestning.</p></div>
        <a class="button ghost" href="data/actuals-template.csv" download>Hämta CSV-mall</a>
      </div>
      <div class="dropzone">
        <strong>Släpp eller välj en CSV-, TXT- eller SIE-fil</strong>
        <p class="muted">Raderna mappas mot BAS-konton och används i forecast, P&amp;L, kassaflöde, balansräkning och årsavslutskontroller.</p>
        <input id="actual-file" type="file" accept=".csv,.txt,.se,.si,.sie">
        <label><input id="replace-year" type="checkbox"> Ersätt befintliga rader för filens år</label>
      </div>
      <div id="import-status"></div>
    </section>

    ${summaryMarkup(state.actuals)}

    <section class="card section">
      <div class="card-header">
        <div><h3>Importerade utfallsrader ${year}</h3><p>De senaste 200 raderna visas. Full datamängd ligger kvar i webbläsarens lokala lagring.</p></div>
        <button class="button danger small" id="clear-year-actuals">Rensa ${year}</button>
      </div>
      ${rowsMarkup(state.actuals, year)}
    </section>

    ${manualForm(year)}

    <section class="card section">
      <div class="card-header"><div><h3>Importkontrakt</h3><p>Formatet är byggt för återanvändning mellan olika bokföringssystem.</p></div></div>
      <div class="grid three">
        <div><strong>Minimikolumner</strong><p class="muted">datum eller period, konto och debet/kredit eller signerat belopp.</p></div>
        <div><strong>Rekommenderade dimensioner</strong><p class="muted">verifikation, projektkod, kostnadsställe, motpart och momsinformation.</p></div>
        <div><strong>Validering</strong><p class="muted">balansering, datum, saknade verifikationer och ej mappade BAS-konton.</p></div>
      </div>
    </section>
  `;

  return {
    html,
    afterRender() {
      document.getElementById('actual-file')?.addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const status = document.getElementById('import-status');
        status.className = 'status-box';
        status.textContent = 'Läser och validerar filen...';
        try {
          const rows = await parseFile(file);
          const validation = validateRows(rows);
          if (!validation.valid) throw new Error('Filen klarade inte grundvalideringen.');
          const years = [...new Set(rows.map(row => Number(row.year)))];
          const replace = document.getElementById('replace-year')?.checked;
          context.mutate(draft => {
            if (replace) draft.actuals = draft.actuals.filter(row => !years.includes(Number(row.year)));
            draft.actuals.push(...rows);
            years.forEach(importYear => {
              const months = rows.filter(row => Number(row.year) === importYear).map(row => Number(row.month) - 1);
              const latestMonth = months.length ? Math.max(...months) : -1;
              draft.lastClosedMonthByYear[importYear] = Math.max(Number(draft.lastClosedMonthByYear[importYear] ?? -1), latestMonth);
            });
          }, `${rows.length} bokföringsrader importerade.`);
        } catch (error) {
          status.className = 'status-box bad';
          status.textContent = `Importen misslyckades: ${error.message}`;
        }
      });
      document.getElementById('clear-year-actuals')?.addEventListener('click', () => {
        if (!window.confirm(`Rensa alla utfallsrader för ${year}?`)) return;
        context.mutate(draft => {
          draft.actuals = draft.actuals.filter(row => Number(row.year) !== year);
          draft.lastClosedMonthByYear[year] = -1;
        }, `Utfall för ${year} rensat.`);
      });
      document.getElementById('manual-actual-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const date = String(data.get('date') || '');
        const dateObject = new Date(`${date}T12:00:00`);
        const debit = Number(data.get('debit') || 0);
        const credit = Number(data.get('credit') || 0);
        const accountCode = String(data.get('accountCode') || '');
        const module = await import('../model.js');
        context.mutate(draft => {
          draft.actuals.push({
            id: crypto.randomUUID(), recordType: 'transaction', date,
            period: `${dateObject.getFullYear()}-${String(dateObject.getMonth() + 1).padStart(2, '0')}`,
            year: dateObject.getFullYear(), month: dateObject.getMonth() + 1,
            voucherId: String(data.get('voucherId') || ''), lineId: String(Date.now()), accountCode,
            accountName: String(data.get('accountName') || ''), description: String(data.get('description') || ''),
            debit, credit, signedAmount: debit - credit, projectCode: '', costCenter: '', counterparty: '',
            currency: 'SEK', sourceSystem: 'Manual prototype', classification: module.classifyAccount(accountCode)
          });
        }, 'Utfallsrad tillagd.');
      });
    }
  };
}

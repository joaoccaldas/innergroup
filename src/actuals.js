import { classifyAccount } from './model.js';

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).trim().replaceAll(' ', '').replace(',', '.');
  const result = Number(cleaned);
  return Number.isFinite(result) ? result : 0;
}

function cleanHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll('å', 'a')
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll(' ', '_');
}

const headerAliases = {
  date: ['date', 'datum', 'bokforingsdatum'],
  period: ['period', 'manad', 'bokforingsperiod'],
  voucher: ['voucher_id', 'voucher', 'verifikation', 'verifikationsnummer'],
  account: ['account_code', 'account', 'konto', 'kontonummer'],
  accountName: ['account_name', 'kontonamn', 'kontobeskrivning'],
  description: ['description', 'text', 'beskrivning', 'verifikationstext'],
  debit: ['debit', 'debet'],
  credit: ['credit', 'kredit'],
  amount: ['amount_sek', 'amount', 'belopp', 'saldo'],
  project: ['project_code', 'project', 'projekt', 'projektkod'],
  costCenter: ['cost_center', 'kostnadsstalle'],
  counterparty: ['counterparty', 'motpart', 'kund_leverantor']
};

function findColumn(headers, key) {
  const aliases = headerAliases[key] || [key];
  return headers.findIndex(header => aliases.includes(header));
}

function splitRow(line, delimiter) {
  const cells = [];
  let value = '';
  let insideQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === delimiter && !insideQuotes) {
      cells.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function parsePeriod(periodValue, dateValue) {
  const period = String(periodValue || '').replace('/', '-');
  const parts = period.split('-');
  if (parts.length >= 2 && Number(parts[0]) >= 2000) {
    return { year: Number(parts[0]), month: Number(parts[1]) };
  }
  const date = new Date(dateValue);
  if (!Number.isNaN(date.getTime())) {
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  }
  return { year: new Date().getFullYear(), month: 1 };
}

export function parseActualsCsv(text, sourceName = 'CSV import') {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('Filen innehåller inga transaktionsrader.');
  const firstLine = lines[0];
  const delimiter = firstLine.split(';').length >= firstLine.split(',').length ? ';' : ',';
  const headers = splitRow(firstLine, delimiter).map(cleanHeader);
  const accountColumn = findColumn(headers, 'account');
  const dateColumn = findColumn(headers, 'date');
  const periodColumn = findColumn(headers, 'period');
  const debitColumn = findColumn(headers, 'debit');
  const creditColumn = findColumn(headers, 'credit');
  const amountColumn = findColumn(headers, 'amount');
  if (accountColumn < 0) throw new Error('Kolumn för konto saknas.');
  if (dateColumn < 0 && periodColumn < 0) throw new Error('Kolumn för datum eller period saknas.');
  if (debitColumn < 0 && creditColumn < 0 && amountColumn < 0) throw new Error('Beloppskolumner saknas.');
  const valueAt = (cells, key) => {
    const column = findColumn(headers, key);
    return column >= 0 ? cells[column] : '';
  };
  return lines.slice(1).map((line, index) => {
    const cells = splitRow(line, delimiter);
    const accountCode = valueAt(cells, 'account');
    if (!accountCode) return null;
    const date = valueAt(cells, 'date');
    const parsedPeriod = parsePeriod(valueAt(cells, 'period'), date);
    const debit = parseNumber(valueAt(cells, 'debit'));
    const credit = parseNumber(valueAt(cells, 'credit'));
    const signedAmount = debitColumn >= 0 || creditColumn >= 0 ? debit - credit : parseNumber(valueAt(cells, 'amount'));
    return {
      id: `${Date.now()}-${index}`,
      recordType: 'transaction',
      date: date || `${parsedPeriod.year}-${String(parsedPeriod.month).padStart(2, '0')}-01`,
      period: `${parsedPeriod.year}-${String(parsedPeriod.month).padStart(2, '0')}`,
      year: parsedPeriod.year,
      month: parsedPeriod.month,
      voucherId: valueAt(cells, 'voucher'),
      lineId: String(index + 1),
      accountCode: String(accountCode),
      accountName: valueAt(cells, 'accountName'),
      description: valueAt(cells, 'description'),
      debit,
      credit,
      signedAmount,
      projectCode: valueAt(cells, 'project'),
      costCenter: valueAt(cells, 'costCenter'),
      counterparty: valueAt(cells, 'counterparty'),
      currency: 'SEK',
      sourceSystem: sourceName,
      classification: classifyAccount(accountCode)
    };
  }).filter(Boolean);
}

export function validateRows(rows) {
  const invalidDates = rows.filter(row => !row.date || Number.isNaN(new Date(row.date).getTime())).length;
  const unmapped = rows.filter(row => row.classification?.statement === 'unknown').length;
  const missingVoucher = rows.filter(row => !row.voucherId).length;
  return { rowCount: rows.length, invalidDates, unmapped, missingVoucher, valid: rows.length > 0 && invalidDates === 0 };
}

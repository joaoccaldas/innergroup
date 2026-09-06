import { classifyAccount } from './model.js';

function parseTokens(line) {
  const tokens = [];
  let value = '';
  let insideQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (/\s/.test(character) && !insideQuotes) {
      if (value) { tokens.push(value); value = ''; }
    } else if (character !== '{' && character !== '}') {
      value += character;
    }
  }
  if (value) tokens.push(value);
  return tokens;
}

function parseAmount(value) {
  const amount = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(raw) {
  if (!/^20\d{6}$/.test(raw || '')) return '';
  return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
}

export function parseSie(text, sourceName = 'SIE4 import') {
  const accounts = new Map();
  const rows = [];
  let voucherId = '';
  let voucherDate = '';
  let rowNumber = 0;
  text.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;
    const tokens = parseTokens(line);
    if (tokens[0] === '#KONTO') {
      accounts.set(String(tokens[1] || ''), tokens.slice(2).join(' '));
      return;
    }
    if (tokens[0] === '#VER') {
      voucherId = [tokens[1], tokens[2]].filter(Boolean).join('-');
      voucherDate = tokens.find(token => /^20\d{6}$/.test(token)) || '';
      return;
    }
    if (!['#TRANS', '#RTRANS', '#BTRANS'].includes(tokens[0])) return;
    const accountCode = String(tokens[1] || '');
    const amountToken = tokens.slice(2).find(token => /^-?\d+(?:[.,]\d+)?$/.test(token));
    const signedAmount = parseAmount(amountToken);
    const dateToken = tokens.find(token => /^20\d{6}$/.test(token)) || voucherDate;
    const date = formatDate(dateToken);
    const dateObject = date ? new Date(`${date}T12:00:00`) : new Date();
    rowNumber += 1;
    rows.push({
      id: `${Date.now()}-sie-${rowNumber}`,
      recordType: 'transaction',
      date,
      period: `${dateObject.getFullYear()}-${String(dateObject.getMonth() + 1).padStart(2, '0')}`,
      year: dateObject.getFullYear(),
      month: dateObject.getMonth() + 1,
      voucherId,
      lineId: String(rowNumber),
      accountCode,
      accountName: accounts.get(accountCode) || '',
      description: tokens[tokens.length - 1] || '',
      debit: signedAmount > 0 ? signedAmount : 0,
      credit: signedAmount < 0 ? Math.abs(signedAmount) : 0,
      signedAmount,
      projectCode: '',
      costCenter: '',
      counterparty: '',
      currency: 'SEK',
      sourceSystem: sourceName,
      classification: classifyAccount(accountCode)
    });
  });
  if (!rows.length) throw new Error('Inga transaktionsrader hittades i SIE-filen.');
  return rows;
}

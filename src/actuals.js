export function validateRows(rows) {
  return { rowCount: rows.length, valid: rows.length > 0 };
}

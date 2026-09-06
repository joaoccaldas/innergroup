export function money(value, compact = false) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard'
  }).format(Number(value || 0));
}

export function percent(value, digits = 1) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function toast(message) {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  window.setTimeout(() => element.classList.remove('show'), 2600);
}

export function annual(values) {
  return (values || []).reduce((total, value) => total + Number(value || 0), 0);
}

export function monthOptions(selected = 1) {
  const names = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
  return names.map((name, index) => `<option value="${index + 1}" ${index + 1 === Number(selected) ? 'selected' : ''}>${name}</option>`).join('');
}

export function field(label, name, value, type = 'text', extra = '') {
  return `<label class="field"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`;
}

export function selectField(label, name, options, value) {
  const items = options.map(option => {
    const item = typeof option === 'string' ? { value: option, label: option } : option;
    return `<option value="${escapeHtml(item.value)}" ${String(item.value) === String(value) ? 'selected' : ''}>${escapeHtml(item.label)}</option>`;
  }).join('');
  return `<label class="field"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}">${items}</select></label>`;
}

export function setPageTitle(title) {
  const element = document.getElementById('page-title');
  if (element) element.textContent = title;
  document.title = `${title} | Inner Group Financial Studio`;
}

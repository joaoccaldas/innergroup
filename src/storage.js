const STORAGE_KEY = 'innergroup-financial-planner-v1';

export function loadState(fallbackFactory) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : fallbackFactory();
  } catch (error) {
    console.warn('Could not load saved state:', error);
    return fallbackFactory();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.projects)) {
    throw new Error('Invalid planner backup file.');
  }
  return parsed;
}

import { createDefaultState, computeModel, complianceReadiness } from './model.js';
import { loadState, saveState } from './storage.js';

let state = loadState(createDefaultState);
let scenario = 'mostLikely';

function seed(draft) {
  const base = 2026;
  if (!draft.targets.some(item => Number(item.year) === base)) {
    draft.targets.push({
      year: base,
      annualRevenue: 850000,
      directCostRatio: 69000 / 850000,
      opexAnnual: 24199,
      personnelAnnual: 172104,
      depreciationAnnual: 0,
      financialNetAnnual: 0,
      monthlyWeights: [25000,25000,25000,25000,40000,25000,25000,25000,160000,290000,160000,25000].map(value => value / 850000)
    });
  }
  draft.planModeByYear[base] = draft.planModeByYear[base] || 'target';
  if (draft.lastClosedMonthByYear[base] === undefined) draft.lastClosedMonthByYear[base] = -1;
  if (!draft.targets.some(item => Number(item.year) === 2027)) {
    draft.targets.push({ year: 2027, annualRevenue: 2000000, directCostRatio: 0.16, opexAnnual: 280000, personnelAnnual: 900000, depreciationAnnual: 0, financialNetAnnual: 0, monthlyWeights: [0.06,0.06,0.07,0.08,0.08,0.08,0.06,0.06,0.1,0.13,0.12,0.1] });
  }
  draft.planModeByYear[2027] = draft.planModeByYear[2027] || 'target';
  return draft;
}

state = seed(state);
saveState(state);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function baseYear() { return Number(String(state.company.fiscalYearStart || '2026-01-01').slice(0, 4)); }
function closingToOpening(model) {
  const month = 11;
  return {
    cash: model.cashFlow.closingCash[month], accountsReceivable: model.balance.accountsReceivable[month],
    fixedAssets: model.balance.fixedAssets[month], otherAssets: model.balance.otherAssets[month],
    accountsPayable: model.balance.accountsPayable[month], vatLiability: model.balance.vatLiability[month],
    taxLiability: model.balance.taxLiability[month], loans: model.balance.loans[month],
    otherLiabilities: model.balance.otherLiabilities[month], equity: model.balance.equity[month]
  };
}

export function getModel(year = state.selectedYear, scenarioKey = scenario, cache = new Map()) {
  const numericYear = Number(year);
  const key = `${numericYear}-${scenarioKey}`;
  if (cache.has(key)) return cache.get(key);
  const draft = clone(state);
  if (numericYear > baseYear()) draft.company.opening = closingToOpening(getModel(numericYear - 1, scenarioKey, cache));
  const model = computeModel(draft, numericYear, scenarioKey);
  cache.set(key, model);
  return model;
}

export function getScenarios(year = state.selectedYear) {
  const cache = new Map();
  return Object.fromEntries(Object.keys(state.scenarios).map(key => [key, getModel(year, key, cache)]));
}
export function getState() { return state; }
export function getScenario() { return scenario; }
export function setScenario(value) { scenario = value; }
export function mutate(mutator) { mutator(state); saveState(state); }
export function replaceState(nextState) { state = seed(nextState); saveState(state); }
export function years() {
  const values = new Set([baseYear(), baseYear() + 1, baseYear() + 2, Number(state.selectedYear)]);
  state.targets.forEach(item => values.add(Number(item.year)));
  state.projects.forEach(item => values.add(Number(item.year)));
  state.actuals.forEach(item => values.add(Number(item.year)));
  return [...values].filter(Number.isFinite).sort((a, b) => a - b);
}
export function buildContext(extra = {}) {
  return { state, scenario, model: getModel(), scenarios: getScenarios(), getModel, getScenarios, compliance: complianceReadiness(state, getModel(baseYear(), 'mostLikely')), ...extra };
}

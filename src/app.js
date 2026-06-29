import { createDefaultState, computeModel, complianceReadiness, MONTHS_SV } from './model.js';
import { loadState, saveState } from './storage.js';
import { clearCharts } from './charts.js';
import { toast, setPageTitle } from './ui.js';
import { renderOverview } from './views/overview.js';
import { renderPlan } from './views/plan.js';
import { renderActuals } from './views/actuals.js';
import { renderReports } from './views/reports.js';
import { renderScenarios } from './views/scenarios.js';
import { renderSettings } from './views/settings.js';

let state = loadState(createDefaultState);

function seedPrototypePlan(draft) {
  const year = 2026;
  if (!draft.targets.some(item => Number(item.year) === year)) {
    draft.targets.push({
      year,
      annualRevenue: 850000,
      directCostRatio: 69000 / 850000,
      opexAnnual: 24199,
      personnelAnnual: 172104,
      depreciationAnnual: 0,
      financialNetAnnual: 0,
      monthlyWeights: [25000,25000,25000,25000,40000,25000,25000,25000,160000,290000,160000,25000].map(value => value / 850000)
    });
  }
  draft.planModeByYear[year] = draft.planModeByYear[year] || 'target';
  if (draft.lastClosedMonthByYear[year] === undefined) draft.lastClosedMonthByYear[year] = -1;
  if (!draft.targets.some(item => Number(item.year) === 2027)) {
    draft.targets.push({
      year: 2027,
      annualRevenue: 2000000,
      directCostRatio: 0.16,
      opexAnnual: 280000,
      personnelAnnual: 900000,
      depreciationAnnual: 0,
      financialNetAnnual: 0,
      monthlyWeights: [0.06,0.06,0.07,0.08,0.08,0.08,0.06,0.06,0.1,0.13,0.12,0.1]
    });
  }
  draft.planModeByYear[2027] = draft.planModeByYear[2027] || 'target';
  return draft;
}

state = seedPrototypePlan(state);
saveState(state);
let currentView = 'overview';
let currentScenario = 'mostLikely';

const views = {
  overview: { title: 'Översikt', render: renderOverview },
  plan: { title: 'Planera', render: renderPlan },
  actuals: { title: 'Utfall', render: renderActuals },
  reports: { title: 'Rapporter', render: renderReports },
  scenarios: { title: 'Scenarier', render: renderScenarios },
  settings: { title: 'Inställningar', render: renderSettings }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseYear() {
  return Number(String(state.company.fiscalYearStart || `${new Date().getFullYear()}-01-01`).slice(0, 4));
}

function closingToOpening(model) {
  const month = 11;
  return {
    cash: model.cashFlow.closingCash[month],
    accountsReceivable: model.balance.accountsReceivable[month],
    fixedAssets: model.balance.fixedAssets[month],
    otherAssets: model.balance.otherAssets[month],
    accountsPayable: model.balance.accountsPayable[month],
    vatLiability: model.balance.vatLiability[month],
    taxLiability: model.balance.taxLiability[month],
    loans: model.balance.loans[month],
    otherLiabilities: model.balance.otherLiabilities[month],
    equity: model.balance.equity[month]
  };
}

function getModel(year = state.selectedYear, scenario = currentScenario, cache = new Map()) {
  const numericYear = Number(year);
  const key = `${numericYear}-${scenario}`;
  if (cache.has(key)) return cache.get(key);
  const modelState = clone(state);
  if (numericYear > baseYear()) {
    const previous = getModel(numericYear - 1, scenario, cache);
    modelState.company.opening = closingToOpening(previous);
  }
  const model = computeModel(modelState, numericYear, scenario);
  cache.set(key, model);
  return model;
}

function getScenarios(year = state.selectedYear) {
  const cache = new Map();
  return Object.fromEntries(Object.keys(state.scenarios).map(key => [key, getModel(year, key, cache)]));
}

function replaceState(nextState) {
  state = seedPrototypePlan(nextState);
  saveState(state);
  syncGlobalControls();
  render();
}

function mutate(mutator, message = '') {
  mutator(state);
  saveState(state);
  syncGlobalControls();
  render();
  if (message) toast(message);
}

function setView(view) {
  currentView = views[view] ? view : 'overview';
  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.view === currentView);
  });
  render();
}

function availableYears() {
  const years = new Set([baseYear(), baseYear() + 1, baseYear() + 2, Number(state.selectedYear)]);
  state.targets.forEach(item => years.add(Number(item.year)));
  state.projects.forEach(item => years.add(Number(item.year)));
  state.actuals.forEach(item => years.add(Number(item.year)));
  return [...years].filter(Number.isFinite).sort((a, b) => a - b);
}

function syncGlobalControls() {
  const yearSelect = document.getElementById('global-year');
  const scenarioSelect = document.getElementById('global-scenario');
  if (yearSelect) {
    yearSelect.innerHTML = availableYears().map(year => `<option value="${year}" ${year === Number(state.selectedYear) ? 'selected' : ''}>${year}</option>`).join('');
  }
  if (scenarioSelect) scenarioSelect.value = currentScenario;
}

function context() {
  const model = getModel();
  return {
    state,
    scenario: currentScenario,
    model,
    scenarios: getScenarios(),
    getModel,
    getScenarios,
    mutate,
    replaceState,
    rerender: render,
    setView,
    months: MONTHS_SV,
    compliance: complianceReadiness(state, getModel(baseYear(), 'mostLikely'))
  };
}

function render() {
  clearCharts();
  const definition = views[currentView];
  setPageTitle(definition.title);
  const root = document.getElementById('app');
  const result = definition.render(context());
  root.innerHTML = result.html;
  root.focus({ preventScroll: true });
  if (typeof result.afterRender === 'function') result.afterRender();
}

document.getElementById('main-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-view]');
  if (button) setView(button.dataset.view);
});

document.getElementById('global-year').addEventListener('change', event => {
  state.selectedYear = Number(event.target.value);
  saveState(state);
  render();
});

document.getElementById('global-scenario').addEventListener('change', event => {
  currentScenario = event.target.value;
  render();
});

document.getElementById('print-button').addEventListener('click', () => window.print());

syncGlobalControls();
render();

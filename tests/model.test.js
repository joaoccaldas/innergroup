import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, computeModel, classifyAccount, calculateFilingDeadline } from '../src/financial-engine.js';

function targetState() {
  const state = createDefaultState();
  state.selectedYear = 2026;
  state.planModeByYear[2026] = 'target';
  state.lastClosedMonthByYear[2026] = -1;
  state.targets = [{
    year: 2026,
    annualRevenue: 1000000,
    directCostRatio: 0.15,
    opexAnnual: 120000,
    personnelAnnual: 360000,
    depreciationAnnual: 12000,
    financialNetAnnual: 0,
    monthlyWeights: Array(12).fill(1 / 12)
  }];
  return state;
}

test('BAS accounts map to management statements', () => {
  assert.equal(classifyAccount('1930').category, 'cash');
  assert.equal(classifyAccount('3041').category, 'revenue');
  assert.equal(classifyAccount('6540').category, 'opex');
  assert.equal(classifyAccount('7210').category, 'personnel');
});

test('three scenarios change all linked outcomes', () => {
  const state = targetState();
  const downside = computeModel(state, 2026, 'downside');
  const likely = computeModel(state, 2026, 'mostLikely');
  const upside = computeModel(state, 2026, 'upside');
  assert.ok(downside.analytics.totalRevenue < likely.analytics.totalRevenue);
  assert.ok(likely.analytics.totalRevenue < upside.analytics.totalRevenue);
  assert.ok(downside.analytics.totalEBIT < likely.analytics.totalEBIT);
  assert.ok(likely.analytics.totalEBIT < upside.analytics.totalEBIT);
  assert.notEqual(downside.analytics.yearEndCash, upside.analytics.yearEndCash);
  assert.notEqual(downside.balance.equity[11], upside.balance.equity[11]);
});

test('P&L rolls from revenue to net income', () => {
  const model = computeModel(targetState(), 2026, 'mostLikely');
  assert.equal(Math.round(model.analytics.totalRevenue), 1000000);
  assert.equal(Math.round(model.analytics.totalEBIT), 358000);
  assert.ok(model.analytics.totalNetIncome < model.analytics.totalEBIT);
});

test('operating costs affect cash and balance sheet remains linked', () => {
  const model = computeModel(targetState(), 2026, 'mostLikely');
  const supplierPayments = model.cashFlow.supplierPayments.reduce((a, b) => a + b, 0);
  assert.ok(supplierPayments > 270000);
  assert.equal(model.balance.cash.length, 12);
  assert.ok(model.balance.check.every(value => Number.isFinite(value)));
  assert.ok(Math.max(...model.balance.check.map(Math.abs)) < 1);
});

test('annual report deadline supports standard and continued-meeting cases', () => {
  const standard = calculateFilingDeadline('2026-12-31');
  assert.equal(standard.getFullYear(), 2027);
  assert.equal(standard.getMonth(), 6);
  assert.equal(standard.getDate(), 31);
  const continued = calculateFilingDeadline('2026-12-31', true);
  assert.equal(continued.getMonth(), 8);
  assert.equal(continued.getDate(), 30);
});

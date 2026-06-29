import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, computeModel, classifyAccount, calculateFilingDeadline } from '../src/model.js';

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
});

test('P&L rolls from revenue to net income', () => {
  const model = computeModel(targetState(), 2026, 'mostLikely');
  assert.equal(Math.round(model.analytics.totalRevenue), 1000000);
  assert.equal(Math.round(model.analytics.totalEBIT), 358000);
  assert.ok(model.analytics.totalNetIncome < model.analytics.totalEBIT);
});

test('balance sheet returns arrays and a control check', () => {
  const model = computeModel(targetState(), 2026, 'mostLikely');
  assert.equal(model.balance.cash.length, 12);
  assert.equal(model.balance.totalAssets.length, 12);
  assert.equal(model.balance.check.length, 12);
  assert.ok(model.balance.check.every(value => Number.isFinite(value)));
});

test('annual report deadline is seven calendar months after fiscal year end', () => {
  const deadline = calculateFilingDeadline('2026-12-31');
  assert.equal(deadline.getFullYear(), 2027);
  assert.equal(deadline.getMonth(), 6);
  assert.equal(deadline.getDate(), 31);
});

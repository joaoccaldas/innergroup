import {
  MONTHS_SV,
  MONTHS_LONG_SV,
  ACCOUNT_HIERARCHY,
  classifyAccount,
  createDefaultState
} from './model.js';

export { MONTHS_SV, MONTHS_LONG_SV, ACCOUNT_HIERARCHY, classifyAccount, createDefaultState };

const zeros = () => Array(12).fill(0);
const number = value => Number(value || 0);
const sum = values => (values || []).reduce((total, value) => total + number(value), 0);
const add = (...arrays) => zeros().map((_, month) => arrays.reduce((total, array) => total + number(array?.[month]), 0));
const subtract = (left, right) => zeros().map((_, month) => number(left?.[month]) - number(right?.[month]));
const multiply = (values, factor) => (values || zeros()).map(value => number(value) * number(factor));
const shift = (values, months) => {
  const result = zeros();
  (values || []).forEach((value, index) => {
    const target = index + Math.max(0, Number(months || 0));
    if (target < 12) result[target] += number(value);
  });
  return result;
};
const cumulative = (values, opening = 0) => {
  let balance = number(opening);
  return (values || zeros()).map(value => {
    balance += number(value);
    return balance;
  });
};
const normalizedWeights = weights => {
  const source = Array.isArray(weights) && weights.length === 12 ? weights.map(number) : Array(12).fill(1 / 12);
  const total = sum(source);
  return total ? source.map(value => value / total) : Array(12).fill(1 / 12);
};
const ensure = (object, key) => {
  if (!object[key]) object[key] = zeros();
  return object[key];
};
const addInto = (target, source) => {
  for (let month = 0; month < 12; month += 1) target[month] += number(source?.[month]);
};

function actualLedger(state, year) {
  const categories = {};
  const balanceMovements = {};
  const cashMovement = zeros();
  const monthsWithData = new Set();
  let unmapped = 0;

  state.actuals.filter(row => Number(row.year) === Number(year)).forEach(row => {
    const month = Math.max(0, Math.min(11, Number(row.month || 1) - 1));
    const classification = row.classification || classifyAccount(row.accountCode);
    const signed = number(row.signedAmount ?? (number(row.debit) - number(row.credit)));
    monthsWithData.add(month);

    if (classification.statement === 'pnl') {
      const amount = signed * number(classification.normalSign || 1);
      ensure(categories, classification.category)[month] += amount;
      ensure(categories, classification.subCategory)[month] += amount;
    } else if (classification.statement === 'balance') {
      const movement = signed * number(classification.normalSign || 1);
      ensure(balanceMovements, classification.category)[month] += movement;
      if (classification.category === 'cash') cashMovement[month] += signed;
    } else {
      unmapped += 1;
    }
  });

  return { categories, balanceMovements, cashMovement, monthsWithData, unmapped };
}

function blankPlan() {
  return {
    categories: {},
    invoices: zeros(),
    outputVat: zeros(),
    cashReceipts: zeros(),
    supplierBills: zeros(),
    inputVat: zeros(),
    supplierPayments: zeros(),
    payrollPayments: zeros(),
    financialPayments: zeros()
  };
}

function addSupplierCost(plan, values, vatRate, paymentDelay) {
  const vat = multiply(values, vatRate);
  addInto(plan.supplierBills, values);
  addInto(plan.inputVat, vat);
  addInto(plan.supplierPayments, shift(add(values, vat), paymentDelay));
}

function addCustomerInvoices(plan, invoices, vatRate, collectionDelay) {
  const vat = multiply(invoices, vatRate);
  addInto(plan.invoices, invoices);
  addInto(plan.outputVat, vat);
  addInto(plan.cashReceipts, shift(add(invoices, vat), collectionDelay));
}

function targetPlan(state, target, scenario) {
  const plan = blankPlan();
  const weights = normalizedWeights(target.monthlyWeights);
  const revenue = weights.map(weight => number(target.annualRevenue) * number(scenario.revenueMultiplier || 1) * weight);
  const directCosts = revenue.map(value => value * number(target.directCostRatio) * number(scenario.directCostMultiplier || 1));
  const opex = Array(12).fill(number(target.opexAnnual) * number(scenario.fixedCostMultiplier || 1) / 12);
  const personnel = Array(12).fill(number(target.personnelAnnual) * number(scenario.fixedCostMultiplier || 1) / 12);
  const depreciation = Array(12).fill(number(target.depreciationAnnual) / 12);
  const financialNet = Array(12).fill(number(target.financialNetAnnual) / 12);

  Object.assign(plan.categories, {
    revenue: [...revenue],
    otherRevenue: [...revenue],
    directCosts: [...directCosts],
    otherDirect: [...directCosts],
    opex: [...opex],
    otherOpex: [...opex],
    personnel: [...personnel],
    salary: [...personnel],
    depreciation: [...depreciation],
    financialNet: [...financialNet]
  });

  addCustomerInvoices(plan, revenue, state.company.vatRate, scenario.collectionDelayMonths);
  addSupplierCost(plan, directCosts, state.company.vatRate, scenario.paymentDelayMonths);
  addSupplierCost(plan, opex, state.company.vatRate, scenario.paymentDelayMonths);
  addInto(plan.payrollPayments, personnel);
  addInto(plan.financialPayments, financialNet);
  return plan;
}

function projectDriver(project, scenario) {
  const revenue = zeros();
  const directCosts = zeros();
  const invoices = zeros();
  const adjustedCount = number(project.count) * number(scenario.revenueMultiplier || 1);
  const probability = number(project.probability ?? 1);
  const totalRevenue = adjustedCount * number(project.price) * probability;
  const totalDirectCost = adjustedCount * number(project.directCostPerUnit) * probability * number(scenario.directCostMultiplier || 1);
  const start = Math.max(0, Math.min(11, Number(project.startMonth || 1) - 1));
  const end = Math.max(start, Math.min(11, Number(project.endMonth || project.startMonth || 1) - 1));
  let weights = Array(end - start + 1).fill(1 / (end - start + 1));

  if (project.phasing === 'custom' && Array.isArray(project.monthlyWeights)) {
    const full = normalizedWeights(project.monthlyWeights);
    weights = full.slice(start, end + 1);
    const total = sum(weights);
    if (total) weights = weights.map(value => value / total);
  }

  weights.forEach((weight, offset) => {
    revenue[start + offset] += totalRevenue * weight;
    directCosts[start + offset] += totalDirectCost * weight;
  });

  if (project.invoiceTiming === 'upfront') invoices[start] = totalRevenue;
  else if (project.invoiceTiming === 'thirtySeventy') {
    invoices[start] += totalRevenue * 0.3;
    invoices[end] += totalRevenue * 0.7;
  } else addInto(invoices, revenue);

  return { revenue, directCosts, invoices };
}

function driverPlan(state, year, scenario) {
  const plan = blankPlan();

  state.projects.filter(project => Number(project.year) === Number(year)).forEach(project => {
    const driver = projectDriver(project, scenario);
    addInto(ensure(plan.categories, 'revenue'), driver.revenue);
    addInto(ensure(plan.categories, project.revenueSubCategory || 'otherRevenue'), driver.revenue);
    addInto(ensure(plan.categories, 'directCosts'), driver.directCosts);
    addInto(ensure(plan.categories, project.directCostSubCategory || 'otherDirect'), driver.directCosts);
    addCustomerInvoices(
      plan,
      driver.invoices,
      number(project.vatRate ?? state.company.vatRate),
      number(project.collectionDelayMonths) + number(scenario.collectionDelayMonths)
    );
    addSupplierCost(
      plan,
      driver.directCosts,
      number(project.vatRate ?? state.company.vatRate),
      number(project.supplierDelayMonths) + number(scenario.paymentDelayMonths)
    );
  });

  state.fixedCosts.filter(cost => Number(cost.year) === Number(year)).forEach(cost => {
    const values = (cost.monthly || zeros()).map(value => number(value) * number(scenario.fixedCostMultiplier || 1));
    const category = cost.category || 'opex';
    const subCategory = cost.subCategory || (category === 'personnel' ? 'salary' : 'otherOpex');
    addInto(ensure(plan.categories, category), values);
    addInto(ensure(plan.categories, subCategory), values);

    if (category === 'personnel') addInto(plan.payrollPayments, values);
    else if (category === 'financialNet') addInto(plan.financialPayments, values);
    else if (category !== 'depreciation') {
      addSupplierCost(
        plan,
        values,
        number(cost.vatRate ?? state.company.vatRate),
        number(cost.paymentDelayMonths) + number(scenario.paymentDelayMonths)
      );
    }
  });

  return plan;
}

function plannedLedger(state, year, scenarioKey) {
  const scenario = state.scenarios[scenarioKey] || state.scenarios.mostLikely;
  const target = state.targets.find(item => Number(item.year) === Number(year));
  const useTarget = (state.planModeByYear[year] || 'projects') === 'target' && target;
  const plan = useTarget ? targetPlan(state, target, scenario) : driverPlan(state, year, scenario);
  ['revenue','directCosts','opex','personnel','depreciation','financialNet'].forEach(key => ensure(plan.categories, key));
  return plan;
}

function mergeActualAndPlan(state, year, scenarioKey) {
  const actual = actualLedger(state, year);
  const plan = plannedLedger(state, year, scenarioKey);
  const closed = Number(state.lastClosedMonthByYear[year] ?? -1);
  const categories = {};
  const keys = new Set([...Object.keys(actual.categories), ...Object.keys(plan.categories)]);

  keys.forEach(key => {
    categories[key] = zeros().map((_, month) => month <= closed
      ? number(actual.categories[key]?.[month])
      : number(plan.categories[key]?.[month]));
  });

  const forecastOnly = values => (values || zeros()).map((value, month) => month <= closed ? 0 : number(value));
  return {
    actual,
    closed,
    categories,
    invoices: forecastOnly(plan.invoices),
    outputVat: forecastOnly(plan.outputVat),
    cashReceipts: forecastOnly(plan.cashReceipts),
    supplierBills: forecastOnly(plan.supplierBills),
    inputVat: forecastOnly(plan.inputVat),
    supplierPayments: forecastOnly(plan.supplierPayments),
    payrollPayments: forecastOnly(plan.payrollPayments),
    financialPayments: forecastOnly(plan.financialPayments)
  };
}

function vatSchedule(outputVat, inputVat, openingVat, frequency) {
  const payments = zeros();
  let liability = number(openingVat);
  const periodLength = Math.max(1, Number(frequency || 3));

  for (let month = 0; month < 12; month += 1) {
    liability += number(outputVat[month]) - number(inputVat[month]);
    const nextMonth = month + 1;
    if ((month + 1) % periodLength === 0 && nextMonth < 12 && liability > 0) {
      payments[nextMonth] += liability;
      liability = 0;
    }
  }
  return payments;
}

function balancedOpening(opening) {
  const values = {
    cash: number(opening.cash),
    accountsReceivable: number(opening.accountsReceivable),
    fixedAssets: number(opening.fixedAssets),
    otherAssets: number(opening.otherAssets),
    accountsPayable: number(opening.accountsPayable),
    vatLiability: number(opening.vatLiability),
    taxLiability: number(opening.taxLiability),
    loans: number(opening.loans),
    otherLiabilities: number(opening.otherLiabilities),
    equity: number(opening.equity)
  };
  const assets = values.cash + values.accountsReceivable + values.fixedAssets + values.otherAssets + Math.max(-values.vatLiability, 0);
  const equityAndLiabilities = values.accountsPayable + Math.max(values.vatLiability, 0) + values.taxLiability + values.loans + values.otherLiabilities + values.equity;
  if (assets > equityAndLiabilities) values.otherLiabilities += assets - equityAndLiabilities;
  if (equityAndLiabilities > assets) values.otherAssets += equityAndLiabilities - assets;
  return values;
}

export function computeModel(state, year, scenarioKey = 'mostLikely') {
  const numericYear = Number(year);
  const merged = mergeActualAndPlan(state, numericYear, scenarioKey);
  const categories = merged.categories;
  const revenue = categories.revenue || zeros();
  const directCosts = categories.directCosts || zeros();
  const opex = categories.opex || zeros();
  const personnel = categories.personnel || zeros();
  const depreciation = categories.depreciation || zeros();
  const financialNet = categories.financialNet || zeros();
  const grossProfit = subtract(revenue, directCosts);
  const ebit = subtract(subtract(subtract(grossProfit, opex), personnel), depreciation);
  const preTax = subtract(ebit, financialNet);
  const tax = preTax.map(value => value > 0 ? value * number(state.company.taxRate) : 0);
  const netIncome = subtract(preTax, tax);
  Object.assign(categories, { grossProfit, ebit, preTax, tax, netIncome });

  const opening = balancedOpening(state.company.opening || {});
  const actualCashMovement = merged.actual.cashMovement.map((value, month) => month <= merged.closed ? number(value) : 0);
  const vatPayments = vatSchedule(merged.outputVat, merged.inputVat, opening.vatLiability, state.company.vatFrequencyMonths);
  const taxPayments = shift(tax.map((value, month) => month <= merged.closed ? 0 : value), 1);
  const forecastCashMovement = subtract(
    merged.cashReceipts,
    add(merged.supplierPayments, merged.payrollPayments, merged.financialPayments, vatPayments, taxPayments)
  );
  const netCashFlow = add(actualCashMovement, forecastCashMovement);
  const closingCash = cumulative(netCashFlow, opening.cash);

  const balance = {
    cash: [...closingCash], accountsReceivable: zeros(), contractAsset: zeros(), fixedAssets: zeros(), otherAssets: zeros(),
    accountsPayable: zeros(), deferredRevenue: zeros(), vatLiability: zeros(), taxLiability: zeros(), loans: zeros(),
    otherLiabilities: zeros(), equity: zeros(), totalAssets: zeros(), totalEquityLiabilities: zeros(), check: zeros()
  };
  let ar = opening.accountsReceivable;
  let contractPosition = 0;
  let fixedAssets = opening.fixedAssets;
  let otherAssets = opening.otherAssets;
  let ap = opening.accountsPayable;
  let vatPosition = opening.vatLiability;
  let taxLiability = opening.taxLiability;
  let loans = opening.loans;
  let otherLiabilities = opening.otherLiabilities;
  let equityMovements = 0;

  for (let month = 0; month < 12; month += 1) {
    if (month <= merged.closed) {
      const movements = merged.actual.balanceMovements;
      ar += number(movements.accountsReceivable?.[month]);
      fixedAssets += number(movements.fixedAssets?.[month]);
      otherAssets += number(movements.otherAssets?.[month]);
      ap += number(movements.accountsPayable?.[month]);
      vatPosition += number(movements.vat?.[month]);
      taxLiability += number(movements.taxLiability?.[month]);
      loans += number(movements.loans?.[month]);
      otherLiabilities += number(movements.otherLiabilities?.[month]);
      equityMovements += number(movements.equity?.[month]);
    } else {
      ar += number(merged.invoices[month]) + number(merged.outputVat[month]) - number(merged.cashReceipts[month]);
      contractPosition += number(revenue[month]) - number(merged.invoices[month]);
      ap += number(merged.supplierBills[month]) + number(merged.inputVat[month]) - number(merged.supplierPayments[month]);
      vatPosition += number(merged.outputVat[month]) - number(merged.inputVat[month]) - number(vatPayments[month]);
      taxLiability += number(tax[month]) - number(taxPayments[month]);
      fixedAssets -= number(depreciation[month]);
    }

    const equity = opening.equity + equityMovements + sum(netIncome.slice(0, month + 1));
    const contractAsset = Math.max(contractPosition, 0);
    const deferredRevenue = Math.max(-contractPosition, 0);
    const vatAsset = Math.max(-vatPosition, 0);
    const vatLiability = Math.max(vatPosition, 0);
    const totalAssets = number(closingCash[month]) + ar + contractAsset + fixedAssets + otherAssets + vatAsset;
    const totalEquityLiabilities = ap + deferredRevenue + vatLiability + taxLiability + loans + otherLiabilities + equity;

    balance.accountsReceivable[month] = ar;
    balance.contractAsset[month] = contractAsset;
    balance.fixedAssets[month] = fixedAssets;
    balance.otherAssets[month] = otherAssets + vatAsset;
    balance.accountsPayable[month] = ap;
    balance.deferredRevenue[month] = deferredRevenue;
    balance.vatLiability[month] = vatLiability;
    balance.taxLiability[month] = taxLiability;
    balance.loans[month] = loans;
    balance.otherLiabilities[month] = otherLiabilities;
    balance.equity[month] = equity;
    balance.totalAssets[month] = totalAssets;
    balance.totalEquityLiabilities[month] = totalEquityLiabilities;
    balance.check[month] = totalAssets - totalEquityLiabilities;
  }

  const totalRevenue = sum(revenue);
  const totalDirectCosts = sum(directCosts);
  const contributionMargin = totalRevenue ? (totalRevenue - totalDirectCosts) / totalRevenue : 0;
  const fixedCosts = sum(opex) + sum(personnel) + sum(depreciation);
  const breakEvenRevenue = contributionMargin ? fixedCosts / contributionMargin : Infinity;
  const minCash = Math.min(...closingCash);

  return {
    year: numericYear,
    scenarioKey,
    categories,
    pnl: { revenue, directCosts, grossProfit, opex, personnel, depreciation, ebit, financialNet, preTax, tax, netIncome },
    cashFlow: {
      receipts: merged.cashReceipts,
      supplierPayments: merged.supplierPayments,
      payrollPayments: merged.payrollPayments,
      financialPayments: merged.financialPayments,
      vatPayments,
      taxPayments,
      netCashFlow,
      closingCash
    },
    balance,
    analytics: {
      totalRevenue,
      totalEBIT: sum(ebit),
      totalNetIncome: sum(netIncome),
      contributionMargin,
      fixedCosts,
      breakEvenRevenue,
      revenueGapToBreakEven: Math.max(0, breakEvenRevenue - totalRevenue),
      minCash,
      minCashMonth: closingCash.indexOf(minCash),
      cashPositiveMonth: netCashFlow.findIndex((value, month) => month > merged.closed && value > 0),
      yearEndCash: closingCash[11]
    },
    dataQuality: {
      unmappedActualRows: merged.actual.unmapped,
      balanceCheck: Math.max(...balance.check.map(value => Math.abs(number(value)))),
      closedMonth: merged.closed
    }
  };
}

export function scenarioModels(state, year) {
  return Object.fromEntries(Object.keys(state.scenarios).map(key => [key, computeModel(state, year, key)]));
}

export function calculateFilingDeadline(fiscalYearEnd, continuedGeneralMeeting = false) {
  const source = new Date(`${fiscalYearEnd}T12:00:00`);
  const monthsToAdd = continuedGeneralMeeting ? 9 : 7;
  const rawMonth = source.getMonth() + monthsToAdd;
  const targetYear = source.getFullYear() + Math.floor(rawMonth / 12);
  const targetMonth = rawMonth % 12;
  const finalDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(source.getDate(), finalDay), 12, 0, 0);
}

export function complianceReadiness(state, model, today = new Date()) {
  const checklist = state.compliance?.checklist || {};
  const completed = Object.values(checklist).filter(Boolean).length;
  const total = Math.max(1, Object.keys(checklist).length);
  const deadline = calculateFilingDeadline(state.company.fiscalYearEnd, Boolean(state.compliance?.continuedGeneralMeeting));
  const daysRemaining = Math.ceil((deadline - today) / 86400000);
  const checks = [
    { key: 'balanced', label: 'Balansräkningen balanserar', ok: model.dataQuality.balanceCheck < 1 },
    { key: 'mapped', label: 'Alla bokföringsrader är mappade', ok: model.dataQuality.unmappedActualRows === 0 },
    { key: 'cash', label: 'Ingen negativ prognostiserad kassa', ok: model.analytics.minCash >= 0 },
    { key: 'equity', label: 'Eget kapital är positivt vid årets slut', ok: model.balance.equity[11] > 0 }
  ];
  const automatedScore = checks.filter(item => item.ok).length / checks.length;
  return {
    deadline,
    daysRemaining,
    checklistProgress: completed / total,
    automatedScore,
    overallScore: (completed / total) * 0.55 + automatedScore * 0.45,
    checks
  };
}

export const helpers = { zeros, sum, add, subtract, multiply, shift, cumulative };

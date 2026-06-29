export const MONTHS_SV = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
export const MONTHS_LONG_SV = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

export const ACCOUNT_HIERARCHY = [
  { key: 'revenue', label: 'Intäkter', children: [
    { key: 'programme', label: 'Program' }, { key: 'consulting', label: 'Konsultarvode' },
    { key: 'workshop', label: 'Workshops / keynotes' }, { key: 'events', label: 'Events' },
    { key: 'coaching', label: 'Coaching' }, { key: 'otherRevenue', label: 'Övriga intäkter' },
    { key: 'egenInsats', label: 'Egen insats' }
  ]},
  { key: 'directCosts', label: 'Direkta kostnader', children: [
    { key: 'travel', label: 'Resor och logi' }, { key: 'materials', label: 'Material' },
    { key: 'platform', label: 'Plattform och projektlicenser' }, { key: 'otherDirect', label: 'Övriga direkta kostnader' }
  ]},
  { key: 'grossProfit', label: 'Bruttovinst', formula: true },
  { key: 'opex', label: 'Driftskostnader', children: [
    { key: 'technology', label: 'Teknik och programvaror' }, { key: 'marketing', label: 'Marknadsföring' },
    { key: 'administration', label: 'Administration' }, { key: 'professional', label: 'Externa tjänster' },
    { key: 'otherOpex', label: 'Övrig drift' }
  ]},
  { key: 'personnel', label: 'Personalkostnader', children: [
    { key: 'salary', label: 'Löner' }, { key: 'socialFees', label: 'Sociala avgifter' },
    { key: 'pension', label: 'Pension och övrigt' }
  ]},
  { key: 'depreciation', label: 'Avskrivningar' },
  { key: 'ebit', label: 'Rörelseresultat (EBIT)', formula: true },
  { key: 'financialNet', label: 'Finansnetto' },
  { key: 'preTax', label: 'Resultat före skatt', formula: true },
  { key: 'tax', label: 'Skatt' },
  { key: 'netIncome', label: 'Årets resultat', formula: true }
];

const zeros = () => Array(12).fill(0);
const sum = values => values.reduce((total, value) => total + Number(value || 0), 0);
const add = (...arrays) => arrays[0].map((_, index) => arrays.reduce((total, array) => total + Number(array[index] || 0), 0));
const subtract = (a, b) => a.map((value, index) => Number(value || 0) - Number(b[index] || 0));
const multiply = (array, factor) => array.map(value => Number(value || 0) * factor);
const shift = (array, months) => {
  const result = zeros();
  array.forEach((value, index) => {
    const target = index + Number(months || 0);
    if (target >= 0 && target < 12) result[target] += Number(value || 0);
  });
  return result;
};
const cumulative = (array, opening = 0) => {
  let balance = Number(opening || 0);
  return array.map(value => (balance += Number(value || 0)));
};

export function classifyAccount(accountCode) {
  const code = Number.parseInt(String(accountCode || '').replace(/\D/g, ''), 10) || 0;
  const first = Math.floor(code / 1000);
  const classification = { statement: 'unknown', category: 'unmapped', subCategory: 'unmapped', normalSign: 1 };
  if (code >= 1900 && code < 2000) return { statement: 'balance', category: 'cash', subCategory: 'bank', normalSign: 1 };
  if (code >= 1500 && code < 1600) return { statement: 'balance', category: 'accountsReceivable', subCategory: 'receivables', normalSign: 1 };
  if (code >= 1200 && code < 1300) return { statement: 'balance', category: 'fixedAssets', subCategory: 'fixedAssets', normalSign: 1 };
  if (code >= 1000 && code < 2000) return { statement: 'balance', category: 'otherAssets', subCategory: 'otherAssets', normalSign: 1 };
  if (code >= 2440 && code < 2450) return { statement: 'balance', category: 'accountsPayable', subCategory: 'payables', normalSign: -1 };
  if ((code >= 2610 && code < 2630) || (code >= 2640 && code < 2650)) return { statement: 'balance', category: 'vat', subCategory: code >= 2640 ? 'inputVat' : 'outputVat', normalSign: -1 };
  if (code >= 2500 && code < 2600) return { statement: 'balance', category: 'taxLiability', subCategory: 'tax', normalSign: -1 };
  if (code >= 2300 && code < 2400) return { statement: 'balance', category: 'loans', subCategory: 'loans', normalSign: -1 };
  if (code >= 2000 && code < 2100) return { statement: 'balance', category: 'equity', subCategory: 'equity', normalSign: -1 };
  if (code >= 2000 && code < 3000) return { statement: 'balance', category: 'otherLiabilities', subCategory: 'otherLiabilities', normalSign: -1 };
  if (first === 3) {
    let subCategory = 'otherRevenue';
    if (code >= 3000 && code < 3100) subCategory = 'programme';
    else if (code >= 3100 && code < 3200) subCategory = 'consulting';
    else if (code >= 3200 && code < 3300) subCategory = 'workshop';
    else if (code >= 3300 && code < 3400) subCategory = 'events';
    else if (code >= 3400 && code < 3500) subCategory = 'coaching';
    return { statement: 'pnl', category: 'revenue', subCategory, normalSign: -1 };
  }
  if (first === 4) return { statement: 'pnl', category: 'directCosts', subCategory: code < 4300 ? 'materials' : code < 4600 ? 'platform' : 'otherDirect', normalSign: 1 };
  if (first === 5 || first === 6) {
    let subCategory = 'otherOpex';
    if (code >= 5400 && code < 5500) subCategory = 'technology';
    else if (code >= 5900 && code < 6000) subCategory = 'marketing';
    else if (code >= 6000 && code < 7000) subCategory = code >= 6500 && code < 6600 ? 'professional' : 'administration';
    return { statement: 'pnl', category: 'opex', subCategory, normalSign: 1 };
  }
  if (code >= 7000 && code < 7700) {
    const subCategory = code < 7100 ? 'salary' : code < 7600 ? 'socialFees' : 'pension';
    return { statement: 'pnl', category: 'personnel', subCategory, normalSign: 1 };
  }
  if (code >= 7800 && code < 7900) return { statement: 'pnl', category: 'depreciation', subCategory: 'depreciation', normalSign: 1 };
  if (code >= 8000 && code < 8900) return { statement: 'pnl', category: 'financialNet', subCategory: 'financialNet', normalSign: code < 8400 ? -1 : 1 };
  if (code >= 8900 && code < 9000) return { statement: 'pnl', category: 'tax', subCategory: 'tax', normalSign: 1 };
  return classification;
}

export function createDefaultState() {
  const currentYear = new Date().getFullYear();
  const standardWeights = [0.06,0.06,0.07,0.08,0.08,0.08,0.06,0.06,0.1,0.13,0.12,0.1];
  return {
    version: 2,
    company: {
      name: 'Inner Group AB', organisationNumber: '', currency: 'SEK', language: 'sv',
      fiscalYearStart: `${currentYear}-01-01`, fiscalYearEnd: `${currentYear}-12-31`,
      vatRate: 0.25, vatFrequencyMonths: 3, taxRate: 0.206,
      opening: { cash: 25000, accountsReceivable: 0, fixedAssets: 0, otherAssets: 0, accountsPayable: 0, vatLiability: 0, taxLiability: 0, loans: 0, otherLiabilities: 0, equity: 25000 }
    },
    selectedYear: currentYear,
    lastClosedMonthByYear: { [currentYear]: -1 },
    planModeByYear: { [currentYear]: 'projects', [currentYear + 1]: 'target' },
    targets: [
      { year: currentYear + 1, annualRevenue: 2000000, directCostRatio: 0.16, opexAnnual: 280000, personnelAnnual: 900000, depreciationAnnual: 0, financialNetAnnual: 0, monthlyWeights: standardWeights }
    ],
    projects: [],
    fixedCosts: [],
    actuals: [],
    scenarios: {
      downside: { label: 'Worst case', revenueMultiplier: 0.8, directCostMultiplier: 1.08, fixedCostMultiplier: 1.05, collectionDelayMonths: 1, paymentDelayMonths: 0 },
      mostLikely: { label: 'Most likely', revenueMultiplier: 1, directCostMultiplier: 1, fixedCostMultiplier: 1, collectionDelayMonths: 0, paymentDelayMonths: 0 },
      upside: { label: 'Best case', revenueMultiplier: 1.18, directCostMultiplier: 0.97, fixedCostMultiplier: 1.02, collectionDelayMonths: 0, paymentDelayMonths: 0 }
    },
    compliance: {
      framework: 'K2', checklist: {
        bankReconciled: false, receivablesReviewed: false, payablesReviewed: false, vatReconciled: false,
        payrollReconciled: false, fixedAssetsReviewed: false, accrualsReviewed: false, equityReviewed: false,
        taxReviewed: false, boardApproved: false, signed: false, filed: false
      }
    }
  };
}

function actualMonthly(state, year) {
  const result = {
    categories: {}, balanceMovements: {}, cashMovement: zeros(), monthsWithData: new Set(), unmapped: 0
  };
  const ensure = (object, key) => { if (!object[key]) object[key] = zeros(); return object[key]; };
  state.actuals.filter(row => Number(row.year) === Number(year)).forEach(row => {
    const month = Math.max(0, Math.min(11, Number(row.month || 1) - 1));
    const classification = row.classification || classifyAccount(row.accountCode);
    const signed = Number(row.signedAmount ?? (Number(row.debit || 0) - Number(row.credit || 0)));
    result.monthsWithData.add(month);
    if (classification.statement === 'pnl') {
      const managementAmount = signed * Number(classification.normalSign || 1);
      ensure(result.categories, classification.category)[month] += managementAmount;
      ensure(result.categories, classification.subCategory)[month] += managementAmount;
    } else if (classification.statement === 'balance') {
      const movement = signed * Number(classification.normalSign || 1);
      ensure(result.balanceMovements, classification.category)[month] += movement;
      if (classification.category === 'cash') result.cashMovement[month] += signed;
    } else {
      result.unmapped += 1;
    }
  });
  return result;
}

function normalizeWeights(weights) {
  const values = Array.isArray(weights) && weights.length === 12 ? weights.map(Number) : Array(12).fill(1 / 12);
  const total = sum(values);
  return total ? values.map(value => value / total) : Array(12).fill(1 / 12);
}

function projectDriver(project, scenario) {
  const revenue = zeros(); const invoices = zeros(); const directCosts = zeros(); const supplierBills = zeros();
  const count = Number(project.count || 0) * Number(scenario.revenueMultiplier || 1);
  const totalRevenue = count * Number(project.price || 0) * Number(project.probability ?? 1);
  const totalDirectCost = Number(project.count || 0) * Number(project.directCostPerUnit || 0) * Number(project.probability ?? 1) * Number(scenario.directCostMultiplier || 1);
  const start = Math.max(0, Number(project.startMonth || 1) - 1);
  const end = Math.max(start, Math.min(11, Number(project.endMonth || project.startMonth || 1) - 1));
  const duration = end - start + 1;
  let weights = Array(duration).fill(1 / duration);
  if (project.phasing === 'custom' && Array.isArray(project.monthlyWeights)) {
    const full = normalizeWeights(project.monthlyWeights);
    weights = full.slice(start, end + 1);
    const localTotal = sum(weights); if (localTotal) weights = weights.map(value => value / localTotal);
  }
  weights.forEach((weight, offset) => {
    revenue[start + offset] += totalRevenue * weight;
    directCosts[start + offset] += totalDirectCost * weight;
    supplierBills[start + offset] += totalDirectCost * weight;
  });
  if (project.invoiceTiming === 'upfront') invoices[start] += totalRevenue;
  else if (project.invoiceTiming === 'thirtySeventy') { invoices[start] += totalRevenue * 0.3; invoices[end] += totalRevenue * 0.7; }
  else revenue.forEach((value, month) => { invoices[month] += value; });
  return { revenue, invoices, directCosts, supplierBills, vatRate: Number(project.vatRate ?? 0.25), collectionDelay: Number(project.collectionDelayMonths || 0) + Number(scenario.collectionDelayMonths || 0), supplierDelay: Number(project.supplierDelayMonths || 0) + Number(scenario.paymentDelayMonths || 0) };
}

function plannedMonthly(state, year, scenarioKey) {
  const scenario = state.scenarios[scenarioKey] || state.scenarios.mostLikely;
  const categories = {}; const ensure = key => { if (!categories[key]) categories[key] = zeros(); return categories[key]; };
  let invoices = zeros(); let supplierBills = zeros(); let cashReceipts = zeros(); let supplierPayments = zeros(); let outputVat = zeros(); let inputVat = zeros();
  const mode = state.planModeByYear[year] || 'projects';
  const target = state.targets.find(item => Number(item.year) === Number(year));
  if (mode === 'target' && target) {
    const weights = normalizeWeights(target.monthlyWeights);
    const revenue = weights.map(weight => Number(target.annualRevenue || 0) * Number(scenario.revenueMultiplier || 1) * weight);
    const direct = revenue.map(value => value * Number(target.directCostRatio || 0) * Number(scenario.directCostMultiplier || 1));
    categories.revenue = revenue; categories.otherRevenue = [...revenue]; categories.directCosts = direct; categories.otherDirect = [...direct];
    invoices = [...revenue]; supplierBills = [...direct];
    outputVat = multiply(invoices, Number(state.company.vatRate || 0)); inputVat = multiply(supplierBills, Number(state.company.vatRate || 0));
    cashReceipts = shift(add(invoices, outputVat), Number(scenario.collectionDelayMonths || 0));
    supplierPayments = shift(add(supplierBills, inputVat), Number(scenario.paymentDelayMonths || 0));
    categories.opex = Array(12).fill(Number(target.opexAnnual || 0) * Number(scenario.fixedCostMultiplier || 1) / 12);
    categories.otherOpex = [...categories.opex];
    categories.personnel = Array(12).fill(Number(target.personnelAnnual || 0) * Number(scenario.fixedCostMultiplier || 1) / 12);
    categories.salary = [...categories.personnel];
    categories.depreciation = Array(12).fill(Number(target.depreciationAnnual || 0) / 12);
    categories.financialNet = Array(12).fill(Number(target.financialNetAnnual || 0) / 12);
  } else {
    state.projects.filter(project => Number(project.year) === Number(year)).forEach(project => {
      const driver = projectDriver(project, scenario);
      const subCategory = project.revenueSubCategory || 'otherRevenue';
      ensure('revenue').forEach((_, month) => {
        ensure('revenue')[month] += driver.revenue[month]; ensure(subCategory)[month] += driver.revenue[month];
        ensure('directCosts')[month] += driver.directCosts[month]; ensure(project.directCostSubCategory || 'otherDirect')[month] += driver.directCosts[month];
      });
      invoices = add(invoices, driver.invoices); supplierBills = add(supplierBills, driver.supplierBills);
      const projectOutputVat = multiply(driver.invoices, driver.vatRate); const projectInputVat = multiply(driver.supplierBills, driver.vatRate);
      outputVat = add(outputVat, projectOutputVat); inputVat = add(inputVat, projectInputVat);
      cashReceipts = add(cashReceipts, shift(add(driver.invoices, projectOutputVat), driver.collectionDelay));
      supplierPayments = add(supplierPayments, shift(add(driver.supplierBills, projectInputVat), driver.supplierDelay));
    });
    state.fixedCosts.filter(cost => Number(cost.year) === Number(year)).forEach(cost => {
      const values = (cost.monthly || zeros()).map(value => Number(value || 0) * Number(scenario.fixedCostMultiplier || 1));
      ensure(cost.category || 'opex').forEach((_, month) => { ensure(cost.category || 'opex')[month] += values[month]; ensure(cost.subCategory || 'otherOpex')[month] += values[month]; });
      if (cost.category !== 'personnel' && cost.category !== 'depreciation' && cost.category !== 'financialNet') {
        supplierBills = add(supplierBills, values); const vat = multiply(values, Number(cost.vatRate ?? state.company.vatRate ?? 0)); inputVat = add(inputVat, vat); supplierPayments = add(supplierPayments, shift(add(values, vat), Number(cost.paymentDelayMonths || 0) + Number(scenario.paymentDelayMonths || 0)));
      }
    });
  }
  ['revenue','directCosts','opex','personnel','depreciation','financialNet'].forEach(key => { if (!categories[key]) categories[key] = zeros(); });
  return { categories, invoices, supplierBills, cashReceipts, supplierPayments, outputVat, inputVat };
}

function mergeActualAndPlan(state, year, scenarioKey) {
  const actual = actualMonthly(state, year); const plan = plannedMonthly(state, year, scenarioKey);
  const closed = Number(state.lastClosedMonthByYear[year] ?? -1);
  const categories = {};
  const keys = new Set([...Object.keys(actual.categories), ...Object.keys(plan.categories)]);
  keys.forEach(key => {
    categories[key] = zeros().map((_, month) => month <= closed ? Number(actual.categories[key]?.[month] || 0) : Number(plan.categories[key]?.[month] || 0));
  });
  const usePlanAfterClose = array => array.map((value, month) => month <= closed ? 0 : Number(value || 0));
  return {
    actual, categories,
    invoices: usePlanAfterClose(plan.invoices), supplierBills: usePlanAfterClose(plan.supplierBills),
    cashReceipts: usePlanAfterClose(plan.cashReceipts), supplierPayments: usePlanAfterClose(plan.supplierPayments),
    outputVat: usePlanAfterClose(plan.outputVat), inputVat: usePlanAfterClose(plan.inputVat), closed
  };
}

function calculateVatPayments(outputVat, inputVat, openingVat, frequency) {
  const payments = zeros(); let accrued = Number(openingVat || 0); const step = Math.max(1, Number(frequency || 3));
  for (let month = 0; month < 12; month += 1) {
    accrued += Number(outputVat[month] || 0) - Number(inputVat[month] || 0);
    const periodEnd = (month + 1) % step === 0;
    if (periodEnd && month + 1 < 12 && accrued > 0) { payments[month + 1] = accrued; accrued = 0; }
  }
  return payments;
}

export function computeModel(state, year, scenarioKey = 'mostLikely') {
  const merged = mergeActualAndPlan(state, Number(year), scenarioKey);
  const c = merged.categories;
  const revenue = c.revenue || zeros(); const directCosts = c.directCosts || zeros(); const opex = c.opex || zeros(); const personnel = c.personnel || zeros(); const depreciation = c.depreciation || zeros(); const financialNet = c.financialNet || zeros();
  const grossProfit = subtract(revenue, directCosts);
  const ebit = subtract(subtract(subtract(grossProfit, opex), personnel), depreciation);
  const preTax = subtract(ebit, financialNet);
  const tax = preTax.map(value => value > 0 ? value * Number(state.company.taxRate || 0) : 0);
  const netIncome = subtract(preTax, tax);
  c.grossProfit = grossProfit; c.ebit = ebit; c.preTax = preTax; c.tax = tax; c.netIncome = netIncome;

  const opening = state.company.opening || {};
  const actualCashMovement = merged.actual.cashMovement.map((value, month) => month <= merged.closed ? value : 0);
  const vatPayments = calculateVatPayments(merged.outputVat, merged.inputVat, opening.vatLiability, state.company.vatFrequencyMonths);
  const payrollPayments = personnel.map((value, month) => month <= merged.closed ? 0 : value);
  const taxPayments = zeros();
  const forecastCashMovement = subtract(subtract(subtract(merged.cashReceipts, merged.supplierPayments), payrollPayments), add(vatPayments, taxPayments));
  const cashMovement = add(actualCashMovement, forecastCashMovement);
  const cash = cumulative(cashMovement, opening.cash);

  const balance = { cash, accountsReceivable: zeros(), contractAsset: zeros(), fixedAssets: zeros(), otherAssets: zeros(), accountsPayable: zeros(), deferredRevenue: zeros(), vatLiability: zeros(), taxLiability: zeros(), loans: zeros(), otherLiabilities: zeros(), equity: zeros(), totalAssets: zeros(), totalEquityLiabilities: zeros(), check: zeros() };
  let ar = Number(opening.accountsReceivable || 0), contract = 0, fixedAssets = Number(opening.fixedAssets || 0), otherAssets = Number(opening.otherAssets || 0), ap = Number(opening.accountsPayable || 0), vat = Number(opening.vatLiability || 0), taxLiability = Number(opening.taxLiability || 0), loans = Number(opening.loans || 0), otherLiabilities = Number(opening.otherLiabilities || 0), equityOpening = Number(opening.equity || 0);
  const openingKnownAssets = Number(opening.cash || 0) + ar + fixedAssets + otherAssets;
  const openingKnownLiabilitiesEquity = ap + Math.max(vat,0) + taxLiability + loans + otherLiabilities + equityOpening;
  if (openingKnownAssets > openingKnownLiabilitiesEquity) otherLiabilities += openingKnownAssets - openingKnownLiabilitiesEquity;
  else if (openingKnownLiabilitiesEquity > openingKnownAssets) otherAssets += openingKnownLiabilitiesEquity - openingKnownAssets;
  for (let month = 0; month < 12; month += 1) {
    if (month <= merged.closed) {
      const movement = merged.actual.balanceMovements;
      ar += Number(movement.accountsReceivable?.[month] || 0); fixedAssets += Number(movement.fixedAssets?.[month] || 0); otherAssets += Number(movement.otherAssets?.[month] || 0);
      ap += Number(movement.accountsPayable?.[month] || 0); vat += Number(movement.vat?.[month] || 0); taxLiability += Number(movement.taxLiability?.[month] || 0); loans += Number(movement.loans?.[month] || 0); otherLiabilities += Number(movement.otherLiabilities?.[month] || 0);
    } else {
      const invoiceInclVat = Number(merged.invoices[month] || 0) + Number(merged.outputVat[month] || 0);
      ar += invoiceInclVat - Number(merged.cashReceipts[month] || 0);
      contract += Number(revenue[month] || 0) - Number(merged.invoices[month] || 0);
      ap += Number(merged.supplierBills[month] || 0) + Number(merged.inputVat[month] || 0) - Number(merged.supplierPayments[month] || 0);
      vat += Number(merged.outputVat[month] || 0) - Number(merged.inputVat[month] || 0) - Number(vatPayments[month] || 0);
      taxLiability += Number(tax[month] || 0) - Number(taxPayments[month] || 0);
      fixedAssets -= Number(depreciation[month] || 0);
    }
    const cumulativeProfit = sum(netIncome.slice(0, month + 1));
    const equity = equityOpening + cumulativeProfit;
    const contractAsset = Math.max(contract, 0); const deferredRevenue = Math.max(-contract, 0); const vatAsset = Math.max(-vat, 0); const vatPayable = Math.max(vat, 0);
    const totalAssets = Number(cash[month] || 0) + ar + contractAsset + fixedAssets + otherAssets + vatAsset;
    const totalEL = ap + deferredRevenue + vatPayable + taxLiability + loans + otherLiabilities + equity;
    balance.accountsReceivable[month] = ar; balance.contractAsset[month] = contractAsset; balance.fixedAssets[month] = fixedAssets; balance.otherAssets[month] = otherAssets + vatAsset;
    balance.accountsPayable[month] = ap; balance.deferredRevenue[month] = deferredRevenue; balance.vatLiability[month] = vatPayable; balance.taxLiability[month] = taxLiability; balance.loans[month] = loans; balance.otherLiabilities[month] = otherLiabilities; balance.equity[month] = equity; balance.totalAssets[month] = totalAssets; balance.totalEquityLiabilities[month] = totalEL; balance.check[month] = totalAssets - totalEL;
  }

  const cashFlow = { receipts: merged.cashReceipts, supplierPayments: merged.supplierPayments, payrollPayments, vatPayments, taxPayments, netCashFlow: cashMovement, closingCash: cash };
  const totalRevenue = sum(revenue); const totalDirect = sum(directCosts); const contributionMargin = totalRevenue ? (totalRevenue - totalDirect) / totalRevenue : 0; const fixedCosts = sum(opex) + sum(personnel) + sum(depreciation); const breakEvenRevenue = contributionMargin ? fixedCosts / contributionMargin : Infinity;
  const cashPositiveMonth = cashFlow.netCashFlow.findIndex((value, month) => month > merged.closed && value > 0);
  const minCash = Math.min(...cash); const minCashMonth = cash.indexOf(minCash);
  const dataQuality = { unmappedActualRows: merged.actual.unmapped, balanceCheck: Math.max(...balance.check.map(Math.abs)), closedMonth: merged.closed };
  return { year: Number(year), scenarioKey, categories: c, pnl: { revenue, directCosts, grossProfit, opex, personnel, depreciation, ebit, financialNet, preTax, tax, netIncome }, cashFlow, balance, analytics: { totalRevenue, totalEBIT: sum(ebit), totalNetIncome: sum(netIncome), contributionMargin, fixedCosts, breakEvenRevenue, revenueGapToBreakEven: Math.max(0, breakEvenRevenue - totalRevenue), minCash, minCashMonth, cashPositiveMonth, yearEndCash: cash[11] }, dataQuality };
}

export function scenarioModels(state, year) {
  return Object.fromEntries(Object.keys(state.scenarios).map(key => [key, computeModel(state, year, key)]));
}

export function calculateFilingDeadline(fiscalYearEnd) {
  const source = new Date(`${fiscalYearEnd}T12:00:00`);
  const targetMonth = source.getMonth() + 7;
  const targetYear = source.getFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  const finalDay = new Date(targetYear, month + 1, 0).getDate();
  return new Date(targetYear, month, Math.min(source.getDate(), finalDay), 12, 0, 0);
}

export function complianceReadiness(state, model, today = new Date()) {
  const checklist = state.compliance?.checklist || {};
  const completed = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(checklist).length || 1;
  const deadline = calculateFilingDeadline(state.company.fiscalYearEnd);
  const daysRemaining = Math.ceil((deadline - today) / 86400000);
  const checks = [
    { key: 'balanced', label: 'Balansräkningen balanserar', ok: model.dataQuality.balanceCheck < 1 },
    { key: 'mapped', label: 'Alla bokföringsrader är mappade', ok: model.dataQuality.unmappedActualRows === 0 },
    { key: 'cash', label: 'Ingen negativ prognostiserad kassa', ok: model.analytics.minCash >= 0 },
    { key: 'equity', label: 'Eget kapital är positivt vid årets slut', ok: model.balance.equity[11] > 0 }
  ];
  const automatedScore = checks.filter(item => item.ok).length / checks.length;
  return { deadline, daysRemaining, checklistProgress: completed / total, automatedScore, overallScore: (completed / total) * 0.55 + automatedScore * 0.45, checks };
}

export const helpers = { sum, add, subtract, multiply, shift, cumulative, zeros };

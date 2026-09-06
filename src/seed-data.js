// Budget baseline extracted from Google Sheet:
// "Ekonomistyrning 2026 | Inner Group joao"
// id: 1Q7j_JipRFxKBCnny4vC8bumZc-9z9xWoe8POLkHFHtc
//
// 2026 result budget totals (exkl. moms):
//   revenue incl. egen insats: 850 000 SEK
//   egen insats (owner contribution): 300 000 SEK -> treated as revenue for 2026 only
//   direct costs: 69 000 SEK
//   opex: 24 199 SEK
//   personnel: 172 104 SEK
//   depreciation / financial net: 0

// prettier-ignore
const BUDGET_2026_LINE_ITEMS = {
  year: 2026,
  revenue: {
    programme:     [0, 0, 0, 0, 0, 0, 0, 0, 120000, 120000, 120000, 0],
    consulting:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 100000, 0, 0],
    workshop:        [0, 0, 0, 0, 15000, 0, 0, 0, 15000, 15000, 15000, 0],
    events:          [0, 0, 0, 0, 0, 0, 0, 0, 0, 15000, 0, 0],
    coaching:        [0, 0, 0, 0, 0, 0, 0, 0, 0, 15000, 0, 0],
    otherRevenue:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    egenInsats:      [25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000]
  },
  directCosts: {
    accommodation:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    travel:          [0, 0, 0, 0, 0, 0, 0, 0, 3000, 3000, 3000, 0],
    materials:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    platform:        [0, 0, 0, 0, 0, 0, 0, 0, 10000, 10000, 10000, 0],
    educationMaterial:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    valueTreeLicense:[0, 0, 0, 0, 0, 0, 0, 0, 10000, 10000, 10000, 0],
    otherDirect:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  opex: {
    webDomainHost:   [0, 549, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250],
    software:        [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500],
    mobile:          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    insurance:       [0, 0, 265, 265, 265, 265, 265, 265, 265, 265, 265, 265],
    bankAccounting:  [0, 2500, 0, 0, 0, 0, 0, 0, 2000, 0, 0, 0],
    marketing:       [0, 0, 0, 0, 0, 0, 0, 0, 5000, 0, 0, 0],
    competenceDevelopment:[0, 0, 0, 3000, 0, 0, 0, 0, 0, 0, 0, 0],
    otherOpex:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  personnel: {
    salary:          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60000, 60000],
    socialFees:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18852, 18852],
    vacationPay:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7200, 7200],
    pension:         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  depreciation:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  financialNet:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

export const BUDGET_2026 = {
  year: BUDGET_2026_LINE_ITEMS.year,
  annualRevenue: 850000,
  directCostRatio: 69000 / 850000,
  opexAnnual: 24199,
  personnelAnnual: 172104,
  depreciationAnnual: 0,
  financialNetAnnual: 0,
  monthlyRevenue: [0, 0, 0, 0, 15000, 0, 0, 0, 135000, 265000, 135000, 0]
};

export const ACTUALS_THROUGH_MAY = [
  {
    id: 'sheet-actual-2026-apr-workshop',
    recordType: 'transaction',
    date: '2026-04-01',
    period: '2026-04',
    year: 2026,
    month: 4,
    voucherId: 'BOK-2026',
    lineId: '1',
    accountCode: '3200',
    accountName: 'Workshops / keynotes',
    description: 'Workshops/keynotes April 2026',
    debit: 0,
    credit: 9109.25,
    signedAmount: -9109.25,
    projectCode: '',
    costCenter: '',
    counterparty: '',
    currency: 'SEK',
    sourceSystem: 'Ekonomistyrning 2026',
    classification: { statement: 'pnl', category: 'revenue', subCategory: 'workshop', normalSign: -1 }
  }
];

export const OWNER_CONTRIBUTION_2026 = 300000;

export function normalizeWeights(monthlyValues) {
  const values = monthlyValues.map(Number);
  const total = values.reduce((sum, v) => sum + v, 0);
  return total ? values.map(v => v / total) : Array(12).fill(1 / 12);
}

export function seed2026Baseline(draft) {
  const targetExisted = draft.targets.some(item => Number(item.year) === 2026);
  if (!targetExisted) {
    draft.targets.push({
      year: BUDGET_2026.year,
      annualRevenue: BUDGET_2026.annualRevenue,
      directCostRatio: BUDGET_2026.directCostRatio,
      opexAnnual: BUDGET_2026.opexAnnual,
      personnelAnnual: BUDGET_2026.personnelAnnual,
      depreciationAnnual: BUDGET_2026.depreciationAnnual,
      financialNetAnnual: BUDGET_2026.financialNetAnnual,
      monthlyWeights: normalizeWeights(BUDGET_2026.monthlyRevenue)
    });
    draft.planModeByYear[2026] = 'target';
  }

  // Attach the explicit 2026 line-item budget so the engine can reconcile exactly
  // to the spreadsheet; 300k egen insats is included as a 2026 revenue line.
  draft.lineItemBudgets = draft.lineItemBudgets || [];
  const existing = draft.lineItemBudgets.find(b => Number(b.year) === 2026);
  if (!existing) {
    draft.lineItemBudgets.push(BUDGET_2026_LINE_ITEMS);
  }

  // Treat 300 000 SEK egen insats as equity injection (owner contribution).
  draft.company.opening.cash = OWNER_CONTRIBUTION_2026;
  draft.company.opening.accountsReceivable = 0;
  draft.company.opening.fixedAssets = 0;
  draft.company.opening.otherAssets = 0;
  draft.company.opening.accountsPayable = 0;
  draft.company.opening.vatLiability = 0;
  draft.company.opening.taxLiability = 0;
  draft.company.opening.loans = 0;
  draft.company.opening.otherLiabilities = 0;
  draft.company.opening.equity = OWNER_CONTRIBUTION_2026;

  // Load actuals through May if none exist for 2026. When a lineItemBudgets
  // exists we keep the explicit spreadsheet months; otherwise actuals drive the
  // closed months as before.
  const has2026Actuals = draft.actuals.some(row => Number(row.year) === 2026);
  if (!has2026Actuals) {
    draft.actuals.push(...ACTUALS_THROUGH_MAY);
    if (!draft.lineItemBudgets?.some(b => Number(b.year) === 2026)) {
      draft.lastClosedMonthByYear[2026] = 4; // May (index 4) = last closed month
    }
  }

  return draft;
}

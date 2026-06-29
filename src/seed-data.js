// Budget baseline extracted from Google Sheet:
// "Ekonomistyrning 2026 | Inner Group joao"
// id: 1Q7j_JipRFxKBCnny4vC8bumZc-9z9xWoe8POLkHFHtc
//
// 2026 result budget totals (exkl. moms):
//   revenue excl. egen insats: 550 000 SEK
//   egen insats (owner contribution): 300 000 SEK -> treated as equity, not revenue
//   direct costs: 69 000 SEK
//   opex: 24 199 SEK
//   personnel: 172 104 SEK
//   depreciation / financial net: 0
//
// Actuals entered through May 2026 in sheet tab "4. Budget vs. Utfall":
//   Apr: Workshops/keynotes 9 109.25
//   (all other visible actual lines are after May or are sheet formulas)

export const BUDGET_2026 = {
  year: 2026,
  annualRevenue: 550000,
  directCostRatio: 69000 / 550000,
  opexAnnual: 24199,
  personnelAnnual: 172104,
  depreciationAnnual: 0,
  financialNetAnnual: 0,
  // Revenue-only monthly totals (egen insats removed)
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

  // Treat 300 000 SEK egen insats as equity injection, not revenue.
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

  // Load actuals through May if none exist for 2026.
  const has2026Actuals = draft.actuals.some(row => Number(row.year) === 2026);
  if (!has2026Actuals) {
    draft.actuals.push(...ACTUALS_THROUGH_MAY);
    draft.lastClosedMonthByYear[2026] = 4; // May (index 4) = last closed month
  }

  return draft;
}

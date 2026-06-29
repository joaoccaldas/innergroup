# Preliminary forecast: remainder of 2026 and full-year 2027

Generated from the current prototype assumptions. This is a management forecast, not statutory accounting output.

## Important data-quality qualification

The 2026 source spreadsheet currently includes `Egen insats` of 25,000 SEK per month inside revenue. The monthly values total 300,000 SEK. Owner contributions or owner loans should normally be classified as financing in cash flow and the balance sheet, not operating revenue in the P&L.

The spreadsheet also contains inconsistent actual-versus-budget formulas. Therefore, the 2026 figures below are a **plan-based preliminary forecast**. Once a CSV or SIE export from the bookkeeping system is loaded, the application will use actuals for closed months and forecast only the remaining open months.

## Scenario assumptions

| Scenario | Revenue | Direct cost | Fixed cost | Collection timing |
|---|---:|---:|---:|---:|
| Worst case | 80% | 108% | 105% | +1 month |
| Most likely | 100% | 100% | 100% | Base |
| Best case | 118% | 97% | 102% | Base |

## 2026 preliminary full-year view

Amounts in SEK.

| Metric | Worst | Most likely | Best |
|---|---:|---:|---:|
| Revenue | 680,000 | 850,000 | 1,003,000 |
| Direct costs | 59,616 | 69,000 | 78,977 |
| Fixed operating and people costs | 206,118 | 196,303 | 200,229 |
| EBIT | 414,266 | 584,697 | 723,794 |
| Net income | 328,927 | 464,249 | 574,692 |
| Break-even revenue | 225,925 | 213,646 | 217,343 |
| Minimum cash | 5,102 | 36,851 | 41,771 |
| Year-end cash | 499,349 | 717,295 | 876,342 |

### Operating-revenue adjustment

If the 300,000 SEK of `Egen insats` is removed from operating revenue, the most-likely operating view becomes approximately:

- Operating revenue: 550,000 SEK
- EBIT: 284,697 SEK
- Net income before any financing classification adjustment: approximately 226,449 SEK

Cash cannot be finalized until the owner funding is classified as either equity, an owner loan, or another financing source and its actual payment dates are confirmed.

## 2027 full-year budget scenarios

The most-likely case uses the requested 2,000,000 SEK annual revenue input, 16% direct cost ratio, 280,000 SEK operating costs and 900,000 SEK personnel costs. The opening balance is linked from the corresponding 2026 scenario.

| Metric | Worst | Most likely | Best |
|---|---:|---:|---:|
| Revenue | 1,600,000 | 2,000,000 | 2,360,000 |
| Direct costs | 276,480 | 320,000 | 366,272 |
| Fixed operating and people costs | 1,239,000 | 1,180,000 | 1,203,600 |
| EBIT | 84,520 | 500,000 | 790,128 |
| Net income | 67,109 | 397,000 | 627,362 |
| Break-even revenue | 1,497,824 | 1,404,762 | 1,424,716 |
| Minimum cash | 105,662 | 577,283 | 770,520 |
| Year-end cash | 310,880 | 1,118,749 | 1,546,421 |
| Year-end equity | 421,036 | 886,249 | 1,227,054 |

## Interpretation

The 2027 most-likely case produces a 25% EBIT margin. The downside remains profitable but operates close to break-even, with only about 102,000 SEK of revenue headroom above break-even. That means delayed sales, lower pricing, additional hiring or slower collections could quickly create pressure.

The strongest management levers are:

1. Confirm the project pipeline behind the 2,000,000 SEK target.
2. Separate owner financing from operating revenue.
3. Load bookkeeping actuals through the canonical CSV or SIE importer.
4. Confirm customer payment terms and project invoicing milestones.
5. Phase personnel costs by actual hiring month rather than evenly across the year.

## Tax and cash timing assumption

The model recognizes estimated corporate tax at year end and carries it as a tax liability into the next year, where the opening liability is paid. This is a simplified management-planning convention. A later production version should model Swedish preliminary tax payments and final tax settlement separately.

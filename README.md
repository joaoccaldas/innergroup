# Inner Group Financial Studio

A local-first financial-planning web app for Inner Group / InnerLoom. It converts business assumptions into a linked P&L, cash-flow forecast, balance sheet, break-even analysis and three automatic scenarios.

## Live site

After GitHub Pages completes its first deployment:

`https://joaoccaldas.github.io/innergroup/`

## Core capabilities

- Current-year actual + forecast
- Full next-year budget
- Project volume, price, probability and phasing
- Invoice timing, VAT and payment delays
- Linked P&L, cash flow and balance sheet
- Automatic worst, most-likely and best cases
- Expandable report rows
- CSV and basic SIE4/4i actuals import
- BAS-account mapping
- Break-even and liquidity warnings
- Browser-local persistence and JSON backups
- Print-to-PDF management pack

## Run locally

Open `index.html` through a local web server, because the application uses ES modules:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Tests

```bash
npm test
```

## Data files

- `schema/actuals.schema.json`: canonical actuals schema
- `data/actuals-template.csv`: import template
- `data/account-mapping.json`: default BAS mapping
- `docs/ACTUALS_IMPORT.md`: import process and conventions

## Important accounting boundary

This application is a management-planning and reporting layer. It is not a statutory bookkeeping system. The accounting system remains the system of record.

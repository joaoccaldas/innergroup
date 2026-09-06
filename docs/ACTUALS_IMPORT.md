# Actuals import contract

The application treats the bookkeeping platform as the system of record. Imported transactions are normalized into a canonical transaction schema and then mapped into management reporting.

## Preferred formats

1. **Canonical CSV** for repeatable integrations and manual exports.
2. **SIE4** for rapid prototyping with Swedish bookkeeping systems.
3. JSON backup for the complete local application state.

## Minimum CSV fields

- `date` or `period`
- `account_code`
- `debit` and `credit`, or `amount_sek`

## Recommended fields

- `voucher_id`
- `line_id`
- `account_name`
- `description`
- `project_code`
- `cost_center`
- `counterparty`
- `vat_rate`
- `vat_amount`
- `source_system`

## Sign convention

- Debit is positive.
- Credit is negative when represented as `amount_sek`.
- When debit and credit columns are supplied, `signedAmount = debit - credit`.

## Mapping

BAS account ranges are mapped into:

- P&L categories
- Balance-sheet categories
- Cash and liquidity
- VAT and tax balances
- Revenue-stream subcategories

The default rules are in `data/account-mapping.json`. Company-specific accounts must be reviewed before reports are treated as reliable.

## Import validation

The prototype checks:

- valid transaction dates
- account presence
- missing voucher identifiers
- unmapped account codes
- total debit versus total credit
- balance-sheet control difference

## Production integration

A production version should use an immutable import batch table with source-file hashes, import timestamps, user attribution, mapping versions and reversal support. It should never silently overwrite statutory bookkeeping data.

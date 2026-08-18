# Sheet schema

## Master (`HisaabDesk — MASTER licenses`)

Owned by `training@sheetomatic.in`. Not shared with customers.

| Tab | Key | Notes |
|---|---|---|
| Tenants | TenantID | One row per shop. `SheetId` is their workbook. |
| Users | UserID / Email | Password is SHA-256(salt + password). Roles: Admin, Owner, Sales, Dispatch, View. |
| Licenses | LicenseID | TRIAL / SUB / ONETIME. Enforce `ValidTill` + 7-day grace. |
| Payments | PaymentID | Razorpay events. |
| Plans | PlanCode | TRIAL, SUB_M, SUB_Y, ONE_12. |
| Audit | — | Login, quote, dispatch, WA. |
| SetupNotes | Key | Delete password rows after first run. |

## Tenant template (copied per shop)

| Tab | Replaces typical AppSheet table | Notes |
|---|---|---|
| Settings | App settings | FirmName, GSTIN, QuoteFooter, InterestPct, DefaultYard |
| Parties | Customers | Phone, credit days, limit |
| Items | Item master | TMT size + grade, HSN, GST% |
| RateList | Daily rates | Append-only. Latest ValidFrom wins. |
| Quotations | Quotes header | TrueMarginPct after freight + credit cost |
| QuoteLines | Quote items | Qty × rate |
| Orders | Sales orders | Created from won quote |
| OrderLines | Order items | QtyOrdered / QtyDispatched |
| Dispatch | Vehicles out | Vehicle, LR, e-way |
| DispatchLines | Dispatch items | Deducts Stock |
| Stock | Yard qty | ItemID + Yard |
| StockMove | Ledger | Never edit by hand |
| Receipts | Collections | Ready for Phase 4 |
| WA_Log | Bot history | SENT / FAIL / SKIPPED |

When the DNM Flora AppSheet workbook is visible, map each live column into this table. Do not rename live client headers until after a copy is taken.

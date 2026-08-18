# Sheet schema

Aligned to the public template **TMT Bars – Sales to Dispatch (AppSheet)**  
https://sheetomatic.com/templates — see `TEMPLATE-TMT-S2D.md`.

## Master (`HisaabDesk — MASTER licenses`)

Owned by `training@sheetomatic.in`. Not shared with customers.

| Tab | Key | Notes |
|---|---|---|
| Tenants | TenantID | One shop. `SheetId` = their TMT workbook. |
| Users | Email | Password hash. Roles: Admin, Owner, Sales, Dispatch, View. |
| Licenses | LicenseID | TRIAL / SUB / ONETIME. `ValidTill` + 7-day grace. |
| Payments | PaymentID | Razorpay or UPI logged. |
| Plans | PlanCode | Include `APP_9999` = ₹9,999 one-time (same as templates page). |
| Audit | — | Login, DO, kanta, WA. |
| SetupNotes | Key | Delete password rows after first run. |

## Tenant template (copy of the AppSheet TMT app)

| Tab | AppSheet job | Notes |
|---|---|---|
| Plants | Plant dropdown | Mill / source |
| Brands | Brand dropdown | Kamdhenu, JSPL, Prime… |
| Parties | Party | Customer or mill |
| Sizes | Size | 8–32 mm, MT/Kg |
| Godowns | Godown | Own yard |
| Vehicles | Vehicle | HR 55 B 1234 |
| PurchaseSauda | Purchase sauda | Buy deal |
| SaleSauda | Sale sauda | Sell deal; link to purchase sauda; Retail/Direct |
| DOs | Delivery Order | Plant, brand, party, size, MT/Kg, status |
| Kanta | Load / unload weigh | Kg + MT |
| Trips | Vehicle track + freight | Load point, unload point |
| GodownStock | Godown qty | Brand + size + godown |
| StockMove | Movement ledger | Do not edit by hand |
| FreightBills | Freight | Per trip |
| PartyPayments | Party payments | Against party / DO |
| Settings | App settings | Firm, default godown, default unit |

DO status: New → Loading → Loaded → In Transit → Dispatched → Delivered.

Do not rename a live client’s headers until a copy of their AppSheet sheet is taken.

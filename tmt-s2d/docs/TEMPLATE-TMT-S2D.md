# Source template: TMT Bars – Sales to Dispatch (AppSheet)

**Live listing:** https://sheetomatic.com/templates  
**Store name:** TMT SALES OPERATIONS  
**Tagline:** TRACK | LOAD | DISPATCH  
**Price today:** ₹9,999 one-time (UPI → CRM confirm → email AppSheet copy link)  
**Client pattern:** DNM Flora / MS TMT traders (direct + retail)

This file is the product spec. HisaabDesk Sheets + Apps Script must speak this language — not a generic quote form.

## What the AppSheet template actually does

From the public card and mockups (DO form, list, vehicle, kanta 23750):

1. **Delivery Order (DO)** — plant, brand, party, size, MT/Kg, date, status  
2. **Retail vs Direct** — two sales lanes on the same stock  
3. **Purchase sauda ↔ sale sauda** — buy deal linked to sell deal  
4. **Kanta** — weigh at **load** and **unload** (kg and MT)  
5. **Vehicle** — number, loading point (plant / godown), in-transit  
6. **Status track** — New → Loading → Loaded → In Transit → Dispatched → Delivered  
7. **Godown** — yard / warehouse qty  
8. **Freight** — per trip / per DO  
9. **Party payments** — what the party paid against the DO  

Screens on the listing: Orders, Pending, Summary, Settings. Phone chrome: Home, Add, List, Profile.

Example mockup values: DO `2021-09-08-01`, plant Smart Real Estate / Shree Ganganagar Steel, brand JSPL Panther / Kamdhenu / Prime, party R.K. Building Materials, 12 mm, 25.000 MT, vehicle `HR 55 B 1234`, kanta 23.750 t.

## Why our first HisaabDesk draft was the wrong spine

| First draft | This template |
|---|---|
| Quote PDF / WhatsApp rate | **DO** is the unit of work |
| Sell rate × qty margin | **Sauda** rate + kanta weight difference |
| Convert quote → order | Load truck → weigh → deliver |
| One “yard stock” | **Godown** + plant + in-transit vehicle |
| No retail split | **Retail vs Direct** |
| No weighbridge | **Kanta load / unload** |

Keep license + Site + login. Replace the tenant workbook with the tables below.

## Tenant workbook (copy of the AppSheet sheet)

| Tab | Purpose | Key fields |
|---|---|---|
| Plants | Rolling mill / source | PlantID, Name, City |
| Brands | TMT brand | BrandID, Name (Kamdhenu, JSPL, Prime…) |
| Parties | Customer / supplier | PartyID, Name, Phone, Type (Party/Mill), City, CreditDays |
| Sizes | 8–32 mm | SizeID, SizeMm, DefaultUnit (MT/KG) |
| Godowns | Own yard | GodownID, Name, City |
| Vehicles | Fleet / hired | VehicleNo, Owner, Phone, Active |
| PurchaseSauda | Buy deal | SaudaID, Date, Plant, Brand, Size, QtyMT, Rate, Party (mill/trader), Status |
| SaleSauda | Sell deal | SaudaID, Date, Party, Brand, Size, QtyMT, Rate, Type (Retail/Direct), LinkedPurchaseSauda, Status |
| DOs | Delivery order | DONo, Date, SaleSaudaID, Plant, Brand, Party, Size, QtyMT, QtyKg, Type, Status, Godown, VehicleNo |
| Kanta | Weighments | KantaID, DONo, When (Load/Unload), WeightKg, WeightMT, SlipNo, At |
| Trips | Vehicle movement | TripID, DONo, VehicleNo, LoadPoint, UnloadPoint, FreightAmt, Status |
| GodownStock | Size+brand+godown | Brand, Size, Godown, QtyMT |
| StockMove | Ledger | Date, Brand, Size, Godown, QtyIn, QtyOut, RefType, RefID |
| FreightBills | Transport cost | BillID, TripID, Amount, Paid |
| PartyPayments | Receipts | PayID, Party, DONo, Amount, Mode, Date |
| Settings | Firm | FirmName, GSTIN, DefaultGodown, DefaultUnit |

DO status values (lock these labels):  
`New` → `Loading` → `Loaded` → `In Transit` → `Dispatched` → `Delivered`  
plus `Pending` on the list filter.

## Money math (this business, not quotation margin)

```
Sale qty billed     = kanta unload MT   (or load MT if party takes plant weigh)
Shortage            = load MT − unload MT
Sale amount         = billed MT × sale sauda rate
Purchase amount     = billed or load MT × purchase sauda rate
Freight             = trip freight
Godown effect       = retail inward / direct outward
Party due           = sale amount + freight (if on party) − payments
```

## How it is sold today vs what we are building

| Today (templates page) | Apps Script product |
|---|---|
| ₹9,999 one-time | Same SKU, plus optional monthly |
| Email AppSheet copy link | Login on Site + tenant Sheet copy |
| Data in buyer’s AppSheet | Data in tenant Sheet; you keep MASTER licenses |

## Screens to build (match the mockups)

1. **Add DO** — Date, Plant, Brand, Party, Size, MT/Kg, Retail/Direct, Sauda link  
2. **Orders list** — DO no, party, size, qty, status dot  
3. **Pending** — not yet Loaded / Delivered  
4. **Trip** — vehicle, kanta load, kanta unload, freight  
5. **Summary** — MT by brand/size, pending payments, godown  
6. **Settings** — plants, brands, parties, godown  

## Still needed for 1:1 column names

The public page has mockups, not the live AppSheet Data tab.  
When `SalesToDispatch-DNMFlora` or the template copy is shared view-only, paste real headers into this file and stop guessing names.

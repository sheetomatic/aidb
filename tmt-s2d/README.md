# HisaabDesk — Sales to Dispatch

Google Sheets + Apps Script web app for Indian TMT / steel traders.

Replaces an AppSheet *SalesToDispatch* stack (quotes → orders → dispatch + WhatsApp Bot) with something Sheetomatic can **sell**:

- Email + password login
- Trial / monthly subscription / 12-month one-time license
- Hindi mobile UI (Google Sites can embed it)
- WhatsApp Cloud API (same role as the AppSheet Bot)
- Razorpay webhook for activation

Source product: **[TMT Bars – Sales to Dispatch (AppSheet)](https://sheetomatic.com/templates)** — ₹9,999, TMT SALES OPERATIONS (DO, sauda, kanta, retail/direct). Spec: `docs/TEMPLATE-TMT-S2D.md`. Reference client: **DNM Flora**.

## Repo

```
tmt-s2d/src/     Apps Script (clasp rootDir)
tmt-s2d/docs/    Deploy + schema
tmt-s2d/sites/   Google Sites copy
```

## Quick start

1. Open `docs/DEPLOY.md`.
2. Deploy as **training@sheetomatic.in**.
3. Run `setupPlatform()`.
4. Log in with the admin password printed in the execution log / SetupNotes.

## Who uses what

| Role | Login | Sees |
|---|---|---|
| Platform admin | training@sheetomatic.in | Create shops, open any tenant |
| Shop owner | their email | Rates, quotes, orders, users |
| Sales | their email | Quotes, convert order |
| Dispatch | their email | Vehicle out, stock down |

## License lock

Every API call (except login / plans) checks `Licenses.ValidTill`. Expired shops hit a paywall. One-time and subscription use the same check; only the payment event differs.

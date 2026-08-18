# Deploy HisaabDesk S2D (training@sheetomatic.in)

Do this from the Google account **training@sheetomatic.in**. Do not run setup on a personal Gmail if you want Sheetomatic to own the data.

## 1. Create the Apps Script project

1. Go to [script.google.com](https://script.google.com) → New project.
2. Name it `HisaabDesk S2D`.
3. Copy every file from `tmt-s2d/src/` into the project (`Code.gs`, `Auth.gs`, … and the `.html` files).
4. Or use clasp:

```bash
cd tmt-s2d
cp .clasp.json.example .clasp.json
# put the script id in .clasp.json
npx @google/clasp login
npx @google/clasp push
```

`appsscript.json` must stay in `src/` (clasp `rootDir`).

## 2. First-run setup

In the script editor: select `setupPlatform` → Run → authorize Drive / Sheets / External requests.

The function returns:

- Master workbook URL (licenses, users, payments)
- Tenant template URL (copied for each shop)
- Admin password for `training@sheetomatic.in`
- Demo shop `demo@dnmflora.test`

Copy the passwords, then delete the password rows on the **SetupNotes** tab.

## 3. Deploy the web app

**Deploy → New deployment → Web app**

| Field | Value |
|---|---|
| Execute as | Me (`training@sheetomatic.in`) |
| Who has access | Anyone |

Copy the `/exec` URL. Open `?page=health` to confirm `setup: true`.

## 4. Script Properties (secrets)

**Project Settings → Script properties**

| Key | Required | Purpose |
|---|---|---|
| `MASTER_SHEET_ID` | set by setup | Master workbook |
| `TEMPLATE_SHEET_ID` | set by setup | Tenant template |
| `PLATFORM_ADMIN_EMAIL` | set by setup | `training@sheetomatic.in` |
| `RAZORPAY_KEY_ID` | for online pay | Checkout |
| `RAZORPAY_KEY_SECRET` | for online pay | Order API |
| `RAZORPAY_WEBHOOK_SECRET` | for online pay | `doPost?path=razorpay` |
| `WA_TOKEN` | for WhatsApp | Cloud API token |
| `WA_PHONE_ID` | for WhatsApp | Phone number id |
| `WA_GRAPH_VERSION` | optional | default `v21.0` |

Never put tokens in the Sheet or in AppSheet Bots.

Razorpay webhook URL:

`https://script.google.com/macros/s/DEPLOYMENT_ID/exec?path=razorpay`

## 5. Google Site (storefront)

1. [sites.google.com](https://sites.google.com) → blank site → `HisaabDesk`.
2. Pages: Home, Pricing, App, Training.
3. On **App**, Embed → the web app `/exec` URL (full width).
4. Custom domain (optional): `app.sheetomatic.in` if Workspace DNS is ready.

If the iframe login fails (cookie), add a button: “Open app” → same `/exec` in a new tab. That is the reliable path.

Paste copy from `tmt-s2d/sites/homepage.html` into the Home page.

## 6. Sell

**Subscription:** customer logs in (trial) → Account → Monthly → Razorpay → webhook extends `Licenses.ValidTill`.

**One-time:** Account → One-time 12 months, or you create the shop from the Admin screen (`training@sheetomatic.in`) with plan `ONE_12`.

**Manual (no Razorpay yet):** Admin → नई दुकान.

## 7. WhatsApp

Same Cloud API you used in the AppSheet Bot. Without `WA_TOKEN`, the app still builds the Hindi quote/dispatch text to paste into WhatsApp.

Install the 9am reminder (optional): run `setupReminders()`.

## 8. Move DNM Flora later

When the live AppSheet sheet is shared view-only:

1. Map each AppSheet table to a tenant tab (see `docs/SCHEMA.md`).
2. Copy parties / items / opening stock into a new tenant sheet.
3. Turn off AppSheet Bots after the first parallel week.

Do not run `setupPlatform` against the client’s existing spreadsheet.

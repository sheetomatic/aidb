# 2-file live install (training@sheetomatic.in)

Google blocks automated sign-in from this Cloud Agent. Use this pack while signed in as **training@sheetomatic.in**. It creates the Script, Sheets, and is ready to sell. Then embed the web app on a Google Site.

## A. Apps Script + Sheets (10 minutes)

1. Chrome → [script.google.com/home](https://script.google.com/home) as **training@sheetomatic.in**
2. **New project** → name `HisaabDesk S2D`
3. Open `Code.gs` in this folder. Select all in the editor → paste **entire** `dist/Code.gs` → Save
4. **+** next to Files → **HTML** → name it exactly `Index` → paste **entire** `dist/Index.html` → Save
5. Select function **`setupPlatform`** → **Run** → **Review permissions** → choose `training@sheetomatic.in` → Allow (Sheets, Drive, external)
6. **Executions** (clock icon) or **View → Logs**: copy
   - `masterUrl`, `templateUrl`
   - `adminEmail` / `adminPassword`
   - `demoEmail` / `demoPassword`
7. Open the master spreadsheet → tab **SetupNotes** → copy passwords → **delete the password rows**
8. **Deploy → New deployment → Web app**
   - Description: `HisaabDesk S2D v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → copy the URL (`/exec`)

## B. Google Site (storefront)

1. [sites.google.com/new](https://sites.google.com/new) → Blank → name **HisaabDesk**
2. **Home** — paste from `tmt-s2d/sites/homepage.html` (replace `WEBAPP_EXEC_URL` with the `/exec` link)
3. **Pricing**
   - Trial 14 days — ₹0
   - Monthly — ₹1,999
   - Yearly — ₹19,999
   - One-time 12 months — ₹14,999
4. **App** — Insert → Embed → the `/exec` URL. Also a text button “ऐप खोलें” linking to the same URL
5. **Training** — `training@sheetomatic.in`
6. **Publish**

## C. First sale test

1. Open `/exec`
2. Log in with **admin** credentials from setup
3. **टेनेंट → नई दुकान** (or use demo `demo@dnmflora.test`)
4. Create a quote → copy WhatsApp text

WhatsApp auto-send and Razorpay: add Script Properties (`WA_TOKEN`, `WA_PHONE_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) after the first shop is live.

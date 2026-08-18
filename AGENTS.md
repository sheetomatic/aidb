# AGENTS.md

Sheetomatic workspace. The runnable product in-repo is **HisaabDesk S2D** (`tmt-s2d/`): a Google Sheets + Apps Script sales-to-dispatch app, plus a local browser preview that does not need Google.

Standard commands and deploy steps live in `tmt-s2d/README.md`, `tmt-s2d/local/README.md`, `tmt-s2d/preview/README.md`, and `tmt-s2d/docs/DEPLOY.md`.

## Cursor Cloud specific instructions

There is no `package.json`, lockfile, or Python project. Do not run `npm install` / `pip install`. The update script is a no-op (`true`) because there are no installable repo dependencies. Python 3 and Node are only used as already-present runtimes.

### What to run here

| Service | Required? | How |
|---|---|---|
| Local HisaabDesk preview | Yes — this is the in-VM app | `python3 -m http.server 8765 --bind 0.0.0.0` from `tmt-s2d/local` (or `tmt-s2d/local/start.sh`) → http://127.0.0.1:8765/ |
| Wiring board | Optional | `python3 -m http.server 8877 --bind 0.0.0.0 --directory tmt-s2d/preview` → http://127.0.0.1:8877/wired.html |
| Live Apps Script / Sheets / Sites | Optional; blocked without an interactive Google login | `tmt-s2d/docs/DEPLOY.md` as **training@sheetomatic.in** |

Both previews default to port **8765** in the docs. In this VM they cannot share that port — keep the app on **8765** and the wiring board on **8877**.

`OPEN-ON-LAPTOP.md` is for a human laptop (file:// or a server on that machine). It does not apply to this VM: start the Python servers here and use the VM browser against `127.0.0.1`.

### Local demo (no Google account)

Shop: `demo@dnmflora.test` / `Demo#1234`  
Platform admin: `training@sheetomatic.in` / `Admin#1234`

State lives in `localStorage` (`hd_s2d_local_db_v1`). Use **Reset data** on the orange banner if quotes/orders look stale. WhatsApp and Razorpay are mocked; quote/dispatch text is still generated.

### Lint / test / build

There is no ESLint, test runner, or bundler. Syntax-check browser JS with `node --check tmt-s2d/local/app.js` and `node --check tmt-s2d/local/mock.js`. Apps Script sources in `tmt-s2d/src/*.gs` are V8 JavaScript plus Google services (`SpreadsheetApp`, etc.) — they are not a Node app and are not started locally.

`clasp` push is optional and needs `tmt-s2d/.clasp.json` plus an interactive `clasp login`. Do not put tokens or generated `.clasp.json` in git.

### Hello-world check

After the local server is up: log in as the shop user, open **कोट**, pick **Sample Contractor**, save a quotation, convert it on **ऑर्डर**, then create a dispatch on **डिस्पैच**. That is the core sales-to-dispatch path.

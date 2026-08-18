# Wiring preview

Open `wired.html` to see **Google Site → Apps Script `/exec` → MASTER + TENANT Sheets**.

This is the same contract as production. Live IDs appear after `setupPlatform()` as `training@sheetomatic.in`.

```bash
python3 -m http.server 8765 --directory tmt-s2d/preview
# http://127.0.0.1:8765/wired.html
```

# Open on your laptop (no server)

`127.0.0.1:8765` and `:8877` only work if **you** start a server on that same laptop. The Cloud Agent cannot do that.

## Easiest: double-click a file

1. Pull branch `cursor/tmt-s2d-apps-script-4c09` (or download the two files from GitHub).
2. In File Explorer / Finder open folder `tmt-s2d`.
3. Double-click:
   - **OPEN-APP.html** — login demo (`demo@dnmflora.test` / `Demo#1234`)
   - **OPEN-WIRING.html** — Site + Script + Sheets board

Use **Chrome** or Edge. Do not open these URLs in the Cloud Agent Simple Browser.

Or download:

- https://raw.githubusercontent.com/sheetomatic/aidb/cursor/tmt-s2d-apps-script-4c09/tmt-s2d/OPEN-APP.html
- https://raw.githubusercontent.com/sheetomatic/aidb/cursor/tmt-s2d-apps-script-4c09/tmt-s2d/OPEN-WIRING.html

Save, then double-click.

## If you still want localhost

Windows: double-click `tmt-s2d/local/start.bat` then open http://127.0.0.1:8765/

Mac/Linux:

```bash
cd tmt-s2d/local
python3 -m http.server 8765 --bind 0.0.0.0
```

If `python3` is unknown, install Python from https://www.python.org/downloads/ and tick **Add to PATH**.

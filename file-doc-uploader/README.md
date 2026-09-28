# FileDoc Capture

HTML form to capture documents with the phone/desktop camera **one by one**, stage them on the form (up to **100 per file number**), then save the whole batch into a **Google Drive folder named for that file number**.

## How it works

1. Enter a **file number** → Start  
2. **Open camera** → frame the page → **Click / Capture**  
3. **Save this photo to form** (repeat, one at a time, max 100)  
4. When finished → **Done — save all to Google Drive**

Drive layout:

```
[Parent folder or My Drive]
  └── File-FN-1042/
        ├── doc-001.jpg
        ├── doc-002.jpg
        └── …
```

## Local demo (this repo)

Open `index.html` in a browser (HTTPS or localhost required for camera):

```bash
cd file-doc-uploader
python3 -m http.server 8080
# visit http://localhost:8080
```

In demo mode, **Done** downloads a JSON batch instead of uploading to Drive.

## Google Drive (Apps Script)

1. Create a new Apps Script project.  
2. Copy `gas/Code.gs`, `gas/Index.html`, and `gas/appsscript.json`.  
3. Optional: set `PARENT_FOLDER_ID` in `Code.gs` to a parent Drive folder.  
4. Deploy → **Web app** → Execute as **Me** → access as needed.  
5. Open the web app URL on phone or desktop.

## Mobile + desktop

- Large tap targets (48px+)  
- `viewport-fit=cover` / safe-area padding  
- Rear camera preferred (`facingMode: environment`) when available  

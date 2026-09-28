# FileDoc Capture

Form that scans document pages into **one PDF** (up to **60 pages**) for a file number, then saves that PDF in a **Google Drive folder named for the file number**.

AppSheet does not include a multi-page document scanner. This form is what you open from AppSheet. A compressed 60-page scan stays under Apps Script’s 50 MB file limit (the form stops at 32 MB).

## AppSheet

1. Deploy the Apps Script web app (steps below) and copy the `/exec` URL.
2. In AppSheet, add an action on the file row:
   - Type: **External: go to a website**
   - Target: `CONCATENATE("https://script.google.com/macros/s/DEPLOYMENT_ID/exec?fileNumber=", ENCODEURL([File Number]))`
   - **Launch external: On**
3. Put that action on the detail view. Launch external opens the phone browser, where the camera works. AppSheet’s in-app browser often blocks the camera, and AppSheet itself cannot scan 50–60 pages into a PDF.

The web app reads `fileNumber` (or `file`) and locks that file number.

## How to scan

1. File number is filled in from AppSheet, or you type it and press **Start**
2. **Open camera** or **Or choose photo**
3. Frame the page → **Click / Capture** → **Add this page**
4. Repeat, up to 60 pages
5. **Done — make PDF**

Each page is resized (longest edge 1500 px), turned into a high-contrast grayscale scan, and placed on its own PDF page.

Drive layout:

```
[Parent folder or My Drive]
  └── File-FN-1042/
        └── File-FN-1042.pdf
```

A later scan of the same file number is saved as `File-FN-1042-2.pdf` so the first PDF is kept.

## Local demo

Camera needs HTTPS or localhost:

```bash
cd file-doc-uploader
python3 -m http.server 8080
# http://localhost:8080
# http://localhost:8080/?fileNumber=FN-1042
```

Check the PDF builder:

```bash
node scan-pdf.test.js
```

In demo mode, **Done — make PDF** downloads the PDF instead of uploading to Drive.

## Google Drive (Apps Script)

1. Create a new Apps Script project.
2. Copy `gas/Code.gs`, `gas/Index.html`, `gas/App.html`, `gas/ScanPdf.html`, and `gas/appsscript.json`.
3. Optional: set `PARENT_FOLDER_ID` in `Code.gs`.
4. Deploy → **Web app** → Execute as **Me** → access as needed.
5. Use that URL in the AppSheet action above.

## Mobile + desktop

- Large tap targets (48px+)
- `viewport-fit=cover` / safe-area padding
- Rear camera preferred (`facingMode: environment`) when available

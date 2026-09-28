/**
 * FileDoc Capture — Google Apps Script backend
 *
 * AppSheet opens this web app with an action:
 *   Type: External: go to a website
 *   Target: CONCATENATE("WEB_APP_URL?fileNumber=", ENCODEURL([File Number]))
 *   Launch external: On
 *
 * Launch external is required. AppSheet's own viewer does not provide a
 * 50–60 page document scanner, and its in-app browser often blocks the camera.
 *
 * Deploy: Deploy → New deployment → Web app
 * Execute as: Me
 * Who has access: Anyone with the link, or your domain, as needed
 *
 * Parent Drive folder: set PARENT_FOLDER_ID, or leave blank to use My Drive root.
 * Each file number gets a folder File-{fileNumber} and one PDF of up to 60 pages.
 */

var PARENT_FOLDER_ID = "";
var MAX_PAGES = 60;
var MAX_PDF_BYTES = 32 * 1024 * 1024;

function doGet(e) {
  var params = (e && e.parameter) || {};
  var raw = params.fileNumber || params.file || "";
  var template = HtmlService.createTemplateFromFile("Index");
  template.prefillFileNumber = sanitizeFileNumber(raw);
  return template.evaluate()
    .setTitle("FileDoc Capture")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * @param {{fileNumber:string, folderName:string, pageCount:number, pdfBase64:string}} payload
 */
function uploadPdf(payload) {
  if (!payload || !payload.fileNumber) {
    throw new Error("File number is required.");
  }
  var pages = Number(payload.pageCount || 0);
  if (!pages || pages < 1) {
    throw new Error("Add at least one page.");
  }
  if (pages > MAX_PAGES) {
    throw new Error("Maximum " + MAX_PAGES + " pages per PDF.");
  }
  if (!payload.pdfBase64) {
    throw new Error("PDF data is missing.");
  }

  var bytes = Utilities.base64Decode(payload.pdfBase64);
  if (!bytes || bytes.length < 5) {
    throw new Error("PDF data is empty.");
  }
  if (bytes.length > MAX_PDF_BYTES) {
    throw new Error("PDF is larger than 32 MB. Remove some pages and try again.");
  }
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    throw new Error("File is not a PDF.");
  }

  var folderName = sanitizeFolderName(payload.folderName || ("File-" + payload.fileNumber));
  var folder = getOrCreateFileFolder(folderName);
  var name = uniquePdfName(folder, folderName + ".pdf");
  var blob = Utilities.newBlob(bytes, "application/pdf", name);
  var file = folder.createFile(blob);
  file.setDescription(
    "File number: " + payload.fileNumber +
    " | Pages: " + pages +
    " | Uploaded: " + new Date().toISOString()
  );

  return {
    ok: true,
    fileNumber: String(payload.fileNumber),
    folderName: folder.getName(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    pageCount: pages,
    bytes: bytes.length
  };
}

function getOrCreateFileFolder(folderName) {
  var parent = PARENT_FOLDER_ID
    ? DriveApp.getFolderById(PARENT_FOLDER_ID)
    : DriveApp.getRootFolder();
  var it = parent.getFoldersByName(folderName);
  if (it.hasNext()) return it.next();
  return parent.createFolder(folderName);
}

function uniquePdfName(folder, baseName) {
  var stem = String(baseName).replace(/\.pdf$/i, "");
  var name = stem + ".pdf";
  var n = 2;
  while (folder.getFilesByName(name).hasNext()) {
    name = stem + "-" + n + ".pdf";
    n++;
    if (n > 50) break;
  }
  return name;
}

function sanitizeFolderName(name) {
  return String(name || "File-unknown")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 120);
}

function sanitizeFileNumber(value) {
  return String(value || "")
    .replace(/[<>"'`\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80);
}

/**
 * FileDoc Capture — Google Apps Script backend
 *
 * Deploy: Extensions → Apps Script → Deploy → New deployment → Web app
 * Execute as: Me
 * Who has access: Anyone in your domain / Anyone (as needed)
 *
 * Parent Drive folder: set PARENT_FOLDER_ID, or leave blank to use My Drive root.
 * Each file number gets its own folder: File-{fileNumber}
 * Up to 100 documents are stored inside that folder.
 */

var PARENT_FOLDER_ID = ""; // optional: paste a Drive folder ID
var MAX_DOCS = 100;

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("FileDoc Capture")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}

/**
 * @param {{fileNumber:string, folderName:string, documents:Array<{name:string,mimeType:string,data:string,capturedAt:string}>}} batch
 */
function uploadBatch(batch) {
  if (!batch || !batch.fileNumber) {
    throw new Error("File number is required.");
  }
  var docs = batch.documents || [];
  if (!docs.length) {
    throw new Error("No documents to upload.");
  }
  if (docs.length > MAX_DOCS) {
    throw new Error("Maximum " + MAX_DOCS + " documents per file folder.");
  }

  var folderName = sanitizeFolderName(batch.folderName || ("File-" + batch.fileNumber));
  var folder = getOrCreateFileFolder(folderName);

  var uploaded = [];
  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    var name = doc.name || ("doc-" + pad3(i + 1) + ".jpg");
    var mime = doc.mimeType || "image/jpeg";
    var blob = Utilities.newBlob(Utilities.base64Decode(doc.data), mime, name);
    var file = folder.createFile(blob);
    file.setDescription(
      "File number: " + batch.fileNumber +
      " | Captured: " + (doc.capturedAt || "") +
      " | Uploaded: " + new Date().toISOString()
    );
    uploaded.push({ id: file.getId(), name: file.getName(), url: file.getUrl() });
  }

  return {
    ok: true,
    fileNumber: String(batch.fileNumber),
    folderName: folder.getName(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    count: uploaded.length,
    files: uploaded
  };
}

function getOrCreateFileFolder(folderName) {
  var parent = PARENT_FOLDER_ID
    ? DriveApp.getFolderById(PARENT_FOLDER_ID)
    : DriveApp.getRootFolder();

  var it = parent.getFoldersByName(folderName);
  if (it.hasNext()) {
    return it.next();
  }
  return parent.createFolder(folderName);
}

function sanitizeFolderName(name) {
  return String(name || "File-unknown")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 120);
}

function pad3(n) {
  var s = String(n);
  while (s.length < 3) s = "0" + s;
  return s;
}

/**
 * Scan helpers for FileDoc Capture.
 * Builds a multi-page PDF from JPEG page scans (max 60).
 * No external library so the same file can run in the browser and Apps Script.
 */
(function (root) {
  var MAX_PAGES = 60;
  var MAX_EDGE = 1500;
  var JPEG_QUALITY = 0.68;
  var MAX_PDF_BYTES = 32 * 1024 * 1024;

  function jpegSize(bytes) {
    if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error("Page is not a JPEG.");
    }
    var i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      var marker = bytes[i + 1];
      if (marker === 0xd8) {
        i += 2;
        continue;
      }
      if (marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
        i += 2;
        continue;
      }
      if (i + 3 >= bytes.length) break;
      var len = (bytes[i + 2] << 8) + bytes[i + 3];
      if (len < 2) throw new Error("Invalid JPEG marker.");
      if (
        marker === 0xc0 || marker === 0xc1 || marker === 0xc2 ||
        marker === 0xc3 || marker === 0xc5 || marker === 0xc6 ||
        marker === 0xc7 || marker === 0xc9 || marker === 0xca ||
        marker === 0xcb || marker === 0xcd || marker === 0xce ||
        marker === 0xcf
      ) {
        return {
          height: (bytes[i + 5] << 8) + bytes[i + 6],
          width: (bytes[i + 7] << 8) + bytes[i + 8],
          components: bytes[i + 9]
        };
      }
      i += 2 + len;
    }
    throw new Error("Could not read JPEG size.");
  }

  function dataUrlToBytes(dataUrl) {
    var comma = String(dataUrl || "").indexOf(",");
    if (comma < 0) throw new Error("Image data is missing.");
    var binary = atob(String(dataUrl).slice(comma + 1));
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  function imageToScanJpeg(source) {
    var sw = source.videoWidth || source.naturalWidth || source.width;
    var sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) throw new Error("Image is not ready.");
    var scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
    var w = Math.max(1, Math.round(sw * scale));
    var h = Math.max(1, Math.round(sh * scale));
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    var imageData = ctx.getImageData(0, 0, w, h);
    var d = imageData.data;
    var contrast = 1.28;
    for (var i = 0; i < d.length; i += 4) {
      var y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      y = (y - 128) * contrast + 136;
      if (y > 188) y = 188 + (y - 188) * 1.45;
      if (y < 48) y = y * 0.75;
      if (y < 0) y = 0;
      if (y > 255) y = 255;
      d[i] = d[i + 1] = d[i + 2] = y;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  function buildScanPdf(jpegs) {
    if (!jpegs || !jpegs.length) throw new Error("Add at least one page.");
    if (jpegs.length > MAX_PAGES) {
      throw new Error("Maximum " + MAX_PAGES + " pages per PDF.");
    }
    var infos = [];
    for (var p = 0; p < jpegs.length; p++) infos.push(jpegSize(jpegs[p]));

    var chunks = [];
    var offsets = [];
    var length = 0;
    function add(part) {
      chunks.push(part);
      length += part.length;
    }
    function addText(text) {
      var encoded = new TextEncoder().encode(text);
      add(encoded);
    }
    function startObj(n) {
      offsets[n] = length;
    }

    addText("%PDF-1.4\n");
    var n = jpegs.length;
    startObj(1);
    addText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    var kids = [];
    for (var k = 0; k < n; k++) kids.push(String(3 + k * 3) + " 0 R");
    startObj(2);
    addText("2 0 obj\n<< /Type /Pages /Count " + n + " /Kids [" + kids.join(" ") + "] >>\nendobj\n");

    for (var i = 0; i < n; i++) {
      var pageId = 3 + i * 3;
      var contentId = pageId + 1;
      var imageId = pageId + 2;
      var info = infos[i];
      var landscape = info.width > info.height;
      var pageW = landscape ? 841.89 : 595.28;
      var pageH = landscape ? 595.28 : 841.89;
      var margin = 18;
      var fit = Math.min((pageW - margin * 2) / info.width, (pageH - margin * 2) / info.height);
      var drawW = info.width * fit;
      var drawH = info.height * fit;
      var x = (pageW - drawW) / 2;
      var y = (pageH - drawH) / 2;
      var colorSpace = info.components === 1 ? "/DeviceGray" : "/DeviceRGB";
      if (info.components !== 1 && info.components !== 3) {
        throw new Error("Page " + (i + 1) + " must be a grayscale or color JPEG.");
      }

      startObj(pageId);
      addText(
        pageId + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
        pageW.toFixed(2) + " " + pageH.toFixed(2) + "] /Contents " + contentId +
        " 0 R /Resources << /XObject << /Im0 " + imageId + " 0 R >> >> >>\nendobj\n"
      );

      var content =
        "q\n" + drawW.toFixed(2) + " 0 0 " + drawH.toFixed(2) + " " +
        x.toFixed(2) + " " + y.toFixed(2) + " cm\n/Im0 Do\nQ\n";
      startObj(contentId);
      addText(contentId + " 0 obj\n<< /Length " + content.length + " >>\nstream\n" + content + "endstream\nendobj\n");

      startObj(imageId);
      addText(
        imageId + " 0 obj\n<< /Type /XObject /Subtype /Image /Width " + info.width +
        " /Height " + info.height + " /ColorSpace " + colorSpace +
        " /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpegs[i].length +
        " >>\nstream\n"
      );
      add(jpegs[i]);
      addText("\nendstream\nendobj\n");
    }

    var xrefPos = length;
    var total = 2 + n * 3;
    var xref = "xref\n0 " + (total + 1) + "\n0000000000 65535 f \n";
    for (var o = 1; o <= total; o++) {
      xref += String(offsets[o]).padStart(10, "0") + " 00000 n \n";
    }
    xref += "trailer\n<< /Size " + (total + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF\n";
    addText(xref);

    if (length > MAX_PDF_BYTES) {
      throw new Error("PDF is larger than 32 MB. Remove some pages and try again.");
    }
    var out = new Uint8Array(length);
    var cursor = 0;
    for (var c = 0; c < chunks.length; c++) {
      out.set(chunks[c], cursor);
      cursor += chunks[c].length;
    }
    return out;
  }

  var api = {
    MAX_PAGES: MAX_PAGES,
    MAX_EDGE: MAX_EDGE,
    MAX_PDF_BYTES: MAX_PDF_BYTES,
    jpegSize: jpegSize,
    dataUrlToBytes: dataUrlToBytes,
    imageToScanJpeg: imageToScanJpeg,
    buildScanPdf: buildScanPdf
  };
  root.FileDocScan = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

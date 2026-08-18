/**
 * Thin Google Sheets access. All business code goes through these helpers.
 */
function masterSs_() {
  return SpreadsheetApp.openById(requireProp_('MASTER_SHEET_ID'));
}

function templateSs_() {
  return SpreadsheetApp.openById(requireProp_('TEMPLATE_SHEET_ID'));
}

function tenantSs_(sheetId) {
  if (!sheetId) throw new Error('Tenant spreadsheet is missing');
  return SpreadsheetApp.openById(sheetId);
}

function sheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing tab: ' + name);
  return sh;
}

function readRows_(ss, tab) {
  var sh = sheet_(ss, tab);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h); });
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      row[headers[c]] = values[i][c];
      if (values[i][c] !== '' && values[i][c] !== null) empty = false;
    }
    if (!empty) {
      row._row = i + 1;
      out.push(row);
    }
  }
  return out;
}

function findRow_(ss, tab, field, value) {
  var rows = readRows_(ss, tab);
  var want = String(value).toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][field]).toLowerCase() === want) return rows[i];
  }
  return null;
}

function findRows_(ss, tab, field, value) {
  var rows = readRows_(ss, tab);
  var want = String(value).toLowerCase();
  return rows.filter(function (r) {
    return String(r[field]).toLowerCase() === want;
  });
}

function appendRow_(ss, tab, obj) {
  var sh = sheet_(ss, tab);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var line = headers.map(function (h) {
    return obj[h] === undefined || obj[h] === null ? '' : obj[h];
  });
  sh.appendRow(line);
}

function updateRow_(ss, tab, rowNumber, patch) {
  var sh = sheet_(ss, tab);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var values = sh.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (Object.prototype.hasOwnProperty.call(patch, headers[i])) {
      values[i] = patch[headers[i]];
    }
  }
  sh.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
}

function ensureTabs_(ss, headersMap) {
  Object.keys(headersMap).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    var headers = headersMap[name];
    var existing = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
    var blank = existing.every(function (c) { return c === ''; });
    if (blank) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  });
  var extra = ss.getSheetByName('Sheet1');
  if (extra && ss.getSheets().length > 1) {
    try { ss.deleteSheet(extra); } catch (e) { /* keep if last */ }
  }
}

function audit_(actor, tenantId, action, detail) {
  try {
    appendRow_(masterSs_(), 'Audit', {
      At: nowIso_(),
      Actor: actor || '',
      TenantID: tenantId || '',
      Action: action || '',
      Detail: String(detail || '').slice(0, 500)
    });
  } catch (e) {
    console.warn('audit failed', e);
  }
}

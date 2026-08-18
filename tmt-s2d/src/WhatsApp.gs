/**
 * WhatsApp Cloud API sender.
 * Tokens stay in Script Properties: WA_TOKEN, WA_PHONE_ID, WA_GRAPH_VERSION
 *
 * If WA_TOKEN is empty, functions return the message text so the owner
 * can paste it into WhatsApp manually (same as a failed AppSheet Bot).
 */
function waEnabled_() {
  return !!getProp_('WA_TOKEN', '') && !!getProp_('WA_PHONE_ID', '');
}

function sendQuoteWhatsApp_(session, book, quoteId) {
  var q = findRow_(book, 'Quotations', 'QuoteID', quoteId);
  var party = findRow_(book, 'Parties', 'PartyID', q.PartyID);
  var text = quoteText_(book, quoteId);
  return sendWhatsAppText_(session, book, party && party.Phone, text, 'QUOTE', quoteId);
}

function sendDispatchWhatsApp_(session, book, dispatchId) {
  var d = findRow_(book, 'Dispatch', 'DispatchID', dispatchId);
  var order = findRow_(book, 'Orders', 'OrderID', d.OrderID);
  var party = order ? findRow_(book, 'Parties', 'PartyID', order.PartyID) : null;
  var text = dispatchText_(book, dispatchId);
  return sendWhatsAppText_(session, book, party && party.Phone, text, 'DISPATCH', dispatchId);
}

function sendWhatsAppText_(session, book, phone, text, refType, refId) {
  var log = {
    LogID: newId_('WA'),
    At: nowIso_(),
    To: String(phone || ''),
    Template: refType,
    Status: 'SKIPPED',
    Error: '',
    RefType: refType,
    RefID: refId
  };
  if (!phone) {
    log.Error = 'No party phone';
    appendRow_(book, 'WA_Log', log);
    return { ok: false, skipped: true, text: text, error: log.Error };
  }
  if (!waEnabled_()) {
    log.Error = 'WA_TOKEN not set — copy text manually';
    appendRow_(book, 'WA_Log', log);
    return { ok: true, skipped: true, text: text, error: log.Error };
  }
  var to = normalizePhone_(phone);
  var url = 'https://graph.facebook.com/' +
    (getProp_('WA_GRAPH_VERSION', 'v21.0')) + '/' +
    getProp_('WA_PHONE_ID', '') + '/messages';
  var payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { preview_url: false, body: text }
  };
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + getProp_('WA_TOKEN', '') },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    log.Status = code >= 200 && code < 300 ? 'SENT' : 'FAIL';
    log.Error = code >= 200 && code < 300 ? '' : String(body).slice(0, 400);
    appendRow_(book, 'WA_Log', log);
    audit_(session.email, session.tenantId, 'WA_' + log.Status, refId);
    return { ok: log.Status === 'SENT', text: text, status: log.Status, error: log.Error };
  } catch (e) {
    log.Status = 'FAIL';
    log.Error = e.message;
    appendRow_(book, 'WA_Log', log);
    return { ok: false, text: text, error: e.message };
  }
}

function normalizePhone_(phone) {
  var d = String(phone).replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  if (d.indexOf('0') === 0 && d.length === 11) return '91' + d.slice(1);
  return d;
}

function apiSendQuoteWA(token, quoteId) {
  var s = requireSession_(token);
  var book = tenantBook_(s);
  return sendQuoteWhatsApp_(s, book, quoteId);
}

/**
 * Morning reminder hook. Install: setupReminders()
 */
function remindOpenQuotes() {
  var tenants = readRows_(masterSs_(), 'Tenants').filter(function (t) {
    return String(t.Status) === 'ACTIVE';
  });
  tenants.forEach(function (t) {
    var lic = getActiveLicense_(t.TenantID);
    if (!lic.ok) return;
    var book = tenantSs_(t.SheetId);
    var open = readRows_(book, 'Quotations').filter(function (q) {
      return String(q.Status) === 'OPEN';
    });
    if (!open.length) return;
    audit_('SYSTEM', t.TenantID, 'REMIND_QUOTES', open.length + ' open');
  });
}

function setupReminders() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'remindOpenQuotes') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('remindOpenQuotes').timeBased().atHour(9).everyDays(1).inTimezone(HD.TZ).create();
}

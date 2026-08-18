/**
 * HisaabDesk Sales-to-Dispatch
 * Web app entry for Google Sites embed + Razorpay / optional webhooks.
 *
 * Deploy: Execute as Me (training@sheetomatic.in) · Who has access: Anyone
 */
function doGet(e) {
  e = e || { parameter: {} };
  if (e.parameter && e.parameter.page === 'health') {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      product: HD.PRODUCT,
      setup: !!getProp_('MASTER_SHEET_ID', '')
    })).setMimeType(ContentService.MimeType.JSON);
  }
  var t = HtmlService.createTemplateFromFile('Index');
  t.product = HD.PRODUCT_FULL;
  t.company = HD.COMPANY;
  return t.evaluate()
    .setTitle(HD.PRODUCT_FULL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  e = e || { parameter: {}, postData: { contents: '' } };
  var path = (e.parameter && e.parameter.path) || '';
  if (path === 'razorpay') return handleRazorpayWebhook_(e);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

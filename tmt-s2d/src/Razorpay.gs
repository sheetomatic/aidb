/**
 * Razorpay: one-time orders + subscription webhooks.
 *
 * Script Properties:
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 *   RAZORPAY_WEBHOOK_SECRET
 *
 * Webhook URL: https://script.google.com/macros/s/DEPLOY_ID/exec?path=razorpay
 */
function apiCreatePaymentOrder(token, planCode) {
  var s = requireSession_(token);
  var plan = findRow_(masterSs_(), 'Plans', 'PlanCode', planCode);
  if (!plan) return { ok: false, error: 'प्लान नहीं मिला' };
  var amount = toNum_(plan.PriceINR);
  if (amount <= 0) return { ok: false, error: 'This plan is free / trial' };

  var keyId = getProp_('RAZORPAY_KEY_ID', '');
  var secret = getProp_('RAZORPAY_KEY_SECRET', '');
  if (!keyId || !secret) {
    return {
      ok: false,
      error: 'Razorpay keys not set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    };
  }

  var payload = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: newId_('RCP'),
    notes: {
      tenantId: s.tenantId,
      email: s.email,
      planCode: planCode,
      licenseType: plan.LicenseType
    }
  };
  var res = UrlFetchApp.fetch('https://api.razorpay.com/v1/orders', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(keyId + ':' + secret)
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300) {
    return { ok: false, error: body.error && body.error.description ? body.error.description : 'Razorpay error' };
  }
  appendRow_(masterSs_(), 'Payments', {
    PaymentID: newId_('PAY'),
    TenantID: s.tenantId,
    LicenseID: '',
    Gateway: 'RAZORPAY',
    GatewayId: body.id,
    Amount: amount,
    Currency: 'INR',
    Status: 'CREATED',
    Type: plan.LicenseType,
    CreatedAt: nowIso_()
  });
  return {
    ok: true,
    orderId: body.id,
    amount: body.amount,
    currency: body.currency,
    keyId: keyId,
    plan: plan.PlanCode
  };
}

function handleRazorpayWebhook_(e) {
  var secret = getProp_('RAZORPAY_WEBHOOK_SECRET', '');
  var raw = e.postData && e.postData.contents ? e.postData.contents : '';
  if (secret) {
    var sig = '';
    try {
      sig = e.headers['X-Razorpay-Signature'] || e.headers['x-razorpay-signature'] || '';
    } catch (err) {
      sig = '';
    }
    var expected = hmacHex_(raw, secret);
    if (sig && expected && sig !== expected) {
      return jsonOut_({ ok: false, error: 'bad signature' }, 401);
    }
  }
  var event;
  try {
    event = JSON.parse(raw || '{}');
  } catch (err) {
    return jsonOut_({ ok: false, error: 'bad json' }, 400);
  }

  var type = event.event || '';
  var notes = (((event.payload || {}).payment || {}).entity || {}).notes ||
    (((event.payload || {}).order || {}).entity || {}).notes || {};
  var tenantId = notes.tenantId;
  var planCode = notes.planCode;
  var paymentId = (((event.payload || {}).payment || {}).entity || {}).id || '';
  var orderId = (((event.payload || {}).payment || {}).entity || {}).order_id || '';
  var amount = ((((event.payload || {}).payment || {}).entity || {}).amount || 0) / 100;

  if (type === 'payment.captured' || type === 'order.paid') {
    if (tenantId && planCode) {
      extendLicense_(tenantId, planCode, notes.razorpaySubId || '');
    }
    appendRow_(masterSs_(), 'Payments', {
      PaymentID: newId_('PAY'),
      TenantID: tenantId || '',
      LicenseID: '',
      Gateway: 'RAZORPAY',
      GatewayId: paymentId || orderId,
      Amount: amount,
      Currency: 'INR',
      Status: 'CAPTURED',
      Type: notes.licenseType || '',
      CreatedAt: nowIso_()
    });
    audit_('RAZORPAY', tenantId, type, paymentId);
  }

  if (type === 'subscription.cancelled' && tenantId) {
    var tenant = findRow_(masterSs_(), 'Tenants', 'TenantID', tenantId);
    if (tenant) updateRow_(masterSs_(), 'Tenants', tenant._row, { Status: 'GRACE' });
    audit_('RAZORPAY', tenantId, type, '');
  }

  return jsonOut_({ ok: true });
}

function hmacHex_(message, secret) {
  var raw = Utilities.computeHmacSha256Signature(message, secret);
  return raw.map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function jsonOut_(obj, status) {
  var out = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return out;
}

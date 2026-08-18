/**
 * Trial / subscription / one-time license checks.
 */
function getActiveLicense_(tenantId) {
  if (tenantId === 'PLATFORM') {
    return { ok: true, summary: { type: 'PLATFORM', validTill: '2099-12-31', plan: 'ADMIN', daysLeft: 9999 } };
  }
  var rows = findRows_(masterSs_(), 'Licenses', 'TenantID', tenantId)
    .filter(function (r) { return String(r.Status).toUpperCase() === 'ACTIVE'; });
  if (!rows.length) {
    return { ok: false, error: 'कोई लाइसेंस नहीं। भुगतान करें।', summary: null };
  }
  rows.sort(function (a, b) {
    return String(b.ValidTill).localeCompare(String(a.ValidTill));
  });
  var lic = rows[0];
  var till = parseDate_(lic.ValidTill);
  var today = parseDate_(todayIso_());
  var grace = new Date(till);
  grace.setDate(grace.getDate() + HD.GRACE_DAYS);
  var daysLeft = Math.round((till.getTime() - today.getTime()) / 86400000);
  var summary = {
    type: lic.LicenseType,
    plan: lic.PlanCode,
    validTill: Utilities.formatDate(till, HD.TZ, 'yyyy-MM-dd'),
    daysLeft: daysLeft,
    maxUsers: toNum_(lic.MaxUsers),
    maxWA: toNum_(lic.MaxWAMonth)
  };
  if (today > grace) {
    return { ok: false, error: 'लाइसेंस खत्म (' + summary.validTill + ')', summary: summary };
  }
  if (today > till) {
    summary.inGrace = true;
  }
  return { ok: true, summary: summary, row: lic };
}

function parseDate_(v) {
  if (v instanceof Date) return v;
  var s = String(v).slice(0, 10);
  var p = s.split('-');
  if (p.length === 3) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return new Date(v);
}

function apiPlans() {
  if (!getProp_('MASTER_SHEET_ID', '')) {
    return { ok: true, setup: false, plans: [] };
  }
  return {
    ok: true,
    plans: readRows_(masterSs_(), 'Plans').map(function (p) {
      return {
        code: p.PlanCode,
        name: p.Name,
        type: p.LicenseType,
        price: toNum_(p.PriceINR),
        months: toNum_(p.Months),
        maxUsers: toNum_(p.MaxUsers),
        features: String(p.Features || '')
      };
    })
  };
}

function extendLicense_(tenantId, planCode, razorpaySubId) {
  var master = masterSs_();
  var plan = findRow_(master, 'Plans', 'PlanCode', planCode);
  if (!plan) throw new Error('Unknown plan ' + planCode);
  var months = toNum_(plan.Months) || 1;
  var current = getActiveLicense_(tenantId);
  var start = new Date();
  if (current.ok && current.row) {
    var till = parseDate_(current.row.ValidTill);
    if (till > start) start = till;
    updateRow_(master, 'Licenses', current.row._row, { Status: 'REPLACED' });
  }
  var end = new Date(start);
  end.setMonth(end.getMonth() + months);
  appendRow_(master, 'Licenses', {
    LicenseID: newId_('LIC'),
    TenantID: tenantId,
    PlanCode: planCode,
    LicenseType: plan.LicenseType,
    ValidFrom: Utilities.formatDate(start, HD.TZ, 'yyyy-MM-dd'),
    ValidTill: Utilities.formatDate(end, HD.TZ, 'yyyy-MM-dd'),
    RazorpaySubId: razorpaySubId || '',
    Status: 'ACTIVE',
    MaxUsers: plan.MaxUsers,
    MaxWAMonth: plan.MaxWAMonth
  });
  var tenant = findRow_(master, 'Tenants', 'TenantID', tenantId);
  if (tenant) updateRow_(master, 'Tenants', tenant._row, { Status: 'ACTIVE' });
  return getActiveLicense_(tenantId).summary;
}

function apiRazorpayConfig(token) {
  requireSession_(token);
  var key = getProp_('RAZORPAY_KEY_ID', '');
  return {
    ok: true,
    enabled: !!key,
    keyId: key,
    currency: 'INR'
  };
}

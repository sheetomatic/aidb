// ===== Config.gs =====
/**
 * HisaabDesk S2D — platform config.
 * Secrets live in Script Properties, never in the tenant sheet.
 */
var HD = {
  PRODUCT: 'HisaabDesk',
  PRODUCT_FULL: 'HisaabDesk Sales to Dispatch',
  COMPANY: 'Sheetomatic',
  SUPPORT_EMAIL: 'training@sheetomatic.in',
  TZ: 'Asia/Kolkata',
  SESSION_HOURS: 12,
  TRIAL_DAYS: 14,
  GRACE_DAYS: 7,
  DEFAULT_INTEREST_PCT: 18,
  DEFAULT_VALID_HRS: 24,
  MASTER_TABS: [
    'Tenants', 'Users', 'Licenses', 'Payments', 'Plans', 'Audit', 'SetupNotes'
  ],
  TENANT_TABS: [
    'Settings', 'Parties', 'Items', 'RateList', 'Quotations', 'QuoteLines',
    'Orders', 'OrderLines', 'Dispatch', 'DispatchLines', 'Stock', 'StockMove',
    'Receipts', 'WA_Log'
  ]
};

var MASTER_HEADERS = {
  Tenants: [
    'TenantID', 'FirmName', 'OwnerName', 'OwnerEmail', 'Phone', 'SheetId',
    'Status', 'City', 'Timezone', 'CreatedAt'
  ],
  Users: [
    'UserID', 'TenantID', 'Email', 'Name', 'Role', 'PasswordSalt',
    'PasswordHash', 'Active', 'LastLogin'
  ],
  Licenses: [
    'LicenseID', 'TenantID', 'PlanCode', 'LicenseType', 'ValidFrom',
    'ValidTill', 'RazorpaySubId', 'Status', 'MaxUsers', 'MaxWAMonth'
  ],
  Payments: [
    'PaymentID', 'TenantID', 'LicenseID', 'Gateway', 'GatewayId',
    'Amount', 'Currency', 'Status', 'Type', 'CreatedAt'
  ],
  Plans: [
    'PlanCode', 'Name', 'LicenseType', 'PriceINR', 'Months',
    'MaxUsers', 'MaxWAMonth', 'Features'
  ],
  Audit: ['At', 'Actor', 'TenantID', 'Action', 'Detail'],
  SetupNotes: ['Key', 'Value']
};

var TENANT_HEADERS = {
  Settings: ['Key', 'Value'],
  Parties: [
    'PartyID', 'Name', 'Phone', 'GSTIN', 'City', 'CreditDays',
    'CreditLimit', 'Notes', 'Active'
  ],
  Items: [
    'ItemID', 'Name', 'Size', 'Grade', 'Unit', 'HSN', 'GSTPct',
    'WeightPerPcKg', 'Active'
  ],
  RateList: [
    'RateID', 'ItemID', 'Rate', 'Unit', 'ValidFrom', 'Source', 'UpdatedBy'
  ],
  Quotations: [
    'QuoteID', 'Date', 'PartyID', 'SalesmanEmail', 'ValidHrs', 'Status',
    'SubTotal', 'GSTAmount', 'Freight', 'GrandTotal', 'TrueMarginPct', 'Notes'
  ],
  QuoteLines: [
    'LineID', 'QuoteID', 'ItemID', 'Qty', 'Rate', 'Amount', 'GSTPct', 'GSTAmount'
  ],
  Orders: [
    'OrderID', 'QuoteID', 'Date', 'PartyID', 'Status', 'Advance', 'Notes'
  ],
  OrderLines: [
    'LineID', 'OrderID', 'ItemID', 'QtyOrdered', 'QtyDispatched', 'Rate'
  ],
  Dispatch: [
    'DispatchID', 'OrderID', 'Date', 'Vehicle', 'DriverPhone', 'LR',
    'Eway', 'Status', 'Notes'
  ],
  DispatchLines: [
    'LineID', 'DispatchID', 'ItemID', 'Qty', 'Yard'
  ],
  Stock: ['ItemID', 'Yard', 'Qty'],
  StockMove: [
    'MoveID', 'Date', 'ItemID', 'Yard', 'QtyIn', 'QtyOut', 'RefType', 'RefID'
  ],
  Receipts: [
    'PayID', 'Date', 'PartyID', 'OrderID', 'Amount', 'Mode', 'Ref', 'Notes'
  ],
  WA_Log: [
    'LogID', 'At', 'To', 'Template', 'Status', 'Error', 'RefType', 'RefID'
  ]
};

var ROLES = { OWNER: 'Owner', SALES: 'Sales', DISPATCH: 'Dispatch', VIEW: 'View', ADMIN: 'Admin' };

function props_() {
  return PropertiesService.getScriptProperties();
}

function getProp_(key, fallback) {
  var v = props_().getProperty(key);
  return v === null || v === undefined ? fallback : v;
}

function requireProp_(key) {
  var v = getProp_(key, '');
  if (!v) {
    throw new Error(key + ' is not set. Run setupPlatform() as training@sheetomatic.in');
  }
  return v;
}

function nowIso_() {
  return Utilities.formatDate(new Date(), HD.TZ, "yyyy-MM-dd'T'HH:mm:ss");
}

function todayIso_() {
  return Utilities.formatDate(new Date(), HD.TZ, 'yyyy-MM-dd');
}

function newId_(prefix) {
  return prefix + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

function toNum_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function isTruthy_(v) {
  if (v === true || v === 1) return true;
  var s = String(v).toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'active';
}


// ===== SheetIO.gs =====
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


// ===== Auth.gs =====
/**
 * Email + password auth. Sessions live in CacheService (12 hours).
 */
function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + '|' + password,
    Utilities.Charset.UTF_8
  );
  return raw.map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function createUserRow_(opts) {
  var salt = Utilities.getUuid();
  appendRow_(masterSs_(), 'Users', {
    UserID: newId_('USR'),
    TenantID: opts.tenantId,
    Email: String(opts.email).toLowerCase().trim(),
    Name: opts.name || '',
    Role: opts.role,
    PasswordSalt: salt,
    PasswordHash: hashPassword_(opts.password, salt),
    Active: true,
    LastLogin: ''
  });
}

function apiLogin(email, password) {
  email = String(email || '').toLowerCase().trim();
  password = String(password || '');
  if (!email || !password) return { ok: false, error: 'ईमेल और पासवर्ड डालें' };

  var user = findRow_(masterSs_(), 'Users', 'Email', email);
  if (!user || !isTruthy_(user.Active)) {
    return { ok: false, error: 'लॉगिन गलत है' };
  }
  var hash = hashPassword_(password, user.PasswordSalt);
  if (hash !== String(user.PasswordHash)) {
    audit_(email, user.TenantID, 'LOGIN_FAIL', 'bad password');
    return { ok: false, error: 'लॉगिन गलत है' };
  }

  var license = getActiveLicense_(user.TenantID);
  if (user.Role !== ROLES.ADMIN) {
    if (!license.ok) {
      return {
        ok: false,
        expired: true,
        error: license.error,
        paywall: true,
        tenantId: user.TenantID
      };
    }
  }

  updateRow_(masterSs_(), 'Users', user._row, { LastLogin: nowIso_() });
  var token = Utilities.getUuid();
  var session = {
    token: token,
    email: user.Email,
    name: user.Name,
    role: user.Role,
    tenantId: user.TenantID,
    exp: Date.now() + HD.SESSION_HOURS * 60 * 60 * 1000
  };
  CacheService.getScriptCache().put('sess_' + token, JSON.stringify(session), 21600);
  audit_(email, user.TenantID, 'LOGIN', user.Role);

  return {
    ok: true,
    token: token,
    user: publicUser_(session),
    license: user.Role === ROLES.ADMIN ? { ok: true, type: 'PLATFORM' } : license.summary
  };
}

function apiLogout(token) {
  if (token) CacheService.getScriptCache().remove('sess_' + token);
  return { ok: true };
}

function apiMe(token) {
  var s = requireSession_(token);
  var license = s.role === ROLES.ADMIN
    ? { ok: true, type: 'PLATFORM' }
    : getActiveLicense_(s.tenantId).summary;
  return { ok: true, user: publicUser_(s), license: license };
}

function apiChangePassword(token, currentPassword, nextPassword) {
  var s = requireSession_(token);
  if (!nextPassword || String(nextPassword).length < 6) {
    return { ok: false, error: 'नया पासवर्ड कम से कम 6 अक्षर' };
  }
  var user = findRow_(masterSs_(), 'Users', 'Email', s.email);
  if (!user) return { ok: false, error: 'User missing' };
  if (hashPassword_(currentPassword, user.PasswordSalt) !== String(user.PasswordHash)) {
    return { ok: false, error: 'पुराना पासवर्ड गलत' };
  }
  var salt = Utilities.getUuid();
  updateRow_(masterSs_(), 'Users', user._row, {
    PasswordSalt: salt,
    PasswordHash: hashPassword_(nextPassword, salt)
  });
  return { ok: true };
}

function requireSession_(token) {
  if (!token) throw new Error('लॉगिन करें');
  var raw = CacheService.getScriptCache().get('sess_' + token);
  if (!raw) throw new Error('सेशन खत्म। फिर से लॉगिन करें');
  var s = JSON.parse(raw);
  if (!s.exp || s.exp < Date.now()) {
    CacheService.getScriptCache().remove('sess_' + token);
    throw new Error('सेशन खत्म। फिर से लॉगिन करें');
  }
  return s;
}

function requireRole_(session, allowed) {
  if (allowed.indexOf(session.role) === -1) {
    throw new Error('इस काम की अनुमति नहीं');
  }
}

function publicUser_(s) {
  return {
    email: s.email,
    name: s.name,
    role: s.role,
    tenantId: s.tenantId,
    isAdmin: s.role === ROLES.ADMIN
  };
}

function tenantFor_(session) {
  if (session.role === ROLES.ADMIN && (!session.tenantId || session.tenantId === 'PLATFORM')) {
    throw new Error('Admin must open a tenant. Use the demo shop or pick a tenant.');
  }
  var t = findRow_(masterSs_(), 'Tenants', 'TenantID', session.tenantId);
  if (!t || String(t.Status) !== 'ACTIVE') throw new Error('दुकान बंद है');
  var lic = getActiveLicense_(session.tenantId);
  if (!lic.ok) throw new Error(lic.error);
  return t;
}

function tenantBook_(session) {
  return tenantSs_(tenantFor_(session).SheetId);
}


// ===== License.gs =====
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


// ===== Quotes.gs =====
/**
 * Parties, items, rates, quotations, true-margin math.
 */
function apiBootstrap(token) {
  var s = requireSession_(token);
  if (s.role === ROLES.ADMIN && (!s.tenantId || s.tenantId === 'PLATFORM')) {
    return {
      ok: true,
      user: publicUser_(s),
      admin: true,
      tenants: readRows_(masterSs_(), 'Tenants').map(function (t) {
        return {
          id: t.TenantID,
          firm: t.FirmName,
          email: t.OwnerEmail,
          status: t.Status,
          city: t.City
        };
      }),
      license: { type: 'PLATFORM' }
    };
  }
  var t = tenantFor_(s);
  var book = tenantSs_(t.SheetId);
  var lic = getActiveLicense_(s.tenantId);
  return {
    ok: true,
    user: publicUser_(s),
    admin: s.role === ROLES.ADMIN,
    tenants: s.role === ROLES.ADMIN ? readRows_(masterSs_(), 'Tenants').map(function (t) {
      return { id: t.TenantID, firm: t.FirmName, email: t.OwnerEmail, status: t.Status, city: t.City };
    }) : [],
    firm: {
      name: getSetting_(book, 'FirmName', t.FirmName),
      city: getSetting_(book, 'City', t.City),
      gstin: getSetting_(book, 'GSTIN', ''),
      footer: getSetting_(book, 'QuoteFooter', ''),
      validHrs: toNum_(getSetting_(book, 'DefaultValidHrs', HD.DEFAULT_VALID_HRS)),
      interestPct: toNum_(getSetting_(book, 'InterestPct', HD.DEFAULT_INTEREST_PCT))
    },
    license: lic.summary,
    parties: listParties_(book),
    items: listItemsWithRate_(book),
    counts: dashboardCounts_(book)
  };
}

function listParties_(book) {
  return readRows_(book, 'Parties').filter(function (p) { return isTruthy_(p.Active) || p.Active === ''; }).map(publicParty_);
}

function publicParty_(p) {
  return {
    id: p.PartyID,
    name: p.Name,
    phone: String(p.Phone || ''),
    gstin: p.GSTIN || '',
    city: p.City || '',
    creditDays: toNum_(p.CreditDays),
    creditLimit: toNum_(p.CreditLimit)
  };
}

function listItemsWithRate_(book) {
  var rates = {};
  readRows_(book, 'RateList').forEach(function (r) {
    var prev = rates[r.ItemID];
    if (!prev || String(r.ValidFrom) >= String(prev.ValidFrom)) rates[r.ItemID] = r;
  });
  return readRows_(book, 'Items').filter(function (it) {
    return isTruthy_(it.Active) || it.Active === '';
  }).map(function (it) {
    var r = rates[it.ItemID] || {};
    return {
      id: it.ItemID,
      name: it.Name,
      size: it.Size,
      grade: it.Grade,
      unit: it.Unit || 'KG',
      hsn: it.HSN,
      gstPct: toNum_(it.GSTPct) || 18,
      rate: toNum_(r.Rate),
      rateUnit: r.Unit || it.Unit || 'KG',
      source: r.Source || ''
    };
  });
}

function dashboardCounts_(book) {
  var quotes = readRows_(book, 'Quotations');
  var orders = readRows_(book, 'Orders');
  var disp = readRows_(book, 'Dispatch');
  return {
    quotes: quotes.length,
    openQuotes: quotes.filter(function (q) { return String(q.Status) === 'OPEN'; }).length,
    orders: orders.length,
    pendingDispatch: orders.filter(function (o) {
      return ['OPEN', 'PARTIAL'].indexOf(String(o.Status)) !== -1;
    }).length,
    trucksToday: disp.filter(function (d) {
      return String(d.Date).indexOf(todayIso_()) === 0;
    }).length
  };
}

function apiSaveParty(token, party) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.OWNER, ROLES.SALES, ROLES.ADMIN]);
  var book = tenantBook_(s);
  party = party || {};
  if (!party.name) return { ok: false, error: 'पार्टी का नाम चाहिए' };
  if (party.id) {
    var row = findRow_(book, 'Parties', 'PartyID', party.id);
    if (!row) return { ok: false, error: 'Party not found' };
    updateRow_(book, 'Parties', row._row, {
      Name: party.name,
      Phone: party.phone || '',
      GSTIN: party.gstin || '',
      City: party.city || '',
      CreditDays: toNum_(party.creditDays),
      CreditLimit: toNum_(party.creditLimit),
      Notes: party.notes || '',
      Active: true
    });
    return { ok: true, party: publicParty_(findRow_(book, 'Parties', 'PartyID', party.id)) };
  }
  var id = newId_('PTY');
  appendRow_(book, 'Parties', {
    PartyID: id,
    Name: party.name,
    Phone: party.phone || '',
    GSTIN: party.gstin || '',
    City: party.city || '',
    CreditDays: toNum_(party.creditDays) || 0,
    CreditLimit: toNum_(party.creditLimit) || 0,
    Notes: party.notes || '',
    Active: true
  });
  return { ok: true, party: publicParty_(findRow_(book, 'Parties', 'PartyID', id)) };
}

function apiSaveRate(token, itemId, rate, source) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.OWNER, ROLES.ADMIN]);
  var book = tenantBook_(s);
  var item = findRow_(book, 'Items', 'ItemID', itemId);
  if (!item) return { ok: false, error: 'आइटम नहीं मिला' };
  appendRow_(book, 'RateList', {
    RateID: newId_('RT'),
    ItemID: itemId,
    Rate: toNum_(rate),
    Unit: item.Unit || 'KG',
    ValidFrom: nowIso_(),
    Source: source || 'Yard',
    UpdatedBy: s.email
  });
  return { ok: true, items: listItemsWithRate_(book) };
}

function computeQuote_(book, input) {
  var items = listItemsWithRate_(book);
  var byId = {};
  items.forEach(function (it) { byId[it.id] = it; });
  var party = findRow_(book, 'Parties', 'PartyID', input.partyId);
  var creditDays = toNum_(input.creditDays);
  if (!creditDays && party) creditDays = toNum_(party.CreditDays);
  var interestPct = toNum_(getSetting_(book, 'InterestPct', HD.DEFAULT_INTEREST_PCT));
  var freight = toNum_(input.freight);
  var sub = 0;
  var gst = 0;
  var cost = 0;
  var lines = (input.lines || []).map(function (ln) {
    var it = byId[ln.itemId];
    if (!it) throw new Error('Unknown item ' + ln.itemId);
    var qty = toNum_(ln.qty);
    var sell = toNum_(ln.rate) || it.rate;
    var amt = qty * sell;
    var gstAmt = amt * (it.gstPct / 100);
    var landed = it.rate * qty;
    sub += amt;
    gst += gstAmt;
    cost += landed;
    return {
      itemId: it.id,
      name: it.name,
      qty: qty,
      rate: sell,
      amount: round2_(amt),
      gstPct: it.gstPct,
      gstAmount: round2_(gstAmt)
    };
  });
  var creditCost = sub * (creditDays / 365) * (interestPct / 100);
  var profit = sub - cost - freight - creditCost;
  var marginPct = sub ? (profit / sub) * 100 : 0;
  return {
    lines: lines,
    subTotal: round2_(sub),
    gstAmount: round2_(gst),
    freight: round2_(freight),
    grandTotal: round2_(sub + gst + freight),
    trueMarginPct: round2_(marginPct),
    creditDays: creditDays,
    creditCost: round2_(creditCost),
    landedCost: round2_(cost)
  };
}

function round2_(n) {
  return Math.round(toNum_(n) * 100) / 100;
}

function apiPreviewQuote(token, input) {
  var s = requireSession_(token);
  var book = tenantBook_(s);
  try {
    return { ok: true, preview: computeQuote_(book, input || {}) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function apiCreateQuote(token, input) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.OWNER, ROLES.SALES, ROLES.ADMIN]);
  var book = tenantBook_(s);
  input = input || {};
  if (!input.partyId) return { ok: false, error: 'पार्टी चुनें' };
  if (!input.lines || !input.lines.length) return { ok: false, error: 'कम से कम एक आइटम' };
  var calc;
  try {
    calc = computeQuote_(book, input);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  var id = newId_('Q');
  appendRow_(book, 'Quotations', {
    QuoteID: id,
    Date: nowIso_(),
    PartyID: input.partyId,
    SalesmanEmail: s.email,
    ValidHrs: toNum_(input.validHrs) || toNum_(getSetting_(book, 'DefaultValidHrs', 24)),
    Status: 'OPEN',
    SubTotal: calc.subTotal,
    GSTAmount: calc.gstAmount,
    Freight: calc.freight,
    GrandTotal: calc.grandTotal,
    TrueMarginPct: calc.trueMarginPct,
    Notes: input.notes || ''
  });
  calc.lines.forEach(function (ln) {
    appendRow_(book, 'QuoteLines', {
      LineID: newId_('QL'),
      QuoteID: id,
      ItemID: ln.itemId,
      Qty: ln.qty,
      Rate: ln.rate,
      Amount: ln.amount,
      GSTPct: ln.gstPct,
      GSTAmount: ln.gstAmount
    });
  });
  var wa = null;
  if (input.sendWhatsApp) {
    wa = sendQuoteWhatsApp_(s, book, id);
  }
  audit_(s.email, s.tenantId, 'QUOTE', id);
  return { ok: true, quoteId: id, preview: calc, whatsapp: wa, text: quoteText_(book, id) };
}

function apiListQuotes(token) {
  var s = requireSession_(token);
  var book = tenantBook_(s);
  var parties = {};
  readRows_(book, 'Parties').forEach(function (p) { parties[p.PartyID] = p.Name; });
  var quotes = readRows_(book, 'Quotations').map(function (q) {
    return {
      id: q.QuoteID,
      date: q.Date,
      partyId: q.PartyID,
      party: parties[q.PartyID] || q.PartyID,
      status: q.Status,
      total: toNum_(q.GrandTotal),
      margin: toNum_(q.TrueMarginPct),
      salesman: q.SalesmanEmail
    };
  }).reverse();
  return { ok: true, quotes: quotes };
}

function apiQuoteText(token, quoteId) {
  var s = requireSession_(token);
  var book = tenantBook_(s);
  return { ok: true, text: quoteText_(book, quoteId) };
}

function quoteText_(book, quoteId) {
  var q = findRow_(book, 'Quotations', 'QuoteID', quoteId);
  if (!q) throw new Error('Quote not found');
  var party = findRow_(book, 'Parties', 'PartyID', q.PartyID);
  var items = {};
  readRows_(book, 'Items').forEach(function (it) { items[it.ItemID] = it; });
  var lines = findRows_(book, 'QuoteLines', 'QuoteID', quoteId);
  var firm = getSetting_(book, 'FirmName', 'HisaabDesk');
  var parts = [];
  parts.push('*' + firm + '* — कोटेशन ' + quoteId);
  parts.push('पार्टी: ' + (party ? party.Name : q.PartyID));
  parts.push('तारीख: ' + String(q.Date).slice(0, 16));
  parts.push('वैध: ' + q.ValidHrs + ' घंटे');
  parts.push('');
  lines.forEach(function (ln) {
    var it = items[ln.ItemID] || { Name: ln.ItemID };
    parts.push('• ' + it.Name + '  ' + ln.Qty + ' ' + (it.Unit || 'KG') + ' × ₹' + ln.Rate + ' = ₹' + ln.Amount);
  });
  parts.push('');
  parts.push('सबटोटल: ₹' + q.SubTotal);
  parts.push('GST: ₹' + q.GSTAmount);
  if (toNum_(q.Freight)) parts.push('फ्रेट: ₹' + q.Freight);
  parts.push('*कुल: ₹' + q.GrandTotal + '*');
  var footer = getSetting_(book, 'QuoteFooter', '');
  if (footer) {
    parts.push('');
    parts.push(footer);
  }
  return parts.join('\n');
}


// ===== Orders.gs =====
/**
 * Convert quote → order, list open orders.
 */
function apiConvertOrder(token, quoteId, advance, notes) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.OWNER, ROLES.SALES, ROLES.ADMIN]);
  var book = tenantBook_(s);
  var q = findRow_(book, 'Quotations', 'QuoteID', quoteId);
  if (!q) return { ok: false, error: 'कोटेशन नहीं मिला' };
  if (String(q.Status) === 'WON') {
    var existing = findRow_(book, 'Orders', 'QuoteID', quoteId);
    return { ok: false, error: 'पहले से ऑर्डर ' + (existing ? existing.OrderID : '') };
  }
  var id = newId_('SO');
  appendRow_(book, 'Orders', {
    OrderID: id,
    QuoteID: quoteId,
    Date: nowIso_(),
    PartyID: q.PartyID,
    Status: 'OPEN',
    Advance: toNum_(advance),
    Notes: notes || ''
  });
  findRows_(book, 'QuoteLines', 'QuoteID', quoteId).forEach(function (ln) {
    appendRow_(book, 'OrderLines', {
      LineID: newId_('OL'),
      OrderID: id,
      ItemID: ln.ItemID,
      QtyOrdered: ln.Qty,
      QtyDispatched: 0,
      Rate: ln.Rate
    });
  });
  updateRow_(book, 'Quotations', q._row, { Status: 'WON' });
  audit_(s.email, s.tenantId, 'ORDER', id);
  return { ok: true, orderId: id };
}

function apiListOrders(token) {
  var s = requireSession_(token);
  var book = tenantBook_(s);
  var parties = {};
  readRows_(book, 'Parties').forEach(function (p) { parties[p.PartyID] = p.Name; });
  var lines = readRows_(book, 'OrderLines');
  var orders = readRows_(book, 'Orders').map(function (o) {
    var ols = lines.filter(function (l) { return l.OrderID === o.OrderID; });
    var ordered = 0;
    var dispatched = 0;
    ols.forEach(function (l) {
      ordered += toNum_(l.QtyOrdered);
      dispatched += toNum_(l.QtyDispatched);
    });
    return {
      id: o.OrderID,
      quoteId: o.QuoteID,
      date: o.Date,
      party: parties[o.PartyID] || o.PartyID,
      partyId: o.PartyID,
      status: o.Status,
      advance: toNum_(o.Advance),
      qtyOrdered: round2_(ordered),
      qtyDispatched: round2_(dispatched),
      lines: ols.map(function (l) {
        return {
          itemId: l.ItemID,
          qtyOrdered: toNum_(l.QtyOrdered),
          qtyDispatched: toNum_(l.QtyDispatched),
          pending: round2_(toNum_(l.QtyOrdered) - toNum_(l.QtyDispatched)),
          rate: toNum_(l.Rate)
        };
      })
    };
  }).reverse();
  return { ok: true, orders: orders };
}


// ===== Dispatch.gs =====
/**
 * Dispatch + stock movement. Yard qty goes down only through this function.
 */
function apiCreateDispatch(token, input) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.OWNER, ROLES.DISPATCH, ROLES.ADMIN]);
  var book = tenantBook_(s);
  input = input || {};
  if (!input.orderId) return { ok: false, error: 'ऑर्डर चुनें' };
  var order = findRow_(book, 'Orders', 'OrderID', input.orderId);
  if (!order) return { ok: false, error: 'ऑर्डर नहीं मिला' };
  var lines = input.lines || [];
  if (!lines.length) return { ok: false, error: 'कितना माल जाएगा लिखें' };

  var yard = input.yard || getSetting_(book, 'DefaultYard', 'Main');
  var id = newId_('DS');
  appendRow_(book, 'Dispatch', {
    DispatchID: id,
    OrderID: input.orderId,
    Date: nowIso_(),
    Vehicle: input.vehicle || '',
    DriverPhone: input.driverPhone || '',
    LR: input.lr || '',
    Eway: input.eway || '',
    Status: 'OUT',
    Notes: input.notes || ''
  });

  var orderLines = findRows_(book, 'OrderLines', 'OrderID', input.orderId);
  lines.forEach(function (ln) {
    var qty = toNum_(ln.qty);
    if (qty <= 0) return;
    appendRow_(book, 'DispatchLines', {
      LineID: newId_('DL'),
      DispatchID: id,
      ItemID: ln.itemId,
      Qty: qty,
      Yard: yard
    });
    var ol = null;
    for (var i = 0; i < orderLines.length; i++) {
      if (orderLines[i].ItemID === ln.itemId) { ol = orderLines[i]; break; }
    }
    if (ol) {
      updateRow_(book, 'OrderLines', ol._row, {
        QtyDispatched: toNum_(ol.QtyDispatched) + qty
      });
    }
    applyStock_(book, ln.itemId, yard, 0, qty, 'DISPATCH', id);
  });

  var refreshed = findRows_(book, 'OrderLines', 'OrderID', input.orderId);
  var remaining = 0;
  refreshed.forEach(function (l) {
    remaining += Math.max(0, toNum_(l.QtyOrdered) - toNum_(l.QtyDispatched));
  });
  updateRow_(book, 'Orders', order._row, { Status: remaining > 0 ? 'PARTIAL' : 'DISPATCHED' });

  var wa = null;
  if (input.sendWhatsApp) {
    wa = sendDispatchWhatsApp_(s, book, id);
  }
  audit_(s.email, s.tenantId, 'DISPATCH', id);
  return { ok: true, dispatchId: id, whatsapp: wa, text: dispatchText_(book, id) };
}

function applyStock_(book, itemId, yard, qtyIn, qtyOut, refType, refId) {
  var rows = readRows_(book, 'Stock').filter(function (r) {
    return r.ItemID === itemId && String(r.Yard) === String(yard);
  });
  var next = (rows[0] ? toNum_(rows[0].Qty) : 0) + toNum_(qtyIn) - toNum_(qtyOut);
  if (rows[0]) updateRow_(book, 'Stock', rows[0]._row, { Qty: next });
  else appendRow_(book, 'Stock', { ItemID: itemId, Yard: yard, Qty: next });
  appendRow_(book, 'StockMove', {
    MoveID: newId_('SM'),
    Date: nowIso_(),
    ItemID: itemId,
    Yard: yard,
    QtyIn: toNum_(qtyIn),
    QtyOut: toNum_(qtyOut),
    RefType: refType,
    RefID: refId
  });
}

function apiStock(token) {
  var s = requireSession_(token);
  var book = tenantBook_(s);
  var names = {};
  readRows_(book, 'Items').forEach(function (it) { names[it.ItemID] = it.Name; });
  var stock = readRows_(book, 'Stock').map(function (r) {
    return {
      itemId: r.ItemID,
      name: names[r.ItemID] || r.ItemID,
      yard: r.Yard,
      qty: toNum_(r.Qty)
    };
  });
  return { ok: true, stock: stock };
}

function apiListDispatch(token) {
  var s = requireSession_(token);
  var book = tenantBook_(s);
  var list = readRows_(book, 'Dispatch').map(function (d) {
    return {
      id: d.DispatchID,
      orderId: d.OrderID,
      date: d.Date,
      vehicle: d.Vehicle,
      eway: d.Eway,
      status: d.Status
    };
  }).reverse();
  return { ok: true, dispatches: list };
}

function dispatchText_(book, dispatchId) {
  var d = findRow_(book, 'Dispatch', 'DispatchID', dispatchId);
  if (!d) throw new Error('Dispatch not found');
  var order = findRow_(book, 'Orders', 'OrderID', d.OrderID);
  var party = order ? findRow_(book, 'Parties', 'PartyID', order.PartyID) : null;
  var items = {};
  readRows_(book, 'Items').forEach(function (it) { items[it.ItemID] = it; });
  var lines = findRows_(book, 'DispatchLines', 'DispatchID', dispatchId);
  var firm = getSetting_(book, 'FirmName', 'HisaabDesk');
  var parts = [
    '*' + firm + '* — डिस्पैच ' + dispatchId,
    'ऑर्डर: ' + d.OrderID,
    'पार्टी: ' + (party ? party.Name : ''),
    'गाडी: ' + (d.Vehicle || '-'),
    'E-way: ' + (d.Eway || '-'),
    ''
  ];
  lines.forEach(function (ln) {
    var it = items[ln.ItemID] || { Name: ln.ItemID };
    parts.push('• ' + it.Name + '  ' + ln.Qty + ' ' + (it.Unit || 'KG'));
  });
  return parts.join('\n');
}


// ===== WhatsApp.gs =====
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


// ===== Razorpay.gs =====
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


// ===== Admin.gs =====
/**
 * Platform admin (training@sheetomatic.in) — create shops without Razorpay.
 */
function apiAdminProvision(token, input) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.ADMIN]);
  input = input || {};
  if (!input.firmName || !input.ownerEmail || !input.password) {
    return { ok: false, error: 'firmName, ownerEmail, password required' };
  }
  var planCode = input.planCode || 'ONE_12';
  var plan = findRow_(masterSs_(), 'Plans', 'PlanCode', planCode);
  if (!plan) return { ok: false, error: 'Unknown plan' };
  var result = provisionTenant_({
    firmName: input.firmName,
    ownerName: input.ownerName || input.firmName,
    ownerEmail: input.ownerEmail,
    phone: input.phone || '',
    city: input.city || '',
    password: input.password,
    planCode: planCode,
    licenseType: plan.LicenseType,
    months: toNum_(plan.Months) || 12,
    trialDays: HD.TRIAL_DAYS
  });
  return { ok: true, tenant: result };
}

function apiAdminExtend(token, tenantId, planCode) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.ADMIN]);
  return { ok: true, license: extendLicense_(tenantId, planCode || 'ONE_12', '') };
}

function apiAdminHome(token) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.ADMIN]);
  s.tenantId = 'PLATFORM';
  s.impersonating = false;
  CacheService.getScriptCache().put('sess_' + token, JSON.stringify(s), 21600);
  return { ok: true };
}

function apiImpersonateTenant(token, tenantId) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.ADMIN]);
  var t = findRow_(masterSs_(), 'Tenants', 'TenantID', tenantId);
  if (!t) return { ok: false, error: 'Tenant not found' };
  var child = {
    token: s.token,
    email: s.email,
    name: s.name,
    role: ROLES.ADMIN,
    tenantId: tenantId,
    exp: s.exp,
    impersonating: true
  };
  CacheService.getScriptCache().put('sess_' + s.token, JSON.stringify(child), 21600);
  return { ok: true, user: publicUser_(child) };
}

function apiAddUser(token, input) {
  var s = requireSession_(token);
  requireRole_(s, [ROLES.OWNER, ROLES.ADMIN]);
  input = input || {};
  var tenantId = s.role === ROLES.ADMIN && input.tenantId ? input.tenantId : s.tenantId;
  var lic = getActiveLicense_(tenantId);
  if (!lic.ok && s.role !== ROLES.ADMIN) return { ok: false, error: lic.error };
  var users = findRows_(masterSs_(), 'Users', 'TenantID', tenantId);
  if (lic.summary && users.length >= toNum_(lic.summary.maxUsers)) {
    return { ok: false, error: 'यूजर लिमिट खत्म' };
  }
  if (findRow_(masterSs_(), 'Users', 'Email', input.email)) {
    return { ok: false, error: 'ईमेल पहले से है' };
  }
  createUserRow_({
    tenantId: tenantId,
    email: input.email,
    name: input.name || input.email,
    role: input.role || ROLES.SALES,
    password: input.password
  });
  return { ok: true };
}


// ===== Setup.gs =====
/**
 * First-run setup. Execute setupPlatform() once from the script editor
 * while signed in as training@sheetomatic.in.
 *
 * Creates:
 *  - Master license workbook
 *  - Tenant template workbook (copied for each paying firm)
 *  - Platform admin user
 *  - Demo tenant so you can log in immediately
 */
function setupPlatform() {
  var existing = getProp_('MASTER_SHEET_ID', '');
  if (existing) {
    return {
      ok: true,
      already: true,
      masterSheetId: existing,
      templateSheetId: getProp_('TEMPLATE_SHEET_ID', ''),
      message: 'Platform already set up. Clear MASTER_SHEET_ID to rebuild.'
    };
  }

  var master = SpreadsheetApp.create('HisaabDesk — MASTER licenses');
  ensureTabs_(master, MASTER_HEADERS);
  seedPlans_(master);

  var template = SpreadsheetApp.create('HisaabDesk — TENANT template (TMT S2D)');
  ensureTabs_(template, TENANT_HEADERS);
  seedTemplate_(template);

  props_().setProperties({
    MASTER_SHEET_ID: master.getId(),
    TEMPLATE_SHEET_ID: template.getId(),
    PLATFORM_ADMIN_EMAIL: HD.SUPPORT_EMAIL
  }, false);

  var adminPass = 'ChangeMe#' + Utilities.getUuid().slice(0, 6);
  var demoPass = 'Demo#' + Utilities.getUuid().slice(0, 6);

  createUserRow_({
    tenantId: 'PLATFORM',
    email: HD.SUPPORT_EMAIL,
    name: 'Sheetomatic Training',
    role: ROLES.ADMIN,
    password: adminPass
  });

  var demo = provisionTenant_({
    firmName: 'DNM Flora Demo',
    ownerName: 'Demo Owner',
    ownerEmail: 'demo@dnmflora.test',
    phone: '9999999999',
    city: 'Raipur',
    password: demoPass,
    planCode: 'TRIAL',
    licenseType: 'TRIAL',
    months: 0,
    trialDays: HD.TRIAL_DAYS
  });

  appendRow_(master, 'SetupNotes', { Key: 'CreatedAt', Value: nowIso_() });
  appendRow_(master, 'SetupNotes', { Key: 'AdminEmail', Value: HD.SUPPORT_EMAIL });
  appendRow_(master, 'SetupNotes', { Key: 'AdminPasswordOnce', Value: adminPass });
  appendRow_(master, 'SetupNotes', { Key: 'DemoEmail', Value: 'demo@dnmflora.test' });
  appendRow_(master, 'SetupNotes', { Key: 'DemoPasswordOnce', Value: demoPass });
  appendRow_(master, 'SetupNotes', {
    Key: 'WARNING',
    Value: 'Copy passwords now, then delete the SetupNotes password rows.'
  });

  Logger.log('MASTER: %s', master.getUrl());
  Logger.log('TEMPLATE: %s', template.getUrl());
  Logger.log('Admin %s / %s', HD.SUPPORT_EMAIL, adminPass);
  Logger.log('Demo %s / %s', 'demo@dnmflora.test', demoPass);

  return {
    ok: true,
    masterUrl: master.getUrl(),
    masterSheetId: master.getId(),
    templateUrl: template.getUrl(),
    templateSheetId: template.getId(),
    adminEmail: HD.SUPPORT_EMAIL,
    adminPassword: adminPass,
    demoEmail: 'demo@dnmflora.test',
    demoPassword: demoPass,
    demoTenantId: demo.tenantId,
    message: 'Copy passwords from this return value and from SetupNotes, then delete those rows.'
  };
}

function seedPlans_(master) {
  var plans = [
    ['TRIAL', '14-day trial', 'TRIAL', 0, 0, 2, 20, 'quote,order,dispatch'],
    ['SUB_M', 'Monthly', 'SUB', 1999, 1, 3, 300, 'quote,order,dispatch,stock,wa'],
    ['SUB_Y', 'Yearly', 'SUB', 19999, 12, 5, 500, 'quote,order,dispatch,stock,wa'],
    ['ONE_12', 'One-time 12 months', 'ONETIME', 14999, 12, 3, 300, 'quote,order,dispatch,stock,wa']
  ];
  var sh = sheet_(master, 'Plans');
  plans.forEach(function (p) { sh.appendRow(p); });
}

function seedTemplate_(ss) {
  var settings = [
    ['FirmName', 'Your Firm'],
    ['GSTIN', ''],
    ['City', ''],
    ['QuoteFooter', 'Rate valid 24 hours. GST extra as applicable. Loading extra.'],
    ['DefaultValidHrs', String(HD.DEFAULT_VALID_HRS)],
    ['InterestPct', String(HD.DEFAULT_INTEREST_PCT)],
    ['DefaultYard', 'Main'],
    ['Locale', 'hi-IN']
  ];
  settings.forEach(function (r) {
    appendRow_(ss, 'Settings', { Key: r[0], Value: r[1] });
  });

  var sizes = ['8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm'];
  var grades = ['Fe500', 'Fe550'];
  var hsn = '7214';
  sizes.forEach(function (size, si) {
    grades.forEach(function (grade, gi) {
      var id = 'ITM-' + size.replace('mm', '') + '-' + grade;
      appendRow_(ss, 'Items', {
        ItemID: id,
        Name: 'TMT ' + size + ' ' + grade,
        Size: size,
        Grade: grade,
        Unit: 'KG',
        HSN: hsn,
        GSTPct: 18,
        WeightPerPcKg: '',
        Active: true
      });
      appendRow_(ss, 'RateList', {
        RateID: 'RT-' + id,
        ItemID: id,
        Rate: 55 + si * 0.4 + gi * 0.8,
        Unit: 'KG',
        ValidFrom: todayIso_(),
        Source: 'Yard',
        UpdatedBy: HD.SUPPORT_EMAIL
      });
      appendRow_(ss, 'Stock', {
        ItemID: id,
        Yard: 'Main',
        Qty: 5000 + si * 1000
      });
    });
  });

  appendRow_(ss, 'Parties', {
    PartyID: 'PTY-DEMO',
    Name: 'Sample Contractor',
    Phone: '9876543210',
    GSTIN: '',
    City: 'Raipur',
    CreditDays: 30,
    CreditLimit: 500000,
    Notes: 'Demo party',
    Active: true
  });
}

/**
 * Copy the tenant template and register license + owner login.
 * Used by setup, Razorpay webhook, and admin "add shop".
 */
function provisionTenant_(opts) {
  var master = masterSs_();
  var tenantId = newId_('TNT');
  var copy = DriveApp.getFileById(requireProp_('TEMPLATE_SHEET_ID'))
    .makeCopy('HisaabDesk — ' + opts.firmName);
  var sheetId = copy.getId();
  var tenantSs = SpreadsheetApp.openById(sheetId);
  upsertSetting_(tenantSs, 'FirmName', opts.firmName);
  upsertSetting_(tenantSs, 'City', opts.city || '');

  appendRow_(master, 'Tenants', {
    TenantID: tenantId,
    FirmName: opts.firmName,
    OwnerName: opts.ownerName || '',
    OwnerEmail: String(opts.ownerEmail).toLowerCase(),
    Phone: opts.phone || '',
    SheetId: sheetId,
    Status: 'ACTIVE',
    City: opts.city || '',
    Timezone: HD.TZ,
    CreatedAt: nowIso_()
  });

  createUserRow_({
    tenantId: tenantId,
    email: opts.ownerEmail,
    name: opts.ownerName || opts.firmName,
    role: ROLES.OWNER,
    password: opts.password
  });

  var from = new Date();
  var till = new Date();
  if (opts.licenseType === 'TRIAL') {
    till.setDate(till.getDate() + (opts.trialDays || HD.TRIAL_DAYS));
  } else {
    till.setMonth(till.getMonth() + (opts.months || 1));
  }

  var plan = findRow_(master, 'Plans', 'PlanCode', opts.planCode) || {};
  appendRow_(master, 'Licenses', {
    LicenseID: newId_('LIC'),
    TenantID: tenantId,
    PlanCode: opts.planCode,
    LicenseType: opts.licenseType,
    ValidFrom: Utilities.formatDate(from, HD.TZ, 'yyyy-MM-dd'),
    ValidTill: Utilities.formatDate(till, HD.TZ, 'yyyy-MM-dd'),
    RazorpaySubId: opts.razorpaySubId || '',
    Status: 'ACTIVE',
    MaxUsers: plan.MaxUsers || 3,
    MaxWAMonth: plan.MaxWAMonth || 100
  });

  try {
    copy.addEditor(opts.ownerEmail);
  } catch (e) {
    console.warn('Could not share tenant sheet with owner', e);
  }

  audit_(HD.SUPPORT_EMAIL, tenantId, 'PROVISION', opts.firmName);
  return { tenantId: tenantId, sheetId: sheetId, sheetUrl: tenantSs.getUrl() };
}

function upsertSetting_(ss, key, value) {
  var row = findRow_(ss, 'Settings', 'Key', key);
  if (row) updateRow_(ss, 'Settings', row._row, { Value: value });
  else appendRow_(ss, 'Settings', { Key: key, Value: value });
}

function getSetting_(ss, key, fallback) {
  var row = findRow_(ss, 'Settings', 'Key', key);
  if (!row) return fallback;
  return row.Value === '' || row.Value === null ? fallback : row.Value;
}

/**
 * Menu in the bound / standalone script editor.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HisaabDesk')
    .addItem('Setup platform (first run)', 'setupPlatform')
    .addItem('Show web app info', 'showDeployHint')
    .addToUi();
}

function showDeployHint() {
  var msg = [
    '1. Run setupPlatform() once.',
    '2. Deploy → New deployment → Web app.',
    '   Execute as: Me (' + HD.SUPPORT_EMAIL + ')',
    '   Who has access: Anyone',
    '3. Embed the /exec URL in Google Sites.',
    '4. Set Script Properties: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, WA_TOKEN, WA_PHONE_ID, WA_WABA_ID'
  ].join('\n');
  try {
    SpreadsheetApp.getUi().alert(HD.PRODUCT_FULL, msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
}


// ===== Code.gs =====
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


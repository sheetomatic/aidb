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

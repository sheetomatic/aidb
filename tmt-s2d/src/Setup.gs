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
    ['ONE_12', 'One-time 12 months', 'ONETIME', 14999, 12, 3, 300, 'quote,order,dispatch,stock,wa'],
    ['APP_9999', 'TMT S2D AppSheet-parity one-time', 'ONETIME', 9999, 12, 3, 300, 'do,sauda,kanta,godown,freight,pay']
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

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

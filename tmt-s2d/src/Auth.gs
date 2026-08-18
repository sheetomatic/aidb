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

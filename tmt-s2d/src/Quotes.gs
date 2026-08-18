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

/**
 * Local google.script.run stand-in. Data stays in localStorage.
 * Demo logins (local only — not for production):
 *   demo@dnmflora.test / Demo#1234
 *   training@sheetomatic.in / Admin#1234
 */
(function (global) {
  var STORE = 'hd_s2d_local_db_v1';

  function seedItems() {
    var sizes = ['8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm'];
    var items = [];
    sizes.forEach(function (size, i) {
      items.push({
        id: 'ITM-' + size.replace('mm', '') + '-Fe500',
        name: 'TMT ' + size + ' Fe500',
        size: size,
        grade: 'Fe500',
        unit: 'KG',
        hsn: '7214',
        gstPct: 18,
        rate: 55 + i * 0.4,
        rateUnit: 'KG',
        source: 'Yard'
      });
    });
    return items;
  }

  function emptyShop(name, city) {
    return {
      firm: {
        name: name,
        city: city || 'Raipur',
        gstin: '',
        footer: 'Rate valid 24 hours. GST extra. Loading extra.',
        validHrs: 24,
        interestPct: 18
      },
      parties: [
        { id: 'PTY-DEMO', name: 'Sample Contractor', phone: '9876543210', gstin: '', city: 'Raipur', creditDays: 30, creditLimit: 500000 }
      ],
      items: seedItems(),
      quotes: [],
      quoteLines: {},
      orders: [],
      dispatches: [],
      stock: seedItems().map(function (it, i) {
        return { itemId: it.id, name: it.name, yard: 'Main', qty: 5000 + i * 800 };
      })
    };
  }

  function defaultDb() {
    return {
      users: [
        { email: 'training@sheetomatic.in', password: 'Admin#1234', name: 'Sheetomatic Training', role: 'Admin', tenantId: 'PLATFORM' },
        { email: 'demo@dnmflora.test', password: 'Demo#1234', name: 'DNM Flora Owner', role: 'Owner', tenantId: 'TNT-DEMO' }
      ],
      sessions: {},
      tenants: [
        { id: 'TNT-DEMO', firm: 'DNM Flora Demo', email: 'demo@dnmflora.test', status: 'ACTIVE', city: 'Raipur' }
      ],
      licenses: {
        'TNT-DEMO': { type: 'TRIAL', plan: 'TRIAL', validTill: '2026-09-01', daysLeft: 14, maxUsers: 2 }
      },
      shops: {
        'TNT-DEMO': emptyShop('DNM Flora Demo', 'Raipur')
      },
      plans: [
        { code: 'TRIAL', name: '14-day trial', type: 'TRIAL', price: 0, months: 0, maxUsers: 2, features: 'quote,order,dispatch' },
        { code: 'SUB_M', name: 'Monthly', type: 'SUB', price: 1999, months: 1, maxUsers: 3, features: 'quote,order,dispatch,stock,wa' },
        { code: 'SUB_Y', name: 'Yearly', type: 'SUB', price: 19999, months: 12, maxUsers: 5, features: 'quote,order,dispatch,stock,wa' },
        { code: 'ONE_12', name: 'One-time 12 months', type: 'ONETIME', price: 14999, months: 12, maxUsers: 3, features: 'quote,order,dispatch,stock,wa' }
      ]
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var db = defaultDb();
    save(db);
    return db;
  }
  function save(db) { localStorage.setItem(STORE, JSON.stringify(db)); }

  function nid(p) { return p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function round2(n) { return Math.round(num(n) * 100) / 100; }

  function sess(token) {
    var db = load();
    var s = db.sessions[token];
    if (!s) throw new Error('सेशन खत्म। फिर से लॉगिन करें');
    return { db: db, s: s };
  }

  function shopOf(ctx) {
    if (ctx.s.role === 'Admin' && (!ctx.s.tenantId || ctx.s.tenantId === 'PLATFORM')) {
      throw new Error('Admin must open a tenant.');
    }
    return ctx.db.shops[ctx.s.tenantId];
  }

  function itemMap(shop) {
    var m = {};
    shop.items.forEach(function (it) { m[it.id] = it; });
    return m;
  }

  function partyName(shop, id) {
    var p = shop.parties.filter(function (x) { return x.id === id; })[0];
    return p ? p.name : id;
  }

  function computeQuote(shop, input) {
    var items = itemMap(shop);
    var party = shop.parties.filter(function (p) { return p.id === input.partyId; })[0];
    var creditDays = num(input.creditDays) || (party ? party.creditDays : 0);
    var interest = shop.firm.interestPct || 18;
    var freight = num(input.freight);
    var sub = 0, gst = 0, cost = 0;
    var lines = (input.lines || []).map(function (ln) {
      var it = items[ln.itemId];
      if (!it) throw new Error('Unknown item ' + ln.itemId);
      var qty = num(ln.qty);
      var sell = num(ln.rate) || it.rate;
      var amt = qty * sell;
      var gstAmt = amt * (it.gstPct / 100);
      sub += amt; gst += gstAmt; cost += it.rate * qty;
      return { itemId: it.id, name: it.name, qty: qty, rate: sell, amount: round2(amt), gstPct: it.gstPct, gstAmount: round2(gstAmt) };
    });
    var creditCost = sub * (creditDays / 365) * (interest / 100);
    var profit = sub - cost - freight - creditCost;
    return {
      lines: lines,
      subTotal: round2(sub),
      gstAmount: round2(gst),
      freight: round2(freight),
      grandTotal: round2(sub + gst + freight),
      trueMarginPct: round2(sub ? (profit / sub) * 100 : 0),
      creditDays: creditDays,
      creditCost: round2(creditCost),
      landedCost: round2(cost)
    };
  }

  function quoteText(shop, q) {
    var lines = shop.quoteLines[q.id] || [];
    var parts = [
      '*' + shop.firm.name + '* — कोटेशन ' + q.id,
      'पार्टी: ' + partyName(shop, q.partyId),
      'तारीख: ' + q.date,
      'वैध: ' + q.validHrs + ' घंटे',
      ''
    ];
    lines.forEach(function (ln) {
      parts.push('• ' + ln.name + '  ' + ln.qty + ' KG × ₹' + ln.rate + ' = ₹' + ln.amount);
    });
    parts.push('', 'सबटोटल: ₹' + q.subTotal, 'GST: ₹' + q.gstAmount, '*कुल: ₹' + q.grandTotal + '*', '', shop.firm.footer);
    return parts.join('\n');
  }

  function counts(shop) {
    var today = new Date().toISOString().slice(0, 10);
    return {
      quotes: shop.quotes.length,
      openQuotes: shop.quotes.filter(function (q) { return q.status === 'OPEN'; }).length,
      orders: shop.orders.length,
      pendingDispatch: shop.orders.filter(function (o) { return o.status === 'OPEN' || o.status === 'PARTIAL'; }).length,
      trucksToday: shop.dispatches.filter(function (d) { return String(d.date).indexOf(today) === 0; }).length
    };
  }

  function orderView(shop, o) {
    return {
      id: o.id,
      quoteId: o.quoteId,
      date: o.date,
      party: partyName(shop, o.partyId),
      partyId: o.partyId,
      status: o.status,
      advance: o.advance,
      qtyOrdered: o.lines.reduce(function (s, l) { return s + l.qtyOrdered; }, 0),
      qtyDispatched: o.lines.reduce(function (s, l) { return s + l.qtyDispatched; }, 0),
      lines: o.lines.map(function (l) {
        return { itemId: l.itemId, qtyOrdered: l.qtyOrdered, qtyDispatched: l.qtyDispatched, pending: round2(l.qtyOrdered - l.qtyDispatched), rate: l.rate };
      })
    };
  }

  var API = {
    apiPlans: function () {
      return { ok: true, setup: true, plans: load().plans };
    },
    apiLogin: function (email, password) {
      var db = load();
      email = String(email || '').toLowerCase().trim();
      var u = db.users.filter(function (x) { return x.email === email && x.password === password; })[0];
      if (!u) return { ok: false, error: 'लॉगिन गलत है' };
      var token = nid('TOK');
      db.sessions[token] = { email: u.email, name: u.name, role: u.role, tenantId: u.tenantId };
      save(db);
      var lic = u.role === 'Admin' ? { type: 'PLATFORM' } : db.licenses[u.tenantId];
      return { ok: true, token: token, user: { email: u.email, name: u.name, role: u.role, tenantId: u.tenantId, isAdmin: u.role === 'Admin' }, license: lic };
    },
    apiLogout: function (token) {
      var db = load();
      delete db.sessions[token];
      save(db);
      return { ok: true };
    },
    apiBootstrap: function (token) {
      var ctx = sess(token);
      var s = ctx.s;
      if (s.role === 'Admin' && (!s.tenantId || s.tenantId === 'PLATFORM')) {
        return {
          ok: true, admin: true, user: s,
          tenants: ctx.db.tenants, license: { type: 'PLATFORM' },
          firm: { name: 'HisaabDesk Admin' }, parties: [], items: [], counts: {}
        };
      }
      var shop = shopOf(ctx);
      return {
        ok: true,
        admin: s.role === 'Admin',
        user: s,
        tenants: s.role === 'Admin' ? ctx.db.tenants : [],
        firm: shop.firm,
        license: ctx.db.licenses[s.tenantId],
        parties: shop.parties,
        items: shop.items,
        counts: counts(shop)
      };
    },
    apiPreviewQuote: function (token, input) {
      var shop = shopOf(sess(token));
      try { return { ok: true, preview: computeQuote(shop, input || {}) }; }
      catch (e) { return { ok: false, error: e.message }; }
    },
    apiCreateQuote: function (token, input) {
      var ctx = sess(token);
      var shop = shopOf(ctx);
      if (!input.partyId) return { ok: false, error: 'पार्टी चुनें' };
      if (!input.lines || !input.lines.length) return { ok: false, error: 'कम से कम एक आइटम' };
      var calc;
      try { calc = computeQuote(shop, input); }
      catch (e) { return { ok: false, error: e.message }; }
      var id = nid('Q');
      var q = {
        id: id, date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        partyId: input.partyId, status: 'OPEN', salesman: ctx.s.email,
        validHrs: num(input.validHrs) || 24,
        subTotal: calc.subTotal, gstAmount: calc.gstAmount, freight: calc.freight,
        grandTotal: calc.grandTotal, trueMarginPct: calc.trueMarginPct, notes: input.notes || ''
      };
      shop.quotes.unshift(q);
      shop.quoteLines[id] = calc.lines;
      save(ctx.db);
      return {
        ok: true, quoteId: id, preview: calc, text: quoteText(shop, q),
        whatsapp: { ok: true, skipped: true, text: quoteText(shop, q), error: 'Local demo — copy text' }
      };
    },
    apiListQuotes: function (token) {
      var shop = shopOf(sess(token));
      return {
        ok: true,
        quotes: shop.quotes.map(function (q) {
          return { id: q.id, date: q.date, partyId: q.partyId, party: partyName(shop, q.partyId), status: q.status, total: q.grandTotal, margin: q.trueMarginPct, salesman: q.salesman };
        })
      };
    },
    apiQuoteText: function (token, quoteId) {
      var shop = shopOf(sess(token));
      var q = shop.quotes.filter(function (x) { return x.id === quoteId; })[0];
      if (!q) return { ok: false, error: 'Quote not found' };
      return { ok: true, text: quoteText(shop, q) };
    },
    apiConvertOrder: function (token, quoteId) {
      var ctx = sess(token);
      var shop = shopOf(ctx);
      var q = shop.quotes.filter(function (x) { return x.id === quoteId; })[0];
      if (!q) return { ok: false, error: 'कोटेशन नहीं मिला' };
      if (q.status === 'WON') return { ok: false, error: 'पहले से ऑर्डर' };
      var id = nid('SO');
      shop.orders.unshift({
        id: id, quoteId: quoteId, date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        partyId: q.partyId, status: 'OPEN', advance: 0,
        lines: (shop.quoteLines[quoteId] || []).map(function (ln) {
          return { itemId: ln.itemId, qtyOrdered: ln.qty, qtyDispatched: 0, rate: ln.rate };
        })
      });
      q.status = 'WON';
      save(ctx.db);
      return { ok: true, orderId: id };
    },
    apiListOrders: function (token) {
      var shop = shopOf(sess(token));
      return { ok: true, orders: shop.orders.map(function (o) { return orderView(shop, o); }) };
    },
    apiCreateDispatch: function (token, input) {
      var ctx = sess(token);
      var shop = shopOf(ctx);
      var order = shop.orders.filter(function (o) { return o.id === input.orderId; })[0];
      if (!order) return { ok: false, error: 'ऑर्डर नहीं मिला' };
      var id = nid('DS');
      (input.lines || []).forEach(function (ln) {
        var qty = num(ln.qty);
        if (qty <= 0) return;
        var ol = order.lines.filter(function (l) { return l.itemId === ln.itemId; })[0];
        if (ol) ol.qtyDispatched += qty;
        var st = shop.stock.filter(function (s) { return s.itemId === ln.itemId; })[0];
        if (st) st.qty -= qty;
      });
      var remain = order.lines.reduce(function (s, l) { return s + Math.max(0, l.qtyOrdered - l.qtyDispatched); }, 0);
      order.status = remain > 0 ? 'PARTIAL' : 'DISPATCHED';
      var text = '*' + shop.firm.name + '* — डिस्पैच ' + id + '\nऑर्डर: ' + order.id + '\nगाडी: ' + (input.vehicle || '-') + '\nE-way: ' + (input.eway || '-');
      shop.dispatches.unshift({ id: id, orderId: order.id, date: new Date().toISOString(), vehicle: input.vehicle, eway: input.eway, status: 'OUT', text: text });
      save(ctx.db);
      return { ok: true, dispatchId: id, text: text, whatsapp: { skipped: true } };
    },
    apiStock: function (token) {
      return { ok: true, stock: shopOf(sess(token)).stock };
    },
    apiSaveParty: function (token, party) {
      var ctx = sess(token);
      var shop = shopOf(ctx);
      if (!party.name) return { ok: false, error: 'पार्टी का नाम चाहिए' };
      var row = { id: nid('PTY'), name: party.name, phone: party.phone || '', gstin: party.gstin || '', city: party.city || '', creditDays: num(party.creditDays), creditLimit: num(party.creditLimit) };
      shop.parties.push(row);
      save(ctx.db);
      return { ok: true, party: row };
    },
    apiSaveRate: function (token, itemId, rate) {
      var ctx = sess(token);
      var shop = shopOf(ctx);
      shop.items.forEach(function (it) { if (it.id === itemId) it.rate = num(rate); });
      save(ctx.db);
      return { ok: true, items: shop.items };
    },
    apiChangePassword: function (token, cur, next) {
      var ctx = sess(token);
      var u = ctx.db.users.filter(function (x) { return x.email === ctx.s.email; })[0];
      if (!u || u.password !== cur) return { ok: false, error: 'पुराना पासवर्ड गलत' };
      if (!next || next.length < 6) return { ok: false, error: 'नया पासवर्ड कम से कम 6 अक्षर' };
      u.password = next;
      save(ctx.db);
      return { ok: true };
    },
    apiCreatePaymentOrder: function (token, planCode) {
      sess(token);
      var plan = load().plans.filter(function (p) { return p.code === planCode; })[0];
      if (!plan || plan.price <= 0) return { ok: false, error: 'This plan is free / trial' };
      return { ok: true, orderId: nid('RCP'), amount: plan.price * 100, currency: 'INR', keyId: '', plan: planCode };
    },
    apiAdminProvision: function (token, input) {
      var ctx = sess(token);
      if (ctx.s.role !== 'Admin') throw new Error('इस काम की अनुमति नहीं');
      if (!input.firmName || !input.ownerEmail || !input.password) return { ok: false, error: 'firmName, ownerEmail, password required' };
      var tid = nid('TNT');
      ctx.db.tenants.push({ id: tid, firm: input.firmName, email: input.ownerEmail, status: 'ACTIVE', city: input.city || '' });
      ctx.db.users.push({ email: String(input.ownerEmail).toLowerCase(), password: input.password, name: input.ownerName || input.firmName, role: 'Owner', tenantId: tid });
      ctx.db.licenses[tid] = { type: input.planCode === 'TRIAL' ? 'TRIAL' : (input.planCode === 'SUB_M' ? 'SUB' : 'ONETIME'), plan: input.planCode, validTill: '2027-08-18', daysLeft: 365, maxUsers: 3 };
      ctx.db.shops[tid] = emptyShop(input.firmName, input.city);
      save(ctx.db);
      return { ok: true, tenant: { tenantId: tid } };
    },
    apiImpersonateTenant: function (token, tenantId) {
      var ctx = sess(token);
      if (ctx.s.role !== 'Admin') throw new Error('इस काम की अनुमति नहीं');
      ctx.s.tenantId = tenantId;
      save(ctx.db);
      return { ok: true, user: ctx.s };
    },
    apiAdminHome: function (token) {
      var ctx = sess(token);
      if (ctx.s.role !== 'Admin') throw new Error('इस काम की अनुमति नहीं');
      ctx.s.tenantId = 'PLATFORM';
      save(ctx.db);
      return { ok: true };
    }
  };

  global.google = {
    script: {
      get run() {
        var ok = function () {};
        var fail = function () {};
        var chain = {
          withSuccessHandler: function (cb) { ok = cb; return chain; },
          withFailureHandler: function (cb) { fail = cb; return chain; }
        };
        return new Proxy(chain, {
          get: function (t, prop) {
            if (prop in t) return t[prop];
            return function () {
              var args = [].slice.call(arguments);
              setTimeout(function () {
                try {
                  if (!API[prop]) throw new Error('Unknown API ' + prop);
                  ok(API[prop].apply(null, args));
                } catch (e) { fail(e); }
              }, 40);
            };
          }
        });
      }
    }
  };

  global.HDLocal = {
    reset: function () { localStorage.removeItem(STORE); location.reload(); }
  };
})(window);

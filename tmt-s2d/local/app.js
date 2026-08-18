(function () {
  var TOKEN_KEY = 'hd_s2d_token';
  var state = {
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
    license: null,
    firm: null,
    parties: [],
    items: [],
    counts: {},
    admin: false,
    tenants: [],
    screen: 'home'
  };

  function $(id) { return document.getElementById(id); }
  function show(el, on) { el.classList.toggle('hidden', !on); }
  function flash(msg, bad) {
    var box = state.user ? $('flash') : $('login-flash');
    if (!box) return;
    box.textContent = msg || '';
    box.classList.toggle('bad', !!bad);
    show(box, !!msg);
  }
  function rupee(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
  function run(name, args, cb) {
    google.script.run
      .withSuccessHandler(function (res) { cb(null, res); })
      .withFailureHandler(function (err) { cb(err); })
      [name].apply(null, args);
  }

  function login() {
    flash('');
    var email = $('email').value.trim();
    var pass = $('password').value;
    $('btn-login').disabled = true;
    run('apiLogin', [email, pass], function (err, res) {
      $('btn-login').disabled = false;
      if (err) return flash(err.message || String(err), true);
      if (!res || !res.ok) {
        if (res && res.paywall) return flash(res.error + ' — प्लान खरीदें।', true);
        return flash((res && res.error) || 'लॉगिन नहीं हुआ', true);
      }
      state.token = res.token;
      localStorage.setItem(TOKEN_KEY, res.token);
      boot();
    });
  }

  function logout() {
    run('apiLogout', [state.token], function () {});
    localStorage.removeItem(TOKEN_KEY);
    state.token = '';
    state.user = null;
    show($('view-app'), false);
    show($('view-login'), true);
  }

  function boot() {
    if (!state.token) return;
    run('apiBootstrap', [state.token], function (err, res) {
      if (err || !res || !res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        state.token = '';
        flash((err && err.message) || (res && res.error) || 'सेशन खत्म', true);
        return;
      }
      state.user = res.user;
      state.license = res.license;
      state.admin = !!res.admin;
      state.tenants = res.tenants || [];
      state.firm = res.firm || { name: 'HisaabDesk Admin' };
      state.parties = res.parties || [];
      state.items = res.items || [];
      state.counts = res.counts || {};
      show($('view-login'), false);
      show($('view-app'), true);
      $('firm-name').textContent = state.firm.name || 'HisaabDesk';
      var lic = state.license || {};
      $('firm-meta').textContent = (state.user.role || '') +
        (lic.validTill ? ' · लाइसेंस ' + lic.validTill : '') +
        (lic.inGrace ? ' · grace' : '');
      renderNav();
      renderScreen(state.admin ? 'admin' : 'home');
    });
  }

  function renderNav() {
    var items = [['home', 'होम'], ['quote', 'कोट'], ['orders', 'ऑर्डर'], ['dispatch', 'डिस्पैच'], ['stock', 'स्टॉक'], ['parties', 'पार्टी'], ['rates', 'रेट'], ['account', 'अकाउंट']];
    if (state.admin) {
      items = [['admin', 'टेनेंट'], ['plans', 'प्लान']].concat(state.firm && state.firm.name ? items : []);
    }
    $('nav').innerHTML = items.map(function (it) {
      return '<button class="pill' + (state.screen === it[0] ? ' active' : '') +
        '" data-go="' + it[0] + '">' + it[1] + '</button>';
    }).join('');
  }

  function renderScreen(name) {
    state.screen = name;
    renderNav();
    flash('');
    var root = $('screen');
    var view = VIEWS[name] || VIEWS.home;
    root.innerHTML = view.html();
    if (view.bind) view.bind(root);
  }

  var VIEWS = {};

  VIEWS.home = {
    html: function () {
      var c = state.counts;
      return '<div class="stats">' +
        stat('कोट', c.quotes) + stat('खुले ऑर्डर', c.pendingDispatch) + stat('आज ट्रक', c.trucksToday) +
        '</div>' +
        '<div class="card"><h2>आज का काम</h2>' +
        '<p class="muted">नया कोटेशन बनाएं। मार्जिन में क्रेडिट दिन और फ्रेट बैठेगा।</p>' +
        '<button class="btn" data-go="quote">नया कोटेशन</button> ' +
        '<button class="btn ghost" data-go="orders">ऑर्डर देखें</button></div>';
    }
  };

  function stat(label, n) {
    return '<div class="stat"><b>' + (n || 0) + '</b><span>' + label + '</span></div>';
  }

  VIEWS.quote = {
    html: function () {
      return '<div class="card"><h2>नया कोटेशन</h2>' +
        '<label>पार्टी</label><select id="q-party">' + partyOptions() + '</select>' +
        '<div class="row"><div><label>फ्रेट ₹</label><input id="q-freight" type="number" value="0"></div>' +
        '<div><label>वैध घंटे</label><input id="q-valid" type="number" value="' + (state.firm.validHrs || 24) + '"></div></div>' +
        '<h3 style="margin-top:14px">आइटम</h3><div id="q-lines"></div>' +
        '<button class="btn ghost" id="q-add">+ आइटम</button>' +
        '<label>नोट</label><input id="q-notes" placeholder="लोडिंग / कटिंग">' +
        '<label><input type="checkbox" id="q-wa"> WhatsApp भेजें</label>' +
        '<button class="btn wide" id="q-preview">मार्जिन देखें</button>' +
        '<button class="btn ok wide" id="q-save">कोटेशन सेव</button>' +
        '<div id="q-result"></div></div>' +
        '<div class="card"><h2>पुराने कोट</h2><div id="q-list">लोड…</div></div>';
    },
    bind: function () {
      addLine();
      $('q-add').onclick = addLine;
      $('q-preview').onclick = function () { saveQuote(true); };
      $('q-save').onclick = function () { saveQuote(false); };
      run('apiListQuotes', [state.token], function (err, res) {
        if (!res || !res.ok) return;
        $('q-list').innerHTML = '<table><tr><th>कोट</th><th>पार्टी</th><th class="right">कुल</th><th>मार्जिन</th></tr>' +
          res.quotes.slice(0, 20).map(function (q) {
            return '<tr><td>' + q.id + '<br><button class="btn ghost" data-qid="' + q.id + '">WA टेक्स्ट</button></td><td>' +
              esc(q.party) + '</td><td class="right">' + rupee(q.total) + '</td><td>' + q.margin + '%</td></tr>';
          }).join('') + '</table>';
      });
    }
  };

  function partyOptions() {
    return '<option value="">— चुनें —</option>' + state.parties.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + (p.city ? ' · ' + esc(p.city) : '') + '</option>';
    }).join('');
  }
  function itemOptions() {
    return state.items.map(function (it) {
      return '<option value="' + it.id + '" data-rate="' + it.rate + '">' +
        esc(it.name) + ' · ₹' + it.rate + '/' + it.unit + '</option>';
    }).join('');
  }
  function addLine() {
    var box = document.createElement('div');
    box.className = 'line-row';
    box.innerHTML = '<div><label>आइटम</label><select class="ln-item">' + itemOptions() + '</select></div>' +
      '<div><label>मात्रा</label><input class="ln-qty" type="number" step="0.01" value="1000"></div>' +
      '<div><label>सेल रेट</label><input class="ln-rate" type="number" step="0.01"></div>' +
      '<button class="btn ghost ln-del" type="button">✕</button>';
    var sel = box.querySelector('.ln-item');
    var rate = box.querySelector('.ln-rate');
    function sync() {
      var opt = sel.selectedOptions[0];
      if (opt) rate.value = opt.getAttribute('data-rate') || '';
    }
    sel.onchange = sync;
    sync();
    box.querySelector('.ln-del').onclick = function () { box.remove(); };
    $('q-lines').appendChild(box);
  }
  function collectLines() {
    return Array.prototype.map.call(document.querySelectorAll('#q-lines .line-row'), function (row) {
      return {
        itemId: row.querySelector('.ln-item').value,
        qty: row.querySelector('.ln-qty').value,
        rate: row.querySelector('.ln-rate').value
      };
    });
  }
  function saveQuote(previewOnly) {
    var input = {
      partyId: $('q-party').value,
      freight: $('q-freight').value,
      validHrs: $('q-valid').value,
      notes: $('q-notes').value,
      lines: collectLines(),
      sendWhatsApp: $('q-wa').checked && !previewOnly
    };
    var fn = previewOnly ? 'apiPreviewQuote' : 'apiCreateQuote';
    run(fn, previewOnly ? [state.token, input] : [state.token, input], function (err, res) {
      if (err) return flash(err.message, true);
      if (!res.ok) return flash(res.error, true);
      var p = res.preview;
      var html = '<div class="card"><b>सबटोटल ' + rupee(p.subTotal) + '</b> · GST ' + rupee(p.gstAmount) +
        ' · कुल ' + rupee(p.grandTotal) + '<br><span class="' + (p.trueMarginPct < 3 ? 'bad' : 'ok') +
        '">True margin ' + p.trueMarginPct + '% (क्रेडिट खर्च ' + rupee(p.creditCost) + ')</span>';
      if (res.text) html += '<div class="wa-box">' + esc(res.text) + '</div>';
      if (res.whatsapp && res.whatsapp.skipped) html += '<p class="muted">WA नहीं गया — टेक्स्ट कॉपी करें।</p>';
      html += '</div>';
      $('q-result').innerHTML = html;
      if (!previewOnly) flash('कोटेशन सेव: ' + res.quoteId);
    });
  }

  VIEWS.orders = {
    html: function () { return '<div class="card"><h2>ऑर्डर</h2><div id="o-list">लोड…</div></div>'; },
    bind: function () {
      run('apiListOrders', [state.token], function (err, res) {
        if (!res || !res.ok) return flash((res && res.error) || (err && err.message), true);
        if (!res.orders.length) { $('o-list').innerHTML = '<p class="muted">कोई ऑर्डर नहीं। कोट को ऑर्डर बनाएं।</p>'; return; }
        run('apiListQuotes', [state.token], function (e2, qres) {
          var open = (qres && qres.quotes || []).filter(function (q) { return q.status === 'OPEN'; });
          var extra = open.length ? '<p>खुला कोट: ' + open.map(function (q) {
            return '<button class="btn ghost" data-convert="' + q.id + '">' + q.id + ' · ' + esc(q.party) + '</button>';
          }).join(' ') + '</p>' : '';
          $('o-list').innerHTML = extra + '<table><tr><th>ऑर्डर</th><th>पार्टी</th><th>स्टेटस</th><th class="right">बाकी</th></tr>' +
            res.orders.map(function (o) {
              var pend = (o.qtyOrdered - o.qtyDispatched).toFixed(0);
              return '<tr><td>' + o.id + '</td><td>' + esc(o.party) + '</td><td>' + o.status +
                '</td><td class="right">' + pend + '</td></tr>';
            }).join('') + '</table>';
        });
      });
    }
  };

  VIEWS.dispatch = {
    html: function () {
      return '<div class="card"><h2>डिस्पैच</h2>' +
        '<label>ऑर्डर</label><select id="d-order"></select>' +
        '<div class="row"><div><label>गाडी</label><input id="d-vehicle"></div>' +
        '<div><label>E-way</label><input id="d-eway"></div></div>' +
        '<div class="row"><div><label>ड्राइवर फोन</label><input id="d-phone"></div>' +
        '<div><label>LR</label><input id="d-lr"></div></div>' +
        '<div id="d-lines"></div>' +
        '<label><input type="checkbox" id="d-wa"> WhatsApp</label>' +
        '<button class="btn wide" id="d-save">माल रवाना</button>' +
        '<div id="d-out"></div></div>';
    },
    bind: function () {
      run('apiListOrders', [state.token], function (err, res) {
        var open = (res && res.orders || []).filter(function (o) {
          return o.status === 'OPEN' || o.status === 'PARTIAL';
        });
        $('d-order').innerHTML = open.map(function (o) {
          return '<option value="' + o.id + '">' + o.id + ' · ' + esc(o.party) + '</option>';
        }).join('') || '<option value="">कोई पेंडिंग ऑर्डर नहीं</option>';
        function paint() {
          var o = open.filter(function (x) { return x.id === $('d-order').value; })[0];
          if (!o) { $('d-lines').innerHTML = ''; return; }
          $('d-lines').innerHTML = o.lines.map(function (ln) {
            var it = state.items.filter(function (i) { return i.id === ln.itemId; })[0];
            return '<div class="line-row"><div>' + esc(it ? it.name : ln.itemId) +
              ' <span class="muted">बाकी ' + ln.pending + '</span></div>' +
              '<input class="d-qty" data-item="' + ln.itemId + '" type="number" step="0.01" value="' + ln.pending + '"></div>';
          }).join('');
        }
        $('d-order').onchange = paint;
        paint();
        $('d-save').onclick = function () {
          var lines = Array.prototype.map.call(document.querySelectorAll('.d-qty'), function (inp) {
            return { itemId: inp.getAttribute('data-item'), qty: inp.value };
          });
          run('apiCreateDispatch', [state.token, {
            orderId: $('d-order').value,
            vehicle: $('d-vehicle').value,
            eway: $('d-eway').value,
            driverPhone: $('d-phone').value,
            lr: $('d-lr').value,
            lines: lines,
            sendWhatsApp: $('d-wa').checked
          }], function (e3, r) {
            if (!r || !r.ok) return flash((r && r.error) || (e3 && e3.message), true);
            $('d-out').innerHTML = '<div class="wa-box">' + esc(r.text || r.dispatchId) + '</div>';
            flash('डिस्पैच ' + r.dispatchId);
          });
        };
      });
    }
  };

  VIEWS.stock = {
    html: function () { return '<div class="card"><h2>यार्ड स्टॉक</h2><div id="st">लोड…</div></div>'; },
    bind: function () {
      run('apiStock', [state.token], function (err, res) {
        if (!res || !res.ok) return;
        $('st').innerHTML = '<table><tr><th>आइटम</th><th>यार्ड</th><th class="right">मात्रा</th></tr>' +
          res.stock.map(function (s) {
            return '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.yard) + '</td><td class="right">' + s.qty + '</td></tr>';
          }).join('') + '</table>';
      });
    }
  };

  VIEWS.parties = {
    html: function () {
      return '<div class="card"><h2>पार्टी</h2>' +
        '<label>नाम</label><input id="p-name">' +
        '<div class="row"><div><label>फोन</label><input id="p-phone"></div>' +
        '<div><label>शहर</label><input id="p-city"></div></div>' +
        '<div class="row"><div><label>क्रेडिट दिन</label><input id="p-days" type="number" value="0"></div>' +
        '<div><label>लिमिट ₹</label><input id="p-limit" type="number" value="0"></div></div>' +
        '<label>GSTIN</label><input id="p-gstin">' +
        '<button class="btn wide" id="p-save">सेव</button></div>' +
        '<div class="card"><div id="p-list"></div></div>';
    },
    bind: function () {
      $('p-list').innerHTML = '<table>' + state.parties.map(function (p) {
        return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.phone) + '</td><td>' + p.creditDays + 'd</td></tr>';
      }).join('') + '</table>';
      $('p-save').onclick = function () {
        run('apiSaveParty', [state.token, {
          name: $('p-name').value, phone: $('p-phone').value, city: $('p-city').value,
          creditDays: $('p-days').value, creditLimit: $('p-limit').value, gstin: $('p-gstin').value
        }], function (err, res) {
          if (!res || !res.ok) return flash((res && res.error) || (err && err.message), true);
          flash('पार्टी सेव');
          boot();
        });
      };
    }
  };

  VIEWS.rates = {
    html: function () {
      return '<div class="card"><h2>आज की रेट लिस्ट</h2><p class="muted">सिर्फ मालिक बदल सकता है।</p><div id="r-list"></div></div>';
    },
    bind: function () {
      $('r-list').innerHTML = state.items.map(function (it) {
        return '<div class="line-row"><div>' + esc(it.name) + '</div>' +
          '<input data-item="' + it.id + '" class="r-rate" type="number" step="0.01" value="' + it.rate + '">' +
          '<button class="btn ghost r-save" data-item="' + it.id + '">सेव</button></div>';
      }).join('');
    }
  };

  VIEWS.account = {
    html: function () {
      var lic = state.license || {};
      return '<div class="card"><h2>लाइसेंस</h2>' +
        '<p>टाइप: <b>' + (lic.type || '-') + '</b> · प्लान ' + (lic.plan || '-') +
        '<br>वैध: ' + (lic.validTill || '-') + ' (' + (lic.daysLeft || 0) + ' दिन)</p>' +
        '<div id="pay-plans"></div>' +
        '<button class="btn" id="btn-pay-sub">मंथली लें</button> ' +
        '<button class="btn ghost" id="btn-pay-one">वन-टाइम 12 महीना</button></div>' +
        '<div class="card"><h2>पासवर्ड बदलें</h2>' +
        '<label>पुराना</label><input id="pw1" type="password">' +
        '<label>नया</label><input id="pw2" type="password">' +
        '<button class="btn wide" id="pw-save">अपडेट</button></div>';
    },
    bind: function () {
      $('btn-pay-sub').onclick = function () { startPay('SUB_M'); };
      $('btn-pay-one').onclick = function () { startPay('ONE_12'); };
      $('pw-save').onclick = function () {
        run('apiChangePassword', [state.token, $('pw1').value, $('pw2').value], function (err, res) {
          if (!res || !res.ok) return flash((res && res.error) || (err && err.message), true);
          flash('पासवर्ड बदल गया');
        });
      };
    }
  };

  VIEWS.admin = {
    html: function () {
      return '<div class="card"><h2>नई दुकान</h2>' +
        '<div class="row"><div><label>फर्म</label><input id="a-firm"></div>' +
        '<div><label>शहर</label><input id="a-city"></div></div>' +
        '<div class="row"><div><label>मालिक ईमेल</label><input id="a-email"></div>' +
        '<div><label>पासवर्ड</label><input id="a-pass"></div></div>' +
        '<label>प्लान</label><select id="a-plan"><option>ONE_12</option><option>SUB_M</option><option>TRIAL</option></select>' +
        '<button class="btn wide" id="a-create">दुकान बनाएं</button></div>' +
        '<div class="card"><h2>टेनेंट</h2><div id="a-list"></div></div>';
    },
    bind: function () {
      $('a-list').innerHTML = '<table>' + state.tenants.map(function (t) {
        return '<tr><td>' + esc(t.firm) + '<br><span class="muted">' + esc(t.email) + '</span></td><td>' +
          t.status + '</td><td><button class="btn ghost" data-open="' + t.id + '">खोलें</button></td></tr>';
      }).join('') + '</table>';
      $('a-create').onclick = function () {
        run('apiAdminProvision', [state.token, {
          firmName: $('a-firm').value, city: $('a-city').value,
          ownerEmail: $('a-email').value, password: $('a-pass').value,
          planCode: $('a-plan').value
        }], function (err, res) {
          if (!res || !res.ok) return flash((res && res.error) || (err && err.message), true);
          flash('टेनेंट ' + res.tenant.tenantId);
        });
      };
    }
  };

  VIEWS.plans = {
    html: function () { return '<div class="card"><h2>प्लान</h2><div id="pl">…</div></div>'; },
    bind: function () {
      run('apiPlans', [], function (err, res) {
        if (!res) return;
        $('pl').innerHTML = res.plans.map(function (p) {
          return '<p><b>' + p.code + '</b> · ' + p.name + ' · ' + rupee(p.price) + ' · ' + p.type + '</p>';
        }).join('');
      });
    }
  };

  function startPay(plan) {
    run('apiCreatePaymentOrder', [state.token, plan], function (err, res) {
      if (!res || !res.ok) return flash((res && res.error) || 'Razorpay सेट नहीं है। Admin से लाइसेंस लगवाएं।', true);
      flash('Razorpay order ' + res.orderId + ' — Checkout कुंजी सेट होने पर यहीं खुलेगा।');
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  document.addEventListener('click', function (ev) {
    var go = ev.target.getAttribute && ev.target.getAttribute('data-go');
    if (go) {
      if (go === 'admin' && state.admin) {
        run('apiAdminHome', [state.token], function () { boot(); });
        return;
      }
      renderScreen(go);
    }
    var qid = ev.target.getAttribute && ev.target.getAttribute('data-qid');
    if (qid) {
      run('apiQuoteText', [state.token, qid], function (err, res) {
        if (res && res.ok) {
          $('q-result').innerHTML = '<div class="wa-box">' + esc(res.text) + '</div>';
        }
      });
    }
    var conv = ev.target.getAttribute && ev.target.getAttribute('data-convert');
    if (conv) {
      run('apiConvertOrder', [state.token, conv, 0, ''], function (err, res) {
        if (!res || !res.ok) return flash((res && res.error) || (err && err.message), true);
        flash('ऑर्डर ' + res.orderId);
        renderScreen('orders');
      });
    }
    var open = ev.target.getAttribute && ev.target.getAttribute('data-open');
    if (open) {
      run('apiImpersonateTenant', [state.token, open], function (err, res) {
        if (!res || !res.ok) return flash((res && res.error) || (err && err.message), true);
        boot();
      });
    }
    if (ev.target.classList && ev.target.classList.contains('r-save')) {
      var id = ev.target.getAttribute('data-item');
      var inp = document.querySelector('.r-rate[data-item="' + id + '"]');
      run('apiSaveRate', [state.token, id, inp.value, 'Yard'], function (err, res) {
        if (!res || !res.ok) return flash((res && res.error) || (err && err.message), true);
        state.items = res.items;
        flash('रेट अपडेट');
      });
    }
  });

  $('btn-login').onclick = login;
  $('btn-logout').onclick = logout;
  $('password').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') login();
  });

  run('apiPlans', [], function (err, res) {
    if (!res || !res.ok) { $('plans').textContent = 'सेटअप के बाद प्लान दिखेंगे।'; return; }
    $('plans').innerHTML = res.plans.filter(function (p) { return p.price > 0; }).map(function (p) {
      return '<div><b>' + esc(p.name) + '</b> — ' + rupee(p.price) +
        (p.type === 'ONETIME' ? ' एक बार' : ' / अवधि') + '</div>';
    }).join('') || 'ट्रायल फ्री है।';
  });

  if (state.token) boot();
})();

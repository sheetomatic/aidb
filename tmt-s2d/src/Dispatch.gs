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

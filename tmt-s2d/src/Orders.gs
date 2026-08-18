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

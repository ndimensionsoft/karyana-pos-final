/* ============================================================
   Karyana POS — GST Engine
   Three-tier priority: product override → category → fallback.
   All percentages come from the live GST_RATES table in IndexedDB
   so any rate change propagates instantly everywhere.
   ============================================================ */

const GSTEngine = (() => {

  /* In-memory cache of rates and categories (refreshed on load) */
  let _rates = {};       // { rateId: { pct, name, color, ... } }
  let _cats  = {};       // { key: { gstId, ... } }
  let _defaultRateId = 'r17';

  /* Load/refresh from IndexedDB */
  async function refresh() {
    _rates = await AppDB.GSTRates.asMap();
    _cats  = await AppDB.Categories.asMap();
    _defaultRateId = await AppDB.Settings.get('gstDefault', 'r17');
  }

  /* Return pct for a rate ID */
  function pct(rateId) {
    return _rates[rateId]?.pct ?? 0;
  }

  /* Return rate object for a rate ID */
  function rate(rateId) {
    return _rates[rateId] ?? { pct: 0, name: 'Unknown', color: '#888' };
  }

  /* Resolve the effective GST rate ID for a product */
  function effectiveRateId(product) {
    if (product.gstId && product.gstId !== 'inherit') return product.gstId;
    const cat = _cats[product.cat];
    if (cat?.gstId) return cat.gstId;
    return _defaultRateId;
  }

  /* Resolve effective GST percentage for a product */
  function effectivePct(product) {
    return pct(effectiveRateId(product));
  }

  /* Calculate tax lines for a cart (array of { product, qty, unitPrice }) */
  /* Returns { taxLines: [{ rateId, label, base, amount }], taxTotal } */
  function calcCartTax(cartItems, gstEnabled = true) {
    if (!gstEnabled) return { taxLines: [], taxTotal: 0 };

    const map = {};
    for (const { product, qty, unitPrice } of cartItems) {
      const rid  = effectiveRateId(product);
      const rate = pct(rid);
      if (rate === 0) continue;
      const lineTotal = (unitPrice ?? product.price) * qty;
      const tax       = lineTotal * rate / 100;
      if (!map[rid]) map[rid] = { rateId: rid, label: rate + '%', base: 0, amount: 0 };
      map[rid].base   += lineTotal;
      map[rid].amount += tax;
    }

    const taxLines  = Object.values(map).map(l => ({
      ...l,
      base:   parseFloat(l.base.toFixed(2)),
      amount: parseFloat(l.amount.toFixed(2)),
    }));
    const taxTotal  = parseFloat(taxLines.reduce((a, l) => a + l.amount, 0).toFixed(2));
    return { taxLines, taxTotal };
  }

  /* Format for FBR GST return — grouped by rate */
  function gstReturnSummary(sales) {
    const byRate = {};
    for (const sale of sales) {
      for (const line of sale.taxLines || []) {
        if (!byRate[line.rateId]) byRate[line.rateId] = { rateId: line.rateId, label: line.label, txns: 0, base: 0, tax: 0 };
        byRate[line.rateId].txns++;
        byRate[line.rateId].base += line.base   || 0;
        byRate[line.rateId].tax  += line.amount || 0;
      }
    }
    return Object.values(byRate).map(r => ({
      ...r,
      base: parseFloat(r.base.toFixed(2)),
      tax:  parseFloat(r.tax.toFixed(2)),
    }));
  }

  return { refresh, pct, rate, effectiveRateId, effectivePct, calcCartTax, gstReturnSummary,
           getRates: () => Object.values(_rates),
           getCatMap: () => _cats };
})();

window.GSTEngine = GSTEngine;

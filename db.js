/* ============================================================
   Karyana POS — Database Layer (Dexie.js / IndexedDB)
   All data stored locally. Works 100% offline.
   Sync engine (sync.js) reads/writes the same tables.
   ============================================================ */

/* Dexie loaded via <script> tag in index.html */
const db = new Dexie('KaryanaPOS');

/* ── Schema versioning ────────────────────────────────────── */
/* IMPORTANT: only ADD new versions, never change old ones.   */
db.version(1).stores({
  /* Primary key is ++ (auto-increment) or & (unique)         */
  products:  '++id, name, cat, barcode, vendorId, gstId, updatedAt',
  categories:'++id, &key, updatedAt',
  gstRates:  '++id, &rateId, updatedAt',
  vendors:   '++id, name, updatedAt',
  customers: '++id, name, phone, updatedAt',
  sales:     '++id, time, payment, synced, createdAt',
  saleItems: '++id, saleId, productId',
  orders:    '++id, vendorId, status, deliveryDate, updatedAt',
  orderItems:'++id, orderId, productId',
  syncQueue: '++id, table, recordId, action, createdAt, attempts',
  settings:  '&key',
});

/* ── Seed default data (runs once on first launch) ─────── */
async function seedDefaults() {
  const existing = await db.gstRates.count();
  if (existing > 0) return;   // already seeded

  /* GST rates */
  await db.gstRates.bulkAdd([
    { rateId:'r0',  name:'Zero-rated / Exempt', pct:0,  desc:'Basic food, medicines, exports',  color:'#22c55e' },
    { rateId:'r1',  name:'Reduced — 1%',        pct:1,  desc:'Selected goods per SRO',          color:'#86efac' },
    { rateId:'r5',  name:'Reduced — 5%',        pct:5,  desc:'Edible oils, some food items',    color:'#f59e0b' },
    { rateId:'r10', name:'Reduced — 10%',       pct:10, desc:'Certain services and goods',      color:'#fb923c' },
    { rateId:'r17', name:'Standard — 17%',      pct:17, desc:'General goods and services',      color:'#ef4444' },
  ]);

  /* Categories */
  await db.categories.bulkAdd([
    { key:'Dairy',      en:'Dairy',      ur:'دودھ / ڈیری', icon:'🥛', color:'#3498db', gstId:'r0'  },
    { key:'Beverages',  en:'Beverages',  ur:'مشروبات',      icon:'🥤', color:'#e74c3c', gstId:'r17' },
    { key:'Snacks',     en:'Snacks',     ur:'اسنیکس',       icon:'🍟', color:'#e67e22', gstId:'r17' },
    { key:'Atta/Rice',  en:'Atta/Rice',  ur:'آٹا / چاول',  icon:'🌾', color:'#f1c40f', gstId:'r0'  },
    { key:'Spices',     en:'Spices',     ur:'مصالحے',       icon:'🌶️', color:'#c0392b', gstId:'r17' },
    { key:'Cleaning',   en:'Cleaning',   ur:'صفائی',        icon:'🧹', color:'#1abc9c', gstId:'r17' },
    { key:'Other',      en:'Other',      ur:'دیگر',         icon:'📦', color:'#607d8b', gstId:'r5'  },
  ]);

  /* Sample products */
  const now = new Date().toISOString();
  await db.products.bulkAdd([
    { name:'Doodh 1L',       nameUr:'دودھ ۱ لیٹر',       price:180,  cost:140, stock:24, cat:'Dairy',     barcode:'6001234', vendorId:1, gstId:'inherit', updatedAt:now },
    { name:'Roti (pack 10)', nameUr:'روٹی ۱۰ عدد',       price:90,   cost:70,  stock:15, cat:'Atta/Rice', barcode:'6001235', vendorId:2, gstId:'inherit', updatedAt:now },
    { name:'Pepsi 1.5L',     nameUr:'پیپسی ڈیڑھ لیٹر',  price:120,  cost:90,  stock:30, cat:'Beverages', barcode:'6001236', vendorId:3, gstId:'inherit', updatedAt:now },
    { name:'Lays Masala',    nameUr:'لیز مصالحہ',         price:50,   cost:38,  stock:48, cat:'Snacks',    barcode:'6001237', vendorId:3, gstId:'inherit', updatedAt:now },
    { name:'Surf Excel 500g',nameUr:'سرف ایکسل ۵۰۰گ',    price:280,  cost:220, stock:12, cat:'Cleaning',  barcode:'6001238', vendorId:null, gstId:'inherit', updatedAt:now },
    { name:'Lipton Tea 200g',nameUr:'لپٹن چائے ۲۰۰گ',    price:320,  cost:260, stock:8,  cat:'Beverages', barcode:'6001239', vendorId:2, gstId:'inherit', updatedAt:now },
    { name:'Basmati Rice 5kg',nameUr:'باسمتی چاول ۵کلو', price:1200, cost:950, stock:5,  cat:'Atta/Rice', barcode:'6001240', vendorId:2, gstId:'inherit', updatedAt:now },
    { name:'Dalda 2.5L',     nameUr:'ڈالڈا ڈھائی لیٹر', price:750,  cost:600, stock:10, cat:'Other',     barcode:'6001241', vendorId:null, gstId:'r0', updatedAt:now },
    { name:'Shan Biryani',   nameUr:'شان بریانی مصالحہ', price:95,   cost:72,  stock:20, cat:'Spices',    barcode:'6001242', vendorId:4, gstId:'inherit', updatedAt:now },
    { name:'Frooti 250ml',   nameUr:'فروٹی ۲۵۰ ملی',    price:35,   cost:25,  stock:60, cat:'Beverages', barcode:'6001243', vendorId:3, gstId:'inherit', updatedAt:now },
  ]);

  /* Sample vendors */
  await db.vendors.bulkAdd([
    { name:'Nestle Pakistan',    contact:'Tariq Bhai', phone:'0300-1111111', area:'Lahore',  notes:'15-day credit.',    credit:4500, lastOrder:'2024-01-12', updatedAt:now },
    { name:'Al-Madina Traders',  contact:'Imran Sahib',phone:'0333-2222222', area:'Local',   notes:'Cash on delivery.', credit:0,    lastOrder:'2024-01-14', updatedAt:now },
    { name:'PepsiCo Distributor',contact:'Saleem',     phone:'0321-3333333', area:'Lahore',  notes:'7-day credit.',     credit:8200, lastOrder:'2024-01-10', updatedAt:now },
    { name:'National Foods',     contact:'Ayesha',     phone:'0312-4444444', area:'Karachi', notes:'30-day credit.',    credit:1800, lastOrder:'2024-01-08', updatedAt:now },
  ]);

  /* Sample customers */
  await db.customers.bulkAdd([
    { name:'Ali Khan',     phone:'0300-1234567', balance:850,  last:'2024-01-15', smsSent:false, updatedAt:now },
    { name:'Ahmed Bhai',   phone:'0333-9876543', balance:0,    last:'2024-01-14', smsSent:false, updatedAt:now },
    { name:'Fatima Begum', phone:'0321-5556789', balance:2100, last:'2024-01-13', smsSent:true,  updatedAt:now },
  ]);

  /* Default settings */
  await db.settings.bulkAdd([
    { key:'storeName',   value:'Karyana Store' },
    { key:'storeAddr',   value:'Shop #12, Main Bazar, Lahore' },
    { key:'storePhone',  value:'0300-0000000' },
    { key:'storeNTN',    value:'1234567-8' },
    { key:'lang',        value:'en' },
    { key:'gstDefault',  value:'r17' },
    { key:'gstAutoApply',value:true },
    { key:'smsApiKey',   value:'' },
    { key:'smsAutoSend', value:false },
    { key:'cloudUrl',    value:'' },
    { key:'cloudKey',    value:'' },
    { key:'lastSync',    value:null },
  ]);
}

/* ── Settings helpers ──────────────────────────────────────── */
const Settings = {
  async get(key, fallback = null) {
    const row = await db.settings.get(key);
    return row ? row.value : fallback;
  },
  async set(key, value) {
    await db.settings.put({ key, value });
  },
  async getAll() {
    const rows = await db.settings.toArray();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },
};

/* ── Products helpers ─────────────────────────────────────── */
const Products = {
  getAll:        ()         => db.products.toArray(),
  getById:       id         => db.products.get(id),
  getByBarcode:  barcode    => db.products.where('barcode').equals(barcode).first(),
  getByCategory: cat        => db.products.where('cat').equals(cat).toArray(),
  save:          product    => {
    product.updatedAt = new Date().toISOString();
    return product.id ? db.products.put(product) : db.products.add(product);
  },
  updateStock:   (id, delta) => db.products.where('id').equals(id).modify(p => { p.stock += delta; p.updatedAt = new Date().toISOString(); }),
};

/* ── Categories helpers ───────────────────────────────────── */
const Categories = {
  getAll: () => db.categories.toArray(),
  save:   cat => {
    cat.updatedAt = new Date().toISOString();
    return cat.id ? db.categories.put(cat) : db.categories.add(cat);
  },
  asMap:  async () => {
    const cats = await db.categories.toArray();
    return Object.fromEntries(cats.map(c => [c.key, c]));
  },
};

/* ── GST Rates helpers ────────────────────────────────────── */
const GSTRates = {
  getAll:     ()  => db.gstRates.toArray(),
  getById:    id  => db.gstRates.where('rateId').equals(id).first(),
  save:       rate => {
    rate.updatedAt = new Date().toISOString();
    return rate.id ? db.gstRates.put(rate) : db.gstRates.add(rate);
  },
  delete:     id  => db.gstRates.where('rateId').equals(id).delete(),
  asMap:      async () => {
    const rates = await db.gstRates.toArray();
    return Object.fromEntries(rates.map(r => [r.rateId, r]));
  },
};

/* ── Vendors helpers ─────────────────────────────────────── */
const Vendors = {
  getAll:  ()         => db.vendors.toArray(),
  getById: id         => db.vendors.get(id),
  save:    vendor     => {
    vendor.updatedAt = new Date().toISOString();
    return vendor.id ? db.vendors.put(vendor) : db.vendors.add(vendor);
  },
  addCredit:   (id, amount) => db.vendors.where('id').equals(id).modify(v => { v.credit = (v.credit||0) + amount; }),
  reduceCredit:(id, amount) => db.vendors.where('id').equals(id).modify(v => { v.credit = Math.max(0,(v.credit||0) - amount); }),
};

/* ── Customers helpers ───────────────────────────────────── */
const Customers = {
  getAll:  ()         => db.customers.toArray(),
  getById: id         => db.customers.get(id),
  save:    customer   => {
    customer.updatedAt = new Date().toISOString();
    return customer.id ? db.customers.put(customer) : db.customers.add(customer);
  },
  addBalance:    (id, amount) => db.customers.where('id').equals(id).modify(c => { c.balance = (c.balance||0) + amount; c.last = new Date().toISOString().split('T')[0]; }),
  reduceBalance: (id, amount) => db.customers.where('id').equals(id).modify(c => { c.balance = Math.max(0,(c.balance||0) - amount); }),
};

/* ── Sales helpers ───────────────────────────────────────── */
const Sales = {
  getAll:     ()          => db.sales.orderBy('id').reverse().toArray(),
  getById:    id          => db.sales.get(id),
  getToday:   async ()    => {
    const today = new Date().toISOString().split('T')[0];
    return db.sales.filter(s => s.createdAt?.startsWith(today)).toArray();
  },
  getUnsynced: ()         => db.sales.where('synced').equals(0).toArray(),
  save:        async (sale, items) => {
    sale.createdAt = sale.createdAt || new Date().toISOString();
    sale.synced    = 0;
    const saleId   = await db.sales.add(sale);
    if (items?.length) {
      await db.saleItems.bulkAdd(items.map(i => ({ ...i, saleId })));
    }
    return saleId;
  },
  getItems:    saleId     => db.saleItems.where('saleId').equals(saleId).toArray(),
  markSynced:  id         => db.sales.where('id').equals(id).modify({ synced: 1 }),
};

/* ── Orders helpers ──────────────────────────────────────── */
const Orders = {
  getAll:     ()          => db.orders.toArray(),
  getPending: ()          => db.orders.where('status').equals('pending').toArray(),
  getById:    id          => db.orders.get(id),
  save:       async (order, items) => {
    order.updatedAt = new Date().toISOString();
    const orderId = order.id ? await db.orders.put(order) : await db.orders.add(order);
    const oid = order.id || orderId;
    if (items?.length) {
      await db.orderItems.where('orderId').equals(oid).delete();
      await db.orderItems.bulkAdd(items.map(i => ({ ...i, orderId: oid })));
    }
    return oid;
  },
  getItems:   orderId     => db.orderItems.where('orderId').equals(orderId).toArray(),
  getExpected: async (productId) => {
    const pending = await db.orders.where('status').equals('pending').toArray();
    let total = 0;
    for (const o of pending) {
      const items = await db.orderItems.where('orderId').equals(o.id).toArray();
      const item = items.find(i => i.productId === productId);
      if (item) total += (item.qty - (item.received || 0));
    }
    return total;
  },
};

/* ── Sync queue helpers ──────────────────────────────────── */
const SyncQueue = {
  push:    entry  => db.syncQueue.add({ ...entry, createdAt: new Date().toISOString(), attempts: 0 }),
  getAll:  ()     => db.syncQueue.toArray(),
  remove:  id     => db.syncQueue.delete(id),
  bumpAttempts: id => db.syncQueue.where('id').equals(id).modify(r => { r.attempts++; }),
};

/* ── Export a single global App.DB namespace ─────────────── */
window.AppDB = { db, Settings, Products, Categories, GSTRates, Vendors, Customers, Sales, Orders, SyncQueue, seedDefaults };

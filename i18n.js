/* ============================================================
   Karyana POS — Internationalisation (i18n)
   All UI strings in English and Urdu.
   Usage: i18n.t('sale') → 'Sale' or 'فروخت'
   Usage: i18n.setLang('ur') → switches globally
   ============================================================ */

const i18n = (() => {

  let _lang = 'en';

  const STRINGS = {
    en: {
      /* Nav tabs */
      sale: 'Sale', inv: 'Inventory', udhar: 'Udhar', vendors: 'Vendors',
      orders: 'Orders', report: 'Report', settings: 'Settings',

      /* POS */
      cart: 'Cart', clear: 'Clear', subtotal: 'Subtotal', total: 'Total',
      charge: 'Charge', applyGst: 'Apply GST', perCatRates: '(per-category)',
      searchPlaceholder: 'Search or scan barcode...',
      cartEmpty: 'Cart is empty',
      paymentSuccess: 'Payment successful',
      addedToUdhar: 'Added to Udhar',
      selectCustomer: 'Select customer...',
      pleaseSelectCustomer: 'Please select a customer for udhar',

      /* Payment methods */
      cash: 'Cash', easypaisa: 'Easypaisa', jazzcash: 'JazzCash', udharBtn: 'Udhar',

      /* Inventory */
      invTitle: 'Inventory', addProd: 'Add product', editProd: 'Edit product',
      product: 'Product', category: 'Category', catGst: 'Cat. GST',
      effGst: 'Effective GST', salePrice: 'Sale price', cost: 'Cost',
      margin: 'Margin', stock: 'Stock', expected: 'Exp.',
      inStock: 'In stock', lowStock: 'Low', outOfStock: 'Out',

      /* Udhar */
      udharTitle: 'Udhar — Customer Credit', addCust: 'Add customer',
      customer: 'Customer', phone: 'Phone', balance: 'Balance',
      lastSale: 'Last sale', paid: 'Paid',
      amountPaid: 'Amount paid?', currentBalance: 'Current balance',

      /* Vendors */
      vendorsTitle: 'Vendors', addVendor: 'Add vendor',
      products: 'products', noCredit: 'No credit', payCredit: 'Pay',

      /* Orders */
      pending: 'Pending', received: 'Received', vendorCredit: 'Vendor Credit',
      newOrder: 'New order', placeOrder: 'Place order', receiveGoods: 'Receive goods',
      totalOwed: 'Total owed', vendorsCredit: 'With credit', oldest: 'Oldest unpaid',
      noOrders: 'No pending orders', noReceived: 'No received orders',
      completed: 'Completed',

      /* Report */
      salesToday: 'Sales today', transactions: 'Transactions',
      custUdhar: 'Customer udhar', vendorCreditLbl: 'Vendor credit',
      avgMargin: 'Avg margin', gstCollected: 'GST collected',
      estProfit: 'Est. gross profit', taxableSales: 'Taxable sales',
      totalGst: 'Total GST', netExGst: 'Net ex-GST',
      fbrReturn: 'FBR GST Return', collectsByRate: 'Collections by rate',
      rateSched: 'Current rate schedule',

      /* Settings */
      storeName: 'Store name', address: 'Address', ntn: 'NTN',
      defaultGstTitle: 'Default GST rate (fallback)', save: 'Save', saved: 'Saved!',
      catHint: 'Set color, icon and GST rate per category.',
      addCatTitle: 'Add new category', addCatBtn: 'Add category',
      gstRate: 'GST rate', color: 'Color', icon: 'Icon',
      fbrTitle: 'FBR GST rates (Pakistan)',
      fbrDesc: 'Standard: 17% · Reduced: 10%, 5%, 1% · Zero: 0%. Edit any rate — changes apply immediately.',
      rateName: 'Rate name', percentage: 'Percentage (%)', description: 'Description',
      addRate: 'Add rate',
      rateNote: 'Rates cascade: Product override → Category → Fallback.',
      cloudUrl: 'Supabase project URL', cloudKey: 'Supabase anon key',
      printerSection: 'Thermal printer', connectUsb: 'Connect USB printer',
      connectBt: 'Connect Bluetooth printer', testPrint: 'Test print',
      printerConnected: 'Printer connected', printerNotConnected: 'No printer connected',
      smsSection: 'SMS settings', smsProvider: 'SMS provider',
      smsApiKey: 'API key', smsSender: 'Sender ID',
      smsAutoSend: 'Auto-send receipt after sale',

      /* GST override */
      inheritCatRate: 'Use category rate', prodGstLabel: 'GST override',

      /* SMS */
      smsTo: 'To (phone)', message: 'Message', send: 'Send',
      reminderSent: 'Reminder sent', remind: 'Remind',
      noBalances: 'No outstanding balances',

      /* Sync */
      synced: 'Synced', syncing: 'Syncing…', offline: 'Offline',
      syncError: 'Sync error',

      /* Printer */
      thankYou: 'Shukriya! Phir aana :)',
    },

    ur: {
      sale: 'فروخت', inv: 'انوینٹری', udhar: 'ادھار', vendors: 'سپلائرز',
      orders: 'آرڈر', report: 'رپورٹ', settings: 'ترتیبات',

      cart: 'ٹوکری', clear: 'صاف', subtotal: 'ذیلی کل', total: 'کل رقم',
      charge: 'وصول کریں', applyGst: 'GST لاگو کریں', perCatRates: '(زمرہ وار)',
      searchPlaceholder: 'مصنوع تلاش کریں...',
      cartEmpty: 'ٹوکری خالی ہے',
      paymentSuccess: 'ادائیگی کامیاب',
      addedToUdhar: 'ادھار میں شامل کیا گیا',
      selectCustomer: 'گاہک منتخب کریں',
      pleaseSelectCustomer: 'ادھار کے لیے گاہک منتخب کریں',

      cash: 'نقد', easypaisa: 'ایزی پیسہ', jazzcash: 'جاز کیش', udharBtn: 'ادھار',

      invTitle: 'انوینٹری', addProd: 'مصنوع شامل کریں', editProd: 'مصنوع ترمیم کریں',
      product: 'مصنوع', category: 'زمرہ', catGst: 'زمرہ GST',
      effGst: 'موثر GST', salePrice: 'فروخت قیمت', cost: 'لاگت',
      margin: 'منافع', stock: 'اسٹاک', expected: 'متوقع',
      inStock: 'موجود', lowStock: 'کم', outOfStock: 'ختم',

      udharTitle: 'ادھار — گاہک کریڈٹ', addCust: 'گاہک شامل کریں',
      customer: 'گاہک', phone: 'فون', balance: 'بقایا',
      lastSale: 'آخری فروخت', paid: 'ادا',
      amountPaid: 'کتنی رقم ادا کی؟', currentBalance: 'موجودہ بقایا',

      vendorsTitle: 'سپلائرز', addVendor: 'سپلائر شامل کریں',
      products: 'مصنوعات', noCredit: 'بقایا نہیں', payCredit: 'ادا',

      pending: 'زیر التواء', received: 'وصول شدہ', vendorCredit: 'سپلائر کریڈٹ',
      newOrder: 'نیا آرڈر', placeOrder: 'آرڈر دیں', receiveGoods: 'مال وصول کریں',
      totalOwed: 'واجب الادا', vendorsCredit: 'کریڈٹ والے', oldest: 'قدیم ترین',
      noOrders: 'کوئی زیر التواء آرڈر نہیں', noReceived: 'کوئی وصول شدہ آرڈر نہیں',
      completed: 'مکمل',

      salesToday: 'آج کی فروخت', transactions: 'لین دین',
      custUdhar: 'گاہک ادھار', vendorCreditLbl: 'سپلائر کریڈٹ',
      avgMargin: 'اوسط منافع', gstCollected: 'جمع شدہ GST',
      estProfit: 'تخمینی منافع', taxableSales: 'قابل ٹیکس فروخت',
      totalGst: 'کل GST', netExGst: 'خالص (GST کے بغیر)',
      fbrReturn: 'FBR GST ریٹرن', collectsByRate: 'شرح کے مطابق',
      rateSched: 'موجودہ شرح نامہ',

      storeName: 'دکان کا نام', address: 'پتہ', ntn: 'این ٹی این',
      defaultGstTitle: 'ڈیفالٹ GST شرح', save: 'محفوظ کریں', saved: 'محفوظ!',
      catHint: 'ہر زمرے کا رنگ، آئیکن اور GST شرح ترتیب دیں۔',
      addCatTitle: 'نیا زمرہ شامل کریں', addCatBtn: 'زمرہ شامل کریں',
      gstRate: 'GST شرح', color: 'رنگ', icon: 'آئیکن',
      fbrTitle: 'FBR GST شرح (پاکستان)',
      fbrDesc: 'معیاری: 17% · کم: 10%, 5%, 1% · صفر: 0%۔ کوئی بھی شرح تبدیل کریں۔',
      rateName: 'شرح کا نام', percentage: 'فیصد (%)', description: 'تفصیل',
      addRate: 'شرح شامل کریں',
      rateNote: 'ترتیب: مصنوع override → زمرہ → ڈیفالٹ',
      cloudUrl: 'Supabase URL', cloudKey: 'Supabase key',
      printerSection: 'تھرمل پرنٹر', connectUsb: 'USB پرنٹر جوڑیں',
      connectBt: 'بلوٹوتھ پرنٹر جوڑیں', testPrint: 'ٹیسٹ پرنٹ',
      printerConnected: 'پرنٹر جڑا ہوا ہے', printerNotConnected: 'پرنٹر نہیں جڑا',
      smsSection: 'SMS ترتیبات', smsProvider: 'SMS سروس',
      smsApiKey: 'API کلید', smsSender: 'بھیجنے والا',
      smsAutoSend: 'فروخت کے بعد رسید خود بھیجیں',

      inheritCatRate: 'زمرہ کی شرح استعمال کریں', prodGstLabel: 'GST override',

      smsTo: 'فون نمبر', message: 'پیغام', send: 'بھیجیں',
      reminderSent: 'یاددہانی بھیجی گئی', remind: 'یاد دہانی',
      noBalances: 'کوئی بقایا نہیں',

      synced: 'مطابقت ہو گئی', syncing: 'مطابقت ہو رہی ہے…', offline: 'آف لائن',
      syncError: 'مطابقت میں خطا',

      thankYou: 'شکریہ! پھر آنا :)',
    },
  };

  function t(key) {
    return STRINGS[_lang]?.[key] ?? STRINGS.en[key] ?? key;
  }

  function setLang(lang) {
    if (STRINGS[lang]) _lang = lang;
  }

  function getLang() { return _lang; }

  function isUrdu() { return _lang === 'ur'; }

  /* Apply all data-i18n attributes in the DOM */
  function applyDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
      if (isUrdu()) {
        el.style.fontFamily = "'Noto Nastaliq Urdu', serif";
        el.style.direction  = 'rtl';
      } else {
        el.style.fontFamily = '';
        el.style.direction  = '';
      }
    });

    /* Placeholders */
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });

    /* Update html lang attribute */
    document.documentElement.lang = _lang === 'ur' ? 'ur' : 'en';
    document.documentElement.dir  = _lang === 'ur' ? 'rtl' : 'ltr';
  }

  return { t, setLang, getLang, isUrdu, applyDOM, STRINGS };

})();

window.i18n = i18n;

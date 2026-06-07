/* ============================================================
   Karyana POS — SMS / WhatsApp Module
   Providers:
     - Jazz SMS (bulk SMS Pakistan)
     - Twilio SMS (international)
     - Meta WhatsApp Cloud API
   Falls back to sms: URI on unsupported devices.
   ============================================================ */

const SMS = (() => {

  let _provider = 'jazz';    // 'jazz' | 'twilio' | 'whatsapp'
  let _apiKey   = '';
  let _from     = '';        // sender ID / WhatsApp number

  /* ── Init from settings ──────────────────────────────── */
  async function init() {
    _provider = await AppDB.Settings.get('smsProvider', 'jazz');
    _apiKey   = await AppDB.Settings.get('smsApiKey',   '');
    _from     = await AppDB.Settings.get('smsSender',   'KaryanaPOS');
  }

  /* ── Build message templates ─────────────────────────── */
  const Templates = {

    udharReminder(customer, storeName, lang = 'en') {
      if (lang === 'ur') {
        return `آداب ${customer.name} صاحب،\nآپ کا ${storeName} پر Rs ${customer.balance.toLocaleString('en-PK')} کا ادھار باقی ہے۔\nمہربانی فرما کر جلد ادا کریں۔\nشکریہ۔`;
      }
      return `Adaab ${customer.name} Sahib,\nApka ${storeName} par Rs ${customer.balance.toLocaleString('en-PK')} ka udhar baqaya hai.\nMeherbani farma kar jald ada karein.\nShukriya - ${storeName}`;
    },

    receipt(sale, storeName, lang = 'en') {
      const items = (sale.lineItems || []).map(i => `${i.name} x${i.qty}`).join(', ');
      const gstStr = sale.taxLines?.length
        ? ' (inc GST Rs ' + Math.round(sale.taxLines.reduce((a, l) => a + l.amount, 0)).toLocaleString('en-PK') + ')'
        : '';
      if (lang === 'ur') {
        return `${storeName} سے خریداری کا شکریہ!\n${items}\nکل رقم: Rs ${Math.round(sale.total).toLocaleString('en-PK')}${gstStr}`;
      }
      return `${storeName} - Receipt\n${items}\nTotal: Rs ${Math.round(sale.total).toLocaleString('en-PK')}${gstStr}\nShukriya!`;
    },

    vendorPayment(vendor, amount, storeName) {
      return `Salam ${vendor.contact} Sahib,\n${storeName} ne Rs ${Math.round(amount).toLocaleString('en-PK')} ki payment karni hai.\nKripya confirm karein.\nShukriya.`;
    },

    orderFollowup(vendor, storeName) {
      return `Salam ${vendor.contact} Sahib,\n${storeName} se kuch items maqamul karne hain. Kripya mujhse rabta karein.\nShukriya - ${storeName}`;
    },
  };

  /* ── Send via Jazz SMS API ───────────────────────────── */
  async function _sendJazz(to, message) {
    /* Jazz Messaging API — requires registration at messaging.jazz.com.pk */
    const res = await fetch('https://api.messaging.jazz.com.pk/messages', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${_apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from: _from, text: message }),
    });
    if (!res.ok) throw new Error(`Jazz SMS error: ${res.status}`);
    return res.json();
  }

  /* ── Send via Twilio ─────────────────────────────────── */
  async function _sendTwilio(to, message) {
    const [accountSid, authToken] = _apiKey.split(':');
    const body = new URLSearchParams({ To: to, From: _from, Body: message });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method:  'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Twilio error: ${res.status}`);
    return res.json();
  }

  /* ── Send via WhatsApp Cloud API (Meta) ──────────────── */
  async function _sendWhatsApp(to, message) {
    const [phoneId, token] = _apiKey.split(':');
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),   // digits only
        type: 'text',
        text: { body: message },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp error: ${res.status}`);
    return res.json();
  }

  /* ── Fallback: open native SMS app ──────────────────── */
  function _openNativeSMS(to, message) {
    const encoded = encodeURIComponent(message);
    window.open(`sms:${to}?body=${encoded}`);
  }

  /* ── Public: send message ────────────────────────────── */
  async function send(to, message) {
    /* No API key — fall back to native SMS */
    if (!_apiKey) {
      _openNativeSMS(to, message);
      return { method: 'native', to };
    }

    try {
      if      (_provider === 'jazz')      return { method: 'jazz',      ...(await _sendJazz(to, message)) };
      else if (_provider === 'twilio')    return { method: 'twilio',    ...(await _sendTwilio(to, message)) };
      else if (_provider === 'whatsapp')  return { method: 'whatsapp',  ...(await _sendWhatsApp(to, message)) };
      else throw new Error('Unknown provider: ' + _provider);
    } catch (err) {
      /* API failed — log and fall back to native */
      console.warn('SMS API failed, opening native:', err.message);
      _openNativeSMS(to, message);
      return { method: 'native_fallback', error: err.message };
    }
  }

  /* ── Public: bulk send udhar reminders ──────────────── */
  async function sendUdharReminders(customers, storeName, lang = 'en') {
    const results = [];
    for (const c of customers) {
      if (!c.phone || c.balance <= 0) continue;
      const msg = Templates.udharReminder(c, storeName, lang);
      const result = await send(c.phone, msg);
      results.push({ customerId: c.id, ...result });
      /* Small delay between messages to avoid rate limits */
      await new Promise(r => setTimeout(r, 300));
    }
    return results;
  }

  return { init, send, sendUdharReminders, Templates };

})();

window.SMS = SMS;

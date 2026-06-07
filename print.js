/* ============================================================
   Karyana POS — Thermal Receipt Printer (ESC/POS)
   WebUSB  → USB printers on Windows/Android
   Web Bluetooth → Bluetooth printers on Android
   58mm paper width (32 chars per line at normal size)
   ============================================================ */

const Printer = (() => {

  const ESC = 0x1B;
  const GS  = 0x1D;
  const COLS = 32;    // 58mm paper = 32 chars at default font

  /* ESC/POS command bytes */
  const CMD = {
    INIT:           [ESC, 0x40],
    ALIGN_LEFT:     [ESC, 0x61, 0x00],
    ALIGN_CENTER:   [ESC, 0x61, 0x01],
    ALIGN_RIGHT:    [ESC, 0x61, 0x02],
    BOLD_ON:        [ESC, 0x45, 0x01],
    BOLD_OFF:       [ESC, 0x45, 0x00],
    DOUBLE_HEIGHT:  [ESC, 0x21, 0x10],
    NORMAL_SIZE:    [ESC, 0x21, 0x00],
    FEED_3:         [ESC, 0x64, 0x03],
    FEED_5:         [ESC, 0x64, 0x05],
    CUT:            [GS,  0x56, 0x42, 0x00],
    LINE:           '\n',
    DIVIDER:        '--------------------------------\n',
  };

  let _device = null;     // WebUSB device
  let _btChar  = null;    // Bluetooth GATT characteristic
  let _mode    = null;    // 'usb' | 'bluetooth' | null

  /* ── USB connect (Windows + Android USB) ─────────────── */
  async function connectUSB() {
    if (!navigator.usb) throw new Error('WebUSB not supported in this browser.');
    _device = await navigator.usb.requestDevice({ filters: [
      { classCode: 7 },          // Printer class
      { vendorId: 0x0416 },      // common cheap thermal printer VIDs
      { vendorId: 0x154F },
      { vendorId: 0x0483 },
    ]});
    await _device.open();
    if (_device.configuration === null) await _device.selectConfiguration(1);
    await _device.claimInterface(0);
    _mode = 'usb';
    return true;
  }

  /* ── Bluetooth connect (Android wireless) ────────────── */
  async function connectBluetooth() {
    if (!navigator.bluetooth) throw new Error('Web Bluetooth not supported.');
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    });
    const server  = await device.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    _btChar = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    _mode = 'bluetooth';
    return true;
  }

  /* ── Disconnect ──────────────────────────────────────── */
  async function disconnect() {
    try {
      if (_mode === 'usb' && _device) { await _device.close(); _device = null; }
      if (_mode === 'bluetooth' && _btChar) { await _btChar.service.device.gatt.disconnect(); _btChar = null; }
    } catch {}
    _mode = null;
  }

  /* ── Send raw bytes to printer ───────────────────────── */
  async function _send(data) {
    if (!_mode) throw new Error('No printer connected.');
    const bytes = new Uint8Array(data);
    if (_mode === 'usb') {
      /* Send in 512-byte chunks (USB bulk transfer limit) */
      for (let i = 0; i < bytes.length; i += 512) {
        await _device.transferOut(1, bytes.slice(i, i + 512));
      }
    } else {
      /* Bluetooth: 20-byte MTU chunks */
      for (let i = 0; i < bytes.length; i += 20) {
        await _btChar.writeValue(bytes.slice(i, i + 20));
        await new Promise(r => setTimeout(r, 20));  // small delay between chunks
      }
    }
  }

  /* ── Text to bytes (UTF-8, fallback for Urdu: print English) */
  function _toBytes(text) {
    return Array.from(new TextEncoder().encode(text));
  }

  /* ── Helper: pad/truncate to fixed width ─────────────── */
  function _padEnd(str, len) {
    str = String(str);
    return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
  }
  function _padStart(str, len) {
    str = String(str);
    return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
  }

  /* ── Build receipt bytes from sale object ────────────── */
  function buildReceipt(sale, store) {
    const buf = [];
    const push = (...cmds) => cmds.forEach(c => {
      if (Array.isArray(c))       buf.push(...c);
      else if (typeof c === 'string') buf.push(..._toBytes(c));
      else                        buf.push(c);
    });

    push(CMD.INIT);

    /* Store header */
    push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT);
    push(store.name + '\n');
    push(CMD.NORMAL_SIZE, CMD.BOLD_OFF);
    push(store.addr  + '\n');
    push(store.phone + '\n');
    if (store.ntn) push('NTN: ' + store.ntn + '\n');
    push(CMD.DIVIDER);

    /* Date / time */
    push(CMD.ALIGN_LEFT);
    const d = new Date(sale.createdAt || Date.now());
    const dateStr = d.toLocaleDateString('en-PK') + '  ' + d.toTimeString().slice(0, 5);
    push(dateStr + '\n');
    push(CMD.DIVIDER);

    /* Line items */
    for (const item of sale.lineItems || []) {
      const name  = _padEnd(item.name || item.nameUr || '', 16);
      const qty   = 'x' + item.qty;
      const total = 'Rs ' + Math.round(item.price * item.qty).toLocaleString('en-PK');
      const gst   = item.gstPct > 0 ? ` +${item.gstPct}%` : '';
      push(name + _padStart(qty + gst, COLS - 16) + '\n');
      push(_padStart(total, COLS) + '\n');
    }
    push(CMD.DIVIDER);

    /* Subtotal */
    push(_padEnd('Subtotal', 20) + _padStart('Rs ' + Math.round(sale.subtotal).toLocaleString('en-PK'), COLS - 20) + '\n');

    /* GST lines */
    for (const tl of sale.taxLines || []) {
      push(_padEnd('GST ' + tl.label, 20) + _padStart('Rs ' + Math.round(tl.amount).toLocaleString('en-PK'), COLS - 20) + '\n');
    }

    /* Total */
    push(CMD.BOLD_ON);
    push(_padEnd('TOTAL', 20) + _padStart('Rs ' + Math.round(sale.total).toLocaleString('en-PK'), COLS - 20) + '\n');
    push(CMD.BOLD_OFF);
    push('Payment: ' + sale.payment + '\n');
    push(CMD.DIVIDER);

    /* Footer */
    push(CMD.ALIGN_CENTER);
    push('Shukriya! Phir aana :)\n');
    push('شکریہ! پھر آنا\n');
    push(CMD.FEED_5);
    push(CMD.CUT);

    return buf;
  }

  /* ── Public: print a sale ────────────────────────────── */
  async function printSale(sale, store) {
    if (!_mode) throw new Error('Connect a printer first.');
    const bytes = buildReceipt(sale, store);
    await _send(bytes);
  }

  /* ── Public: test print ──────────────────────────────── */
  async function testPrint(store) {
    const testSale = {
      createdAt: new Date().toISOString(),
      payment:   'Test',
      subtotal:  100,
      taxLines:  [{ label: '17%', amount: 17 }],
      total:     117,
      lineItems: [{ name: 'Test Item', qty: 1, price: 100, gstPct: 17 }],
    };
    await printSale(testSale, store);
  }

  /* ── Public: generate plain-text receipt (fallback for screen) */
  function buildTextReceipt(sale, store) {
    const lines = [
      '================================',
      `  ${store.name}`,
      `  ${store.addr}`,
      `  Tel: ${store.phone}`,
      store.ntn ? `  NTN: ${store.ntn}` : '',
      '================================',
      `Date: ${new Date(sale.createdAt||Date.now()).toLocaleDateString('en-PK')}  ${new Date(sale.createdAt||Date.now()).toTimeString().slice(0,5)}`,
      '--------------------------------',
    ];
    for (const item of sale.lineItems || []) {
      const gst = item.gstPct > 0 ? ` +${item.gstPct}%` : '';
      lines.push(`${(item.name||'').substring(0,14).padEnd(14)} x${item.qty}${gst.padEnd(6)} ${('Rs '+Math.round(item.price*item.qty).toLocaleString('en-PK')).padStart(8)}`);
    }
    lines.push('--------------------------------');
    lines.push(`${'Subtotal'.padEnd(20)} ${('Rs '+Math.round(sale.subtotal).toLocaleString('en-PK')).padStart(10)}`);
    for (const tl of sale.taxLines || []) {
      lines.push(`${'GST '+tl.label.padEnd(18)} ${('Rs '+Math.round(tl.amount).toLocaleString('en-PK')).padStart(10)}`);
    }
    lines.push(`${'TOTAL'.padEnd(20)} ${('Rs '+Math.round(sale.total).toLocaleString('en-PK')).padStart(10)}`);
    lines.push(`Payment: ${sale.payment}`);
    lines.push('================================');
    lines.push('   Shukriya! Phir aana :)');
    lines.push('================================');
    return lines.filter(Boolean).join('\n');
  }

  return {
    connectUSB, connectBluetooth, disconnect,
    printSale, testPrint, buildTextReceipt,
    isConnected:   () => _mode !== null,
    connectionMode:() => _mode,
  };

})();

window.Printer = Printer;

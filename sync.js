/* ============================================================
   Karyana POS — Sync Engine
   Queues all mutations while offline.
   Pushes to Supabase when internet is available.
   Conflict resolution: last-write-wins via updatedAt timestamp.
   ============================================================ */

const SyncEngine = (() => {

  let _cloudUrl = '';
  let _cloudKey = '';
  let _syncing  = false;
  let _listeners = [];   // UI callbacks for sync status changes

  /* ── Init ──────────────────────────────────────────────── */
  async function init() {
    _cloudUrl = await AppDB.Settings.get('cloudUrl', '');
    _cloudKey = await AppDB.Settings.get('cloudKey', '');

    /* Listen for online events and attempt sync */
    window.addEventListener('online',  () => { notifyListeners('online');  sync(); });
    window.addEventListener('offline', () => notifyListeners('offline'));

    /* Sync on startup if online */
    if (navigator.onLine && _cloudUrl) sync();

    /* Periodic background sync every 5 minutes */
    setInterval(() => { if (navigator.onLine && _cloudUrl) sync(); }, 5 * 60 * 1000);
  }

  /* ── Register a UI listener for status changes ────────── */
  function onStatusChange(fn) {
    _listeners.push(fn);
  }

  function notifyListeners(status, detail = {}) {
    _listeners.forEach(fn => fn(status, detail));
  }

  /* ── Queue a mutation for sync ────────────────────────── */
  async function queue(table, recordId, action = 'upsert', payload = {}) {
    if (!_cloudUrl) return;   // cloud not configured — skip
    await AppDB.SyncQueue.push({ table, recordId, action, payload: JSON.stringify(payload) });
  }

  /* ── Push pending queue to Supabase ──────────────────── */
  async function sync() {
    if (_syncing || !_cloudUrl || !navigator.onLine) return;
    _syncing = true;
    notifyListeners('syncing');

    try {
      const pending = await AppDB.SyncQueue.getAll();
      let pushed = 0;

      for (const entry of pending) {
        try {
          const payload = JSON.parse(entry.payload || '{}');
          const endpoint = `${_cloudUrl}/rest/v1/${entry.table}`;
          const headers  = {
            'Content-Type': 'application/json',
            'apikey':        _cloudKey,
            'Authorization': `Bearer ${_cloudKey}`,
            'Prefer':        'resolution=merge-duplicates',
          };

          let ok = false;

          if (entry.action === 'upsert') {
            const res = await fetch(endpoint, {
              method:  'POST',
              headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
              body:    JSON.stringify(payload),
            });
            ok = res.ok;
          } else if (entry.action === 'delete') {
            const res = await fetch(`${endpoint}?id=eq.${entry.recordId}`, {
              method: 'DELETE', headers,
            });
            ok = res.ok;
          }

          if (ok) {
            await AppDB.SyncQueue.remove(entry.id);
            pushed++;
          } else {
            await AppDB.SyncQueue.bumpAttempts(entry.id);
          }
        } catch {
          await AppDB.SyncQueue.bumpAttempts(entry.id);
        }
      }

      /* Update lastSync timestamp */
      const now = new Date().toISOString();
      await AppDB.Settings.set('lastSync', now);

      notifyListeners('synced', { pushed, at: now });

    } catch (err) {
      notifyListeners('error', { message: err.message });
    } finally {
      _syncing = false;
    }
  }

  /* ── Pull latest data from Supabase ──────────────────── */
  async function pull(table, since = null) {
    if (!_cloudUrl || !navigator.onLine) return [];
    try {
      let url = `${_cloudUrl}/rest/v1/${table}?order=updatedAt.desc`;
      if (since) url += `&updatedAt=gt.${since}`;
      const res = await fetch(url, {
        headers: {
          'apikey': _cloudKey,
          'Authorization': `Bearer ${_cloudKey}`,
        },
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  /* ── Full pull-and-merge (on first login or manual resync) */
  async function fullResync() {
    if (!_cloudUrl || !navigator.onLine) {
      notifyListeners('offline');
      return;
    }
    notifyListeners('syncing');
    const tables = ['products', 'categories', 'gstRates', 'vendors', 'customers', 'sales', 'orders'];
    for (const table of tables) {
      const rows = await pull(table);
      if (rows.length) {
        await AppDB.db[table].bulkPut(rows);
      }
    }
    notifyListeners('synced', { at: new Date().toISOString() });
  }

  return { init, queue, sync, pull, fullResync, onStatusChange,
           isOnline: () => navigator.onLine,
           isConfigured: () => !!_cloudUrl };

})();

window.SyncEngine = SyncEngine;

/* ============================================================
   Karyana POS — Auth Module (Phase 2)
   Handles: signup, login, logout, session, subscription check.
   Uses Supabase Auth with phone + password (no OTP for now).
   ============================================================ */

const Auth = (() => {

  /* ── Supabase client (initialised in config.js) ─────────── */
  const getClient = () => window.SupabaseClient;

  /* ── Current session state ──────────────────────────────── */
  let _session      = null;   // Supabase session object
  let _store        = null;   // { storeId, storeName, plan, status, paidUntil, trialEnds }
  let _listeners    = [];     // UI callbacks

  /* ── Notify UI of auth state change ────────────────────── */
  function notify(event, data = {}) {
    _listeners.forEach(fn => fn(event, data));
  }

  function onAuthChange(fn) {
    _listeners.push(fn);
  }

  /* ── Init: restore session from local storage ───────────── */
  async function init() {
    const client = getClient();
    if (!client) return;

    /* Restore existing session */
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      _session = session;
      await _loadStoreProfile(session.user.id);
      notify('signed_in', { store: _store });
    }

    /* Listen for auth state changes */
    client.auth.onAuthStateChange(async (event, session) => {
      _session = session;
      if (event === 'SIGNED_IN' && session) {
        await _loadStoreProfile(session.user.id);
        notify('signed_in', { store: _store });
      }
      if (event === 'SIGNED_OUT') {
        _store = null;
        notify('signed_out');
      }
    });
  }

  /* ── Load store profile + subscription ─────────────────── */
  async function _loadStoreProfile(userId) {
    const client = getClient();
    try {
      /* Get store profile */
      const { data: profile, error: pe } = await client
        .from('stores')
        .select('*')
        .eq('userId', userId)
        .single();

      if (pe || !profile) {
        /* First login — create store profile */
        _store = null;
        notify('needs_setup');
        return;
      }

      /* Get subscription */
      const { data: sub } = await client
        .from('subscriptions')
        .select('*')
        .eq('storeId', profile.storeId)
        .single();

      _store = {
        ...profile,
        subscription: sub || {
          plan:       'trial',
          status:     'trial',
          paidUntil:  null,
          trialEnds:  null,
        },
      };

      /* Cache subscription status locally for offline use */
      await AppDB.Settings.set('cachedSubStatus',  _store.subscription.status);
      await AppDB.Settings.set('cachedSubExpiry',  _store.subscription.paidUntil);
      await AppDB.Settings.set('cachedSubChecked', new Date().toISOString());
      await AppDB.Settings.set('storeId',          _store.storeId);
      await AppDB.Settings.set('storeName',        _store.storeName);

    } catch (err) {
      console.warn('Auth: could not load store profile:', err.message);
      /* Fall back to cached values if offline */
      const cachedStatus  = await AppDB.Settings.get('cachedSubStatus', 'active');
      const cachedExpiry  = await AppDB.Settings.get('cachedSubExpiry', null);
      const cachedChecked = await AppDB.Settings.get('cachedSubChecked', null);
      const storeId       = await AppDB.Settings.get('storeId', null);
      const storeName     = await AppDB.Settings.get('storeName', 'My Store');

      /* Allow 7-day offline grace */
      const daysSinceCheck = cachedChecked
        ? (Date.now() - new Date(cachedChecked).getTime()) / 86400000
        : 0;

      _store = {
        storeId,
        storeName,
        subscription: {
          status:    daysSinceCheck > 7 ? 'suspended' : cachedStatus,
          paidUntil: cachedExpiry,
          plan:      'cached',
        },
        offline: true,
      };
    }
  }

  /* ── Sign up new store ──────────────────────────────────── */
  async function signUp({ phone, password, storeName, area }) {
    const client = getClient();

    /* Create Supabase auth user */
    const { data, error } = await client.auth.signUp({
      phone:    _normalisePhone(phone),
      password,
    });
    if (error) throw new Error(error.message);

    const userId  = data.user.id;
    const storeId = 'store_' + userId.slice(0, 8);

    /* Create store profile */
    const { error: se } = await client.from('stores').insert({
      userId,
      storeId,
      storeName,
      area,
      phone:     _normalisePhone(phone),
      createdAt: new Date().toISOString(),
    });
    if (se) throw new Error('Could not create store: ' + se.message);

    /* Create trial subscription — 30 days free */
    const trialEnds = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    await client.from('subscriptions').insert({
      storeId,
      plan:      'trial',
      status:    'trial',
      trialEnds,
    });

    return { userId, storeId };
  }

  /* ── Sign in ────────────────────────────────────────────── */
  async function signIn({ phone, password }) {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({
      phone:    _normalisePhone(phone),
      password,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  /* ── Sign out ───────────────────────────────────────────── */
  async function signOut() {
    const client = getClient();
    await client.auth.signOut();
    _session = null;
    _store   = null;
  }

  /* ── Get subscription status ────────────────────────────── */
  function subscriptionStatus() {
    if (!_store) return 'unauthenticated';
    const sub = _store.subscription;
    if (!sub) return 'trial';

    /* Check trial expiry */
    if (sub.status === 'trial' && sub.trialEnds) {
      if (new Date() > new Date(sub.trialEnds)) return 'expired';
    }

    /* Check paid expiry */
    if (sub.status === 'active' && sub.paidUntil) {
      const expiry = new Date(sub.paidUntil);
      const now    = new Date();
      const daysLeft = (expiry - now) / 86400000;
      if (daysLeft < 0)  return 'grace';
      if (daysLeft < 7)  return 'expiring_soon';
    }

    return sub.status; // 'trial' | 'active' | 'grace' | 'suspended'
  }

  /* Days remaining on trial or subscription */
  function daysRemaining() {
    const sub = _store?.subscription;
    if (!sub) return 0;
    const expiry = sub.status === 'trial' ? sub.trialEnds : sub.paidUntil;
    if (!expiry) return 0;
    return Math.max(0, Math.ceil((new Date(expiry) - new Date()) / 86400000));
  }

  /* ── Can the store use the POS right now? ───────────────── */
  function canUsePOS() {
    const s = subscriptionStatus();
    return ['trial', 'active', 'grace', 'expiring_soon'].includes(s);
  }

  /* ── Normalise Pakistani phone numbers ─────────────────── */
  function _normalisePhone(phone) {
    let p = phone.replace(/[\s\-()]/g, '');
    if (p.startsWith('0')) p = '+92' + p.slice(1);
    if (!p.startsWith('+')) p = '+92' + p;
    return p;
  }

  /* ── Getters ─────────────────────────────────────────────── */
  function getStore()   { return _store; }
  function getSession() { return _session; }
  function getStoreId() { return _store?.storeId || null; }
  function isLoggedIn() { return !!_session; }

  return {
    init, signUp, signIn, signOut,
    subscriptionStatus, daysRemaining, canUsePOS,
    getStore, getSession, getStoreId, isLoggedIn,
    onAuthChange,
  };

})();

window.Auth = Auth;

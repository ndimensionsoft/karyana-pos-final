/* ============================================================
   Karyana POS — Supabase Configuration (Phase 2)

   SETUP INSTRUCTIONS:
   1. Open this file
   2. Replace PASTE_YOUR_SUPABASE_URL_HERE with your Project URL
      (looks like: https://xyzxyzxyz.supabase.co)
   3. Replace PASTE_YOUR_ANON_KEY_HERE with your anon public key
      (long string starting with eyJ...)
   4. Save the file
   5. git add config.js && git commit -m "Add Supabase config"
   6. git push

   ⚠️  NEVER commit real keys to a public repo.
       If your repo is private (it is), this is fine.
       For extra safety add config.js to .gitignore and
       set keys as Cloudflare Pages environment variables.
   ============================================================ */

const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

/* ── Feature flags ──────────────────────────────────────────── */
const CONFIG = {
  /* Trial length in days for new signups */
  trialDays: 30,

  /* Grace period after subscription expires (days) */
  graceDays: 7,

  /* Offline grace — how many days to trust cached sub status */
  offlineGraceDays: 7,

  /* Pricing (Rs per month) */
  plans: {
    basic: { price: 500,  label: 'Basic',  features: ['POS', 'Inventory', 'Udhar', 'Vendors'] },
    pro:   { price: 1000, label: 'Pro',    features: ['Everything in Basic', 'Cloud sync', 'Multi-device', 'SMS receipts', 'WhatsApp'] },
  },

  /* Your payment details shown on the payment screen */
  payment: {
    easypaisa:  '0300-0000000',   // ← replace with your Easypaisa number
    jazzcash:   '0300-0000000',   // ← replace with your JazzCash number
    bankName:   'HBL',
    bankAccount:'0000-0000-0000', // ← replace with your account number
    bankTitle:  'Your Name Here',
  },

  /* Admin phone numbers — these get access to the admin dashboard */
  adminPhones: [
    '+923000000000',   // ← replace with your phone number
  ],

  /* App branding */
  appName:    'Karyana POS',
  appTagline: 'Apki Dukaan, Apka Haq',
  appUrl:     'https://karyanastores.pk',  // ← replace with your domain
};

/* ── Initialise Supabase client ─────────────────────────────── */
function initSupabase() {
  if (!SUPABASE_URL || SUPABASE_URL === 'PASTE_YOUR_SUPABASE_URL_HERE') {
    console.warn('Supabase not configured — running in offline-only mode.');
    window.SupabaseClient = null;
    return;
  }

  try {
    window.SupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: false,
        storage:           localStorage,
      },
      realtime: { params: { eventsPerSecond: 2 } },
    });
    console.log('Supabase client initialised.');
  } catch (err) {
    console.error('Supabase init failed:', err.message);
    window.SupabaseClient = null;
  }
}

window.CONFIG = CONFIG;
window.initSupabase = initSupabase;

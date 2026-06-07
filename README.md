# Karyana POS

A lightweight, offline-first Point of Sale system for Pakistani karyana (grocery) stores.
Works on Android and Windows. No internet required to operate.

## Features
- Full POS: sales, cart, barcode scanning
- Inventory management with category colour coding
- Udhar (customer credit) tracking
- Vendor management + purchase orders
- Configurable GST rates (FBR-compliant, per-category)
- Bilingual UI: English + Urdu (Nastaliq script)
- Thermal receipt printing (USB + Bluetooth ESC/POS)
- SMS / WhatsApp reminders (Jazz, Twilio, Meta)
- Offline-first with IndexedDB — works during load shedding
- Optional cloud sync to Supabase when internet is available

---

## Quick start (local)

1. Clone or download this repo
2. Open a terminal in the project folder and run any static file server:

```bash
# Option A — Python (comes pre-installed on most systems)
python3 -m http.server 8080

# Option B — Node.js
npx serve .
```

3. Open `http://localhost:8080` in Chrome
4. Chrome will show an **Install** prompt — click it to install as a desktop/mobile app

---

## Deploy to Cloudflare Pages (free, live URL)

1. Push this repo to GitHub (see steps below)
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. **Create a project → Connect to Git → Select your repo**
4. Leave build settings blank (static site, no build step)
5. Click **Save and Deploy**

You get a live URL like `karyana-pos.pages.dev` in ~30 seconds.
Every future `git push` to `main` auto-deploys the update to all devices.

### Custom domain (optional)
Buy a `.pk` domain from [PKNIC](https://pknic.net.pk) and point it at Cloudflare Pages.
HTTPS is automatic and free.

---

## Connect Supabase cloud sync (optional)

1. Create a free project at [supabase.com](https://supabase.com) — choose **Mumbai** region
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon public key** from Settings → API
4. Open the app → Settings → Cloud sync → paste both values → Save

The app will now sync all sales, inventory changes, and customer balances to the cloud
whenever internet is available. Offline changes queue automatically and push on reconnect.

---

## File structure

```
karyana-pos/
├── index.html        Main app (all screens, all logic)
├── manifest.json     PWA install config
├── sw.js             Service worker — full offline cache
├── db.js             Dexie.js IndexedDB data layer
├── gst.js            GST rate engine
├── sync.js           Supabase sync engine
├── print.js          ESC/POS thermal printer (USB + Bluetooth)
├── sms.js            SMS / WhatsApp (Jazz, Twilio, Meta)
├── i18n.js           English + Urdu string translations
├── icons/            App icons (add icon-192.png and icon-512.png here)
├── supabase/
│   └── schema.sql    Postgres schema for cloud sync
└── README.md
```

---

## Adding app icons

The PWA install prompt requires icons. Create two PNG files and place them in the `icons/` folder:

| File | Size | Used for |
|------|------|---------|
| `icons/icon-192.png` | 192×192 px | Android home screen |
| `icons/icon-512.png` | 512×512 px | Splash screen / Play Store |

**Free tool:** [realfavicongenerator.net](https://realfavicongenerator.net) — upload any image and it generates all sizes.

---

## Thermal printer setup

**USB (Windows + Android)**
- Connect printer via USB cable
- In the app go to Settings → Printer → **Connect USB printer**
- Chrome will show a device picker — select your printer
- Works with any 58mm ESC/POS printer (Rs 3,000–5,000 from Hafeez Centre)

**Bluetooth (Android)**
- Pair the printer in Android Bluetooth settings first
- In the app go to Settings → Printer → **Connect Bluetooth printer**
- Select the printer from the list

---

## SMS setup

1. Register with your chosen provider:
   - **Jazz SMS:** [messaging.jazz.com.pk](https://messaging.jazz.com.pk)
   - **Twilio:** [twilio.com](https://twilio.com) — international, Pakistan numbers supported
   - **WhatsApp:** Meta Cloud API via [developers.facebook.com](https://developers.facebook.com)
2. Get your API key
3. In the app → Settings → SMS → select provider → paste key → Save

Without an API key the app falls back to opening your phone's native SMS app.

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Vanilla HTML/CSS/JS | Fast on low-end Android, no build step |
| Offline storage | Dexie.js (IndexedDB) | Survives restarts, works offline |
| PWA | Service Worker + manifest | Installs like a native app |
| Cloud sync | Supabase (Postgres + Auth) | Free tier, Mumbai region, no DevOps |
| Printing | Web Bluetooth + WebUSB | No driver install needed |
| Fonts | Noto Nastaliq Urdu | Proper Urdu calligraphy rendering |

---

## Working with Claude Code

Install [Claude Code](https://claude.ai/code) and run `claude` inside this project folder.
Claude reads the full codebase and can build new features, fix bugs, or extend the app
across multiple files in one session.

```bash
cd karyana-pos
claude
```

---

## License

MIT — free to use, modify, and distribute.

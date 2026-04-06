# 🛡️ TrustSight Browser Guard

**TrustSight** is a triple-layer browser security extension that blocks malware, phishing, scams, ads, and trackers using an Edge AI engine running entirely on-device. No data ever leaves your computer.

> Built for **NextGen Hackathon 2026 — Round 2 Development Phase**

## 🌐 Live Deployment

👉 **[https://trust-sight.vercel.app](https://trust-sight.vercel.app)** 👈

📦 **GitHub:** [https://github.com/adarshlilhare/TrustSight](https://github.com/adarshlilhare/TrustSight)

> The repository contains a deployment-ready landing page (`index.html`) with `vercel.json` for zero-config Vercel hosting. Connect this repo to Vercel and paste the live link above.

---

## ✨ Key Features

### Layer 1: Pre-Navigation Threat Blocking
- Intercepts malicious URLs **before the page even loads** via Chrome's `webNavigation` API
- Maintains a local database of **150+ known threat domains** (phishing, malware, scams)
- Pattern-matching engine detects suspicious URL structures (`-login.`, `-verify.`, `-secure.`, etc.)

### Layer 2: Edge AI Phishing & Scam Detection
- **On-device AI scoring engine** analyzes page content for phishing keywords, suspicious forms, hidden iframes, and brand impersonation
- Weighted scoring system with **30+ phishing indicators** — triggers warning overlay at threshold
- Detects cross-domain form submissions and insecure password fields

### Layer 3: Real-Time Ad & Tracker Blocking
- **DOM-level ad blocking** using 30+ CSS selectors targeting Google Ads, ad networks, popups, and cookie banners
- **Tracker removal engine** strips scripts/iframes from 12+ known tracker domains (Google Analytics, Facebook Pixel, Criteo, etc.)
- **MutationObserver** continuously monitors for dynamically injected ad/tracker elements
- Periodic sweep every 5 seconds for persistent ad elements

### Security & Privacy
- **Allow List Engine** — Users can whitelist trusted domains via Dashboard or block page bypass
- **Secure Bypass** — "Continue Anyway" uses `new URL()` validation + `location.replace()` to prevent Open Redirect vulnerabilities
- **100% Offline** — All threat databases, AI analysis, and settings stored locally in `chrome.storage.local`
- **Zero cloud dependency** — No external API calls, no data exfiltration, no telemetry

### Smart UI States
- **Protection is ON** (green) — All protection modules active
- **Partially Protected** (amber) — Some modules disabled per user preference
- **Protection is OFF** (grey) — All modules disabled
- **Empty Page** (grey) — Chrome system pages where extensions cannot operate

---

## 🏗️ Architecture

```
TrustSight/
├── manifest.json          # Chrome Extension Manifest V3
├── background.js          # Service Worker: threat interception, message routing, stats
├── content/
│   ├── content.js         # Content Script: Edge AI, ad/tracker blocking, DOM monitoring
│   └── overlay.css        # Warning overlay styles
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic: status states, toggle management
├── dashboard/
│   ├── dashboard.html     # Options page: Settings, Allow List, Support, About
│   ├── dashboard.css      # Dashboard styles
│   └── dashboard.js       # Dashboard logic: Allow List CRUD, FAQ, Report, diagnostics
├── block/
│   ├── block.html         # Threat warning page
│   ├── block.css          # Block page styles
│   └── block.js           # Secure bypass + Allow List integration
├── assets/icons/          # Extension icons
├── index.html             # Vercel landing page
├── vercel.json            # Vercel deployment config
└── README.md
```

---

## 🔧 Installation (Chrome)

1. Download the extension ZIP and extract it to a folder.
2. Open Chrome → Navigate to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → Select the `TrustSight` folder
5. The extension icon appears in your toolbar — click it to see protection status

### Test the Blocking
- Navigate to `paypa1.com` or `faceb00k.com` → You'll see the red **Website Blocked** page
- Click "Continue Anyway" → Domain is added to your Allow List and you're redirected safely
- Open the Dashboard → **Allow List** tab shows the bypassed domain

---

## 🔐 Security Practices

| Practice | Implementation |
|---|---|
| **Input Validation** | `new URL()` constructor validates all redirect targets in `block.js` |
| **Open Redirect Prevention** | `location.replace()` used instead of `location.href` assignment |
| **XSS Prevention** | No `innerHTML` with user input; DOM manipulation via safe APIs |
| **Least Privilege** | Manifest permissions scoped to exact requirements |
| **Secure Storage** | All data in `chrome.storage.local` — sandboxed per extension |
| **Error Handling** | Try-catch blocks around all URL parsing and async operations |

---

## 📊 Code Quality

- **Clean Architecture**: Separation of concerns — background (network), content (DOM), popup (UI), dashboard (settings)
- **Consistent Naming**: camelCase variables, UPPER_CASE constants, descriptive function names
- **Code Comments**: Section headers and inline documentation throughout
- **No External Dependencies**: Zero npm packages — pure vanilla JS, HTML, CSS
- **Manifest V3 Compliant**: Uses service workers (not background pages), modern Chrome APIs

---

## 👤 Contact

**Developer:** Adarsh Lilhare  
**Email:** adarshlilhare5000@gmail.com

---

*Built with 💻 for NextGen Hackathon 2026*

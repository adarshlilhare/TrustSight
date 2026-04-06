// content.js - TrustSight Content Engine

console.log("TrustSight Engine Loaded.");

let warningActive = false;
let smartBanner = null;
let lastScanResult = null;
let scanDebounceTimer = null;
let lastUrl = location.href;
let adsBlocked = 0;
let trackersBlocked = 0;

// ──────────────────────────────────────────────────────────────
// AD SELECTORS — Common ad container selectors across the web
// ──────────────────────────────────────────────────────────────
const AD_SELECTORS = [
    // Google Ads
    'ins.adsbygoogle', '.google-auto-placed', '[id^="google_ads"]', '[id^="div-gpt-ad"]',
    // Generic patterns
    '[class*="ad-container"]', '[class*="ad-wrapper"]', '[class*="ad-banner"]',
    '[class*="advertisement"]', '[id*="advertisement"]',
    '[class*="sponsored"]', '[data-ad]', '[data-ad-slot]',
    // Common ad networks
    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="facebook.com/plugins"]',
    // Popups & overlays
    '[class*="popup-ad"]', '[class*="interstitial"]', '[class*="cookie-banner"]',
    '[class*="cookie-consent"]', '[class*="cookie-notice"]', '[id*="cookie-banner"]',
    '[id*="cookie-consent"]', '[id*="cookie-notice"]',
    // Newsletter/signup popups
    '[class*="newsletter-popup"]', '[class*="subscribe-popup"]',
];

// ──────────────────────────────────────────────────────────────
// TRACKER DOMAINS
// ──────────────────────────────────────────────────────────────
const TRACKER_HOSTS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'google-analytics.com', 'facebook.net', 'analytics.google.com',
    'adnxs.com', 'taboola.com', 'outbrain.com', 'criteo.com',
    'scorecardresearch.com', 'quantserve.com', 'demdex.net',
];

// ──────────────────────────────────────────────────────────────
// EDGE AI PHISHING ENGINE
// ──────────────────────────────────────────────────────────────
class TrustSightEdgeAI {
    static getPhishingKeywords() {
        return [
            { word: "verify your account", weight: 4 },
            { word: "account suspended", weight: 4 },
            { word: "account has been limited", weight: 4 },
            { word: "your account will be closed", weight: 4 },
            { word: "unauthorized access", weight: 3 },
            { word: "unauthorized login attempt", weight: 4 },
            { word: "confirm your identity", weight: 3 },
            { word: "verify your identity", weight: 3 },
            { word: "verify immediately", weight: 3 },
            { word: "password expired", weight: 3 },
            { word: "urgent action required", weight: 3 },
            { word: "immediate action required", weight: 3 },
            { word: "within 24 hours", weight: 2 },
            { word: "failure to respond", weight: 3 },
            { word: "last warning", weight: 3 },
            { word: "update your payment", weight: 3 },
            { word: "payment method declined", weight: 3 },
            { word: "enter your credit card", weight: 4 },
            { word: "enter your card number", weight: 4 },
            { word: "bank account details", weight: 3 },
            { word: "refund pending", weight: 3 },
            { word: "claim your refund", weight: 3 },
            { word: "ssn", weight: 2 },
            { word: "social security", weight: 2 },
            { word: "mother's maiden name", weight: 3 },
            { word: "click here to secure", weight: 2 },
            { word: "click here to verify", weight: 3 },
            { word: "security alert", weight: 2 },
            { word: "unusual activity", weight: 2 },
            { word: "suspicious activity", weight: 2 },
            { word: "your computer is infected", weight: 5 },
            { word: "virus detected", weight: 3 },
            { word: "call microsoft support", weight: 5 },
            { word: "call apple support", weight: 5 },
            { word: "windows defender alert", weight: 4 },
            { word: "congratulations you won", weight: 4 },
            { word: "claim your prize", weight: 4 },
            { word: "free gift card", weight: 3 },
            { word: "you are the lucky", weight: 4 },
            { word: "enter your seed phrase", weight: 5 },
            { word: "enter your recovery phrase", weight: 5 },
            { word: "double your bitcoin", weight: 5 },
        ];
    }

    static analyzeDOM(title, text) {
        let score = 0;
        let triggers = [];
        const content = (title + " " + text).toLowerCase();

        this.getPhishingKeywords().forEach(k => {
            if (content.includes(k.word)) {
                score += k.weight;
                triggers.push(k.word);
            }
        });

        const hasPasswordField = document.querySelector('input[type="password"]');
        if (hasPasswordField && location.protocol !== 'https:') {
            score += 5; triggers.push("insecure password form");
        }

        const forms = document.querySelectorAll('form[action]');
        forms.forEach(f => {
            try {
                const actionUrl = new URL(f.action, location.href);
                if (actionUrl.hostname !== location.hostname) {
                    score += 3; triggers.push("cross-domain form");
                }
            } catch(e) {}
        });

        const hiddenIframes = document.querySelectorAll('iframe[style*="display:none"], iframe[width="0"], iframe[height="0"]');
        if (hiddenIframes.length > 0) { score += 3; triggers.push("hidden iframe"); }

        // Brand impersonation
        const brands = ['paypal','google','facebook','apple','microsoft','amazon','netflix','chase'];
        const titleLower = document.title.toLowerCase();
        const hostname = location.hostname.toLowerCase();
        for (const brand of brands) {
            if (titleLower.includes(brand) && !hostname.includes(brand)) {
                score += 3; triggers.push(`impersonates "${brand}"`); break;
            }
        }

        const isDanger = score >= 5;
        return { isDanger, score, reason: isDanger ? `Phishing detected: [${triggers.join(", ")}]` : "Safe" };
    }
}

// ──────────────────────────────────────────────────────────────
// AD & TRACKER BLOCKING (real functionality)
// ──────────────────────────────────────────────────────────────
function blockAds() {
    let count = 0;
    AD_SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (!el.dataset.tsBlocked) {
                el.dataset.tsBlocked = 'true';
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('height', '0', 'important');
                el.style.setProperty('overflow', 'hidden', 'important');
                count++;
            }
        });
    });
    if (count > 0) {
        adsBlocked += count;
        chrome.runtime.sendMessage({ action: "INCREMENT_STAT", statKey: "adsBlockedCount", amount: count });
    }
    return count;
}

function blockTrackers() {
    let count = 0;
    // Block tracker scripts/iframes/images by src
    const elements = document.querySelectorAll('script[src], iframe[src], img[src], link[href]');
    elements.forEach(el => {
        if (el.dataset.tsTrackerBlocked) return;
        const src = el.src || el.href || '';
        for (const tracker of TRACKER_HOSTS) {
            if (src.includes(tracker)) {
                el.dataset.tsTrackerBlocked = 'true';
                el.remove();
                count++;
                break;
            }
        }
    });
    if (count > 0) {
        trackersBlocked += count;
        chrome.runtime.sendMessage({ action: "INCREMENT_STAT", statKey: "trackersBlockedCount", amount: count });
    }
    return count;
}

// ──────────────────────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "TRUSTSIGHT_TRIGGER_WARNING") {
        injectWarningOverlay(request.reason || "AI detected deceptive intent.");
    } else if (request.action === "TRUSTSIGHT_STATUS_SAFE") {
        showSafeBanner();
    }
});

if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', initTrustSight);
} else {
    initTrustSight();
}

function initTrustSight() {
    if (warningActive) return;
    
    const cssUrl = chrome.runtime.getURL('content/overlay.css');
    if (!document.querySelector(`link[href="${cssUrl}"]`)) {
        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = cssUrl;
        document.head.appendChild(linkEl);
    }

    // Get per-site settings and run engines accordingly
    const hostname = location.hostname;
    chrome.runtime.sendMessage({ action: "GET_SITE_SETTINGS", hostname }, (config) => {
        if (chrome.runtime.lastError || !config) {
            // Default: everything on
            runAllEngines(true, true, true);
            return;
        }

        if (!config.globalEnabled) {
            // Protection disabled globally
            return;
        }

        runAllEngines(config.scam, config.ads, config.malware);
    });

    startDynamicMonitoring();
}

function runAllEngines(scamOn, adsOn, malwareOn) {
    // 1. Edge AI Phishing/Scam scan
    if (scamOn || malwareOn) {
        const aiResult = TrustSightEdgeAI.analyzeDOM(
            document.title,
            document.body ? document.body.innerText.substring(0, 3000) : ""
        );
        if (aiResult.isDanger) {
            injectWarningOverlay(aiResult.reason);
            return;
        }
    }

    // 2. Ad blocking
    if (adsOn) {
        blockAds();
    }

    // 3. Tracker blocking
    if (adsOn) {
        blockTrackers();
    }

    // Show safe if nothing was blocked
    if (!warningActive) {
        showSafeBanner();
    }
}

// ──────────────────────────────────────────────────────────────
// DYNAMIC MONITORING
// ──────────────────────────────────────────────────────────────
function startDynamicMonitoring() {
    const observer = new MutationObserver((mutations) => {
        if (warningActive) return;
        let dominated = false;
        for (const m of mutations) {
            if (m.target.id && m.target.id.startsWith('trustsight')) continue;
            if (m.type === 'childList' && m.addedNodes.length > 0) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'FORM' || node.tagName === 'IFRAME' || node.tagName === 'INPUT' ||
                            (node.querySelector && (node.querySelector('form') || node.querySelector('iframe') || node.querySelector('input[type="password"]')))) {
                            dominated = true; break;
                        }
                        // Also check for new ad elements
                        for (const sel of AD_SELECTORS) {
                            if (node.matches && node.matches(sel)) { blockAds(); break; }
                        }
                    }
                }
            }
            if (dominated) break;
        }
        if (dominated) debouncedRescan();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // SPA navigation
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function(...args) { origPush.apply(this, args); onUrlChange(); };
    history.replaceState = function(...args) { origReplace.apply(this, args); onUrlChange(); };
    window.addEventListener('popstate', onUrlChange);

    // Periodic ad sweep every 5 seconds
    setInterval(() => {
        blockAds();
        blockTrackers();
        if (location.href !== lastUrl) onUrlChange();
    }, 5000);
}

function debouncedRescan() {
    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
        if (warningActive) return;
        const aiResult = TrustSightEdgeAI.analyzeDOM(document.title, document.body.innerText.substring(0, 3000));
        if (aiResult.isDanger) injectWarningOverlay(aiResult.reason);
    }, 800);
}

function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    warningActive = false;
    lastScanResult = null;
    const overlay = document.getElementById('trustsight-warning-overlay');
    if (overlay) { overlay.remove(); document.body.style.overflow = ''; }
    initTrustSight();
}

// ──────────────────────────────────────────────────────────────
// UI COMPONENTS
// ──────────────────────────────────────────────────────────────
function createBannerIfNeeded() {
    if (document.getElementById('trustsight-smart-banner')) return;
    smartBanner = document.createElement('div');
    smartBanner.id = 'trustsight-smart-banner';
    document.body.appendChild(smartBanner);
}

function showSafeBanner() {
    createBannerIfNeeded();
    smartBanner.className = 'ts-safe ts-visible';
    smartBanner.innerHTML = `
        <div class="ts-banner-icon">
            <svg class="ts-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="ts-banner-text">
            <h4 class="ts-banner-title" style="color:#10b981;">Protected</h4>
            <p class="ts-banner-sub">No threats found${adsBlocked > 0 ? ` · ${adsBlocked} ads blocked` : ''}${trackersBlocked > 0 ? ` · ${trackersBlocked} trackers stopped` : ''}</p>
        </div>
    `;
    setTimeout(() => { if (smartBanner) smartBanner.classList.remove('ts-visible'); }, 3500);
}

function hideBanner() { if (smartBanner) smartBanner.classList.remove('ts-visible'); }

function injectWarningOverlay(reasonText) {
    if (warningActive) return;
    warningActive = true;
    hideBanner();

    const overlay = document.createElement('div');
    overlay.id = 'trustsight-warning-overlay';
    overlay.innerHTML = `
        <div class="ts-glass-panel">
            <div class="ts-icon-container">
                <svg class="ts-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <circle cx="12" cy="11" r="3"/>
                </svg>
            </div>
            <h1 class="ts-title">TrustSight Alert</h1>
            <p class="ts-subtitle">Threat Detected</p>
            <p class="ts-reason">${reasonText}</p>
            <div class="ts-actions">
                <button id="ts-go-back" class="ts-btn ts-btn-primary">Go Back to Safety</button>
                <button id="ts-proceed" class="ts-btn ts-btn-text">Proceed Anyway (Unsafe)</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    document.getElementById('ts-go-back').addEventListener('click', () => {
        window.history.back();
        setTimeout(() => { window.location.href = "https://www.google.com"; }, 100);
    });
    document.getElementById('ts-proceed').addEventListener('click', () => {
        overlay.remove();
        document.body.style.overflow = '';
        warningActive = false;
    });
}

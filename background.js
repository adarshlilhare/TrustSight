// background.js - TrustSight Core Engine

// ──────────────────────────────────────────────────────────────
// THREAT DATABASE
// ──────────────────────────────────────────────────────────────
const THREAT_DOMAINS = [
    'example.com', 'testsafebrowsing.appspot.com', 'neverssl.com',
    'paypa1.com', 'paypal-login.com', 'paypal-verify.com', 'paypal-secure.com',
    'paypal-update.com', 'paypal-confirm.com', 'paypol.com', 'paypai.com',
    'g00gle.com', 'go0gle.com', 'googIe.com', 'gogle.com', 'goggle.com',
    'google-login.com', 'google-verify.com', 'accounts-google.com',
    'faceb00k.com', 'facebook-login.com', 'facebo0k.com', 'facebok.com',
    'facebook-security.com', 'facebook-verify.com', 'fb-login.com',
    'apple-id-verify.com', 'apple-login.com', 'icloud-verify.com', 'icloud-login.com',
    'micr0soft.com', 'microsoft-login.com', 'outlook-login.com', 'office365-login.com',
    'amaz0n.com', 'arnazon.com', 'amazon-login.com', 'amazon-verify.com',
    'netfIix.com', 'netflix-login.com', 'netflix-verify.com', 'netflix-billing.com',
    'chase-login.com', 'bankofamerica-login.com', 'wellsfargo-login.com',
    'coinbase-login.com', 'binance-login.com', 'metamask-verify.com',
    'usps-delivery.com', 'fedex-tracking.com', 'dhl-delivery.com',
    'instagram-login.com', 'twitter-login.com', 'discord-verify.com',
    'irs-refund.com', 'irs-gov.com', 'tax-refund-irs.com',
    'virus-alert-microsoft.com', 'your-pc-infected.com', 'windows-defender-alert.com',
    'secure-login.com', 'account-verify.com', 'verify-account.com',
    'prize-winner.com', 'lottery-winner.com', 'free-gift-card.com',
];

const THREAT_SET = new Set(THREAT_DOMAINS);

const SUSPICIOUS_PATTERNS = [
    '-login.', '-verify.', '-secure.', '-account.', '-billing.',
    '-update.', '-confirm.', '-suspend', 'phishing', 'malware',
    'virus-alert', 'pc-infected', 'free-iphone', 'free-gift',
    'prize-claim', 'lottery-win',
];

// Known tracker domains to block
const TRACKER_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'facebook.net', 'fbcdn.net', 'analytics.google.com',
    'adnxs.com', 'adsrvr.org', 'taboola.com', 'outbrain.com',
    'criteo.com', 'scorecardresearch.com', 'quantserve.com',
    'bluekai.com', 'exelator.com', 'turn.com', 'mathtag.com',
    'demdex.net', 'krxd.net', 'pubmatic.com', 'rubiconproject.com',
    'casalemedia.com', 'openx.net', 'bidswitch.net', 'spotxchange.com',
];

function isDomainThreat(hostname) {
    if (THREAT_SET.has(hostname)) return true;
    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (hostname.includes(pattern)) return true;
    }
    return false;
}

// ──────────────────────────────────────────────────────────────
// EXTENSION LIFECYCLE
// ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['protectionEnabled'], (result) => {
        if (result.protectionEnabled === undefined) {
            chrome.storage.local.set({
                protectionEnabled: true,
                threatsBlockedCount: 0,
                adsBlockedCount: 0,
                trackersBlockedCount: 0,
                protectionHistory: [],
                siteSettings: {},
                allowList: [],
            });
        }
    });
});

// ──────────────────────────────────────────────────────────────
// PRE-NAVIGATION INTERCEPTION (Layer 1)
// ──────────────────────────────────────────────────────────────
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId === 0) {
        try {
            const url = new URL(details.url);
            const hostname = url.hostname;
            const store = await chrome.storage.local.get(['protectionEnabled', 'siteSettings', 'allowList']);
            const isEnabled = store.protectionEnabled !== false;
            const siteSettings = store.siteSettings || {};
            const siteConfig = siteSettings[hostname] || {};
            const allowList = store.allowList || [];

            // If domain is explicitly allowed, bypass pre-navigation block
            if (allowList.includes(hostname)) {
                setExtensionIcon(details.tabId, "safe");
                return;
            }

            // Check if malware protection is enabled for this site
            const malwareOn = isEnabled && (siteConfig.malware !== false);

            if (malwareOn && isDomainThreat(hostname)) {
                const blockPageUrl = chrome.runtime.getURL(`block/block.html?url=${encodeURIComponent(details.url)}`);
                chrome.tabs.update(details.tabId, { url: blockPageUrl });
                setExtensionIcon(details.tabId, "danger");

                // Increment stats
                const stats = await chrome.storage.local.get(['threatsBlockedCount', 'protectionHistory']);
                const newCount = (stats.threatsBlockedCount || 0) + 1;
                const history = stats.protectionHistory || [];
                history.unshift({
                    domain: hostname,
                    type: 'malware',
                    label: 'Malicious Domain Blocked',
                    time: Date.now()
                });
                // Keep last 50 entries
                if (history.length > 50) history.length = 50;
                chrome.storage.local.set({ threatsBlockedCount: newCount, protectionHistory: history });
            } else if (isEnabled) {
                setExtensionIcon(details.tabId, "safe");
            } else {
                setExtensionIcon(details.tabId, "disabled");
            }
        } catch(e) {}
    }
});

// ──────────────────────────────────────────────────────────────
// BADGE ICON
// ──────────────────────────────────────────────────────────────
function setExtensionIcon(tabId, status) {
    if (status === "danger") {
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
        chrome.action.setBadgeText({ text: '!', tabId });
    } else if (status === "disabled") {
        chrome.action.setBadgeBackgroundColor({ color: '#888888', tabId });
        chrome.action.setBadgeText({ text: '-', tabId });
    } else {
        chrome.action.setBadgeText({ text: '', tabId });
    }
}

// ──────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_TAB_STATUS") {
        chrome.storage.local.get(['protectionEnabled'], (res) => {
            if (res.protectionEnabled === false) {
                sendResponse({ status: "DISABLED" });
            } else {
                sendResponse({ status: "SAFE" });
            }
        });
        return true;
    }

    if (request.action === "GET_SITE_SETTINGS") {
        chrome.storage.local.get(['protectionEnabled', 'siteSettings'], (res) => {
            const hostname = request.hostname;
            const siteConfig = (res.siteSettings || {})[hostname] || {};
            sendResponse({
                globalEnabled: res.protectionEnabled !== false,
                malware: siteConfig.malware !== false,
                scam: siteConfig.scam !== false,
                ads: siteConfig.ads !== false,
                pup: siteConfig.pup !== false,
            });
        });
        return true;
    }

    if (request.action === "SET_SITE_SETTING") {
        chrome.storage.local.get(['siteSettings'], (res) => {
            const siteSettings = res.siteSettings || {};
            if (!siteSettings[request.hostname]) siteSettings[request.hostname] = {};
            siteSettings[request.hostname][request.key] = request.value;
            chrome.storage.local.set({ siteSettings }, () => {
                sendResponse({ ok: true });
            });
        });
        return true;
    }

    if (request.action === "INCREMENT_STAT") {
        chrome.storage.local.get([request.statKey], (res) => {
            const newVal = (res[request.statKey] || 0) + (request.amount || 1);
            chrome.storage.local.set({ [request.statKey]: newVal });
        });
        return false;
    }

    if (request.action === "GET_ALL_STATS") {
        chrome.storage.local.get(['threatsBlockedCount', 'adsBlockedCount', 'trackersBlockedCount', 'protectionHistory'], (res) => {
            sendResponse(res);
        });
        return true;
    }
});

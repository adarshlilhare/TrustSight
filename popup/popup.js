document.addEventListener('DOMContentLoaded', () => {
    const statusBanner = document.getElementById('status-banner');
    const statusIcon = document.getElementById('status-main-icon');
    const statusTitle = document.getElementById('status-title');
    const statusDesc = document.getElementById('status-desc');
    const statBlocked = document.getElementById('stat-blocked');
    const statAds = document.getElementById('stat-ads');
    const statTrackers = document.getElementById('stat-trackers');
    const currentDomainEl = document.getElementById('current-domain');

    const toggleMalware = document.getElementById('toggle-malware');
    const toggleScam = document.getElementById('toggle-scam');
    const toggleAds = document.getElementById('toggle-ads');
    const togglePup = document.getElementById('toggle-pup');

    // Default all toggles to ON
    toggleMalware.checked = true;
    toggleScam.checked = true;
    toggleAds.checked = true;
    togglePup.checked = true;

    let currentHostname = '';

    // Get real stats from storage
    chrome.runtime.sendMessage({ action: "GET_ALL_STATS" }, (stats) => {
        if (chrome.runtime.lastError) return;
        if (stats) {
            statBlocked.innerText = stats.threatsBlockedCount || 0;
            statAds.innerText = stats.adsBlockedCount || 0;
            statTrackers.innerText = stats.trackersBlockedCount || 0;
        }
    });

    // Extension monitor - real count
    if (chrome.management) {
        chrome.management.getAll((extensions) => {
            const el = document.getElementById('ext-monitor-desc');
            if (el && extensions) {
                el.innerText = `${extensions.length} extensions scanned`;
            }
        });
    }

    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.url) {
            currentDomainEl.innerText = 'this page';
            updateStatus('safe');
            return;
        }

        try {
            const url = new URL(activeTab.url);
            currentHostname = url.hostname;

            // For chrome:// and extension pages, show simplified view
            if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:') || activeTab.url.startsWith('chrome-extension://')) {
                currentDomainEl.innerText = 'system page';
                updateStatus('empty');
                disableAllToggles();
                return;
            }

            currentDomainEl.innerText = currentHostname || 'this site';
        } catch(e) {
            currentDomainEl.innerText = 'this page';
            updateStatus('empty');
            disableAllToggles();
            return;
        }

        // Get protection status for this tab
        chrome.runtime.sendMessage({ action: "GET_TAB_STATUS", tabId: activeTab.id }, (response) => {
            if (chrome.runtime.lastError) { updateStatus('safe'); return; }
            
            if (response && response.status === "DISABLED") {
                updateStatus('disabled');
            } else if (response && response.status === "DANGER") {
                updateStatus('danger');
            } else {
                updateStatus('safe');
            }
        });

        // Load per-site settings (only for real websites)
        if (currentHostname && !activeTab.url.startsWith('chrome')) {
            chrome.runtime.sendMessage({ action: "GET_SITE_SETTINGS", hostname: currentHostname }, (config) => {
                if (chrome.runtime.lastError || !config) return;
                // Only override if explicitly set to false
                if (config.malware === false) toggleMalware.checked = false;
                if (config.scam === false) toggleScam.checked = false;
                if (config.ads === false) toggleAds.checked = false;
                if (config.pup === false) togglePup.checked = false;
                
                // Immediately check if all are off and update the UI accordingly
                updateStatusBasedOnToggles();
            });
        }
    });

    function updateStatus(state) {
        statusBanner.className = 'mb-status-banner';
        if (state === 'disabled') {
            statusBanner.classList.add('status-disabled');
            statusIcon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
            statusTitle.innerText = "Protection is OFF";
            statusDesc.innerText = currentHostname || 'Not protected';
        } else if (state === 'danger') {
            statusBanner.classList.add('status-danger');
            statusIcon.innerHTML = '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
            statusTitle.innerText = "Threat Blocked!";
            statusDesc.innerText = currentHostname || 'Blocked';
        } else if (state === 'partial') {
            statusBanner.classList.add('status-partial');
            statusIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line>';
            statusTitle.innerText = "Partially Protected";
            statusDesc.innerText = currentHostname || 'Protected';
        } else if (state === 'empty') {
            statusBanner.classList.add('status-disabled');
            statusIcon.innerHTML = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>';
            statusTitle.innerText = "Empty page";
            statusDesc.innerText = 'System pages are addresses which are part of the browser or an extension, we do not block content on these pages.';
            // The banner text is smaller so we inject smaller font if needed, but styling usually handles it.
        } else {
            statusBanner.classList.add('status-safe');
            statusIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
            statusTitle.innerText = "Protection is ON";
            statusDesc.innerText = currentHostname || 'Protected';
        }
    }

    function disableAllToggles() {
        toggleMalware.checked = false;
        toggleScam.checked = false;
        toggleAds.checked = false;
        togglePup.checked = false;
        toggleMalware.disabled = true;
        toggleScam.disabled = true;
        toggleAds.disabled = true;
        togglePup.disabled = true;
    }

    function updateStatusBasedOnToggles() {
        const offCount = [!toggleMalware.checked, !toggleScam.checked, !toggleAds.checked, !togglePup.checked].filter(Boolean).length;
        
        if (offCount === 4) {
            updateStatus('disabled');
        } else if (offCount > 0) {
            if (statusBanner.classList.contains('status-danger')) {
                updateStatus('danger');
            } else {
                updateStatus('partial');
            }
        } else {
            if (statusBanner.classList.contains('status-danger')) {
                updateStatus('danger');
            } else {
                updateStatus('safe');
            }
        }
    }

    // Per-site toggle handlers - save when changed
    function bindToggle(key, checkbox) {
        checkbox.addEventListener('change', () => {
            if (currentHostname) {
                chrome.runtime.sendMessage({
                    action: "SET_SITE_SETTING",
                    hostname: currentHostname,
                    key: key,
                    value: checkbox.checked
                });
            }
            updateStatusBasedOnToggles();
        });
    }

    bindToggle('malware', toggleMalware);
    bindToggle('scam', toggleScam);
    bindToggle('ads', toggleAds);
    bindToggle('pup', togglePup);

    // Open dashboard
    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    document.querySelector('.mb-gear').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});

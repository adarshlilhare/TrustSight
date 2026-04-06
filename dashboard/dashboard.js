document.addEventListener('DOMContentLoaded', () => {

    // ── Navigation ──
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            document.getElementById('page-' + item.dataset.page).classList.add('active');
        });
    });



    // ── Settings Actions ──
    document.getElementById('clear-history-btn').addEventListener('click', () => {
        chrome.storage.local.set({ protectionHistory: [], threatsBlockedCount: 0, adsBlockedCount: 0, trackersBlockedCount: 0 });
        const btn = document.getElementById('clear-history-btn');
        const oldText = btn.innerText;
        btn.innerText = 'Cleared!';
        setTimeout(() => { btn.innerText = oldText; }, 2000);
    });

    document.getElementById('reset-settings-btn').addEventListener('click', () => {
        chrome.storage.local.set({
            protectionEnabled: true,
            threatsBlockedCount: 0,
            adsBlockedCount: 0,
            trackersBlockedCount: 0,
            protectionHistory: [],
            siteSettings: {},
        }, () => {
            location.reload();
        });
    });

    // Master protection toggle
    const setProtection = document.getElementById('set-protection');
    if (setProtection) {
        chrome.storage.local.get(['protectionEnabled'], (res) => {
            if (res.protectionEnabled === false) {
                setProtection.checked = false;
            }
        });

        setProtection.addEventListener('change', (e) => {
            chrome.storage.local.set({ protectionEnabled: e.target.checked });
        });
    }

    // ── Allow List Logic ──
    const allowListContainer = document.getElementById('allow-list-container');
    const newDomainInput = document.getElementById('new-allow-domain');
    const addDomainBtn = document.getElementById('add-allow-btn');

    function renderAllowList() {
        chrome.storage.local.get(['allowList'], (res) => {
            const list = res.allowList || [];
            if (!allowListContainer) return;
            
            if (list.length === 0) {
                allowListContainer.innerHTML = '<div style="text-align:center; color:rgba(255,255,255,0.25); padding:40px; font-size:14px;">No websites explicitly allowed yet.</div>';
                return;
            }

            allowListContainer.innerHTML = '';
            list.forEach(domain => {
                const row = document.createElement('div');
                row.className = 'settings-row';
                row.innerHTML = `
                    <div class="settings-info">
                        <span class="settings-name">${domain}</span>
                        <span class="settings-desc">Global Exception</span>
                    </div>
                    <button class="settings-btn danger" data-domain="${domain}">Remove</button>
                `;
                
                row.querySelector('button').addEventListener('click', () => {
                    removeDomain(domain);
                });
                
                allowListContainer.appendChild(row);
            });
        });
    }

    function addDomain() {
        const domain = newDomainInput.value.trim();
        if(!domain) return;

        chrome.storage.local.get(['allowList'], (res) => {
            const list = res.allowList || [];
            if (!list.includes(domain)) {
                list.push(domain);
                chrome.storage.local.set({ allowList: list }, () => {
                    newDomainInput.value = '';
                    renderAllowList();
                });
            }
        });
    }

    function removeDomain(domain) {
        chrome.storage.local.get(['allowList'], (res) => {
            let list = res.allowList || [];
            list = list.filter(d => d !== domain);
            chrome.storage.local.set({ allowList: list }, () => {
                renderAllowList();
            });
        });
    }

    if (addDomainBtn) {
        addDomainBtn.addEventListener('click', addDomain);
        newDomainInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addDomain();
        });
        
        // Initial render
        renderAllowList();
    }

    // ── Support Sub-Page Navigation ──
    const supportMain = document.getElementById('support-main');
    const supportFaq = document.getElementById('support-faq');
    const supportReport = document.getElementById('support-report');

    document.getElementById('open-faq').addEventListener('click', () => {
        supportMain.style.display = 'none';
        supportReport.style.display = 'none';
        supportFaq.style.display = 'block';
    });

    document.getElementById('open-report').addEventListener('click', () => {
        supportMain.style.display = 'none';
        supportFaq.style.display = 'none';
        supportReport.style.display = 'block';
    });

    document.getElementById('faq-back').addEventListener('click', () => {
        supportFaq.style.display = 'none';
        supportMain.style.display = 'block';
    });

    document.getElementById('report-back').addEventListener('click', () => {
        supportReport.style.display = 'none';
        supportMain.style.display = 'block';
    });

    // ── FAQ Accordion ──
    document.querySelectorAll('.faq-q').forEach(q => {
        q.addEventListener('click', () => {
            const answer = q.nextElementSibling;
            const icon = q.querySelector('span');
            if (answer.style.display === 'none') {
                answer.style.display = 'block';
                icon.textContent = '−';
            } else {
                answer.style.display = 'none';
                icon.textContent = '+';
            }
        });
    });

    // ── Report Threat via Email ──
    document.getElementById('submit-report').addEventListener('click', () => {
        const url = document.getElementById('report-url').value.trim();
        const category = document.getElementById('report-category').value;
        const desc = document.getElementById('report-desc').value.trim();
        const statusEl = document.getElementById('report-status');

        if (!url) {
            statusEl.style.display = 'block';
            statusEl.style.color = '#ef4444';
            statusEl.textContent = 'Please enter a suspicious URL.';
            return;
        }

        const subject = encodeURIComponent(`[TrustSight Report] ${category}: ${url}`);
        const body = encodeURIComponent(
            `Threat Report from TrustSight Browser Guard\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Suspicious URL: ${url}\n` +
            `Category: ${category}\n` +
            `Description: ${desc || 'N/A'}\n\n` +
            `Reported at: ${new Date().toLocaleString()}\n` +
            `Extension Version: 1.0.0`
        );

        window.open(`mailto:adarshlilhare5000@gmail.com?subject=${subject}&body=${body}`);

        statusEl.style.display = 'block';
        statusEl.style.color = '#10b981';
        statusEl.textContent = '✓ Report submitted. Your email client should open with the report.';

        // Clear form
        document.getElementById('report-url').value = '';
        document.getElementById('report-desc').value = '';
    });

    // ── Diagnostic: Download Debug Logs ──
    document.getElementById('dl-logs').addEventListener('click', () => {
        chrome.storage.local.get(null, (allData) => {
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trustsight-debug-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    });

    // ── Diagnostic: Clear Local Storage ──
    document.getElementById('clear-cache-btn').addEventListener('click', () => {
        if (confirm('This will wipe ALL TrustSight data including settings, history, and allow list. Continue?')) {
            chrome.storage.local.clear(() => {
                const btn = document.getElementById('clear-cache-btn');
                btn.innerText = 'Cleared!';
                setTimeout(() => { btn.innerText = 'Clear Data'; }, 2000);
            });
        }
    });
});

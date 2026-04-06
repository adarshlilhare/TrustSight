document.addEventListener('DOMContentLoaded', () => {
    // Get URL from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const blockedUrl = urlParams.get('url') || 'Unknown URL';
    
    document.getElementById('blocked-url').textContent = blockedUrl;

    document.getElementById('ts-go-back').addEventListener('click', () => {
        window.history.back();
        setTimeout(() => {
            window.location.href = "https://www.google.com";
        }, 100);
    });

    document.getElementById('ts-proceed').addEventListener('click', () => {
        if (!blockedUrl || blockedUrl === 'Unknown URL') return;
        try {
            const urlObj = new URL(blockedUrl);
            const hostname = urlObj.hostname;
            
            // Add to allow list securely
            chrome.storage.local.get(['allowList'], (res) => {
                const list = res.allowList || [];
                if (!list.includes(hostname)) {
                    list.push(hostname);
                    chrome.storage.local.set({ allowList: list }, () => {
                        window.location.replace(blockedUrl);
                    });
                } else {
                    window.location.replace(blockedUrl);
                }
            });
        } catch (e) {
            console.error("Invalid URL format prevented redirect");
        }
    });
});

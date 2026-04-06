// options/options.js

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveBtn = document.getElementById('save-btn');
    const statusMsg = document.getElementById('save-status');

    // Load existing settings
    chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Save API Key
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
            statusMsg.textContent = 'Key Saved Successfully!';
            statusMsg.className = 'status-msg success';
            setTimeout(() => {
                statusMsg.className = 'status-msg';
            }, 3000);
        });
    });
});

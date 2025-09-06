let isDictationActive = false;

function createOrResetContextMenu() {
    isDictationActive = false;
    // First remove in case it already exists
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "voiceToText",
            title: "Start Dictation",
            contexts: ["editable"]
        });
    });
}

chrome.runtime.onInstalled.addListener(createOrResetContextMenu);
chrome.runtime.onStartup.addListener(createOrResetContextMenu);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        createOrResetContextMenu();
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "voiceToText") {
        if (isDictationActive) {
            // If dictation is active, send message to stop it
            chrome.tabs.sendMessage(tab.id, { action: "stopDictation" });
        }else{
            chrome.tabs.sendMessage(tab.id, { action: "startDictation" });
        }
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "updateContextMenu") {
        chrome.contextMenus.update("voiceToText", {
            title: msg.newTitle
        });
        if (msg.newTitle === "Stop Dictation") {
            isDictationActive = true;
        }else{
            isDictationActive = false;
        }
        sendResponse({ status: 'Context menu updated' });
    }
});
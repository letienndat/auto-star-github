chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  });
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "open_tab") {
    const repoUrl = message.url;
    const senderTab = sender.tab;
    const senderWindowId = senderTab ? senderTab.windowId : null;

    console.log(repoUrl, senderTab, senderWindowId);

    if (senderWindowId !== null) {
      try {
        await createTabSafe({
          url: repoUrl,
          active: false,
          windowId: senderWindowId,
        });
      } catch (err) {
        console.error("❌ Failed to create tab:", err.message);
      }
    } else {
      try {
        await createTabSafe({
          url: repoUrl,
          active: false,
        });
      } catch (err) {
        console.error("❌ Failed to create tab:", err.message);
      }
    }
  }
});

function createTabSafe(createOptions) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(createOptions, (tab) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(err);
      } else {
        resolve(tab);
      }
    });
  });
}

const timeout = 30;
const pendingTabs = {};

const sendMessage = (status, value, retry) => {
  chrome.runtime.sendMessage({
    type: "star_result",
    success: status,
    repo: new URL(repoUrl).pathname.slice(1),
    value,
    retry,
  });
};

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  });
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "open_tab") {
    const retry = message.retry;
    const repoUrl = `${message.url}&retry=${retry}`;
    const senderTab = sender.tab;
    const senderWindowId = senderTab ? senderTab.windowId : null;

    console.log(`${retry ? "Retrying" : "Opening"} repo:`, repoUrl);

    try {
      const tab = await createTabSafe({
        url: repoUrl,
        active: false,
        ...(senderWindowId ? { windowId: senderWindowId } : {}),
      });

      const timeoutId = setTimeout(() => {
        let value = `Timeout: No response from repo ${repoUrl}, tab ${tab.id}`
        sendMessage(false, value, retry)

        // Close tab timeout
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Failed to close tab:",
              chrome.runtime.lastError.message
            );
          } else {
            console.log("Closed tab due to timeout");
          }
        });

        delete pendingTabs[tab.id];
      }, timeout * 1000);

      pendingTabs[tab.id] = timeoutId;
    } catch (err) {
      let value = `Failed to create tab: ${err.message}`
      sendMessage(false, value, retry)
    }
  }

  if (message.type === "star_result") {
    const tabId = sender.tab?.id;
    if (tabId && pendingTabs[tabId]) {
      clearTimeout(pendingTabs[tabId]); // Cancel timeout
      delete pendingTabs[tabId];
      console.log(`Received star result from tab ${tabId}:`, message.success);
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

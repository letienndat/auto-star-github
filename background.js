chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "open_tab") {
    const repoUrl = message.url;
    const senderTab = sender.tab;
    const senderWindowId = senderTab ? senderTab.windowId : null;

    if (senderWindowId !== null) {
      chrome.tabs.create({
        url: repoUrl,
        active: false,
        windowId: senderWindowId,
      });
    } else {
      chrome.tabs.create({
        url: repoUrl,
        active: false,
      });
    }
  }
});

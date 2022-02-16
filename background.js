// Set conditional use of extension only in cloud.boosteroid.com
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'cloud.boosteroid.com' }
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});
// Information from a persistent variables.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ noFullScreen: false });
});

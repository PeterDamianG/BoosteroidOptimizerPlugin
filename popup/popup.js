// Find switch element in popup.html
const sw = document.querySelector('#noFullScreenSwitch');
// Set actual state to switch.
sw.checked = chrome.storage.sync.get('noFullScreen');
// Add event to change storage.
sw.addEventListener('change', () =>
  chrome.storage.sync.set({ noFullScreen: sw.checked })
);

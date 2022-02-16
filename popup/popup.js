// Find switch element in popup.html
const sw = document.querySelector('#noFullScreenSwitch');
// Set actual state to switch.
chrome.storage.sync.get('noFullScreen', ({ noFullScreen }) => {
  sw.checked = noFullScreen;
});
// Add event to change storage.
sw.addEventListener('change', () =>
  chrome.storage.sync.set({ noFullScreen: sw.checked })
);

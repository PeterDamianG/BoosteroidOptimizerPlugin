// Inyect own EventHandler with different init.
async function noFullScreenExperimental(conditional) {
  if (conditional) {
    console.log('No fullscreen experimental feature is Actived.');
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('scripts/eventHandler.js');
    s.onload = function () {
      this.remove();
    };
    (document.body || document.documentElement).appendChild(s);
  } else {
    console.log('No fullscreen experimental feature is Disabled.');
  }
}
// Call function using persist variable.
chrome.storage.sync.get('noFullScreen', async ({ noFullScreen }) => {
  await noFullScreenExperimental(noFullScreen);
});

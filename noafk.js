// Check if we have a MutationObserver Api.
const MutationObserver =
  window.MutationObserver || window.WebKitMutationObserver;
// Make a function to close the afk popup.
const closePopUp = () => {
  const elementButton = document.querySelector('#confirm_btn');
  if (elementButton) elementButton.click();
};
// Make a function to run observer.
const observeApp = () => {
  appObserver = new MutationObserver(() => {
    closePopUp();
    console.log('Closed popup afk system.');
  });
  appObserver.observe(document.body, {
    childList: true
  });
};
// Notify in console we use a B.O.P and version.
console.log(
  `Boosteriod Optimizer Plugin v${chrome.runtime.getManifest().version}`
);
// Run the observer.
observeApp();

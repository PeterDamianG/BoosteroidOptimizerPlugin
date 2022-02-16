// Check if we have a MutationObserver Api.
const MutationObserver =
  window.MutationObserver || window.WebKitMutationObserver;
// Make a function to close the afk popup.
function closePopUp() {
  const elementButton = document.querySelector('#confirm_btn');
  if (elementButton) {
    elementButton.click();
    console.log('Closed popup afk system.');
  }
}
// Make a function to run observer.
function noAFK() {
  appObserverAFK = new MutationObserver(() => closePopUp());
  appObserverAFK.observe(document.body, {
    childList: true
  });
}
// Run function.
noAFK();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'grab_page_text') {
    sendResponse({ text: document.body.innerText });
  }
});

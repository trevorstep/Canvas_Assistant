console.log('Canvas Assistant content script loaded.');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'grab_page_text') {
    sendResponse({ text: document.body.innerText });
  }

  // Listen for toggle command from background or popup
  if (msg.action === 'toggle_popup') {
    let frame = document.getElementById('canvas-popup-frame');
    if (frame) {
      // If already showing, remove it (toggle off)
      frame.remove();
    } else {
      // Create the iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'canvas-popup-frame';
      iframe.src = chrome.runtime.getURL('popup.html');

      Object.assign(iframe.style, {
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '380px',
        height: '460px',
        border: 'none',
        borderRadius: '18px',
        boxShadow: '0 0 25px rgba(0,0,0,0.25)',
        zIndex: 999999,
        background: 'transparent',
      });

      document.body.appendChild(iframe);
    }
  }
});


chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "toggle_popup" });
});


// AI used for carrier connection

// Set up daily alarm when extension is installed/updated
chrome.runtime.onInstalled.addListener(async () => {
  // Create alarm that fires every 24 hours
  chrome.alarms.create('dailyCheck', { 
    periodInMinutes: 1440 // Every 24 hours
  });
});

// Check when alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyCheck') {
    await checkAndNotify();
  }
});

async function checkAndNotify() {
  const { userPhone, userCarrier, canvasToken } = await chrome.storage.sync.get(['userPhone', 'userCarrier', 'canvasToken']);
  
  if (!userPhone || !userCarrier || !canvasToken) {
    console.log('Missing phone, carrier, or token');
    return;
  }

  // Call your Cloud Function
  const FUNCTION_URL = 'https://us-central1-canvas-assistant-476201.cloudfunctions.net/notify';
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phone: userPhone,
        carrier: userCarrier,
        token: canvasToken 
      })
    });
    
    const result = await response.text();
    console.log('Text notification sent:', result);
  } catch (err) {
    console.error('Failed to send text:', err);
  }
}

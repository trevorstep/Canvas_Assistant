document.getElementById('save').addEventListener('click', async () => {
  const token = document.getElementById('token').value.trim();
  if (!token) return alert('Paste token');
  await chrome.storage.sync.set({ canvasToken: token });
  alert('Saved');
});

async function getToken() {
  const { canvasToken } = await chrome.storage.sync.get('canvasToken');
  return canvasToken;
}

async function fetchAssignments() {
  const token = await getToken();
  if (!token) return alert('No token saved — go to Options to add one.');

  const base = 'https://canvas.instructure.com';
  const res = await fetch(`${base}/api/v1/courses?enrollment_state=active`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const courses = await res.json();

  const allAssignments = [];
  for (const c of courses) {
    try {
      const aRes = await fetch(`${base}/api/v1/courses/${c.id}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = await aRes.json();
      for (const a of list) {
        if (a.due_at) allAssignments.push(a);
      }
    } catch (_) {}
  }

  return allAssignments;
}

function prioritize(assignments) {
  const now = Date.now();
  return assignments
    .map(a => ({ ...a, due_ts: new Date(a.due_at).getTime() }))
    .filter(a => a.due_ts > now)
    .sort((a, b) => a.due_ts - b.due_ts)
    .slice(0, 5); // top 5
}

document.getElementById('fetch').addEventListener('click', async () => {
  const list = document.getElementById('assignments');
  list.innerHTML = 'Loading...';

  try {
    const assignments = await fetchAssignments();
    const prioritized = prioritize(assignments);
    list.innerHTML = '';
    prioritized.forEach(a => {
      const li = document.createElement('li');
      li.textContent = `${a.name} — due ${new Date(a.due_at).toLocaleString()}`;
      list.appendChild(li);
    });
  } catch (err) {
    list.innerHTML = 'Error fetching assignments.';
    console.error(err);
  }
});

document.getElementById('summarize').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0].id;

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.body.innerText.slice(0, 20000)
  });

  const text = result;
  // Placeholder summarization — replace with real API call later
  const summary = text.split('.').slice(0, 3).join('.') + '...';
  document.getElementById('summary').innerText = summary;
});

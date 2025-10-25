const AI_ENDPOINT = "https://canvas-ai-endpoint-502269216279.us-central1.run.app";


async function getToken() {
    const { canvasToken } = await chrome.storage.sync.get('canvasToken');
    return canvasToken;
}

async function fetchAssignments() {
    const token = await getToken();
    if (!token) return alert('No token saved — go to Options to add one.');

    const base = `https://${window.location.hostname}`;
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
        } catch (_) { }
    }

    return allAssignments;
}

function prioritize(assignments) {
    const now = Date.now();
    return assignments
        .map(a => ({ ...a, due_ts: new Date(a.due_at).getTime() }))
        .filter(a => a.due_ts > now)
        .sort((a, b) => a.due_ts - b.due_ts)
        .slice(0, 5); 
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








// dont work on anything above this line



async function extractPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const el = document.querySelector('#content.ic-Layout-contentMain[role="main"]');
      return el ? el.innerText.slice(0, 20000) : '';
    }
  });
  return result;
}


document.getElementById('summarize').addEventListener('click', async () => {
  try {
    const text = await extractPageText();
    document.getElementById('summary').innerText = "Thinking…";

    const answer = await askGemini(text);  // await the promise
    document.getElementById('summary').innerText = answer || "(No answer)";
    alert(answer); 
  } catch (e) {
    console.error(e);
    document.getElementById('summary').innerText = "Error: " + e.message;
    alert("Error: " + e.message);
  }
});

async function askGemini(prompt) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.result || "";
}

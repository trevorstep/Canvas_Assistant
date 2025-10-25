const AI_ENDPOINT = "https://canvas-ai-endpoint-502269216279.us-central1.run.app";


async function getToken() {
    const { canvasToken } = await chrome.storage.sync.get('canvasToken');
    return canvasToken;
}

async function fetchAssignments() {
    const token = await getToken();
    if (!token) return alert('No token saved — go to Options to add one.');

    const base = `https://${'https://canvas.instructure.com'}`;
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
        } catch (err) {
            console.error("Error fetching assignments for course", c.name, err);
        }
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





    function prioritize(assignments) {
        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

        // Step 1: Filter to only assignments due within a week
        const upcoming = assignments
            .map(a => ({
                ...a,
                due_ts: new Date(a.due_at).getTime(),
                points: a.points_possible || 0
            }))
            .filter(a => a.due_ts > now && (a.due_ts - now) <= weekMs);

        if (upcoming.length === 0) return [];

        // Step 2: Normalize weight so point values scale from 0 to 1
        const maxPoints = Math.max(...upcoming.map(a => a.points || 0)) || 1;

        // Step 3: Compute priority score
        const scored = upcoming.map(a => {
            const timeUntilDue = a.due_ts - now;
            const urgencyScore = Math.max(0, 1 - timeUntilDue / weekMs); // closer = higher
            const weightScore = a.points / maxPoints; // higher points = higher importance

            // Adjust balance of urgency vs weight here
            const priorityScore = (urgencyScore * 0.6) + (weightScore * 0.4);

            return { ...a, urgencyScore, weightScore, priorityScore };
        });

        // Step 4: Sort by score descending (most important first)
        scored.sort((a, b) => b.priorityScore - a.priorityScore);

        // Step 5: Limit to top 5 results (optional)
        return scored.slice(0, 5);
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

    const answer = await summarize(text);  // await the promise
    document.getElementById('summary').innerText = stripMarkdown(answer) || "(No answer)";
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

async function summarize(prompt) {
  return await askGemini(`Summarize the most important parts of this text short:\n\n${prompt}`);
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .trim();
}

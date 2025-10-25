const AI_ENDPOINT = "https://canvas-ai-endpoint-502269216279.us-central1.run.app";


async function getToken() {
    const { canvasToken } = await chrome.storage.sync.get('canvasToken');
    return canvasToken;
}

async function fetchAssignments() {
    const token = await getToken();
    if (!token) return alert('No token saved — go to Options to add one.');

    const base = 'https://byui.instructure.com';
    const res = await fetch(`${base}/api/v1/courses?enrollment_state=active`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const courses = await res.json();

    const allAssignments = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekFromNow = now.getTime() + 7 * 24 * 60 * 60 * 1000;

    for (const c of courses) {
        try {
            const aRes = await fetch(`${base}/api/v1/courses/${c.id}/assignments?include[]=submission`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = await aRes.json();

            for (const a of list) {
                if (!a.due_at) continue;

                const dueDate = new Date(a.due_at);
                const dueTime = dueDate.getTime();
                const sub = a.submission;
                const isSubmitted = sub && (sub.submitted_at || sub.workflow_state === "submitted");
                const isGraded = sub && sub.graded_at;
                const isExcused = sub && sub.excused;

                if (!isSubmitted && !isGraded && !isExcused && dueTime <= weekFromNow) {
                    allAssignments.push({
                        ...a,
                        due_ts: dueTime,
                        due_str: dueDate.toISOString().slice(0, 10),
                        points: a.points_possible || 0
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching assignments for course", c.name, err);
        }
    }

    return prioritize(allAssignments, todayStr);
}


function prioritize(assignments, todayStr) {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const maxPoints = Math.max(...assignments.map(a => a.points || 0)) || 1;

    const scored = assignments.map(a => {
        const timeUntilDue = a.due_ts - now;
        const urgencyScore = Math.max(0, 1 - timeUntilDue / weekMs);
        const weightScore = a.points / maxPoints;
        const priorityScore = (urgencyScore * 0.6) + (weightScore * 0.4);
        const isToday = a.due_str === todayStr;
        return { ...a, priorityScore, isToday };
    });

    // Sort: due today first, then by score descending
    scored.sort((a, b) => {
        if (a.isToday && !b.isToday) return -1;
        if (!a.isToday && b.isToday) return 1;
        return b.priorityScore - a.priorityScore;
    });

    return scored;
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
    return await askGemini(`Summarize the most important parts of this text:\n\n${prompt}`);
}

function stripMarkdown(text) {
  return (text || "")
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .trim();
}

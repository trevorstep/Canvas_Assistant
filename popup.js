const AI_ENDPOINT = "https://canvas-ai-endpoint-502269216279.us-central1.run.app";
fetchedAssignments = fetchAssignments()
const now = new Date();

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
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000; 

    const upcoming = assignments
        .filter(a => {
            if (!a.due_at) return false;
            const dueTs = new Date(a.due_at).getTime();
            const notSubmitted = !a.has_submitted_submissions && !a.submission?.submitted_at;
            return notSubmitted && dueTs >= (now - 12 * 60 * 60 * 1000) && (dueTs - now) <= twoWeeksMs;
        })
        .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    return upcoming;
}



    // Toggles the in-popup chat interface. This function was made with the help of ChatGPT.
    document.addEventListener("DOMContentLoaded", () => {
        const otherBtn = document.getElementById("other");
        const chatContainer = document.getElementById("chat-container");
        const userInput = document.getElementById("user-input");
        const sendBtn = document.getElementById("send-btn");
        
        if (otherBtn && chatContainer) {
          otherBtn.addEventListener("click", () => {
            chatContainer.classList.toggle("hidden");
          });
        }

        if (userInput && sendBtn) {
          userInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              sendBtn.click();
            }
          });
        }
      });
      



document.getElementById('fetch').addEventListener('click', async () => {
    const list = document.getElementById('assignments');
    list.innerHTML = 'Loading...';

    try {
        const assignments = await fetchAssignments();
        const prioritized = prioritize(assignments);
        list.innerHTML = '';

        for (const a of prioritized) {
            const li = document.createElement('li');
            li.textContent = `${a.name} — due ${new Date(a.due_at).toLocaleString()} `;

            const summarizeBtn = document.createElement('button');
            summarizeBtn.textContent = "Summarize Assignment";
            summarizeBtn.style.marginLeft = "10px";

            summarizeBtn.addEventListener('click', async () => {
                summarizeBtn.textContent = "Summarizing...";
                summarizeBtn.disabled = true;

                try {
                    const token = await getToken();
                    const base = 'https://byui.instructure.com';
                    const res = await fetch(`${base}/api/v1/courses/${a.course_id}/assignments/${a.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const details = await res.json();

                    const description = details.description
                        ? details.description.replace(/<[^>]*>/g, '')
                        : "No description provided.";

                    const result = await async function summarize(prompt) {
    return await shortSummarize(`Summarize the most important parts of this text:\n\n${prompt}`);
}(`Summarize this Canvas assignment:\n\n${description}`);
                    const clean = stripMarkdown(result);

                    const summaryEl = document.createElement('div');
                    summaryEl.textContent = clean;
                    summaryEl.style.marginTop = "5px";
                    summaryEl.style.fontStyle = "italic";

                    li.appendChild(summaryEl);
                } catch (err) {
                    console.error(err);
                    alert("Error summarizing assignment.");
                } finally {
                    summarizeBtn.textContent = "Summarize Assignment";
                    summarizeBtn.disabled = false;
                }
            });

            li.appendChild(summarizeBtn);
            list.appendChild(li);
        }
    } catch (err) {
        list.innerHTML = 'Error fetching assignments.';
        console.error(err);
    }
});



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

async function shortSummarize(prompt) {
    return await askGemini(`Summarize the most important parts of this text in 2 sentances:\n\n${prompt}`);
}

function stripMarkdown(text) {
  return (text || "")
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .trim();
}

async function otherGeminiQuestion(prompt) {
    return await askGemini(`You are an AI assistant for the educational website Canvas. Here the information about the web page they are on:${await extractPageText()}. Here are their assignments: ${fetchedAssignments}. The date and time is ${now.toString()}Here is their current question: \n\n${prompt}`);
}

document.getElementById("other").addEventListener("click", () => {
    const chatContainer = document.getElementById("chat-container");
  
    // Toggle visibility (show/hide)
    chatContainer.classList.toggle("active");
  
    // Optional: focus the input when opened
    if (chatContainer.classList.contains("active")) {
      document.getElementById("chat-input").focus();
    }
  });
  

  

  document.getElementById('send-btn').addEventListener('click', async () => {
    try {
        const text = document.getElementById("user-input").value;

        const answer = await otherGeminiQuestion(text);
        alert(answer);
        // document.getElementById('summary').innerText = stripMarkdown(answer) || "(No answer)";
    } catch (e) {
        console.error(e);
        document.getElementById('summary').innerText = "Error: " + e.message;
        alert("Error: " + e.message);
    }
});
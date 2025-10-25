document.getElementById('save').addEventListener('click', async () => {
  const token = document.getElementById('token').value.trim();
  if (!token) return alert('Paste token');
  await chrome.storage.sync.set({ canvasToken: token });
  alert('Saved');
});

async function getToken() {
  const { canvasToken } = await chrome.storage.sync.get('canvasToken');
  return canvasToken;
}

async function loadCourses() {
  const listDiv = document.getElementById('courseList');
  const token = await getToken();

  if (!listDiv) return;

  if (!token) {
    listDiv.textContent = 'No Canvas token found. Save your token first.';
    return;
  }

  listDiv.textContent = 'Fetching your courses...';

  try {
    const base = 'https://canvas.instructure.com';
    const res = await fetch(`${base}/api/v1/courses?enrollment_state=active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const courses = await res.json();

    if (!Array.isArray(courses) || courses.length === 0) {
      listDiv.textContent = 'No active courses found.';
      return;
    }

    const { excludedCourses = [] } = await chrome.storage.sync.get('excludedCourses');

    listDiv.innerHTML = ''; 
    courses.forEach(c => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.marginBottom = '4px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = c.id;
      checkbox.checked = !excludedCourses.includes(c.id); 
      label.appendChild(checkbox);
      label.append(` ${c.name}`);
      listDiv.appendChild(label);
    });

  } catch (err) {
    console.error('Error fetching courses:', err);
    listDiv.textContent = 'Failed to load courses. Check your token or network connection.';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadCourses();

  const savePrefsBtn = document.getElementById('savePrefs');
  if (savePrefsBtn) {
    savePrefsBtn.addEventListener('click', async () => {
      const checkboxes = document.querySelectorAll('#courseList input[type=checkbox]');
      const excludedCourses = [];

      checkboxes.forEach(cb => {
        if (!cb.checked) excludedCourses.push(parseInt(cb.value));
      });

      await chrome.storage.sync.set({ excludedCourses });

      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'Preferences saved!';
        setTimeout(() => (status.textContent = ''), 1500);
      }
    });
  }
});

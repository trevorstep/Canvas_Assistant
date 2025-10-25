document.getElementById('save').addEventListener('click', async () => {
  const token = document.getElementById('token').value.trim();
  if (!token) return alert('Paste token');
  await chrome.storage.sync.set({ canvasToken: token });
  alert('Saved');
});


async function loadCourses() {
  const token = await getToken();
  const listDiv = document.getElementById('courseList');
  if (!token) {
    listDiv.textContent = 'No Canvas token found. Go to the main page and save it first.';
    return;
  }

  listDiv.textContent = 'Fetching courses...';

  const base = 'https://canvas.instructure.com';
  const res = await fetch(`${base}/api/v1/courses?enrollment_state=active`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const courses = await res.json();

  const { excludedCourses = [] } = await chrome.storage.sync.get('excludedCourses');

  listDiv.innerHTML = ''; 
  courses.forEach(c => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = c.id;
    checkbox.checked = !excludedCourses.includes(c.id); // checked unless excluded
    label.appendChild(checkbox);
    label.append(` ${c.name}`);
    listDiv.appendChild(label);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadCourses();

  document.getElementById('save').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('#courseList input[type=checkbox]');
    const excludedCourses = [];
    checkboxes.forEach(cb => {
      if (!cb.checked) excludedCourses.push(parseInt(cb.value));
    });
    await chrome.storage.sync.set({ excludedCourses });

    const status = document.getElementById('status');
    status.textContent = 'Preferences saved!';
    setTimeout(() => status.textContent = '', 1500);
  });
});

// === Save Token Button ===
document.getElementById('saveToken').addEventListener('click', async () => {
  const token = document.getElementById('token').value.trim();
  if (!token) return alert('Please paste your Canvas token first.');

  await chrome.storage.sync.set({ canvasToken: token });
  document.getElementById('status').textContent = 'Token saved!';
  setTimeout(() => (document.getElementById('status').textContent = ''), 2000);
});



async function getToken() {
  const { canvasToken } = await chrome.storage.sync.get('canvasToken');
  return canvasToken;
}


// === Load Courses ===
async function loadCourses() {
  const listDiv = document.getElementById('courseList');
  if (!listDiv) return;

  const token = await getToken();

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


// === Preferences Save ===
document.addEventListener('DOMContentLoaded', async () => {
  const token = await getToken();

  await loadCourses();

  const savePrefsBtn = document.getElementById('savePreferences');
  if (savePrefsBtn) {
    savePrefsBtn.addEventListener('click', async () => {
      const token = await getToken();
      if (!token) return alert('No token found. Please save your Canvas token first.');

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





document.addEventListener('DOMContentLoaded', () => {
  const textNotifyCheckbox = document.getElementById('textNotifyCheckbox');
  const phoneBox = document.getElementById('phoneInputContainer');

  if (!textNotifyCheckbox || !phoneBox) return; // Safety check

  // Function to toggle visibility of phone input container
  const togglePhoneBoxVisibility = () => {
    if (textNotifyCheckbox.checked) {
      phoneBox.classList.remove('hidden'); // Show phone input container
    } else {
      phoneBox.classList.add('hidden'); // Hide phone input container
    }
  };

  // Set initial visibility based on checkbox state
  togglePhoneBoxVisibility();

  // Add event listener to toggle visibility on checkbox change
  textNotifyCheckbox.addEventListener('change', togglePhoneBoxVisibility);
});


// Save phone number
document.getElementById('savePhoneBtn').addEventListener('click', async () => {
  const phone = document.getElementById('phoneNumber').value.trim();
  const carrier = document.getElementById('carrier').value.trim();
  const statusMsg = document.getElementById('saveStatus');
  
  if (!phone || !carrier) {
    statusMsg.textContent = '⚠ Please enter phone number AND carrier';
    statusMsg.style.color = '#fb7185';
    return;
  }
  
  await chrome.storage.sync.set({ userPhone: phone, userCarrier: carrier });
  
  statusMsg.textContent = '✓ Saved!';
  statusMsg.style.color = '#4ade80';
  setTimeout(() => {
    statusMsg.textContent = '';
  }, 2000);
});


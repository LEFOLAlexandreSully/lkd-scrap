const statusEl = document.getElementById('status');
const resultBox = document.getElementById('resultBox');
const extractBtn = document.getElementById('extractBtn');
const saveBtn = document.getElementById('saveBtn');
const copyBtn = document.getElementById('copyBtn');
let currentProfile = null;

function renderData(data) {
  resultBox.textContent = JSON.stringify(data, null, 2);
}

async function restorePendingProfile() {
  try {
    const { pendingProfile } = await chrome.storage.session.get('pendingProfile');
    if (!pendingProfile) return;

    currentProfile = pendingProfile;
    renderData(currentProfile);
    saveBtn.disabled = false;
    statusEl.textContent = 'Profile ready. Open the company app to save it.';
  } catch (error) {
    statusEl.textContent = `Unable to restore the pending profile: ${String(error.message || error)}`;
  }
}

function sendMessageToTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'extractProfile' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });
}

async function extractProfile() {
  statusEl.textContent = 'Checking active LinkedIn tab...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    statusEl.textContent = 'No active tab found.';
    return;
  }

  if (!tab.url || !tab.url.includes('linkedin.com')) {
    statusEl.textContent = 'Open a LinkedIn profile page first.';
    return;
  }

  let response = await sendMessageToTab(tab.id);

  if (!response || !response.success) {
    statusEl.textContent = 'Content script not active yet; retrying...';

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      statusEl.textContent = 'Unable to inject the page script. Refresh and try again.';
      return;
    }

    response = await sendMessageToTab(tab.id);
  }

  if (!response || !response.success) {
    statusEl.textContent = 'Could not parse profile data.';
    return;
  }

  try {
    await chrome.storage.session.set({ pendingProfile: response.data });
  } catch (error) {
    renderData(response.data);
    statusEl.textContent = `Profile extracted, but could not keep it for saving: ${String(error.message || error)}`;
    return;
  }

  currentProfile = response.data;
  saveBtn.disabled = false;
  renderData(response.data);
  statusEl.textContent = 'Profile extracted. Open the company app, then save it.';
}

async function saveProfile() {
  if (!currentProfile) {
    statusEl.textContent = 'Extract a profile before saving it.';
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:\/\//i.test(tab.url) || /linkedin\.com/i.test(tab.url)) {
    statusEl.textContent = 'Open the company app in this tab before saving.';
    return;
  }

  saveBtn.disabled = true;
  statusEl.textContent = 'Saving profile to the company database...';

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['target-app.js']
    });

    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'saveProfileToDatabase',
        data: currentProfile
      }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    });

    if (!response?.success) {
      throw new Error(response?.error || 'The company database did not confirm the save.');
    }

    await chrome.storage.session.remove('pendingProfile');
    currentProfile = null;
    statusEl.textContent = `Profile saved successfully (ID: ${response.id}).`;
  } catch (error) {
    statusEl.textContent = `Could not save the profile: ${String(error.message || error)}`;
    saveBtn.disabled = false;
  }
}

extractBtn.addEventListener('click', extractProfile);
saveBtn.addEventListener('click', saveProfile);

copyBtn.addEventListener('click', async () => {
  const payload = resultBox.textContent;

  try {
    await navigator.clipboard.writeText(payload);
    statusEl.textContent = 'JSON copied to clipboard';
  } catch (error) {
    statusEl.textContent = 'Copy failed. You can still copy manually.';
  }
});

restorePendingProfile();

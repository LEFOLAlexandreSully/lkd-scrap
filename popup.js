const statusEl = document.getElementById('status');
const resultBox = document.getElementById('resultBox');
const extractBtn = document.getElementById('extractBtn');
const copyBtn = document.getElementById('copyBtn');

function renderData(data) {
  resultBox.textContent = JSON.stringify(data, null, 2);
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

  renderData(response.data);
  statusEl.textContent = 'Data extracted successfully';
}

extractBtn.addEventListener('click', extractProfile);

copyBtn.addEventListener('click', async () => {
  const payload = resultBox.textContent;

  try {
    await navigator.clipboard.writeText(payload);
    statusEl.textContent = 'JSON copied to clipboard';
  } catch (error) {
    statusEl.textContent = 'Copy failed. You can still copy manually.';
  }
});

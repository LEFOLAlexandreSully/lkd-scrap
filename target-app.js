function setFieldValue(field, value) {
  const prototype = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (valueSetter) {
    valueSetter.call(field, value);
  } else {
    field.value = value;
  }

  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillProfileForm(profile) {
  const fields = [
    ['firstName', profile.firstName],
    ['lastName', profile.lastName],
    ['jobTitle', profile.jobTitle]
  ];
  const missingFields = [];

  for (const [name, value] of fields) {
    const field = document.querySelector(
      `input[name="${name}"], textarea[name="${name}"]`
    );

    if (!field) {
      missingFields.push(name);
      continue;
    }

    setFieldValue(field, value || '');
  }

  if (missingFields.length) {
    throw new Error(`Form fields not found: ${missingFields.join(', ')}`);
  }

  return { firstName: profile.firstName, lastName: profile.lastName, jobTitle: profile.jobTitle };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'fillProfile') {
    return false;
  }

  try {
    if (!message.data || typeof message.data !== 'object') {
      throw new Error('Profile data is missing.');
    }

    fillProfileForm(message.data);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: String(error.message || error) });
  }

  return false;
});

(() => {
  const listenerKey = '__linkedinProfileDatabaseListenerInstalled';
  if (globalThis[listenerKey]) return;
  globalThis[listenerKey] = true;

  const databaseName = 'candidates';
  const storeName = 'candidates';

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
    });
  }

  function transactionCompletion(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction was aborted.'));
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
    });
  }

  async function saveProfile(profile) {
    if (!profile || typeof profile !== 'object') {
      throw new Error('Profile data is missing.');
    }
    for (const field of ['firstName', 'lastName', 'jobTitle']) {
      if (typeof profile[field] !== 'string') {
        throw new Error(`Profile field "${field}" is missing or invalid.`);
      }
    }
    if (typeof indexedDB.databases !== 'function') {
      throw new Error('This browser cannot verify that the company database already exists.');
    }

    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === databaseName)) {
      throw new Error(`IndexedDB "${databaseName}" was not found on this site. Open the company app and try again.`);
    }

    const database = await requestResult(indexedDB.open(databaseName));
    try {
      if (!Array.from(database.objectStoreNames).includes(storeName)) {
        throw new Error(`Object store "${storeName}" was not found in IndexedDB "${databaseName}".`);
      }

      const checkTransaction = database.transaction(storeName, 'readonly');
      const keyPath = checkTransaction.objectStore(storeName).keyPath;
      await transactionCompletion(checkTransaction);
      if (keyPath !== 'id') {
        throw new Error(`Object store "${storeName}" must use "id" as its key path.`);
      }

      const transaction = database.transaction(storeName, 'readwrite');
      const completed = transactionCompletion(transaction);
      const id = crypto.randomUUID();
      transaction.objectStore(storeName).add({
        id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        position: profile.jobTitle
      });
      await completed;
      return id;
    } finally {
      database.close();
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action !== 'saveProfileToDatabase') {
      return false;
    }

    saveProfile(message.data)
      .then((id) => sendResponse({ success: true, id }))
      .catch((error) => sendResponse({
        success: false,
        error: String(error.message || error)
      }));
    return true;
  });
})();

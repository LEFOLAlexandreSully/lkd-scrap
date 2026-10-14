const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const contentScript = fs.readFileSync(path.join(__dirname, '..', 'target-app.js'), 'utf8');

async function runContentScript(data, { databaseExists = true, storeExists = true, keyPath = 'id' } = {}) {
  let messageListener;
  let insertedRecord;
  let openedDatabase = false;
  const database = {
    objectStoreNames: storeExists ? ['candidates'] : [],
    close() {},
    transaction() {
      let completeHandler;
      const transaction = {
        objectStore() {
          return {
            keyPath,
            add(record) {
              insertedRecord = record;
            },
          };
        }
      };
      Object.defineProperty(transaction, 'oncomplete', {
        set(handler) {
          completeHandler = handler;
          setTimeout(() => completeHandler?.(), 0);
        }
      });
      return transaction;
    }
  };
  const indexedDB = {
    databases: async () => databaseExists ? [{ name: 'candidates' }] : [],
    open() {
      openedDatabase = true;
      const request = { result: database };
      setTimeout(() => request.onsuccess(), 0);
      return request;
    }
  };
  const context = {
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListener = listener;
          }
        }
      }
    },
    indexedDB,
    crypto: { randomUUID: () => '00087c53-5bca-44f3-99cd-d76ed24db5c5' },
    setTimeout
  };

  vm.runInNewContext(contentScript, context);
  const response = await new Promise((resolve) => {
    messageListener({ action: 'saveProfileToDatabase', data }, {}, resolve);
  });

  return { response, insertedRecord, openedDatabase };
}

test('inserts the profile into the candidates store with a generated UUID and mapped position', async () => {
  const { response, insertedRecord } = await runContentScript({
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobTitle: 'Engineer'
  });

  assert.equal(response.success, true);
  assert.equal(response.id, '00087c53-5bca-44f3-99cd-d76ed24db5c5');
  assert.deepEqual(JSON.parse(JSON.stringify(insertedRecord)), {
    id: response.id,
    firstName: 'Ada',
    lastName: 'Lovelace',
    position: 'Engineer'
  });
});

test('does not create a database when the company database is absent', async () => {
  const { response, insertedRecord, openedDatabase } = await runContentScript({
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobTitle: 'Engineer'
  }, { databaseExists: false });

  assert.equal(response.success, false);
  assert.match(response.error, /IndexedDB "candidates" was not found/);
  assert.equal(openedDatabase, false);
  assert.equal(insertedRecord, undefined);
});

test('reports when the expected object store is missing', async () => {
  const { response, insertedRecord } = await runContentScript({
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobTitle: 'Engineer'
  }, { storeExists: false });

  assert.equal(response.success, false);
  assert.match(response.error, /Object store "candidates" was not found/);
  assert.equal(insertedRecord, undefined);
});

test('rejects a store with a different primary key path', async () => {
  const { response, insertedRecord } = await runContentScript({
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobTitle: 'Engineer'
  }, { keyPath: 'candidateId' });

  assert.equal(response.success, false);
  assert.match(response.error, /must use "id" as its key path/);
  assert.equal(insertedRecord, undefined);
});

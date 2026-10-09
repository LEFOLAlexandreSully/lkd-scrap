const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const contentScript = fs.readFileSync(path.join(__dirname, '..', 'target-app.js'), 'utf8');

function runContentScript(html, data, setupDom = () => {}) {
  const dom = new JSDOM(html, { url: 'https://app.example.test/' });
  setupDom(dom.window.document);
  let messageListener;
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
    document: dom.window.document,
    Event: dom.window.Event,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement
  };

  vm.runInNewContext(contentScript, context);
  let response;
  messageListener({ action: 'fillProfile', data }, {}, (value) => {
    response = value;
  });

  return { dom, response };
}

test('fills the matching name, firstName, and jobTitle fields and dispatches form events', () => {
  const eventCounts = { input: 0, change: 0 };
  const { dom, response } = runContentScript(`
    <input name="lastName">
    <input name="firstName">
    <textarea name="jobTitle"></textarea>
  `, {
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobTitle: 'Engineer'
  }, (document) => {
    for (const field of document.querySelectorAll('input, textarea')) {
      field.addEventListener('input', () => eventCounts.input++);
      field.addEventListener('change', () => eventCounts.change++);
    }
  });
  const { document } = dom.window;

  assert.equal(response.success, true);
  assert.equal(document.querySelector('[name="firstName"]').value, 'Ada');
  assert.equal(document.querySelector('[name="lastName"]').value, 'Lovelace');
  assert.equal(document.querySelector('[name="jobTitle"]').value, 'Engineer');
  assert.deepEqual(eventCounts, { input: 3, change: 3 });
  dom.window.close();
});

test('reports the names of form fields that are missing', () => {
  const { dom, response } = runContentScript('<input name="firstName">', {
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobTitle: 'Engineer'
  });

  assert.equal(response.success, false);
  assert.match(response.error, /lastName, jobTitle/);
  assert.equal(dom.window.document.querySelector('[name="firstName"]').value, 'Ada');
  dom.window.close();
});

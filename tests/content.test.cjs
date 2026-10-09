const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const contentScript = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function extractFromHtml(html) {
  const dom = new JSDOM(html, {
    url: 'https://www.linkedin.com/in/example/'
  });
  const context = {
    chrome: {
      runtime: {
        onMessage: {
          addListener() {}
        }
      }
    },
    document: dom.window.document,
    window: dom.window
  };

  vm.runInNewContext(contentScript, context);
  const profile = context.extractLinkedInProfile();
  dom.window.close();

  return profile;
}

test('extracts the first and last name from the example HTML page', () => {
  const pageHtml = `<h2>Un autre titre avant le profil</h2>${fs.readFileSync(path.join(__dirname, 'pageExample.html'), 'utf8')}`;
  const profile = extractFromHtml(pageHtml);

  assert.equal(profile.fullName, 'John Doe');
  assert.equal(profile.firstName, 'John');
  assert.equal(profile.lastName, 'Doe');
  assert.equal(profile.jobTitle, 'Développeur JavaEE à Alteca');
});

test('extracts the job title from the second example HTML page', () => {
  const pageHtml = fs.readFileSync(path.join(__dirname, 'pageExample2.html'), 'utf8');
  const profile = extractFromHtml(pageHtml);

  assert.equal(profile.fullName, 'Jacques Mougeot');
  assert.equal(profile.jobTitle, 'Étudiant(e) à Centrale Méditerranée');
});

test('extracts the job title from the third example HTML page', () => {
  const pageHtml = fs.readFileSync(path.join(__dirname, 'pageExample3.html'), 'utf8');
  const profile = extractFromHtml(pageHtml);

  assert.equal(profile.fullName, 'Jean-Marc Jancovici');
  assert.equal(profile.jobTitle, 'Associé Carbone 4 - Président The Shift Project');
});

test('extracts the profile name and job title from HTML elements', () => {
  const profile = extractFromHtml(`
    <html>
      <body>
        <p>Un titre extérieur à la carte profil</p>
        <div id="com.linkedin.sdui.profile.card.refExampleTopcard">
          <h2>Ada   Lovelace</h2>
          <p>Vérification en 2 minutes</p>
          <p class="profile-ebul07-title">Senior Engineer</p>
        </div>
      </body>
    </html>
  `);

  assert.equal(profile.fullName, 'Ada Lovelace');
  assert.equal(profile.firstName, 'Ada');
  assert.equal(profile.lastName, 'Lovelace');
  assert.equal(profile.jobTitle, 'Senior Engineer');
});

test('rejects generic profile labels instead of returning them as name or job title', () => {
  for (const label of ['Infos', 'Coordonnées']) {
    const profile = extractFromHtml(`
      <html>
        <body>
          <div id="com.linkedin.sdui.profile.card.refExampleTopcard">
            <h2>${label}</h2>
          </div>
          <p>Product Designer</p>
        </body>
      </html>
    `);

    assert.equal(profile.fullName, '');
  }

  for (const label of ['Infos', 'Coordonnées', 'Passer à la recherche']) {
    const profile = extractFromHtml(`
      <html>
        <body>
          <div id="com.linkedin.sdui.profile.card.refExampleTopcard">
            <h2>Ada Lovelace</h2>
          </div>
          <p class="profile-ebul07-title">${label}</p>
        </body>
      </html>
    `);

    assert.equal(profile.jobTitle, '');
  }
});

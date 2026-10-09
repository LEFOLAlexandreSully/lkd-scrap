# LinkedIn Profile Scraper for Edge

This extension extracts the current LinkedIn profile data visible on the page and shows it in a popup.

## Included fields

- firstName
- lastName
- jobTitle
- skills
- yearsOfExperience
- sourceUrl

## Install in Microsoft Edge

1. Open Edge and go to `edge://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project folder.
5. Open a public LinkedIn profile page, then click the extension icon.
6. Press Extract data.

## Notes

- This is intended for personal use and should comply with LinkedIn's terms and your local privacy requirements.
- LinkedIn pages are dynamic, so the extension waits for the page content to be available before extracting the data.
- The `yearsOfExperience` value is estimated using the visible experience timeline when available.

## Fill a company web app form

`target-app.js` is a content script for the destination application. It listens for a
`fillProfile` extension message and fills these text fields by their `name` attribute:

- `firstName`
- `lastName`
- `jobTitle`

The message data should use the same keys, for example:

```js
chrome.tabs.sendMessage(tabId, {
  action: 'fillProfile',
  data: { firstName: 'Ada', lastName: 'Lovelace', jobTitle: 'Engineer' }
});
```

To make the browser load this script, add the destination application's origin to
`manifest.json` under `content_scripts.matches` and add `target-app.js` to that
entry's `js` list. The destination domain is intentionally not configured here;
replace the match with the company's actual URL pattern. The script only fills the
form and reports whether it succeeded; it does not submit the form.

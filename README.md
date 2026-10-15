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
6. Press **Extract data**.

## Save a profile to the company database

1. Open the LinkedIn profile and click **Extract data** in the extension.
2. Open the company web app in a browser tab.
3. Click the extension icon in that tab and press **Save to company database**.

The extension writes to the existing IndexedDB database and object store named
`candidates`. The object store must use `id` as its primary key. Each new record
gets a UUID and contains `firstName`, `lastName`, and `position` (mapped from
LinkedIn's `jobTitle`). The company app must have initialized its database before
the save; the extension will not create or modify the database schema. The
extracted profile is kept in temporary extension storage for the current browser
session so it remains available after switching tabs.

## Package for distribution

Run the following command from the project folder to create a ZIP containing
only the extension files (without development dependencies or tests):

```sh
npm run package
```

The ZIP is created in `dist/` and its filename uses the version in
`manifest.json` (for example, `dist/lkd-scrap-1.1.0.zip`). Share that file with
users. To load it manually, they must extract it and select the extracted folder
from `edge://extensions` > **Load unpacked**. Update the version in
`manifest.json` before preparing a new release.

## Notes

- This is intended for personal use and should comply with LinkedIn's terms and your local privacy requirements.
- LinkedIn pages are dynamic, so the extension waits for the page content to be available before extracting the data.
- The `yearsOfExperience` value is estimated using the visible experience timeline when available.

# ApplyMaxx — waitlist landing page

The coming-soon landing page for [ApplyMaxx](https://applymax.com), a
South-Africa-first job-application automation tool. Collects waitlist
signups into a Google Sheet via a Google Apps Script backend — no
third-party form service, no database.

## Structure

- `index.html`, `styles.css`, `script.js` — the site itself (plain HTML/CSS/
  ES-module JS, no build step, no framework).
- `lib/formLogic.js` — pure signup-form logic (validation, payload shaping,
  response parsing), unit-tested.
- `apps-script/Code.gs` — the Apps Script backend source. This is **not**
  deployed from this repo; it's pasted into the Apps Script editor bound to
  the Google Sheet. Kept here for version history and review.
- `docs/SETUP.md` — non-developer setup instructions for the Apps Script
  backend, how to redeploy after changes, and a manual test checklist.

## Development

```
npm install
npm test        # run unit tests
npm run serve   # serve the static site locally at http://localhost:3000
```

Before the signup form works locally or in production, follow
`docs/SETUP.md` to deploy the Apps Script backend and paste its URL into
`script.js`.

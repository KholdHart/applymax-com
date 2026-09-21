# Setting up the ApplyMaxx waitlist backend

This covers creating the Google Sheet, deploying the Apps Script backend,
and wiring it into the site. No coding experience required beyond
copy-pasting.

## 1. Create the sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new,
   blank spreadsheet.
2. Rename it "ApplyMaxx Waitlist" (click the title in the top-left).
3. Leave the first tab named "Sheet1" (the default) — the script creates
   its header row automatically the first time it runs.

## 2. Add the script

1. In the sheet, go to **Extensions → Apps Script**. This opens the Apps
   Script editor in a new tab, already bound to this sheet.
2. Delete any placeholder code in `Code.gs`.
3. Open `apps-script/Code.gs` from this repo, copy its entire contents, and
   paste into the Apps Script editor.
4. Click the disk icon (or Ctrl/Cmd+S) to save.

## 3. Deploy as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**.
5. The first time, Google will ask you to authorize the script — click
   through the consent screens (you'll see an "unverified app" warning
   since this is your own personal script; click **Advanced → Go to
   (project name) (unsafe)** to proceed — this is expected for
   scripts you wrote yourself).
6. Copy the **Web app URL** it gives you.

## 4. Wire it into the site

1. Open `script.js` in this repo.
2. Replace `REPLACE_WITH_YOUR_APPS_SCRIPT_DEPLOYMENT_URL` with the URL you
   just copied.
3. Commit and redeploy the site (see the main README for hosting).

## Redeploying after you change Code.gs

Apps Script deployment URLs behave differently depending on how you
redeploy — this trips people up, so read carefully:

- **Deploy → New deployment** issues a **brand-new URL**. Your old URL
  keeps working (pointing at the old code) until you delete that
  deployment, but `script.js` won't automatically use the new one — you'd
  have to update it again. **Don't use this for routine changes.**
- **Deploy → Manage deployments → (pencil/edit icon on your existing
  deployment) → Version: New version → Deploy** updates the code behind
  your **existing URL**. This is what you want after editing `Code.gs`: the
  URL already in `script.js` keeps working, now running the new code.

So: first deployment ever → "New deployment". Every deployment after that →
"Manage deployments → edit → new version".

## Manual test checklist

Run through these after every deploy (both first setup and after any code
change):

- [ ] **Normal signup** — fill the form with a real name and a fresh email,
      submit. Confirm: a new row appears in the sheet with `Status =
      Pending`; you receive the "New signup" notification email; the
      signer-upper's address receives the waitlist confirmation email; the
      page shows the correct waitlist position.
- [ ] **Duplicate email** — submit the same email again. Confirm: no new
      row is added; the page shows "you're already on the list" with the
      original position; no new emails are sent.
- [ ] **Empty fields** — submit with the name or email field empty.
      Confirm: the page shows a validation message and no request reaches
      the Apps Script (check the browser Network tab — nothing fires); no
      row is added.
- [ ] **Honeypot triggered** — using the browser dev tools, set a value on
      the hidden `website` field, then submit. Confirm: the page behaves as
      if it succeeded, but no row is added to the sheet and no emails are
      sent.

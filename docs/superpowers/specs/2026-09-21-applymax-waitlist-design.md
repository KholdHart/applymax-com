# ApplyMaxx waitlist landing page — design

Date: 2026-09-21
Status: approved

## Purpose

A coming-soon landing page for ApplyMaxx (a South-Africa-first job-application
automation tool) at `applymax.com`, whose primary job is to collect waitlist
signups ahead of public launch. Positioning mixes two angles: SA-first job
search and automated applying.

## Repo & hosting

- New, separate GitHub repo `applymax-com` (public), independent of the
  private ApplyMaxx monorepo. Git-initialized directly in this folder.
- Static site (no build step) hosted on Vercel or Netlify, with `applymax.com`
  pointed at it via custom domain (exact host TBD at deploy time — both work
  with zero config for a static folder).
- Signup backend is a Google Apps Script web app bound to a Google Sheet — no
  third-party form service, no custom database, per explicit requirement.

## File layout

```
applymax.com/
  index.html
  styles.css
  script.js
  apps-script/
    Code.gs          # Apps Script source, kept in-repo for version history
                      # (actually deployed by pasting into the Apps Script editor)
  docs/
    SETUP.md          # non-developer setup + redeploy + test checklist
  README.md
```

## Page content (single scroll, one page, no nav bar)

Order: **Hero → Feature highlights → How it works → Signup form → Footer.**

1. **Hero** — headline mixing SA-first + automated-applying, e.g. "Your South
   African job search, automated." Subhead names the SA job boards it scans
   and that it applies on your behalf. CTA scrolls to the signup form.
2. **Feature highlights** — grid of 3-4 items: South-Africa-first sources
   (PNet, CareerJunction, Careers24, local Workday boards), AI-matched
   relevance (not a generic firehose), auto-apply on
   Greenhouse/Lever/Ashby-style forms, human-in-the-loop fallback for
   anything it can't safely finish alone (CAPTCHAs etc).
3. **How it works** — 4 steps: tell it what you want → it scans SA job boards
   daily → AI scores each job against your profile → it auto-fills and
   submits the strong matches (with manual review as the honest fallback).
4. **Signup form** — fields: Name, Email, Role (text), "How did you hear
   about us" (select: Friend/colleague, Twitter/X, LinkedIn, Reddit, Search,
   Other), Consent checkbox ("Email me about ApplyMaxx's launch — no spam,
   unsubscribe anytime"), hidden honeypot field (visually hidden via
   off-screen positioning, not `display:none`, so bots that skip
   display:none fields still get caught). States: loading (button spinner
   while submitting), success (waitlist position + generic "share
   ApplyMaxx" link), already-registered, retryable error.
5. **Footer** — copyright line + contact email. No social links (nothing to
   link to yet).

## Signup storage: Google Sheets + Apps Script

**Sheet** "ApplyMaxx Waitlist", columns:
`Timestamp | Name | Email | Role | Heard From | Consent | Waitlist Position | Status`

v1 deliberately excludes `Signup Type`, `UTM Source`, `UTM Campaign`,
`Referral Code`, `Referred By` — single waitlist type, no referral tracking,
per explicit scope decision. These can be added as new columns later without
touching existing rows.

**`doPost(e)` behavior in `Code.gs`:**

1. Reject if the honeypot field is non-empty — return a success-shaped JSON
   so bots don't learn they were caught, but do not append a row or send
   email.
2. Validate `name` and `email` are present and `email` matches a basic email
   pattern; otherwise return `{status: "error", message: "..."}`.
3. Scan the sheet for a matching email (case-insensitive). If found, return
   `{status: "already_registered", position: <their row's position>}` and do
   not add a new row.
4. Otherwise append a row with `Status = "Pending"`; compute `Waitlist
   Position` from the row count.
5. `MailApp.sendEmail` to `jobileecareerservices@gmail.com`: subject `New
   signup: <Name>`, body with all fields plus the total signup count.
6. `MailApp.sendEmail` to the signer-upper: thank-you, their waitlist
   position, what happens next (email at launch / when it's their turn), a
   generic share line.
7. Return `{status: "success", position: N}`.

All thrown errors are caught inside `doPost` and returned as `{status:
"error", message: "..."}` JSON — never Apps Script's default HTML error page
— so the frontend can always parse the response as JSON.

**Frontend → backend call:**

```js
fetch(APPS_SCRIPT_URL, {
  method: 'POST',
  body: new URLSearchParams({ name, email, role, heardFrom, consent, website /* honeypot */ }),
  headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight
})
```

`text/plain` content-type is used specifically to dodge the CORS preflight,
since Apps Script's web app endpoint doesn't answer `OPTIONS` requests.

## Error handling

- Network failure or non-2xx from `fetch`: show a "Something went wrong, try
  again" state with a retry button; form data is preserved.
- `status: "error"` from the script: same retryable error state, using the
  script's message where safe to show.
- `status: "already_registered"`: friendly "you're already on the list at
  position N" state, not treated as an error.

## Testing (manual checklist, documented in `docs/SETUP.md`)

- Normal signup → row appears in the sheet, both notification and
  confirmation emails arrive, position increments correctly.
- Same email submitted again → `already_registered` response, no duplicate
  row.
- Missing name or email → validation error, no row added.
- Honeypot field filled → silent success response to the client, but no row
  and no emails sent.
- Frontend: loading state visible during submit; success/already-registered/
  error states all render correctly; page usable at mobile width.

## Deployment

- **Static site**: push repo to GitHub, connect to Vercel or Netlify, point
  `applymax.com` DNS at the chosen host.
- **Apps Script**: not deployed from the repo/CI — pasted manually into the
  Apps Script editor bound to the Sheet, per the explicit requirement that
  this uses Google Apps Script directly. The in-repo copy under
  `apps-script/Code.gs` is for version history and review only.
- `docs/SETUP.md` walks through, for a non-developer: create the sheet, open
  Apps Script, paste the code, deploy as a web app (Execute as: me, Access:
  Anyone), copy the deployment URL into `script.js`, and — importantly — how
  redeploying works (Apps Script's "New deployment" issues a new URL while
  the old one stays live; "Manage deployments → Edit → Deploy" updates the
  existing URL in place, which is what should be used after code changes so
  the frontend URL doesn't silently break).

## Explicitly out of scope for v1

- Referral code generation/tracking.
- UTM source/campaign capture.
- "Early tester" vs "launch waitlist" signup distinction.
- Any server or database beyond the Apps Script + Sheet.
- Multi-page site / nav bar — this is a single scrolling page.

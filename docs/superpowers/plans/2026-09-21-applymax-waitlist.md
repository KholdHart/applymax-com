# ApplyMaxx Waitlist Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship a single-page waitlist landing site for ApplyMaxx at `applymax.com`, with signups stored in a Google Sheet via a Google Apps Script backend — no third-party form service, no custom database.

**Architecture:** A plain HTML/CSS/ES-module-JS static site (no bundler in the deploy path) calls a Google Apps Script web app directly via `fetch`. The Apps Script appends rows to a bound Google Sheet and sends two emails per signup (owner notification + signer-upper confirmation). Pure signup-form logic (validation, payload shaping, response parsing) is factored into a small module that's unit-tested with Vitest as a dev-only dependency.

**Tech Stack:** Vanilla HTML/CSS/JavaScript (ES modules, no framework, no bundler), Vitest (dev-only, for unit tests), Google Apps Script + Google Sheets (signup storage + email), hosting on Vercel or Netlify (TBD at deploy time, both work with zero config for a static folder).

**Spec:** `docs/superpowers/specs/2026-09-21-applymax-waitlist-design.md`

## Global Constraints

- No third-party form service, no custom database — signups go through Google Apps Script into a Google Sheet only.
- Production site ships as plain, unbundled HTML/CSS/ES-module JS — no bundler in the deploy path. Vitest is a dev-only dependency for testing pure logic; it never ships.
- Single scrolling page, no nav bar. Section order: **Hero → Feature highlights → How it works → Signup form → Footer.**
- Honeypot field must be hidden via off-screen CSS positioning, not `display:none`.
- `fetch` to the Apps Script backend uses `Content-Type: text/plain;charset=utf-8` to avoid a CORS preflight (Apps Script web apps don't answer `OPTIONS`).
- Owner notification email address: `jobileecareerservices@gmail.com`.
- Sheet name: "ApplyMaxx Waitlist"; columns: `Timestamp | Name | Email | Role | Heard From | Consent | Waitlist Position | Status`.
- v1 explicitly excludes: referral code generation/tracking, UTM capture, a Launch-vs-Early-Tester signup type distinction.
- Repo: new public GitHub repo `applymax-com`, separate from the private ApplyMaxx monorepo.

---

### Task 1: Repo scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: `npm test` (runs Vitest), `npm run serve` (serves the static site locally for manual QA) — both later tasks and manual verification rely on these scripts existing.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "applymax-com",
  "private": true,
  "version": "1.0.0",
  "description": "Waitlist landing page for ApplyMaxx",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "serve": "npx serve ."
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
.DS_Store
```

- [ ] **Step 3: Write `README.md`**

```markdown
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
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore README.md
git commit -m "chore: scaffold repo with npm test/serve scripts"
```

---

### Task 2: Pure signup-form logic, unit-tested

**Files:**
- Create: `lib/formLogic.js`
- Test: `lib/formLogic.test.js`

**Interfaces:**
- Produces: `isValidEmailFormat(email: string): boolean`, `buildSignupPayload({name, email, role, heardFrom, consent, honeypot}): {name, email, role, heardFrom, consent: 'yes'|'no', website}`, `validateSignupPayload(payload): {valid: boolean, message?: string}`, `parseSignupResponse(json): {kind: 'success'|'already_registered'|'error', position?: number, message?: string}`. Task 5 (`script.js`) imports and uses all four.

- [ ] **Step 1: Write the failing tests**

Create `lib/formLogic.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  isValidEmailFormat,
  buildSignupPayload,
  validateSignupPayload,
  parseSignupResponse,
} from './formLogic.js';

describe('isValidEmailFormat', () => {
  it('accepts a normal email', () => {
    expect(isValidEmailFormat('jane@example.com')).toBe(true);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmailFormat('janeexample.com')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmailFormat('')).toBe(false);
  });
});

describe('buildSignupPayload', () => {
  it('trims whitespace from text fields', () => {
    const payload = buildSignupPayload({
      name: '  Jane  ',
      email: ' jane@example.com ',
      role: ' Dev ',
      heardFrom: 'reddit',
      consent: true,
      honeypot: '',
    });
    expect(payload).toEqual({
      name: 'Jane',
      email: 'jane@example.com',
      role: 'Dev',
      heardFrom: 'reddit',
      consent: 'yes',
      website: '',
    });
  });

  it('maps unchecked consent to "no"', () => {
    const payload = buildSignupPayload({
      name: 'Jane',
      email: 'jane@example.com',
      role: '',
      heardFrom: '',
      consent: false,
      honeypot: '',
    });
    expect(payload.consent).toBe('no');
  });
});

describe('validateSignupPayload', () => {
  it('rejects a missing name', () => {
    const result = validateSignupPayload({ name: '', email: 'jane@example.com', consent: 'yes' });
    expect(result.valid).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = validateSignupPayload({ name: 'Jane', email: 'not-an-email', consent: 'yes' });
    expect(result.valid).toBe(false);
  });

  it('rejects missing consent', () => {
    const result = validateSignupPayload({ name: 'Jane', email: 'jane@example.com', consent: 'no' });
    expect(result.valid).toBe(false);
  });

  it('accepts a fully valid payload', () => {
    const result = validateSignupPayload({ name: 'Jane', email: 'jane@example.com', consent: 'yes' });
    expect(result.valid).toBe(true);
  });
});

describe('parseSignupResponse', () => {
  it('parses a success response', () => {
    expect(parseSignupResponse({ status: 'success', position: 42 })).toEqual({ kind: 'success', position: 42 });
  });

  it('parses an already_registered response', () => {
    expect(parseSignupResponse({ status: 'already_registered', position: 7 })).toEqual({
      kind: 'already_registered',
      position: 7,
    });
  });

  it('parses an error response with a message', () => {
    expect(parseSignupResponse({ status: 'error', message: 'Invalid email' })).toEqual({
      kind: 'error',
      message: 'Invalid email',
    });
  });

  it('falls back to a generic error on garbage input', () => {
    expect(parseSignupResponse(null).kind).toBe('error');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/formLogic.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `lib/formLogic.js`:

```js
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email) {
  return typeof email === 'string' && EMAIL_PATTERN.test(email.trim());
}

export function buildSignupPayload({ name, email, role, heardFrom, consent, honeypot }) {
  return {
    name: (name || '').trim(),
    email: (email || '').trim(),
    role: (role || '').trim(),
    heardFrom: heardFrom || '',
    consent: consent ? 'yes' : 'no',
    // "website" is the honeypot field name the backend checks for bot fills.
    website: honeypot || '',
  };
}

export function validateSignupPayload(payload) {
  if (!payload.name) {
    return { valid: false, message: 'Please enter your name.' };
  }
  if (!isValidEmailFormat(payload.email)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }
  if (payload.consent !== 'yes') {
    return { valid: false, message: "Please agree to be emailed about the launch." };
  }
  return { valid: true };
}

export function parseSignupResponse(json) {
  if (!json || typeof json !== 'object') {
    return { kind: 'error', message: 'Unexpected response from the server.' };
  }
  if (json.status === 'success') {
    return { kind: 'success', position: json.position };
  }
  if (json.status === 'already_registered') {
    return { kind: 'already_registered', position: json.position };
  }
  return { kind: 'error', message: json.message || 'Something went wrong. Please try again.' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/formLogic.js lib/formLogic.test.js
git commit -m "feat: add pure signup-form logic with unit tests"
```

---

### Task 3: Landing page HTML structure

**Files:**
- Create: `index.html`

**Interfaces:**
- Produces: DOM element IDs `signup-form`, `submit-button`, `form-status`, and form field names `name`, `email`, `role`, `heardFrom`, `consent`, `website` (honeypot) — Task 5 (`script.js`) queries these exact IDs/names.
- Consumes: `styles.css` (Task 4), `script.js` (Task 5) — both referenced by path but not required to exist yet for this task's manual check.

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ApplyMaxx — Your South African job search, automated</title>
  <meta name="description" content="ApplyMaxx scans South African job boards daily, scores every posting against your profile, and applies for you. Join the waitlist." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main>
    <section class="hero">
      <div class="container">
        <h1>Your South African job search, automated.</h1>
        <p class="hero-sub">
          ApplyMaxx scans PNet, CareerJunction, Careers24 and local Workday boards every day,
          scores each posting against your profile, and applies for you — so you spend less time
          searching and more time interviewing.
        </p>
        <a href="#signup" class="button button-primary">Join the waitlist</a>
      </div>
    </section>

    <section class="features">
      <div class="container">
        <h2>Built for the South African job market</h2>
        <div class="feature-grid">
          <article class="feature-card">
            <h3>South-Africa-first sources</h3>
            <p>PNet, CareerJunction, Careers24 and local Workday boards — not a global firehose with fifteen SA jobs buried in twenty thousand.</p>
          </article>
          <article class="feature-card">
            <h3>AI-matched relevance</h3>
            <p>Every posting is scored against your actual profile, so you see the roles worth your time, not everything with a matching keyword.</p>
          </article>
          <article class="feature-card">
            <h3>Auto-apply, done properly</h3>
            <p>Fills and submits applications on Greenhouse, Lever and Ashby-style forms — the tedious part, handled.</p>
          </article>
          <article class="feature-card">
            <h3>Human-in-the-loop fallback</h3>
            <p>CAPTCHAs and anything else it can't safely finish alone gets handed back to you, not silently dropped.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="how-it-works">
      <div class="container">
        <h2>How it works</h2>
        <ol class="steps">
          <li>
            <span class="step-number">1</span>
            <h3>Tell it what you want</h3>
            <p>Target roles, seniority, and where you're willing to work.</p>
          </li>
          <li>
            <span class="step-number">2</span>
            <h3>It scans SA job boards daily</h3>
            <p>New postings get pulled in automatically, every day.</p>
          </li>
          <li>
            <span class="step-number">3</span>
            <h3>AI scores each match</h3>
            <p>Every posting is ranked against your profile before anything happens.</p>
          </li>
          <li>
            <span class="step-number">4</span>
            <h3>It applies for the strong matches</h3>
            <p>Forms get filled and submitted — anything it can't finish safely comes back to you.</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="signup" id="signup">
      <div class="container">
        <h2>Join the waitlist</h2>
        <p class="signup-sub">Be first to know when ApplyMaxx launches.</p>

        <form id="signup-form" novalidate>
          <div class="form-row">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" autocomplete="name" required />
          </div>

          <div class="form-row">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" autocomplete="email" required />
          </div>

          <div class="form-row">
            <label for="role">What role are you looking for?</label>
            <input type="text" id="role" name="role" placeholder="e.g. RPA Developer" />
          </div>

          <div class="form-row">
            <label for="heard-from">How did you hear about us?</label>
            <select id="heard-from" name="heardFrom">
              <option value="">Select one</option>
              <option value="friend">Friend / colleague</option>
              <option value="twitter">Twitter / X</option>
              <option value="linkedin">LinkedIn</option>
              <option value="reddit">Reddit</option>
              <option value="search">Search</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="form-row form-row-checkbox">
            <input type="checkbox" id="consent" name="consent" required />
            <label for="consent">Email me about ApplyMaxx's launch — no spam, unsubscribe anytime.</label>
          </div>

          <!-- Honeypot: hidden from real users via off-screen positioning (not
               display:none), so bots that skip display:none fields still get caught. -->
          <div class="form-row honeypot" aria-hidden="true">
            <label for="website">Leave this field empty</label>
            <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
          </div>

          <button type="submit" class="button button-primary" id="submit-button">
            <span class="button-label">Join the waitlist</span>
          </button>

          <p class="form-status" id="form-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; 2026 ApplyMaxx. <a href="mailto:jobileecareerservices@gmail.com">jobileecareerservices@gmail.com</a></p>
    </div>
  </footer>

  <script type="module" src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the markup is valid**

Run: `npx serve .` and open `http://localhost:3000` in a browser.
Expected: the page renders unstyled but structurally complete — all four sections present in order (hero, features, how-it-works, signup, footer); no console errors about `script.js` beyond it being empty/missing (Task 5 creates it).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add landing page HTML structure and copy"
```

---

### Task 4: Visual design (CSS)

**Files:**
- Create: `styles.css`

**Interfaces:**
- Consumes: the class names and element structure from `index.html` (Task 3) — `.hero`, `.features`, `.feature-grid`, `.feature-card`, `.how-it-works`, `.steps`, `.step-number`, `.signup`, `#signup-form`, `.form-row`, `.form-row-checkbox`, `.honeypot`, `.button`, `.button-primary`, `.form-status`, `.site-footer`.

- [ ] **Step 1: Load the frontend-design skill for visual direction**

Before writing CSS, invoke the `frontend-design` skill to guide color, type, and layout choices so the result reads as an intentional design rather than generic defaults — a dark, warm-accented palette (charcoal background, amber accent) paired with a distinct display font (Sora) for headings against a clean body font (Inter), per the direction below.

- [ ] **Step 2: Write `styles.css`**

```css
:root {
  --color-bg: #0f1115;
  --color-bg-alt: #171a21;
  --color-surface: #1c2029;
  --color-border: #2a2f3a;
  --color-text: #eef0f4;
  --color-text-muted: #9aa1ae;
  --color-accent: #f5a623;
  --color-accent-dark: #cc861a;
  --color-success: #4cc38a;
  --color-error: #e2574c;
  --font-heading: 'Sora', sans-serif;
  --font-body: 'Inter', sans-serif;
  --radius: 10px;
  --max-width: 1080px;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--font-heading);
  line-height: 1.15;
  margin: 0 0 0.5em;
}

p { margin: 0 0 1em; color: var(--color-text-muted); }

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 24px;
}

section { padding: 88px 0; }

.hero {
  padding-top: 120px;
  padding-bottom: 96px;
  background:
    radial-gradient(circle at 20% 20%, rgba(245, 166, 35, 0.12), transparent 45%),
    var(--color-bg);
  text-align: center;
}

.hero h1 {
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  color: var(--color-text);
  max-width: 780px;
  margin-left: auto;
  margin-right: auto;
}

.hero-sub {
  max-width: 620px;
  margin: 0 auto 32px;
  font-size: 1.1rem;
}

.button {
  display: inline-block;
  padding: 14px 28px;
  border-radius: var(--radius);
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.button-primary {
  background: var(--color-accent);
  color: #1a1300;
}

.button-primary:hover { background: var(--color-accent-dark); transform: translateY(-1px); }

.button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.features { background: var(--color-bg-alt); }

.features h2, .how-it-works h2, .signup h2 {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  text-align: center;
  margin-bottom: 48px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 24px;
}

.feature-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 28px;
}

.feature-card h3 { font-size: 1.1rem; color: var(--color-text); }
.feature-card p { margin: 0; }

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 32px;
}

.steps li { position: relative; padding-left: 4px; }

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #1a1300;
  font-family: var(--font-heading);
  font-weight: 700;
  margin-bottom: 16px;
}

.steps h3 { font-size: 1.05rem; color: var(--color-text); }
.steps p { margin: 0; }

.signup { background: var(--color-bg-alt); }

.signup-sub { text-align: center; margin-bottom: 40px; }

#signup-form {
  max-width: 480px;
  margin: 0 auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 32px;
}

.form-row { margin-bottom: 20px; }

.form-row label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: var(--color-text);
}

.form-row input[type="text"],
.form-row input[type="email"],
.form-row select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 1rem;
}

.form-row input:focus,
.form-row select:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.form-row-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.form-row-checkbox label { margin-bottom: 0; font-size: 0.85rem; color: var(--color-text-muted); }

.honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

#signup-form .button { width: 100%; }

.form-status {
  margin: 16px 0 0;
  font-size: 0.9rem;
  min-height: 1.2em;
}

.form-status.is-success { color: var(--color-success); }
.form-status.is-error { color: var(--color-error); }

.site-footer {
  padding: 32px 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.site-footer a { color: var(--color-text-muted); }

@media (max-width: 640px) {
  section { padding: 56px 0; }
  .hero { padding-top: 80px; }
}
```

- [ ] **Step 3: Verify visually in a browser**

Run: `npx serve .` and open `http://localhost:3000`.
Expected: styled hero with headline + amber CTA button, a 4-card feature grid, a 4-step how-it-works row, a boxed signup form, and a footer. Resize to ~375px width and confirm the feature grid and steps collapse to a single column with no horizontal scroll, and the honeypot field is invisible but the real fields are all visible and usable.

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "feat: add visual design for the landing page"
```

---

### Task 5: Frontend wiring (script.js)

**Files:**
- Create: `script.js`

**Interfaces:**
- Consumes: `isValidEmailFormat`, `buildSignupPayload`, `validateSignupPayload`, `parseSignupResponse` from `lib/formLogic.js` (Task 2); DOM IDs/names from `index.html` (Task 3).
- Produces: a working `#signup-form` submit handler — Task 8's manual verification exercises this directly.

- [ ] **Step 1: Write `script.js`**

```js
import { buildSignupPayload, validateSignupPayload, parseSignupResponse } from './lib/formLogic.js';

// Replace with the deployment URL from docs/SETUP.md after deploying the
// Apps Script backend.
const APPS_SCRIPT_URL = 'REPLACE_WITH_YOUR_APPS_SCRIPT_DEPLOYMENT_URL';

const form = document.getElementById('signup-form');
const submitButton = document.getElementById('submit-button');
const statusEl = document.getElementById('form-status');

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.classList.remove('is-success', 'is-error');
  if (kind) statusEl.classList.add(kind === 'success' ? 'is-success' : 'is-error');
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.querySelector('.button-label').textContent = isLoading ? 'Joining…' : 'Join the waitlist';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = buildSignupPayload({
    name: form.name.value,
    email: form.email.value,
    role: form.role.value,
    heardFrom: form.heardFrom.value,
    consent: form.consent.checked,
    honeypot: form.website.value,
  });

  const validation = validateSignupPayload(payload);
  if (!validation.valid) {
    setStatus(validation.message, 'error');
    return;
  }

  setStatus('', null);
  setLoading(true);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: new URLSearchParams(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    const json = await response.json();
    const result = parseSignupResponse(json);

    if (result.kind === 'success') {
      setStatus(
        `You're #${result.position} on the waitlist. Share ApplyMaxx with a friend to help others hear about it too.`,
        'success'
      );
      form.reset();
    } else if (result.kind === 'already_registered') {
      setStatus(`You're already on the list, at position #${result.position}.`, 'success');
    } else {
      setStatus(result.message, 'error');
    }
  } catch (error) {
    setStatus('Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});
```

- [ ] **Step 2: Verify in a browser with the placeholder URL**

Run: `npx serve .`, open `http://localhost:3000`, fill the form with a valid name/email, check consent, submit.
Expected: button shows "Joining…" then the fetch fails (placeholder URL isn't a real endpoint) and the status area shows "Something went wrong. Please try again." in red — this confirms the loading/error path wires up correctly. Also verify: submitting with no name, or an invalid email, or consent unchecked shows the matching validation message and never calls fetch (check the Network tab — no request fires).

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: wire signup form to Apps Script backend"
```

---

### Task 6: Google Apps Script backend

**Files:**
- Create: `apps-script/Code.gs`

**Interfaces:**
- Produces: a `doPost(e)` entry point returning JSON shaped `{status: 'success'|'already_registered'|'error', position?, message?}` — matches what `parseSignupResponse` (Task 2) expects.
- Consumes: form field names `name`, `email`, `role`, `heardFrom`, `consent`, `website` (honeypot) — matches `buildSignupPayload`'s output (Task 2).

- [ ] **Step 1: Write `apps-script/Code.gs`**

```javascript
// ApplyMaxx Waitlist — Apps Script backend
//
// Bound to the "ApplyMaxx Waitlist" Google Sheet. Deployed as a web app
// (Execute as: me, Access: Anyone). This file is not deployed from the repo
// or CI — it's pasted into the Apps Script editor. See docs/SETUP.md for
// setup and redeploy instructions.

const SHEET_NAME = 'Sheet1'; // rename here if you rename the sheet's tab
const NOTIFY_EMAIL = 'jobileecareerservices@gmail.com';
const COLUMNS = ['Timestamp', 'Name', 'Email', 'Role', 'Heard From', 'Consent', 'Waitlist Position', 'Status'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  try {
    const params = e.parameter;

    // Honeypot: bots that fill hidden fields get a success-shaped response
    // so they don't learn they were caught, but nothing is recorded.
    if (params.website) {
      return jsonResponse({ status: 'success', position: 0 });
    }

    const name = (params.name || '').trim();
    const email = (params.email || '').trim();

    if (!name) {
      return jsonResponse({ status: 'error', message: 'Name is required.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return jsonResponse({ status: 'error', message: 'A valid email is required.' });
    }

    const sheet = getSheet();
    const existingRow = findRowByEmail(sheet, email);
    if (existingRow) {
      return jsonResponse({ status: 'already_registered', position: existingRow.position });
    }

    const existingDataRows = sheet.getLastRow() - 1; // header is row 1
    const newPosition = existingDataRows + 1;

    sheet.appendRow([
      new Date(),
      name,
      email,
      params.role || '',
      params.heardFrom || '',
      params.consent === 'yes' ? 'yes' : 'no',
      newPosition,
      'Pending',
    ]);

    notifyOwner(name, email, params.role, params.heardFrom, newPosition);
    notifySignup(name, email, newPosition);

    return jsonResponse({ status: 'success', position: newPosition });
  } catch (error) {
    return jsonResponse({ status: 'error', message: 'Server error. Please try again.' });
  }
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
  }
  return sheet;
}

function findRowByEmail(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null; // header only, no data rows yet

  const emailColumn = 3; // Email is column C
  const positionColumn = 7; // Waitlist Position is column G
  const values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][emailColumn - 1]).toLowerCase() === email.toLowerCase()) {
      return { rowIndex: i + 2, position: values[i][positionColumn - 1] };
    }
  }
  return null;
}

function notifyOwner(name, email, role, heardFrom, position) {
  const sheet = getSheet();
  const totalSignups = sheet.getLastRow() - 1;
  const body = [
    'New ApplyMaxx waitlist signup:',
    '',
    'Name: ' + name,
    'Email: ' + email,
    'Role: ' + (role || '(not given)'),
    'Heard from: ' + (heardFrom || '(not given)'),
    'Waitlist position: ' + position,
    'Total signups: ' + totalSignups,
  ].join('\n');

  MailApp.sendEmail(NOTIFY_EMAIL, 'New signup: ' + name, body);
}

function notifySignup(name, email, position) {
  const body = [
    'Hi ' + name + ',',
    '',
    "Thanks for joining the ApplyMaxx waitlist — you're #" + position + ' in line.',
    '',
    "We'll email you as soon as it's your turn / when we launch.",
    '',
    'Know someone else job-hunting in South Africa? Send them our way: https://applymax.com',
    '',
    '— ApplyMaxx',
  ].join('\n');

  MailApp.sendEmail(email, "You're on the ApplyMaxx waitlist", body);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps-script/Code.gs
git commit -m "feat: add Apps Script waitlist backend"
```

(This file cannot be automatically tested outside the Apps Script runtime — Task 7's setup doc includes the manual test checklist from the spec, and Task 8 covers what can be verified without a live Google deployment.)

---

### Task 7: Setup and redeploy documentation

**Files:**
- Create: `docs/SETUP.md`

- [ ] **Step 1: Write `docs/SETUP.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/SETUP.md
git commit -m "docs: add Apps Script setup, redeploy, and test checklist"
```

---

### Task 8: Manual end-to-end verification in a browser

**Files:** none (verification only).

- [ ] **Step 1: Serve the site locally**

Run: `npm run serve` and open the printed local URL in a browser.

- [ ] **Step 2: Verify layout and copy**

Confirm section order top-to-bottom is Hero → Feature highlights → How it works → Signup form → Footer, matching the spec. Confirm no nav bar is present. Check at both a desktop width (~1280px) and a mobile width (~375px) that there's no horizontal scroll and all text is legible.

- [ ] **Step 3: Verify client-side validation paths**

In the signup form: submit empty → see "Please enter your name." Fill name, leave email empty → see the email message. Fill name + invalid email ("abc") → see the email message. Fill name + valid email, leave consent unchecked → see the consent message. Confirm no network request fires for any of these (Network tab stays empty of POSTs).

- [ ] **Step 4: Verify the loading/error path against the placeholder URL**

Fill the form fully and correctly, submit. Confirm the button shows "Joining…" and becomes disabled during the request, then shows the red "Something went wrong. Please try again." message once the placeholder URL fails, and the button re-enables.

- [ ] **Step 5: Simulate success and already-registered responses**

Using the browser's console, temporarily override `window.fetch` to return canned responses matching the Apps Script's JSON shape, then submit the form again for each case:

```js
window.fetch = async () => ({ json: async () => ({ status: 'success', position: 12 }) });
```
Confirm: green message "You're #12 on the waitlist..." appears and the form resets.

```js
window.fetch = async () => ({ json: async () => ({ status: 'already_registered', position: 3 }) });
```
Confirm: green message "You're already on the list, at position #3." appears.

Reload the page afterward to restore the real `fetch`.

- [ ] **Step 6: Note the follow-up manual step**

Record (in your own notes, not the repo) that the true end-to-end check — a real signup hitting a real deployed Apps Script and arriving in the real Sheet and inbox — requires completing `docs/SETUP.md` with a live Google account, which is a manual step for the site owner to do once hosting/deployment is sorted.

---

## Self-review notes

- **Spec coverage:** hero/features/how-it-works/signup/footer sections (✓ Task 3), section order Hero→Features→How it works→Signup→Footer as corrected in review (✓ Task 3), honeypot off-screen not display:none (✓ Tasks 3–4), text/plain fetch to dodge CORS preflight (✓ Task 5), sheet columns and name (✓ Task 6), duplicate-email handling (✓ Task 6), owner + signer-upper emails (✓ Task 6), error JSON never HTML (✓ Task 6, try/catch wraps doPost), SETUP.md with non-dev steps + redeploy explanation + test checklist (✓ Task 7), manual QA (✓ Task 8). v1 exclusions (referral tracking, UTM, signup-type toggle) are simply absent from every task — confirmed no task references them.
- **Placeholder scan:** no TBD/TODO markers remain; `REPLACE_WITH_YOUR_APPS_SCRIPT_DEPLOYMENT_URL` in `script.js` is an intentional, documented placeholder the site owner fills in per `docs/SETUP.md`, not an unfinished plan step.
- **Type/name consistency:** `formLogic.js`'s `buildSignupPayload` output keys (`name, email, role, heardFrom, consent, website`) match `index.html`'s form field `name` attributes (Task 3) and `Code.gs`'s `params.*` reads (Task 6) exactly. `parseSignupResponse`'s `kind` values (`success`, `already_registered`, `error`) match `Code.gs`'s `status` values exactly.

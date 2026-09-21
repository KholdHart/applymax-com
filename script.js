import { buildSignupPayload, validateSignupPayload, parseSignupResponse } from './lib/formLogic.js';

// Replace with the deployment URL from docs/SETUP.md after deploying the
// Apps Script backend.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyY2tW4CEicwZMfbKenze6yKtWrmHCIh3ZvqHzKNsvDuh818ABalJRskCPeYBBHbmhG/exec';

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

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  // .feature-card is excluded: its nth-child zig-zag offset (styles.css) also
  // sets `transform`, and that rule's higher specificity would silently
  // override .reveal's hidden-state transform instead of combining with it.
  const revealTargets = document.querySelectorAll(
    '.hero .eyebrow, .hero h1, .hero-tagline, .hero-sub, .hero .button, .steps li, #signup-form'
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  revealTargets.forEach((el, index) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
    observer.observe(el);
  });
}

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

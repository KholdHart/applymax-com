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

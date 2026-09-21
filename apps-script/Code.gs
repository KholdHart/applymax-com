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

    try {
      notifyOwner(name, email, params.role, params.heardFrom, newPosition);
      notifySignup(name, email, newPosition);
    } catch (mailError) {
      // The row is already written — a failed notification shouldn't make
      // the signup look like it failed. Log for manual follow-up instead.
      Logger.log('Failed to send waitlist emails for ' + email + ': ' + mailError);
    }

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

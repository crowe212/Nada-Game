/**
 * Shared leaderboard for Coast to Coast, backed by a Google Sheet you own.
 *
 * Setup (about 5 minutes):
 *  1. Create a new Google Sheet. Extensions > Apps Script. Replace the code with this file.
 *  2. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone.
 *  3. Copy the web app URL (ends in /exec) into LEADERBOARD_URL at the top of www/game.js.
 * Scores land in a "Scores" tab (delete a row to remove a score) and tester feedback in a "Feedback" tab.
 */
const TAB = 'Scores';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TAB);
  if (!sh) { sh = ss.insertSheet(TAB); sh.appendRow(['When', 'Id', 'Name', 'Role', 'Score', 'States']); }
  return sh;
}

function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const top = rows
    .map((r) => ({ id: r[1], name: String(r[2]), role: String(r[3]), score: Number(r[4]), states: Number(r[5]) }))
    .filter((r) => r.name && r.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
  return ContentService.createTextOutput(JSON.stringify(top)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let ok = false;
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.type === 'feedback') { // tester feedback goes to its own tab
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const fb = ss.getSheetByName('Feedback') || ss.insertSheet('Feedback');
      if (fb.getLastRow() === 0) fb.appendRow(['When', 'Name', 'Role', 'Last run', 'Feedback']);
      fb.appendRow([new Date(), String(d.name || '').slice(0, 40), String(d.role || '').slice(0, 16), String(d.lastRun || '').slice(0, 40), String(d.text || '').slice(0, 1000)]);
      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }
    const name = String(d.name || '').toUpperCase().replace(/[^A-Z0-9 ._-]/g, '').slice(0, 14).trim();
    const role = String(d.role || '').replace(/[^A-Za-z ]/g, '').slice(0, 16);
    const score = Math.round(Number(d.score)), states = Math.round(Number(d.states));
    if (name && score >= 0 && score <= 500000 && states >= 1 && states <= 50) {
      const lock = LockService.getScriptLock(); lock.waitLock(5000);
      sheet_().appendRow([new Date(), Number(d.id) || Date.now(), name, role, score, states]);
      lock.releaseLock();
      ok = true;
    }
  } catch (err) { ok = false; }
  return ContentService.createTextOutput(JSON.stringify({ ok })).setMimeType(ContentService.MimeType.JSON);
}

// hub/Code.gs 를 가짜 구글 시트 위에서 돌려 보는 시험 장치. 실행: node test/hub_harness.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function makeSheet(name) {
  const sh = {name, cells: [], maxRows: 1000, maxCols: 26, rules: []};
  const range = (r, c, nr, nc) => ({
    setValues(v) { v.forEach((row, i) => row.forEach((val, j) => { (sh.cells[r - 1 + i] = sh.cells[r - 1 + i] || [])[c - 1 + j] = val; })); return this; },
    getDisplayValues() { return Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => { const v = (sh.cells[r - 1 + i] || [])[c - 1 + j]; return v === undefined ? '' : String(v).replace(/^'/, ''); })); },
    setNumberFormats() { return this; }, setBackground() { return this; }, setFontColor() { return this; }, setFontWeight() { return this; }
  });
  return {
    getName: () => name,
    getLastRow: () => sh.cells.reduce((m, row, i) => (row && row.some(v => v !== undefined && v !== '') ? i + 1 : m), 0),
    getMaxRows: () => sh.maxRows, getMaxColumns: () => sh.maxCols,
    insertRowsAfter: (_, n) => { sh.maxRows += n; }, insertColumnsAfter: (_, n) => { sh.maxCols += n; },
    getRange: range, setFrozenRows() {}, setColumnWidth() {},
    getLastColumn: () => sh.cells.reduce((m, row) => Math.max(m, row ? row.length : 0), 0),
    deleteRows: (start, n) => { sh.cells.splice(start - 1, n); },
    getConditionalFormatRules: () => sh.rules, setConditionalFormatRules: r => { sh.rules = r; },
    _cells: sh.cells
  };
}
const sheets = {};
const book = {
  getId: () => 'BOOK1',
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = makeSheet(n))
};
const props = {};
const mails = [];
const who = {active: 'teacher@school'};
const ruleBuilder = () => { const b = {whenFormulaSatisfied: () => b, setBackground: () => b, setRanges: () => b, build: () => ({getBooleanCondition: () => null})}; return b; };
const ctx = {
  console: {log() {}, warn() {}, error: (...a) => console.error('[hub error]', ...a)},
  SpreadsheetApp: {getActiveSpreadsheet: () => book, openById: () => book, flush() {}, newConditionalFormatRule: ruleBuilder, BooleanCriteria: {CUSTOM_FORMULA: 'CF'}},
  LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock() {}})},
  PropertiesService: {getScriptProperties: () => ({getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }})},
  Utilities: {formatDate: () => '2026-11-10 10:00:00', getUuid: () => '1234abcd-1234-abcd-1234-abcd1234abcd'},
  Session: {getScriptTimeZone: () => 'Asia/Seoul', getActiveUser: () => ({getEmail: () => who.active}), getEffectiveUser: () => ({getEmail: () => 'teacher@school'})},
  MailApp: {sendEmail: m => mails.push(m)},
  ContentService: {createTextOutput: t => ({t, setMimeType() { return JSON.parse(t); }}), MimeType: {JSON: 'json'}},
  HtmlService: {createHtmlOutput: h => { const o = {h, setTitle: () => o, addMetaTag: () => o, setXFrameOptionsMode: () => o}; return o; }, XFrameOptionsMode: {ALLOWALL: 1}},
  ScriptApp: {getService: () => ({getUrl: () => 'https://script.google.com/macros/s/X/exec'})}
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'hub', 'Code.gs'), 'utf8'), ctx);
const run = src => vm.runInContext(src, ctx);

run('setup()');
assert(sheets['기록'] && sheets['제출'] && sheets['현황'], 'sheets created');
assert(props.HUB_TEACHER_KEY && props.HUB_TEACHER_KEY.length >= 24, 'teacher key');
const key = props.HUB_TEACHER_KEY;
run('setup()'); // 다시 실행해도 키 유지
assert.strictEqual(props.HUB_TEACHER_KEY, key);

const post = obj => run('doPost')({postData: {contents: JSON.stringify(obj)}});
const base = {v: 1, ws: 'gugak-instruments', title: '국악기 학습지', sid: 's1', num: '010712', name: '홍길동', t: new Date().toISOString(), away: 0};
assert.deepStrictEqual(post({...base, type: 'start'}), {ok: true});
assert.deepStrictEqual(post({...base, type: 'away', away: 1, data: {reason: 'hidden'}}), {ok: true});
assert.deepStrictEqual(post({...base, type: 'back', away: 1, data: {seconds: 12}}), {ok: true});
assert.deepStrictEqual(post({...base, type: 'submit', away: 1, data: {score: 9, total: 13, minutes: 20, attempt: 1, wrong: ['복습 3', '=SUM(A1)'], answers: {'메모 소금': '+맑은 소리'}}}), {ok: true});
// 다른 학습지, 같은 학생
assert.deepStrictEqual(post({...base, ws: 'dance-1', title: '춤 학습지', type: 'start'}), {ok: true});
// 거절되어야 하는 요청
for (const bad of [
  {...base, type: 'start', ws: 'Bad WS'},
  {...base, type: 'hack'},
  {...base, type: 'away', data: {reason: 'x'}},
  {...base, type: 'submit', data: {score: 14, total: 13, minutes: 1, attempt: 1, wrong: [], answers: {}}},
  {...base, type: 'start', num: '   '}
]) assert.strictEqual(post(bad).ok, false, 'should reject ' + JSON.stringify(bad).slice(0, 80));
assert.strictEqual(run('doPost')({postData: {contents: 'not json'}}).ok, false);

const status = sheets['현황'].getRange(2, 1, 2, 8).getDisplayValues();
assert.deepStrictEqual(status[0], ['gugak-instruments', '국악기 학습지', '010712', '홍길동', '제출함', '1', '2026-11-10 10:00:00', '9']);
assert.strictEqual(status[1][0], 'dance-1');
assert.strictEqual(sheets['기록'].getLastRow(), 6, '5 log rows + header');
const sub = sheets['제출'].getRange(2, 1, 1, 12).getDisplayValues()[0];
assert.strictEqual(sub[9], '복습 3, =SUM(A1)');
assert.strictEqual(run('safeCell_')('=SUM(A1)'), "'=SUM(A1)", 'formula-like text escaped');
assert.strictEqual(run('safeCell_')('+맑은'), "'+맑은");

// 현황판
assert.strictEqual(run('doGet')({parameter: {dash: 'wrong'}}).h, undefined, 'wrong key gets no dashboard');
assert(run('doGet')({parameter: {dash: key}}).h.includes('학습지 현황판'));
const d = run('dashboardData')(key);
assert.strictEqual(d.rows.length, 2);
assert.throws(() => run('dashboardData')('nope'));
run('showDashboardLink')();
// 웹 앱 방문자(익명)는 관리 함수를 쓸 수 없어야 해요.
who.active = '';
assert.throws(() => run('showDashboardLink')());
assert.throws(() => run('resetDashboardKey')());
assert.throws(() => run('setup')());
assert.strictEqual(props.HUB_TEACHER_KEY, key);
who.active = 'teacher@school';
assert.strictEqual(typeof run('doGet')({parameter: {}}).t, 'string', 'no-key page is plain text');
assert.strictEqual(run('doGet')({parameter: {ping: '1'}}).ok, true);
// ---- 현황판 지우기 · 되돌리기 ----
const statusRows = () => sheets['현황'].getRange(2, 1, Math.max(sheets['현황'].getLastRow() - 1, 1), 8).getDisplayValues().filter(r => r[0]);
const logRows = () => sheets['기록'].getRange(2, 1, Math.max(sheets['기록'].getLastRow() - 1, 1), 8).getDisplayValues().filter(r => r[0]);
// 학생 둘 더(같은 학습지), 다른 학습지에 같은 학생
post({...base, num: '10701', name: '김하늘', sid: 's2', type: 'start'});
post({...base, num: '10702', name: '이바다', sid: 's3', type: 'start'});
assert.strictEqual(statusRows().length, 4);
const logBefore = logRows().length;
// 1) 현황에서만 지우기
let res = run('dashboardDelete')(key, 'gugak-instruments', [{num: '010712', name: '홍길동'}, {num: '10701', name: '김하늘'}], false);
assert.strictEqual(res.removed.length, 2);
assert.deepStrictEqual(statusRows().map(r => r[0] + '/' + r[2]).sort(), ['dance-1/010712', 'gugak-instruments/10702']);
assert.strictEqual(logRows().length, logBefore, 'log untouched on soft delete');
// 2) 되돌리기 (이미 있는 줄은 건너뜀)
assert.strictEqual(run('dashboardRestore')(key, res.removed).restored, 2);
assert.strictEqual(statusRows().length, 4);
assert.strictEqual(run('dashboardRestore')(key, res.removed).restored, 0, 'no duplicates on second restore');
const restored = statusRows().find(r => r[2] === '010712' && r[0] === 'gugak-instruments');
assert.deepStrictEqual(restored, ['gugak-instruments', '국악기 학습지', '010712', '홍길동', '제출함', '1', '2026-11-10 10:00:00', '9']);
// 3) 완전히 지우기: 그 학습지의 그 학생 기록·제출만
res = run('dashboardDelete')(key, 'gugak-instruments', [{num: '010712', name: '홍길동'}], true);
assert.strictEqual(res.removed.length, 1);
assert.strictEqual(res.removedLog, 4, 'start/away/back/submit');
assert.strictEqual(res.removedSubmit, 1);
assert(logRows().some(r => r[1] === 'dance-1' && r[2] === '010712'), 'other worksheet log kept');
assert(logRows().some(r => r[2] === '10701'), 'other students kept');
assert.strictEqual(sheets['제출'].getLastRow(), 1);
// 4) 잘못된 요청
assert.throws(() => run('dashboardDelete')('nope', 'gugak-instruments', [{num: '1', name: 'a'}], false));
assert.throws(() => run('dashboardDelete')(key, 'BAD WS', [{num: '1', name: 'a'}], false));
assert.throws(() => run('dashboardDelete')(key, 'gugak-instruments', [], false));
assert.throws(() => run('dashboardRestore')('nope', []));
// 5) 현황판 HTML 안의 스크립트 문법
const html = run('doGet')({parameter: {dash: key}}).h;
const inline = html.match(/<script>([\s\S]*)<\/script>/)[1];
new vm.Script(inline);
console.log('hub harness: all checks passed');

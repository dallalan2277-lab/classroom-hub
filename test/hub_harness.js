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
// 4b) 알림판 JSON
const j = run('doGet')({parameter: {dash: key, format: 'json'}});
assert.strictEqual(j.ok, true); assert(Array.isArray(j.rows) && j.rows.length > 0); assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(j.nowFull));
assert.strictEqual(run('doGet')({parameter: {dash: 'nope', format: 'json'}}).ok, false);
// 5) 현황판 HTML 안의 스크립트 문법
const html = run('doGet')({parameter: {dash: key}}).h;
const inline = html.match(/<script>([\s\S]*)<\/script>/)[1];
new vm.Script(inline);
// 6) 신호 순서·재전송·제출 상태 지키기 (2026-11-18)
{
  const T = sec => new Date(Date.UTC(2026, 10, 18, 1, 0, sec)).toISOString();
  const b2 = {v: 1, ws: 'order-test', title: '순서 시험', sid: 'q1', num: '10705', name: '가나다', away: 0};
  const row = () => statusRows().find(r => r[0] === 'order-test' && r[2] === '10705');
  const full = () => sheets['현황'].getRange(1, 1, sheets['현황'].getLastRow(), 9).getDisplayValues();
  const logCount = () => logRows().length;
  assert.deepStrictEqual(post({...b2, t: T(1), type: 'start'}), {ok: true});
  // 복귀(3초)가 자리 비움(2초)보다 먼저 도착
  post({...b2, t: T(3), type: 'back', away: 1, data: {seconds: 1}});
  let n = logCount();
  assert.deepStrictEqual(post({...b2, t: T(2), type: 'away', away: 1, data: {reason: 'hidden'}}), {ok: true});
  assert.strictEqual(row()[4], '풀이 중', 'late away must not overwrite back');
  assert.strictEqual(logCount(), n + 1, 'late away still logged');
  assert(/늦게 도착/.test(logRows()[logRows().length - 1][6]));
  // 같은 신호 재전송 → 한 번만 기록
  n = logCount();
  assert.deepStrictEqual(post({...b2, t: T(3), type: 'back', away: 1, data: {seconds: 1}}), {ok: true, dup: true});
  assert.strictEqual(logCount(), n, 'duplicate not logged');
  // 제출 뒤 자리 비움·복귀 → '제출함' 유지, 이탈 횟수는 늘어남
  post({...b2, t: T(4), type: 'submit', away: 1, data: {score: 5, total: 6, minutes: 3, attempt: 1, wrong: [], answers: {}}});
  post({...b2, t: T(5), type: 'away', away: 2, data: {reason: 'blur'}});
  assert.strictEqual(row()[4], '제출함'); assert.strictEqual(row()[5], '2'); assert.strictEqual(row()[7], '5');
  post({...b2, t: T(6), type: 'back', away: 2, data: {seconds: 4}});
  assert.strictEqual(row()[4], '제출함');
  // 다른 세션(다른 기기·새 로그인)은 기기 시각이 더 이르더라도 반영
  post({...b2, sid: 'q2', t: T(0), type: 'start'});
  assert.strictEqual(row()[4], '풀이 중');
  assert.strictEqual(full()[0][8], '마지막 신호(순서 확인용)');
  // 예전 시트(머리글 8칸·순서 칸 비어 있음)도 그대로 동작, setup 다시 실행 가능
  sheets['현황']._cells.forEach(r => { if (r) r[8] = ''; });
  assert.deepStrictEqual(post({...b2, sid: 'q2', t: T(1), type: 'away', away: 1, data: {reason: 'hidden'}}), {ok: true});
  assert.strictEqual(row()[4], '자리 비움');
  assert.strictEqual(full()[0][8], '마지막 신호(순서 확인용)', 'header filled in lazily');
  sheets['현황']._cells[0][8] = '';
  run('setup()');
  // 예전 현황판이 준 8칸짜리 되돌리기 줄도 받아들임
  const del = run('dashboardDelete')(key, 'order-test', [{num: '10705', name: '가나다'}], false);
  assert.strictEqual(run('dashboardRestore')(key, del.removed.map(r => r.slice(0, 8))).restored, 1);
  // 다시 제출: 나중 제출(7초)이 먼저 도착하면 늦게 온 앞 제출(6.5초 → 6초로 표기)이 점수를 덮지 않음
  const b3 = {...b2, sid: 'q3', num: '10706'};
  const row3 = () => statusRows().find(r => r[0] === 'order-test' && r[2] === '10706');
  post({...b3, t: T(5), type: 'start'});
  post({...b3, t: T(7), type: 'submit', away: 0, data: {score: 6, total: 6, minutes: 3, attempt: 2, wrong: [], answers: {}}});
  post({...b3, t: T(6), type: 'submit', away: 0, data: {score: 2, total: 6, minutes: 2, attempt: 1, wrong: [], answers: {}}});
  assert.strictEqual(row3()[4], '제출함'); assert.strictEqual(row3()[7], '6', 'newer score kept');
  assert.strictEqual(sheets['제출'].getLastRow(), 4, 'both submissions logged');
  // 칸이 8개뿐인 현황 시트도 저장·조회됨
  const fake = {getMaxColumns: () => 8, insertColumnsAfter: (_, n) => { fake.added = n; }};
  run('ensureColumns_')(fake, 9); assert.strictEqual(fake.added, 1);
  // 머리글이 너무 짧은(다른 자료) 시트는 setup이 거절
  sheets['현황']._cells[0].splice(5);
  assert.throws(() => run('setup()'), /머리글/);
}
// 7) 명단 탭(선택): setup이 머리글과 함께 만들고, 형식이 맞는 학번만 현황판에 줌
assert(sheets['명단'], 'roster tab created');
assert.strictEqual(JSON.stringify(run('dashboardData')(key).roster), '[]');
sheets['명단'].getRange(2, 1, 5, 2).setValues([['10701', '가람'], ['10702 ', ' 나래 '], ['10701', '중복'], ['1070', '짧음'], ['40101', '학년틀림']]);
assert.strictEqual(JSON.stringify(run('dashboardData')(key).roster), JSON.stringify([{num: '10701', name: '가람'}, {num: '10702', name: '나래'}]));
sheets['명단'].getRange(1, 1, 1, 2).setValues([['내 학번', '내 이름']]);
sheets['현황'].getRange(1, 1, 1, 9).setValues([run('HEADERS_STATUS_')]);
run('setup()');
assert.strictEqual(sheets['명단'].getRange(1, 1, 1, 2).getDisplayValues()[0][0], '내 학번', 'setup never overwrites roster');
console.log('hub harness: all checks passed');

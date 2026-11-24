// hub/Code.gs 를 가짜 구글 시트 위에서 돌려 보는 시험 장치. 실행: node test/hub_harness.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

let failNextWriteTo = '';
let serverTime = '2026-11-10 10:00:00';
const writeErrors = [];
function makeSheet(name) {
  const sh = {name, cells: [], maxRows: 1000, maxCols: 26, rules: []};
  const range = (r, c, nr, nc) => ({
    setValues(v) {
      if (name === failNextWriteTo) {
        failNextWriteTo = '';
        throw new Error('가짜 쓰기 실패');
      }
      v.forEach((row, i) => row.forEach((val, j) => { (sh.cells[r - 1 + i] = sh.cells[r - 1 + i] || [])[c - 1 + j] = val; }));
      return this;
    },
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
  console: {log() {}, warn() {}, error: message => writeErrors.push(message)},
  SpreadsheetApp: {getActiveSpreadsheet: () => book, openById: () => book, flush() {}, newConditionalFormatRule: ruleBuilder, BooleanCriteria: {CUSTOM_FORMULA: 'CF'}},
  LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock() {}})},
  PropertiesService: {getScriptProperties: () => ({
    getProperty: k => props[k] || null,
    setProperty: (k, v) => { props[k] = v; },
    setProperties: values => { Object.assign(props, values); }
  })},
  Utilities: {formatDate: () => serverTime, getUuid: () => '1234abcd-1234-abcd-1234-abcd1234abcd'},
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
const attemptRows = (tab, sid) => {
  const sheet = sheets[tab];
  const count = sheet ? sheet.getLastRow() - 1 : 0;
  return count > 0 ? sheet.getRange(2, 1, count, 13).getDisplayValues().filter(r => r[11] === sid) : [];
};
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
sheets['명단'].getRange(7, 1, 2, 2).setValues([['30626', '스물여섯'], ['10731', '서른하나']]);
assert.strictEqual(JSON.stringify(run('dashboardData')(key).roster), JSON.stringify([{num: '10701', name: '가람'}, {num: '10702', name: '나래'}, {num: '30626', name: '스물여섯'}]));
sheets['명단'].getRange(1, 1, 1, 2).setValues([['내 학번', '내 이름']]);
sheets['현황'].getRange(1, 1, 1, 9).setValues([run('HEADERS_STATUS_')]);
run('setup()');
assert.strictEqual(sheets['명단'].getRange(1, 1, 1, 2).getDisplayValues()[0][0], '내 학번', 'setup never overwrites roster');
// 8) 창이 작아져서 생긴 자리 비움(small): 현황 '자리 비움' + 현황판 small 표시, 복귀하면 표시 없어짐
{
  const T = sec => new Date(Date.UTC(2026, 10, 18, 4, 0, sec)).toISOString();
  const b4 = {v: 1, ws: 'small-test', title: '창 시험', sid: 'w1', num: '10709', name: '창', away: 0};
  const pick = () => run('dashboardData')(key).rows.find(r => r.ws === 'small-test');
  post({...b4, t: T(1), type: 'start'});
  assert.deepStrictEqual(post({...b4, t: T(2), type: 'away', away: 1, data: {reason: 'small'}}), {ok: true});
  assert.strictEqual(pick().state, '자리 비움'); assert.strictEqual(pick().small, 1);
  assert(/창 작아짐/.test(logRows()[logRows().length - 1][6]));
  assert.deepStrictEqual(post({...b4, t: T(2), type: 'away', away: 1, data: {reason: 'small'}}), {ok: true, dup: true}, 'small resend is dup');
  post({...b4, t: T(9), type: 'back', away: 1, data: {seconds: 7}});
  assert.strictEqual(pick().state, '풀이 중'); assert.strictEqual(pick().small, 0);
  post({...b4, t: T(10), type: 'away', away: 2, data: {reason: 'hidden'}});
  assert.strictEqual(pick().small, 0, 'hidden away is plain red');
  assert.strictEqual(post({...b4, t: T(11), type: 'away', away: 3, data: {reason: 'zzz'}}).ok, false);
}
// 9) 시험 서버 채점·중복 제출 방지·exam JSON
{
  const T = sec => new Date(Date.UTC(2026, 10, 19, 1, 0, sec)).toISOString();
  const noKey = {v: 1, ws: 'gugak-exam', sid: 'nk-exam', num: '20301', name: '가상학생', away: 0};
  assert.deepStrictEqual(post({...noKey, t: T(1), type: 'start'}), {ok: true});
  assert.deepStrictEqual(post({...noKey, t: T(2), type: 'away', away: 1, data: {reason: 'hidden'}}), {ok: true});
  assert.deepStrictEqual(post({...noKey, t: T(3), type: 'back', away: 1, data: {seconds: 2}}), {ok: true});
  const beforeNoKeySubmit = logRows().length;
  const noKeySubmit = {...noKey, t: T(4), type: 'submit',
    data: {score: 3, total: 3, minutes: 5, attempt: 1, wrong: [], answers: {}}};
  assert.deepStrictEqual(post(noKeySubmit),
    {ok: false, error: '시험 정답표가 허브에 없어요. 선생님께 알려 주세요.'});
  assert.strictEqual(logRows().length, beforeNoKeySubmit);
  assert.strictEqual(statusRows().find(r => r[0] === noKey.ws && r[2] === noKey.num)[4], '풀이 중');
  assert.strictEqual(attemptRows('제출', noKey.sid).length, 0);
  assert.strictEqual(attemptRows('시험보관', noKey.sid).length, 0);

  // EXAM_KEYS 가 없을 때도 일반 제출은 정상 동작하고 exam JSON 요청은 깨지지 않음
  assert.deepStrictEqual(
    post({v: 1, ws: 'no-key-exam', title: '키 없음 시험', sid: 'nk1', num: '20101', name: '김시험', t: T(1), away: 0, type: 'submit',
      data: {score: 7, total: 10, minutes: 5, attempt: 1, wrong: [], answers: {'q:x1': '답'}}}),
    {ok: true}
  );
  const noKeyGet = run('doGet')({parameter: {dash: key, format: 'json', exam: 'no-key-exam'}});
  assert.strictEqual(noKeyGet.ok, false);

  // 테스트용 가짜 EXAM_KEYS 주입 (실제 hub/ExamKey.gs 를 읽지 않음)
  ctx.EXAM_KEYS = {
    'fake-exam': {
      title: '가짜 국악기 시험',
      base: 10,
      per: 1,
      items: [
        {code: 'f1111', answer: '가짜악기1', also: []},
        {code: 'f2222', answer: '가짜악기2', also: []},
        {code: 'f3333', answer: '가짜북', also: ['장고']}
      ]
    }
  };
  assert.strictEqual(post(noKeySubmit).ok, false, 'known exam without its own key must be rejected');
  const submitCountBefore = sheets['제출'].getLastRow();
  const baseEx = {v: 1, ws: 'fake-exam', title: '가짜 국악기 시험', sid: 'ex1', num: '20102', name: '이시험', away: 0};
  assert.deepStrictEqual(post({...baseEx, t: T(1), type: 'start'}), {ok: true});
  // 클라이언트 점수(0)를 무시하고 서버 채점(2점), 공백 무시(' 가짜 악기 1 '), also(' 장고 ') 인정
  assert.deepStrictEqual(
    post({...baseEx, t: T(2), away: 1, type: 'submit',
      data: {score: 0, total: 3, minutes: 4, attempt: 1, wrong: ['가짜악기1'], answers: {'q:f1111': ' 가짜 악기 1 ', 'q:f2222': '틀린답', 'q:f3333': ' 장고 ', _auto: '0', _order: 'f1111,f2222,f3333'}}}),
    {ok: true}
  );
  assert.strictEqual(sheets['제출'].getLastRow(), submitCountBefore + 1);
  const rowSub1 = sheets['제출'].getRange(sheets['제출'].getLastRow(), 1, 1, 12).getDisplayValues()[0];
  assert.strictEqual(rowSub1[4], '2');
  assert.strictEqual(rowSub1[5], '3');
  assert.strictEqual(rowSub1[9], '가짜악기2');

  // 같은 세션·같은 차수 재전송(다른 t) → 한 번만 기록
  assert.deepStrictEqual(
    post({...baseEx, t: T(9), away: 1, type: 'submit',
      data: {score: 3, total: 3, minutes: 4, attempt: 1, wrong: [], answers: {'q:f1111': '가짜악기1', 'q:f2222': '가짜악기2', 'q:f3333': '가짜북'}}}),
    {ok: true, dup: true}
  );
  assert.strictEqual(sheets['제출'].getLastRow(), submitCountBefore + 1, 'same sid+attempt not duplicated');

  // 다른 세션(ex2) 두 번째 제출은 기록되며 클라이언트 위조 점수(3)를 서버 채점(1)으로 덮어씀
  assert.deepStrictEqual(post({...baseEx, sid: 'ex2', t: T(10), type: 'start'}), {ok: true});
  assert.deepStrictEqual(
    post({...baseEx, sid: 'ex2', t: T(12), away: 5, type: 'submit',
      data: {score: 3, total: 3, minutes: 2, attempt: 1, wrong: [], answers: {'q:f1111': '가짜악기1', 'q:f2222': '틀린답', 'q:f3333': '틀린답', _auto: '1'}}}),
    {ok: true}
  );
  assert.strictEqual(sheets['제출'].getLastRow(), submitCountBefore + 2, 'different sid recorded');
  const rowSub2 = sheets['제출'].getRange(sheets['제출'].getLastRow(), 1, 1, 12).getDisplayValues()[0];
  assert.strictEqual(rowSub2[4], '1');

  // exam JSON 키 확인 및 응답 구조
  assert.strictEqual(run('doGet')({parameter: {dash: 'wrong', format: 'json', exam: 'fake-exam'}}).ok, false);
  const exData = run('doGet')({parameter: {dash: key, format: 'json', exam: 'fake-exam'}});
  assert.strictEqual(exData.ok, true);
  assert.strictEqual(exData.exam.ws, 'fake-exam');
  assert.strictEqual(exData.exam.items.length, 3);
  assert.strictEqual(exData.rows.length, 2);
  assert.strictEqual(exData.rows[0].correct, 2);
  assert.strictEqual(exData.rows[0].auto, false);
  assert.deepStrictEqual(exData.rows[0].perItem, {f1111: true, f2222: false, f3333: true});
  assert.strictEqual(exData.rows[1].correct, 1);
  assert.strictEqual(exData.rows[1].auto, true);
  assert.strictEqual(exData.status.length, 1);
  assert.deepStrictEqual(exData.status[0].sessions.sort(), ['ex1', 'ex2']);
  assert(Array.isArray(exData.roster));
  assert(/^\d{4}-\d{2}-\d{2}/.test(exData.today));

  // 정답표 변경 시 exam JSON 재채점 반영 확인
  ctx.EXAM_KEYS['fake-exam'].items[1].also.push('틀린답');
  const regraded = run('doGet')({parameter: {dash: key, format: 'json', exam: 'fake-exam'}});
  assert.strictEqual(regraded.rows[0].correct, 3);
  assert.strictEqual(regraded.rows[1].correct, 2);

  delete ctx.EXAM_KEYS;
  assert.strictEqual(run('doGet')({parameter: {dash: key, format: 'json', exam: 'fake-exam'}}).ok, false);
}
// 10) T007: NFC/보이지 않는 문자 정규화, 시험보관, 통계 되살리기(examRestore), 재응시 초기화(examReset)
{
  const T = sec => new Date(Date.UTC(2026, 10, 19, 3, 0, sec)).toISOString();
  ctx.EXAM_KEYS = {
    'fake-exam': {
      title: '가짜 국악기 시험',
      base: 10,
      per: 1,
      items: [
        {code: 'f1111', answer: '가짜악기1', also: []},
        {code: 'f2222', answer: '가짜악기2', also: []},
        {code: 'f3333', answer: '가짜북', also: ['장고']}
      ]
    }
  };
  // 1) NFD 한글 + 보이지 않는 문자(\u200B, \uFEFF) 정규화 통과 확인
  assert.strictEqual(run('normalizeExamAnswer_')('가짜악기1'.normalize('NFD')), '가짜악기1');
  assert.strictEqual(run('normalizeExamAnswer_')('\uFEFF가짜\u200B악기2'), '가짜악기2');

  // 일반(비시험) 학습지는 시험보관에 쌓이지 않음 확인
  const archiveBeforeNormal = sheets['시험보관'] ? sheets['시험보관'].getLastRow() : 0;
  assert.deepStrictEqual(
    post({v: 1, ws: 'normal-ws', title: '일반 학습지', sid: 'n1', num: '20102', name: '이시험', t: T(1), away: 0, type: 'submit',
      data: {score: 5, total: 5, minutes: 3, attempt: 1, wrong: [], answers: {q1: 'a'}}}),
    {ok: true}
  );
  assert.strictEqual(sheets['시험보관'] ? sheets['시험보관'].getLastRow() : 0, archiveBeforeNormal, 'non-exam submit must not write archive');

  // 2) 시험 제출 시 시험보관 시트 자동 생성 및 기록, 소프트 삭제 후에도 sessions 유지
  const subCount0 = sheets['제출'].getLastRow();
  assert.deepStrictEqual(
    post({v: 1, ws: 'fake-exam', title: '가짜 국악기 시험', sid: 't7s1', num: '20102', name: '이시험', t: T(2), away: 1, type: 'submit',
      data: {score: 0, total: 3, minutes: 5, attempt: 1, wrong: [], answers: {'q:f1111': '가짜악기1'.normalize('NFD'), 'q:f2222': '가짜\u200B악기2', 'q:f3333': '틀림', _auto: '0'}}}),
    {ok: true}
  );
  assert.strictEqual(sheets['제출'].getLastRow(), subCount0 + 1);
  assert(sheets['시험보관'], 'archive sheet auto-created');
  const archRows = () => sheets['시험보관'].getRange(2, 1, sheets['시험보관'].getLastRow() - 1, 13).getDisplayValues();
  const targetArch = archRows().find(r => r[11] === 't7s1');
  assert(targetArch && targetArch[12] === '제출' && targetArch[4] === '2', 'archive stores submission');

  // 다른 학생(20109)도 fake-exam에 추가(초기화 시 보존 확인용)
  assert.deepStrictEqual(
    post({v: 1, ws: 'fake-exam', title: '가짜 국악기 시험', sid: 't7other', num: '20109', name: '박보존', t: T(3), away: 0, type: 'submit',
      data: {score: 0, total: 3, minutes: 4, attempt: 1, wrong: [], answers: {'q:f1111': '가짜악기1', _auto: '0'}}}),
    {ok: true}
  );

  // 현황판 소프트 삭제 후에도 examData_.sessions[num] 은 기록 탭 모든 세션을 유지
  run('dashboardDelete')(key, 'fake-exam', [{num: '20102', name: '이시험'}], false);
  const afterSoft = run('doGet')({parameter: {dash: key, format: 'json', exam: 'fake-exam'}});
  assert(afterSoft.sessions['20102'].includes('t7s1') && afterSoft.sessions['20102'].includes('ex1'), 'sessions preserved after soft delete');

  // 3) 완전 삭제(hard=true) 후에도 시험보관은 유지되고, examRestore 로 되살리기 가능
  const archCountBeforeHard = archRows().length;
  run('dashboardDelete')(key, 'fake-exam', [{num: '20102', name: '이시험'}], true);
  assert.strictEqual(archRows().length, archCountBeforeHard, 'hard delete must not remove archive');
  assert(!sheets['제출'].getRange(2, 1, sheets['제출'].getLastRow() - 1, 12).getDisplayValues().some(r => r[11] === 't7s1'));

  // examRestore 키 오류 거절 + 정상 되살리기
  assert.strictEqual(post({type: 'examRestore', key: 'wrong', ws: 'fake-exam', sid: 't7s1', time: targetArch[0]}).ok, false);
  assert.deepStrictEqual(post({type: 'examRestore', key: key, ws: 'fake-exam', sid: 't7s1', time: targetArch[0]}), {ok: true, restored: true});
  const afterRestore = run('doGet')({parameter: {dash: key, format: 'json', exam: 'fake-exam'}});
  assert(afterRestore.rows.some(r => r.sid === 't7s1' && r.correct === 2), 'restored row appears in examData');
  assert(afterRestore.status.some(s => s.num === '20102' && s.state === '제출함'), 'restored status is 제출함');

  // 4) examReset 검증: 잘못된 요청 거절 + 정상 초기화(다른 학생·다른 ws 보존 + 보관함 유지 + 감사 줄 + examstate + 재제출)
  assert.strictEqual(post({type: 'examReset', key: 'wrong', ws: 'fake-exam', num: '20102'}).ok, false);
  assert.strictEqual(post({type: 'examReset', key: key, ws: 'no-exam', num: '20102'}).ok, false);
  assert.strictEqual(post({type: 'examReset', key: key, ws: 'fake-exam', num: 'abc'}).ok, false);

  // 다른 이름('이시험2')의 같은 학번 행이 하나 더 있어도 학번 기준으로 모두 지워지는지 확인
  post({v: 1, ws: 'fake-exam', title: '가짜 국악기 시험', sid: 't7s2', num: '20102', name: '이시험2', t: T(4), away: 2, type: 'submit',
    data: {score: 0, total: 3, minutes: 2, attempt: 1, wrong: [], answers: {'q:f1111': '가짜악기1', _auto: '1'}}});

  run('appendRow_')(sheets['기록'], [serverTime, 'fake-exam', '20102', '가상학생', '시작', 0, '', 'log-only']);
  run('appendRow_')(sheets['현황'], ['fake-exam', '가상 시험', '20102', '가상학생', '풀이 중', 0,
    serverTime, '', 'status-only ' + T(5) + ' start']);
  run('appendRow_')(sheets['제출'], [serverTime, 'fake-exam', '20102', '가상학생', 0, 3, 0, 1, 1, '', '{}', 'submit-only']);

  const resetRes = post({type: 'examReset', key: key, ws: 'fake-exam', num: '20102'});
  assert.strictEqual(resetRes.ok, true);
  assert(resetRes.removed.submit >= 2 && resetRes.resetAt, 'removed submissions and returned resetAt');

  // 제출·기록·현황에서 fake-exam의 20102는 감사 줄 외 모두 삭제, 20109·normal-ws는 유지
  const subRowsNow = sheets['제출'].getRange(2, 1, Math.max(sheets['제출'].getLastRow() - 1, 1), 12).getDisplayValues();
  assert(!subRowsNow.some(r => r[1] === 'fake-exam' && r[2] === '20102'), '20102 submissions cleared');
  assert(subRowsNow.some(r => r[1] === 'fake-exam' && r[2] === '20109'), 'other student submission kept');
  assert(subRowsNow.some(r => r[1] === 'normal-ws' && r[2] === '20102'), 'other ws same num kept');

  const statusNow = sheets['현황'].getRange(2, 1, Math.max(sheets['현황'].getLastRow() - 1, 1), 9).getDisplayValues();
  assert(!statusNow.some(r => r[0] === 'fake-exam' && r[2] === '20102'), '20102 status cleared');
  assert(statusNow.some(r => r[0] === 'fake-exam' && r[2] === '20109'), 'other student status kept');
  assert(statusNow.some(r => r[0] === 'normal-ws' && r[2] === '20102'), 'other ws status kept');

  const logNow = sheets['기록'].getRange(2, 1, sheets['기록'].getLastRow() - 1, 8).getDisplayValues();
  const auditRow = logNow.find(r => r[1] === 'fake-exam' && r[2] === '20102');
  assert(auditRow && auditRow[3] === '(선생님)' && auditRow[4] === '재응시 초기화', 'audit log added');
  assert(!logNow.some(r => r[1] === 'fake-exam' && r[2] === '20102' && r[4] !== '재응시 초기화'), 'old student logs cleared');

  // 시험보관 시트에는 기존 제출들이 남고 '재응시 초기화' 표시 줄 추가됨
  const archAfterReset = archRows();
  assert(archAfterReset.some(r => r[11] === 't7s1' && r[12] === '제출'), 'archive kept previous submission');
  assert(archAfterReset.some(r => r[2] === '20102' && r[12] === '재응시 초기화'), 'archive logged reset marker');

  // 공개 조회 ?examstate=
  const stateHit = run('doGet')({parameter: {examstate: 'fake-exam', num: '20102'}});
  assert.strictEqual(stateHit.ok, true);
  assert.strictEqual(stateHit.resetAt, resetRes.resetAt);
  assert.strictEqual(run('doGet')({parameter: {examstate: 'fake-exam', num: '20109'}}).resetAt, '');
  assert.strictEqual(run('doGet')({parameter: {examstate: 'fake-exam', num: 'bad'}}).ok, false);

  // 세 시트 중 한 곳에만 있던 세션과 한 번도 도착하지 않았던 옛 답안을 모두 막아요.
  const createdBeforeReset = new Date(Date.parse(resetRes.resetAt) - 16 * 60 * 1000).toISOString();
  const createdSlowClock = new Date(Date.parse(resetRes.resetAt) - 3 * 60 * 1000).toISOString();
  const createdAfterReset = new Date(Date.parse(resetRes.resetAt) + 1).toISOString();
  const answer = {v: 1, ws: 'fake-exam', sid: 't7new', num: '20102', name: '이시험', t: T(20), away: 0, type: 'submit',
    data: {score: 0, total: 3, minutes: 3, attempt: 1, wrong: [],
      answers: {'q:f1111': '가짜악기1', 'q:f2222': '가짜악기2', 'q:f3333': '장고', _auto: '0'}}};
  const stale = {ok: true, dup: true, stale: true};
  for (const sid of ['t7s1', 't7s2', 'log-only', 'status-only', 'submit-only']) {
    assert.deepStrictEqual(post({...answer, sid}), stale, 'old sessions must be rejected even without _created');
  }
  assert.deepStrictEqual(post({...answer, sid: 'status-only', data: {...answer.data, answers: {_created: createdAfterReset}}}), stale);
  assert.deepStrictEqual(post({...answer, sid: 'unseen', data: {...answer.data, answers: {_created: createdBeforeReset}}}), stale);
  assert.strictEqual(logRows().length, logNow.length);
  assert.strictEqual(statusRows().length, statusNow.length);
  assert.strictEqual(sheets['제출'].getLastRow(), subRowsNow.length + 1);
  assert.strictEqual(archRows().length, archAfterReset.length);

  // 초기화 뒤 새 세션(t7new) 제출이 1건(첫 제출)으로 잡히는지 확인
  assert.deepStrictEqual(
    // 태블릿 시계가 3분 느려도 새 세션 제출은 받아야 해요.
    post({...answer, data: {...answer.data, answers: {...answer.data.answers, _created: createdSlowClock}}}),
    {ok: true});
  const afterRetake = run('doGet')({parameter: {dash: key, format: 'json', exam: 'fake-exam'}});
  const retakeSubs = afterRetake.rows.filter(r => r.num === '20102');
  assert.strictEqual(retakeSubs.length, 1);
  assert.strictEqual(retakeSubs[0].sid, 't7new');
  assert.strictEqual(retakeSubs[0].correct, 3);
  assert(afterRetake.archive.some(a => a.sid === 't7s1' && a.status === '제출'), 'archive exposed in examData');

  assert.strictEqual(post({type: 'examReset', key, ws: answer.ws, num: answer.num}).ok, true);
  assert.deepStrictEqual(post({...answer, sid: 'log-only'}), stale, 'earlier reset session kept');
  assert.deepStrictEqual(post(answer), stale, 'most recent reset session added');

  const recent = Array.from({length: 51}, (_, i) => 'history-' + i);
  for (const sid of recent) post({...answer, type: 'start', num: '20309', sid});
  assert.strictEqual(post({type: 'examReset', key, ws: answer.ws, num: '20309'}).ok, true);
  assert.deepStrictEqual(JSON.parse(props['EXAM_RESET_SIDS:fake-exam:20309']), recent.slice(-50));

  delete ctx.EXAM_KEYS;
}
ctx.EXAM_KEYS = {
  'gugak-exam': {title: '가상 시험', base: 10, per: 1, items: [{code: 'example-1', answer: '예시답'}]}
};

// 11) 시험보관을 먼저 쓰고, 두 시트 중 한쪽만 남아도 재전송으로 복구해요.
{
  const T = sec => new Date(Date.UTC(2026, 10, 19, 1, 1, sec)).toISOString();
  const original = {v: 1, ws: 'gugak-exam', type: 'submit', sid: 'write-retry', num: '20302', name: '가상학생',
    t: T(1), away: 5, data: {score: 0, total: 1, minutes: 7, attempt: 1, wrong: [],
      answers: {'q:example-1': '예시답', _auto: '1'}}};
  const dup = {ok: true, dup: true};
  failNextWriteTo = '시험보관';
  assert.strictEqual(post(original).ok, false);
  assert.strictEqual(attemptRows('제출', original.sid).length, 0, 'no official row after archive write fails');
  assert.strictEqual(attemptRows('시험보관', original.sid).length, 0);
  assert(!logRows().some(r => r[7] === original.sid), 'failed write leaves no duplicate submission log');
  assert.deepStrictEqual(post(original), {ok: true});
  assert.deepStrictEqual(post({...original, t: T(2)}), dup);
  assert.strictEqual(attemptRows('제출', original.sid).length, 1);
  assert.strictEqual(attemptRows('시험보관', original.sid).length, 1);

  const archiveFirst = {...original, sid: 'archive-first', t: T(3)};
  failNextWriteTo = '제출';
  assert.strictEqual(post(archiveFirst).ok, false);
  assert.strictEqual(attemptRows('제출', archiveFirst.sid).length, 0);
  const firstArchive = attemptRows('시험보관', archiveFirst.sid);
  assert.strictEqual(firstArchive.length, 1, 'archive exists before the official row');
  const earlierServerTime = serverTime;
  serverTime = '2026-11-10 10:00:01';
  const changed = {...archiveFirst, t: T(4), away: 6, data: {...archiveFirst.data, minutes: 8, answers: {_auto: '0'}}};
  assert.deepStrictEqual(post(changed), {ok: true});
  const saved = attemptRows('제출', archiveFirst.sid);
  assert.strictEqual(saved.length, 1);
  assert.deepStrictEqual(saved[0].slice(0, 9), firstArchive[0].slice(0, 9));
  assert.strictEqual(saved[0][10], firstArchive[0][10], 'retry keeps the original answers');
  assert.strictEqual(logRows().filter(r => r[7] === archiveFirst.sid && r[4] === '제출').length, 1);
  assert.deepStrictEqual(attemptRows('시험보관', archiveFirst.sid), firstArchive);

  // 예전 코드에서 제출만 남은 상태를 만들고 같은 시각·새 시각의 중복 경로를 모두 확인해요.
  const archive = sheets['시험보관'];
  for (const t of [changed.t, T(5)]) {
    archive.deleteRows(archive._cells.findIndex(r => r[11] === archiveFirst.sid) + 1, 1);
    assert.deepStrictEqual(post({...changed, t}), dup);
    assert.deepStrictEqual(attemptRows('제출', archiveFirst.sid), saved);
    assert.deepStrictEqual(attemptRows('시험보관', archiveFirst.sid), firstArchive);
  }
  assert.deepStrictEqual(post({...changed, t: T(6), data: {...changed.data, attempt: 2}}), {ok: true});
  assert.deepStrictEqual(attemptRows('제출', archiveFirst.sid).map(r => r[8]), ['1', '2']);
  assert.deepStrictEqual(attemptRows('시험보관', archiveFirst.sid).map(r => r[8]), ['1', '2']);
  assert.deepStrictEqual(writeErrors, Array(2).fill('학습지 기록 실패: 가짜 쓰기 실패'));
  serverTime = earlierServerTime;
}

// 12) 실제 시험·공용 스크립트를 가짜 브라우저와 허브에 연결해 이탈과 응답 지연을 시험해요.
const root = path.join(__dirname, '..');
const classroomJs = fs.readFileSync(path.join(root, 'classroom.js'), 'utf8');
const examJs = fs.readFileSync(path.join(root, 'gugak-exam', 'app.js'), 'utf8');
const ws = 'gugak-exam';
const classroomKey = 'classroom:' + ws;
const settle = () => new Promise(resolve => setImmediate(resolve));

function mountExamPage(storage) {
  const origin = 'http://localhost:8768';
  const timers = new Map();
  const elements = new Map();
  const submissions = [];
  let timerId = 0;
  let draftWrites = 0;
  const node = () => Object.assign(new EventTarget(), {
    hidden: true, classList: {remove() {}, toggle() {}}, focus() {}, appendChild() {},
    setAttribute() {}, removeAttribute() {}, querySelectorAll: () => []
  });
  const element = id => {
    if (!elements.has(id)) elements.set(id, node());
    return elements.get(id);
  };
  const script = {getAttribute: name => name === 'data-ws' ? ws : null};
  const document = Object.assign(new EventTarget(), {
    head: node(), body: node(), hidden: false, hasFocus: () => true,
    getElementById: element, createElement: node, createTextNode() {},
    querySelector: sel => sel === 'script[data-ws]' ? script : null
  });
  const window = Object.assign(new EventTarget(), {innerWidth: 1024, innerHeight: 768});
  const page = vm.createContext({
    window, document, URLSearchParams, Blob, AbortController,
    CustomEvent: class extends Event {},
    location: {hostname: 'localhost', search: '?hub=' + origin + '/', hash: ''},
    screen: {orientation: {type: 'landscape-primary'}},
    navigator: {onLine: true, sendBeacon: () => true},
    setInterval() {},
    setTimeout(fn, delay) { timers.set(++timerId, {fn, delay}); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    localStorage: {
      getItem: k => storage.get(k) || null,
      removeItem: k => storage.delete(k),
      setItem(k, value) {
        if (k.startsWith(ws + ':draft:')) draftWrites++;
        storage.set(k, value);
      }
    },
    fetch(url, options) {
      const target = new URL(url);
      assert.strictEqual(target.origin, origin, 'every request stays on the fake hub');
      if (options.method !== 'POST') {
        return Promise.resolve({json: () => run('doGet')({parameter: Object.fromEntries(target.searchParams)})});
      }
      const entry = JSON.parse(options.body);
      const result = post(entry);
      const reply = {json: () => result};
      if (entry.type !== 'submit') return Promise.resolve(reply);
      return new Promise(resolve => submissions.push({entry, result, respond: () => resolve(reply)}));
    }
  });
  vm.runInContext(classroomJs, page);
  vm.runInContext(examJs, page);
  return {
    element, submissions, draftWrites: () => draftWrites,
    click: id => element(id).dispatchEvent(new Event('click')),
    leaveAndReturn() {
      document.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
      document.hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    },
    runTimer(delay) {
      const pending = Array.from(timers).find(([, timer]) => timer.delay === delay);
      assert(pending, 'missing timer for ' + delay + ' ms');
      timers.delete(pending[0]);
      pending[1].fn();
    }
  };
}

async function checkExamPage() {
  const student = {sid: 'page-retry', num: '20303', name: '가상학생', startAt: Date.now()};
  const draftKey = ws + ':draft:' + student.num;
  const storage = new Map([[classroomKey, JSON.stringify(student)]]);
  let page = mountExamPage(storage);
  await settle();
  for (let i = 0; i < 6; i++) page.leaveAndReturn();
  await settle();
  assert.strictEqual(page.element('awayCnt').textContent, '0');
  assert.strictEqual(page.submissions.length, 0, 'no auto-submit while the intro is open');

  page = mountExamPage(storage);
  await settle();
  assert.strictEqual(page.element('introModal').hidden, false);
  assert.strictEqual(page.submissions.length, 0, 'reload before acknowledging the intro does not auto-submit');
  page.click('introStartBtn');
  const confirmed = JSON.parse(storage.get(draftKey));
  assert.strictEqual(confirmed.awayBase, 6);
  assert.strictEqual(new Date(confirmed.createdAt).toISOString(), confirmed.createdAt);
  for (let i = 0; i < 4; i++) page.leaveAndReturn();
  await settle();
  page = mountExamPage(storage);
  await settle();
  assert.strictEqual(page.element('awayCnt').textContent, '4');
  assert.strictEqual(page.submissions.length, 0, 'saved baseline survives reload');
  page.leaveAndReturn();
  await settle();
  assert.strictEqual(page.element('awayCnt').textContent, '5');
  assert.strictEqual(page.submissions.length, 1);
  assert.strictEqual(page.submissions[0].entry.data.answers._created, confirmed.createdAt);
  assert.strictEqual(page.submissions[0].entry.data.answers._auto, '1');

  page.runTimer(20000);
  await settle();
  assert(page.element('autoRetryMsg').textContent.includes('5초 뒤 자동으로 다시'));
  page.runTimer(5000);
  await settle();
  assert.strictEqual(page.submissions.length, 2);
  assert.deepStrictEqual(page.submissions.map(s => s.entry.data.attempt), [1, 1]);
  assert.deepStrictEqual(page.submissions[1].result, {ok: true, dup: true});
  page.submissions[1].respond();
  await settle();
  assert.strictEqual(page.element('lockedTitle').textContent, '제출 완료');
  const writes = page.draftWrites();
  page.submissions[0].respond();
  await settle();
  assert.strictEqual(page.draftWrites(), writes, 'late success must not finish the old attempt again');
  assert.strictEqual(attemptRows('제출', student.sid).length, 1);
  assert.strictEqual(attemptRows('시험보관', student.sid).length, 1);

  // 첫 응답이 재시도 5초 대기 중에 오면 공용 코드에서 차수가 이미 올라가 있어요.
  const late = {...student, sid: 'page-late-ack', num: '20304', away: 11};
  const lateDraft = {...confirmed, sid: late.sid};
  const lateStorage = new Map([[classroomKey, JSON.stringify(late)], [ws + ':draft:' + late.num, JSON.stringify(lateDraft)]]);
  page = mountExamPage(lateStorage);
  await settle();
  assert.strictEqual(page.element('awayCnt').textContent, '5');
  assert.strictEqual(page.submissions.length, 1, 'auto-submit on reload after five counted absences');
  page.runTimer(20000);
  await settle();
  page.submissions[0].respond();
  await settle();
  assert.strictEqual(JSON.parse(lateStorage.get(classroomKey)).attempt, 1);
  page.runTimer(5000);
  await settle();
  assert.strictEqual(page.submissions.length, 1, 'no new attempt after receiving the earlier success');
  assert.strictEqual(page.element('lockedTitle').textContent, '제출 완료');
  assert.strictEqual(attemptRows('제출', late.sid).length, 1);
  assert.strictEqual(attemptRows('시험보관', late.sid).length, 1);
}

checkExamPage().then(() => console.log('hub harness: all checks passed'), error => {
  console.error(error);
  process.exitCode = 1;
});

// ===== 학습지 허브 (여러 학습지가 함께 쓰는 수신기) =====
// 처음 한 번만 설치하면 돼요. 학습지를 새로 만들거나 고쳐도 이 파일과 시트는 다시 고치지 않아요.
//
// 설치 순서
// 1. 구글 드라이브에서 새 구글 시트를 만들어요. (예: "학습지 허브")
// 2. 시트 메뉴 확장 프로그램 > Apps Script 를 열고, 원래 있던 내용을 지운 뒤 이 파일 전체를 붙여 넣고 저장해요.
// 3. 왼쪽 톱니바퀴(프로젝트 설정)에서 시간대를 "(GMT+09:00) 서울"로 바꿔요.
// 4. 위쪽 함수 목록에서 setup 을 골라 실행 → 권한 허용.
// 5. 배포 > 새 배포 > 유형: 웹 앱 / 실행: 나 / 액세스 권한: 모든 사용자 → 배포. 나온 웹 앱 URL(/exec로 끝남)을 복사해요.
// 6. 함수 목록에서 showDashboardLink 를 실행하면 실행 로그에 "선생님 현황판" 주소가 나와요. 즐겨찾기 해 두세요.
//    (이 주소에는 비밀 키가 들어 있으니 학생에게 보여 주지 마세요.)
// 7. 5번의 웹 앱 URL을 Claude에게 알려 주면 모든 학습지에 연결해 줘요.
//
// 나중에 이 파일을 고쳐야 할 때는 배포 > 배포 관리 > 연필 > 버전: "새 버전"으로 배포해야 주소가 그대로 유지돼요.

const ALERT_EMAIL = '';        // 알림 받을 이메일. 빈칸이면 메일을 보내지 않아요.
const ALERT_AT = 3;            // 한 학생이 한 학습지에서 이 횟수만큼 자리를 비우면 한 번 알려요.
const SHEET_LOG = '기록';      // 모든 신호(시작·이탈·복귀·제출)를 쌓는 시트
const SHEET_SUBMIT = '제출';   // 제출 결과를 쌓는 시트
const SHEET_STATUS = '현황';   // 학습지·학번·이름별 최신 상태

// 아래는 내부용이에요.
const PROP_SHEET_ID_ = 'HUB_SPREADSHEET_ID';
const PROP_TEACHER_KEY_ = 'HUB_TEACHER_KEY';
const HEADERS_LOG_ = ['서버시각', '학습지', '학번', '이름', '종류', '누적 이탈', '세부', '세션'];
const HEADERS_SUBMIT_ = ['서버시각', '학습지', '학번', '이름', '점수', '만점', '이탈 횟수',
  '걸린 시간(분)', '제출 차수', '틀린 문항', '답안(JSON)', '세션'];
const HEADERS_STATUS_ = ['학습지', '제목', '학번', '이름', '상태', '누적 이탈', '마지막 소식 시각', '점수'];

// ---------------------------------------------------------------------------
// 설치
// ---------------------------------------------------------------------------

// 처음 한 번 실행해요. 다시 실행해도 기존 기록과 현황판 키는 그대로예요.
function setup() {
  requireOwner_();
  validateSettings_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('다른 요청을 처리 중이에요. 잠시 후 setup을 다시 실행하세요.');
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    if (!book) throw new Error('구글 시트의 확장 프로그램 > Apps Script에서 열어 실행하세요.');
    const specs = [
      [SHEET_LOG, HEADERS_LOG_, [160, 140, 80, 90, 70, 80, 220, 260]],
      [SHEET_SUBMIT, HEADERS_SUBMIT_, [160, 140, 80, 90, 60, 60, 80, 100, 80, 200, 420, 260]],
      [SHEET_STATUS, HEADERS_STATUS_, [140, 200, 80, 90, 90, 80, 160, 60]]
    ];
    specs.forEach(function (spec) {
      const sheet = book.getSheetByName(spec[0]);
      if (sheet && sheet.getLastRow() > 0) {
        const header = sheet.getRange(1, 1, 1, spec[1].length).getDisplayValues()[0];
        if (header.join('\t') !== spec[1].join('\t')) {
          throw new Error(spec[0] + ' 시트의 머리글이 달라요. 다른 자료가 있는 시트인지 확인하세요.');
        }
      }
    });
    specs.forEach(function (spec) {
      const sheet = book.getSheetByName(spec[0]) || book.insertSheet(spec[0]);
      if (sheet.getMaxRows() < 2) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
      if (sheet.getMaxColumns() < spec[1].length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), spec[1].length - sheet.getMaxColumns());
      }
      sheet.getRange(1, 1, 1, spec[1].length).setValues([spec[1]])
        .setBackground('#1f4e78').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
      spec[2].forEach(function (width, index) { sheet.setColumnWidth(index + 1, width); });
      refreshRules_(sheet);
    });
    SpreadsheetApp.flush();
    const props = PropertiesService.getScriptProperties();
    props.setProperty(PROP_SHEET_ID_, book.getId());
    if (!props.getProperty(PROP_TEACHER_KEY_)) props.setProperty(PROP_TEACHER_KEY_, newKey_());
  } finally {
    lock.releaseLock();
  }
  console.log('설치 완료. 이제 웹 앱으로 배포한 뒤 showDashboardLink를 실행하세요.');
}

// 배포한 뒤 실행하면 선생님 현황판 주소를 실행 로그에 보여 줘요.
function showDashboardLink() {
  requireOwner_();
  const key = PropertiesService.getScriptProperties().getProperty(PROP_TEACHER_KEY_);
  if (!key) throw new Error('먼저 setup을 실행하세요.');
  // 편집기에서 실행하면 시험용 /dev 주소가 나와서, 실제 배포 주소(/exec)로 바꿔 보여 줘요.
  const url = (ScriptApp.getService().getUrl() || '').replace(/\/dev$/, '/exec');
  if (!url) throw new Error('아직 웹 앱으로 배포되지 않았어요. 배포 > 새 배포를 먼저 하세요.');
  const link = url + '?dash=' + encodeURIComponent(key);
  console.log('선생님 현황판: ' + link);
  console.log('학습지 연결용 웹 앱 주소(Claude에게 알려 줄 주소): ' + url);
}

// 현황판 주소가 새어 나갔다면 실행해요. 새 키를 만들고 예전 주소는 막혀요.
function resetDashboardKey() {
  requireOwner_();
  PropertiesService.getScriptProperties().setProperty(PROP_TEACHER_KEY_, newKey_());
  showDashboardLink();
}

// 관리용 함수는 선생님이 Apps Script 편집기에서 실행할 때만 동작해요.
// (웹 앱 방문자는 이 함수들을 불러도 결과를 받을 수 없어요.)
function requireOwner_() {
  const active = Session.getActiveUser().getEmail();
  if (!active || active !== Session.getEffectiveUser().getEmail()) {
    throw new Error('Apps Script 편집기에서 직접 실행하세요.');
  }
}

function newKey_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

// ---------------------------------------------------------------------------
// 웹 앱 입구
// ---------------------------------------------------------------------------

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.ping) return json_({ok: true, msg: '학습지 허브가 동작 중이에요'});
  // 선생님 알림판(GitHub Pages)이 5초마다 읽어 가는 JSON
  if (p.dash && p.format === 'json') {
    if (!checkKey_(p.dash)) return json_({ok: false, error: '현황판 키가 올바르지 않아요.'});
    try { const d = dashboardData(p.dash); d.ok = true; return json_(d); }
    catch (error) { return json_({ok: false, error: error.message}); }
  }
  if (p.dash && checkKey_(p.dash)) {
    return HtmlService.createHtmlOutput(dashboardHtml_(p.dash))
      .setTitle('학습지 현황판')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return ContentService.createTextOutput('학습지 허브예요. 학습지 페이지에서 접속해 주세요.');
}

function doPost(e) {
  return json_(handle_(e && e.postData ? e.postData.contents : null));
}

// ---------------------------------------------------------------------------
// 신호 기록
// ---------------------------------------------------------------------------

function handle_(contents) {
  let request;
  try {
    validateSettings_();
    request = parseRequest_(contents);
  } catch (error) {
    return {ok: false, error: error.message};
  }

  let lock;
  let locked = false;
  let sendAlert = false;
  let serverTime;
  try {
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) return {ok: false, error: '요청이 몰렸어요. 잠시 후 다시 보내 주세요.'};

    const book = openBook_();
    if (!book) return {ok: false, error: '선생님이 먼저 setup을 실행해야 해요.'};
    const log = book.getSheetByName(SHEET_LOG);
    const submissions = book.getSheetByName(SHEET_SUBMIT);
    const status = book.getSheetByName(SHEET_STATUS);
    if (!log || !submissions || !status) {
      return {ok: false, error: '필요한 시트가 없어요. 선생님이 setup을 다시 실행해 주세요.'};
    }

    serverTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sendAlert = Boolean(ALERT_EMAIL) && request.type === 'away' && request.away === ALERT_AT &&
      !hasAlertRecord_(log, request);
    const details = eventDetails_(request);
    appendRow_(log, [serverTime, request.ws, request.num, request.name, details.kind,
      request.away, details.text, request.sid]);
    if (request.type === 'submit') {
      const d = request.data;
      appendRow_(submissions, [serverTime, request.ws, request.num, request.name, d.score, d.total,
        request.away, d.minutes, d.attempt, d.wrong.join(', '), request.answersJson, request.sid]);
    }
    upsertStatus_(status, request, serverTime);
    SpreadsheetApp.flush();
  } catch (error) {
    console.error('학습지 기록 실패: ' + error.message);
    return {ok: false, error: '저장에 실패했어요. 잠시 후 다시 보내 주세요.'};
  } finally {
    if (locked) lock.releaseLock();
  }

  if (sendAlert) {
    try {
      const clean = function (v) { return String(v).replace(/[\r\n]/g, ' '); };
      MailApp.sendEmail({
        to: ALERT_EMAIL,
        subject: '[' + clean(request.title || request.ws) + '] ' + clean(request.num) + ' ' +
          clean(request.name) + ' 화면 이탈 ' + ALERT_AT + '회',
        body: '학습지: ' + (request.title || request.ws) + '\n학번: ' + request.num + '\n이름: ' + request.name +
          '\n누적 이탈: ' + request.away + '회\n서버시각: ' + serverTime + '\n세션: ' + request.sid
      });
    } catch (error) {
      console.warn('알림 메일 실패: ' + error.message);
    }
  }
  return {ok: true};
}

function openBook_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_SHEET_ID_);
  return id ? SpreadsheetApp.openById(id) : null;
}

function validateSettings_() {
  if (typeof ALERT_EMAIL !== 'string' || !Number.isSafeInteger(ALERT_AT) || ALERT_AT < 1) {
    throw new Error('ALERT_EMAIL, ALERT_AT 설정을 확인해 주세요.');
  }
  const names = [SHEET_LOG, SHEET_SUBMIT, SHEET_STATUS];
  if (names.some(function (n) { return typeof n !== 'string' || !n.trim(); }) || new Set(names).size !== 3) {
    throw new Error('시트 이름은 비어 있지 않고 서로 달라야 해요.');
  }
}

// 잘못된 요청은 시트에 닿기 전에 거절해요.
function parseRequest_(contents) {
  if (typeof contents !== 'string' || contents.length > 40000) {
    throw new Error('본문이 없거나 너무 길어요(최대 40000자).');
  }
  let input;
  try { input = JSON.parse(contents); } catch (error) { throw new Error('JSON 형식이 올바르지 않아요.'); }
  if (!isObject_(input)) throw new Error('요청은 JSON 객체여야 해요.');

  const type = string_(input.type, 'type', 10, false);
  if (['start', 'away', 'back', 'submit'].indexOf(type) < 0) {
    throw new Error('type은 start, away, back, submit 중 하나여야 해요.');
  }
  const request = {
    type: type,
    ws: string_(input.ws, 'ws', 40, false),
    title: input.title === undefined ? '' : string_(input.title, 'title', 60, true).trim(),
    sid: string_(input.sid, 'sid', 40, false),
    num: string_(input.num, 'num', 20, false).trim(),
    name: string_(input.name, 'name', 20, false).trim(),
    t: string_(input.t, 't', 40, false),
    away: integer_(input.away, 'away', 0)
  };
  if (!/^[a-z0-9-]{1,40}$/.test(request.ws)) throw new Error('ws는 영문 소문자·숫자·하이픈이어야 해요.');
  if (!request.num || !request.name) throw new Error('학번과 이름이 필요해요.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(request.t) ||
      !Number.isFinite(Date.parse(request.t))) {
    throw new Error('t는 올바른 ISO 시각이어야 해요.');
  }
  if (type === 'start') return request;
  const data = isObject_(input.data) ? input.data : null;
  if (!data) throw new Error('data 객체가 필요해요.');
  if (type === 'away') {
    if (data.reason !== 'hidden' && data.reason !== 'blur') throw new Error('이탈 사유는 hidden 또는 blur여야 해요.');
    request.data = {reason: data.reason};
  } else if (type === 'back') {
    request.data = {seconds: integer_(data.seconds, 'seconds', 0)};
  } else {
    request.data = {
      score: integer_(data.score, 'score', 0),
      total: integer_(data.total, 'total', 0),
      minutes: integer_(data.minutes, 'minutes', 0),
      attempt: integer_(data.attempt, 'attempt', 1)
    };
    if (request.data.score > request.data.total) throw new Error('점수는 만점보다 클 수 없어요.');
    if (!Array.isArray(data.wrong) || data.wrong.length > 100) throw new Error('wrong은 최대 100개 배열이어야 해요.');
    request.data.wrong = data.wrong.map(function (v) { return string_(v, 'wrong 항목', 100, true); });
    if (!isObject_(data.answers)) throw new Error('answers는 JSON 객체여야 해요.');
    Object.keys(data.answers).forEach(function (key) {
      string_(key, '문항 이름', 40, false);
      string_(data.answers[key], '답안', 2000, true);
    });
    request.answersJson = JSON.stringify(data.answers);
    if (request.answersJson.length > 30000) throw new Error('답안은 합쳐서 최대 30000자예요.');
  }
  return request;
}

function string_(value, label, maxLength, allowEmpty) {
  if (typeof value !== 'string' || value.length > maxLength || (!allowEmpty && !value.trim())) {
    throw new Error(label + ': 문자열(최대 ' + maxLength + '자)' + (allowEmpty ? '' : ', 빈칸 불가') + '여야 해요.');
  }
  return value;
}

function integer_(value, label, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(label + ': ' + minimum + ' 이상의 정수여야 해요.');
  return value;
}

function isObject_(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function eventDetails_(request) {
  if (request.type === 'start') return {kind: '시작', text: request.title};
  if (request.type === 'away') {
    return {kind: '이탈', text: request.data.reason === 'hidden' ? '다른 탭·앱으로 이동' : '창 밖 클릭 3초 이상'};
  }
  if (request.type === 'back') return {kind: '복귀', text: request.data.seconds + '초 자리 비움'};
  return {kind: '제출', text: '점수 ' + request.data.score + '/' + request.data.total};
}

// 같은 학습지·학생·세션의 임계 이탈 기록이 있으면 메일을 다시 보내지 않아요.
function hasAlertRecord_(sheet, request) {
  const count = sheet.getLastRow() - 1;
  if (count < 1) return false;
  return sheet.getRange(2, 2, count, 7).getDisplayValues().some(function (row) {
    return row[0] === request.ws && row[1] === request.num && row[2] === request.name &&
      row[3] === '이탈' && Number(row[4]) === ALERT_AT && row[6] === request.sid;
  });
}

// (학습지, 학번, 이름)이 같은 행을 갱신하고, 없으면 새로 만들어요.
function upsertStatus_(sheet, request, serverTime) {
  const count = sheet.getLastRow() - 1;
  const rows = count > 0 ? sheet.getRange(2, 1, count, HEADERS_STATUS_.length).getDisplayValues() : [];
  const index = rows.findIndex(function (row) {
    return row[0] === request.ws && row[2] === request.num && row[3] === request.name;
  });
  const rowNumber = index < 0 ? sheet.getLastRow() + 1 : index + 2;
  const state = request.type === 'away' ? '자리 비움' : request.type === 'submit' ? '제출함' : '풀이 중';
  const previousScore = index < 0 || rows[index][7] === '' ? '' : Number(rows[index][7]);
  const score = request.type === 'submit' ? request.data.score : request.type === 'start' ? '' : previousScore;
  const title = request.title || (index < 0 ? '' : rows[index][1]);
  writeRow_(sheet, rowNumber, [request.ws, title, request.num, request.name, state, request.away, serverTime, score]);
}

function appendRow_(sheet, values) {
  writeRow_(sheet, sheet.getLastRow() + 1, values);
}

// 문자열은 일반 텍스트로, 숫자는 숫자로 저장해 학번 앞자리 0도 지켜요.
function writeRow_(sheet, rowNumber, values) {
  if (rowNumber > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), Math.max(100, rowNumber - sheet.getMaxRows()));
    refreshRules_(sheet);
  }
  const range = sheet.getRange(rowNumber, 1, 1, values.length);
  range.setNumberFormats([values.map(function (v) { return typeof v === 'number' ? '0' : '@'; })]);
  range.setValues([values.map(safeCell_)]);
}

// 수식으로 해석될 수 있는 값 앞에는 작은따옴표를 붙여요.
function safeCell_(value) {
  return typeof value === 'string' && /^[\s\u0000-\u001f\u007f]*[=+\-@']/.test(value) ? "'" + value : value;
}

function refreshRules_(sheet) {
  let specs;
  if (sheet.getName() === SHEET_LOG) specs = [['=$E2="이탈"', 1, HEADERS_LOG_.length, '#fce4d6']];
  else if (sheet.getName() === SHEET_STATUS) {
    specs = [['=$E2="자리 비움"', 5, 1, '#f4cccc'], ['=$E2="제출함"', 5, 1, '#d9ead3']];
  } else return;
  const formulas = specs.map(function (s) { return s[0]; });
  const rules = sheet.getConditionalFormatRules().filter(function (rule) {
    const c = rule.getBooleanCondition();
    return !c || c.getCriteriaType() !== SpreadsheetApp.BooleanCriteria.CUSTOM_FORMULA ||
      formulas.indexOf(String(c.getCriteriaValues()[0])) < 0;
  });
  const managed = specs.map(function (s) {
    return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(s[0]).setBackground(s[3])
      .setRanges([sheet.getRange(2, s[1], sheet.getMaxRows() - 1, s[2])]).build();
  });
  sheet.setConditionalFormatRules(managed.concat(rules));
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// 선생님 현황판
// ---------------------------------------------------------------------------

function checkKey_(key) {
  const real = PropertiesService.getScriptProperties().getProperty(PROP_TEACHER_KEY_);
  if (!real || typeof key !== 'string' || key.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}

// 현황판이 10초마다 불러요. 현황 시트의 모든 행을 돌려줘요.
function dashboardData(key) {
  if (!checkKey_(key)) throw new Error('현황판 주소가 올바르지 않아요.');
  const book = openBook_();
  if (!book) throw new Error('먼저 setup을 실행하세요.');
  const sheet = book.getSheetByName(SHEET_STATUS);
  const count = sheet ? sheet.getLastRow() - 1 : 0;
  const rows = count > 0 ? sheet.getRange(2, 1, count, HEADERS_STATUS_.length).getDisplayValues() : [];
  return {
    today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    now: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss'),
    nowFull: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    rows: rows.filter(function (r) { return r[0] !== ''; }).map(function (r) {
      return {ws: r[0], title: r[1], num: r[2], name: r[3], state: r[4], away: r[5], last: r[6], score: r[7]};
    })
  };
}

// 현황판의 '지우기'. people = [{num, name}] (학습지 ws 안에서).
// hard가 true면 기록·제출 탭의 해당 줄도 지워요(되돌릴 수 없어요).
// 지운 현황 줄을 돌려줘서 '되돌리기'에 써요.
function dashboardDelete(key, ws, people, hard) {
  if (!checkKey_(key)) throw new Error('현황판 주소가 올바르지 않아요.');
  if (typeof ws !== 'string' || !/^[a-z0-9-]{1,40}$/.test(ws)) throw new Error('학습지 이름이 올바르지 않아요.');
  if (!Array.isArray(people) || !people.length || people.length > 500) throw new Error('지울 학생을 골라 주세요.');
  const wanted = {};
  people.forEach(function (p) {
    if (!isObject_(p) || typeof p.num !== 'string' || typeof p.name !== 'string') throw new Error('지울 학생 정보가 올바르지 않아요.');
    wanted[p.num + '\u0000' + p.name] = true;
  });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('학생 기록을 저장하는 중이에요. 잠시 후 다시 눌러 주세요.');
  try {
    const book = openBook_();
    if (!book) throw new Error('먼저 setup을 실행하세요.');
    // 열 위치: 현황(학습지 A, 학번 C, 이름 D), 기록·제출(학습지 B, 학번 C, 이름 D)
    const removed = deleteMatching_(book.getSheetByName(SHEET_STATUS), 1, ws, wanted);
    let removedLog = 0;
    let removedSubmit = 0;
    if (hard === true) {
      removedLog = deleteMatching_(book.getSheetByName(SHEET_LOG), 2, ws, wanted).length;
      removedSubmit = deleteMatching_(book.getSheetByName(SHEET_SUBMIT), 2, ws, wanted).length;
    }
    SpreadsheetApp.flush();
    return {removed: removed, removedLog: removedLog, removedSubmit: removedSubmit};
  } finally {
    lock.releaseLock();
  }
}

// '되돌리기': 방금 지운 현황 줄을 다시 넣어요(그사이 학생이 다시 들어와 줄이 생겼으면 그대로 둬요).
function dashboardRestore(key, rows) {
  if (!checkKey_(key)) throw new Error('현황판 주소가 올바르지 않아요.');
  if (!Array.isArray(rows) || rows.length > 500) throw new Error('되돌릴 내용이 올바르지 않아요.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('학생 기록을 저장하는 중이에요. 잠시 후 다시 눌러 주세요.');
  try {
    const book = openBook_();
    const sheet = book && book.getSheetByName(SHEET_STATUS);
    if (!sheet) throw new Error('현황 시트가 없어요.');
    const count = sheet.getLastRow() - 1;
    const existing = {};
    (count > 0 ? sheet.getRange(2, 1, count, 4).getDisplayValues() : []).forEach(function (r) {
      existing[r[0] + '\u0000' + r[2] + '\u0000' + r[3]] = true;
    });
    let restored = 0;
    rows.forEach(function (r) {
      if (!Array.isArray(r) || r.length !== HEADERS_STATUS_.length) return;
      const v = r.map(function (x) { return String(x == null ? '' : x).slice(0, 200); });
      if (!/^[a-z0-9-]{1,40}$/.test(v[0]) || existing[v[0] + '\u0000' + v[2] + '\u0000' + v[3]]) return;
      writeRow_(sheet, sheet.getLastRow() + 1, [v[0], v[1], v[2], v[3], v[4],
        /^\d+$/.test(v[5]) ? Number(v[5]) : v[5], v[6], /^\d+$/.test(v[7]) ? Number(v[7]) : v[7]]);
      restored++;
    });
    SpreadsheetApp.flush();
    return {restored: restored};
  } finally {
    lock.releaseLock();
  }
}

// wsCol 열이 ws이고 (학번, 이름)이 wanted에 있는 줄을 지우고, 지운 줄(현황 형식 문자열)을 돌려줘요.
// 이웃한 줄은 한 번에 지워서 빠르게 처리해요.
function deleteMatching_(sheet, wsCol, ws, wanted) {
  if (!sheet) return [];
  const count = sheet.getLastRow() - 1;
  if (count < 1) return [];
  const width = sheet.getLastColumn ? Math.max(sheet.getLastColumn(), 4) : 8;
  const values = sheet.getRange(2, 1, count, width).getDisplayValues();
  const hits = [];
  values.forEach(function (row, i) {
    if (row[wsCol - 1] === ws && wanted[row[2] + '\u0000' + row[3]]) hits.push(i);
  });
  for (let k = hits.length - 1; k >= 0;) {
    let start = hits[k];
    let n = 1;
    while (k - n >= 0 && hits[k - n] === start - 1) { start--; n++; }
    sheet.deleteRows(start + 2, n);
    k -= n;
  }
  return hits.map(function (i) { return values[i].slice(0, HEADERS_STATUS_.length); });
}

function dashboardHtml_(key) {
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>' +
    ':root{--bg:#f5f6f3;--card:#fff;--ink:#1f2a24;--muted:#66726b;--line:#e2e7e3;--accent:#244b3a;--sel:#e8f0fb;--red:#b3261e;--redbg:#fde8e6;--green:#2e7d4a}' +
    'body{font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;margin:0;padding:16px;background:var(--bg);color:var(--ink)}' +
    'h1{font-size:20px;margin:0 0 12px}button{font:inherit;font-size:14px;padding:6px 12px;border:1px solid #c9d1cb;border-radius:8px;background:#fff;color:var(--ink);cursor:pointer}' +
    'button:hover{background:#f0f2ef}button.danger{color:var(--red);border-color:#e9b7b2}button.icon{border:0;background:transparent;padding:4px 6px;color:var(--muted)}button.icon:hover{color:var(--red);background:var(--redbg)}' +
    '.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px;position:relative}.grow{flex:1}' +
    'select{font-size:15px;padding:6px 8px;border-radius:8px;border:1px solid #c9d1cb;max-width:100%}' +
    '.menu{position:absolute;right:0;top:40px;background:#fff;border:1px solid #c9d1cb;border-radius:8px;padding:4px;min-width:240px;z-index:5;box-shadow:0 6px 20px rgba(0,0,0,.08)}' +
    '.menu button{display:block;width:100%;text-align:left;border:0;padding:9px 10px}' +
    '.sum{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.sum div{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 14px;font-size:13px}' +
    '.sum b{display:block;font-size:22px}.sum .red b{color:var(--red)}.sum .green b{color:var(--green)}' +
    '.selbar{display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:8px;background:var(--sel);border-radius:8px;font-size:14px}' +
    'table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:14px}' +
    'th,td{padding:8px 10px;border-bottom:1px solid #eef1ee;text-align:left;white-space:nowrap}th{background:var(--accent);color:#fff;font-weight:600}' +
    'tr.away td{background:var(--redbg)}tr.away td.st{color:var(--red);font-weight:700}tr.done td.st{color:var(--green);font-weight:700}tr.sel td{background:var(--sel)}' +
    '.wrap{overflow-x:auto}.muted{color:var(--muted);font-size:12px}[hidden]{display:none!important}' +
    '.veil{position:fixed;inset:0;background:rgba(20,28,24,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:10}' +
    '.box{background:#fff;border-radius:14px;max-width:420px;width:100%;padding:20px}.box h2{font-size:17px;margin:0 0 8px}.box p{font-size:14px;color:var(--muted);margin:0 0 12px}' +
    '.box label{display:block;font-size:14px;margin-bottom:16px}.box .row{display:flex;gap:8px;justify-content:flex-end}' +
    '.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#1f2a24;color:#fff;border-radius:10px;padding:10px 14px;display:flex;gap:14px;align-items:center;font-size:14px;z-index:9}' +
    '.toast button{background:transparent;color:#cfe8d8;border-color:#55705f}' +
    '</style></head><body><h1>학습지 현황판</h1>' +
    '<div class="bar"><select id="ws" aria-label="학습지"></select><label><input type="checkbox" id="today" checked> 오늘만 보기</label>' +
    '<span class="muted" id="stamp">불러오는 중…</span><span class="grow"></span>' +
    '<button id="alertBtn">알림판 열기</button><button id="moreBtn" aria-haspopup="true" aria-expanded="false">정리 ▾</button>' +
    '<div class="menu" id="menu" hidden role="menu">' +
    '<button data-bulk="old" role="menuitem">오늘 이전 줄 지우기</button>' +
    '<button data-bulk="test" role="menuitem">시험용 학생(00000) 지우기</button>' +
    '<button data-bulk="all" class="danger" role="menuitem">이 학습지 현황 모두 지우기</button></div></div>' +
    '<div class="sum"><div>접속<b id="nAll">0</b></div><div class="red">자리 비움<b id="nAway">0</b></div><div class="green">제출<b id="nDone">0</b></div></div>' +
    '<div class="selbar" id="selbar" hidden><span id="selTxt"></span><span class="grow"></span><button id="selClear">선택 해제</button><button id="selDel" class="danger">현황에서 지우기</button></div>' +
    '<div class="wrap"><table><thead><tr><th><input type="checkbox" id="all" aria-label="모두 선택"></th><th>학번</th><th>이름</th><th>상태</th><th>이탈</th><th>마지막 소식</th><th>점수</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>' +
    '<div class="veil" id="confirm" hidden role="dialog" aria-modal="true" aria-labelledby="cTitle"><div class="box"><h2 id="cTitle"></h2>' +
    '<p>현황판에서만 사라져요. 시트의 기록·제출 탭에는 그대로 남아요. 지금 접속 중인 학생은 다음 신호를 보내면 다시 나타나요.</p>' +
    '<label><input type="checkbox" id="hard"> 기록·제출 탭에서도 완전히 지우기 <span style="color:var(--red)">(되돌릴 수 없어요)</span></label>' +
    '<div class="row"><button id="cNo">취소</button><button id="cYes" class="danger">지우기</button></div></div></div>' +
    '<div class="veil" id="alertBox" hidden role="dialog" aria-modal="true" aria-labelledby="aTitle"><div class="box" style="text-align:center"><h2 id="aTitle">선생님 알림판</h2>' +
    '<p>휴대폰 카메라로 비추면 알림판이 열려요. 오래 자리를 비운 학생이 생기면 소리와 빨간 화면으로 알려 줘요. 이 QR에는 비밀 키가 있으니 학생에게 보여 주지 마세요.</p>' +
    '<div id="qr" style="display:inline-block;margin:4px 0 12px"></div><div class="row" style="justify-content:center"><a id="alertLink" target="_blank" rel="noopener"><button>이 컴퓨터에서 열기</button></a><button id="aClose">닫기</button></div></div></div>' +
    '<div class="toast" id="toast" hidden role="status"><span id="tTxt"></span><button id="undo">되돌리기</button></div>' +
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>' +
    'var KEY=' + JSON.stringify(key) + ',data=null,picked="",sel={},pending=null,undoRows=null,busy=false,toastTimer=null;' +
    'function $(i){return document.getElementById(i)}' +
    'function pk(r){return r.num+"\\u0000"+r.name}' +
    'function td(t,c){var e=document.createElement("td");e.textContent=t;if(c)e.className=c;return e}' +
    'function visible(){if(!data)return[];var today=$("today").checked;return data.rows.filter(function(r){return !today||r.last.slice(0,10)===data.today})}' +
    'function current(){return visible().filter(function(r){return r.ws===picked}).sort(function(a,b){return a.num.localeCompare(b.num,"ko",{numeric:true})})}' +
    'function draw(){if(!data)return;var rows=visible(),seen={},opts=[];rows.forEach(function(r){if(!seen[r.ws]){seen[r.ws]={r:r,last:r.last};opts.push(r)}else if(r.last>seen[r.ws].last)seen[r.ws].last=r.last});' +
    'opts.sort(function(a,b){return seen[b.ws].last.localeCompare(seen[a.ws].last)});if(!seen[picked])picked=opts.length?opts[0].ws:"";var s=$("ws");s.textContent="";' +
    'opts.forEach(function(r){var o=document.createElement("option");o.value=r.ws;o.textContent=r.title||r.ws;if(r.ws===picked)o.selected=true;s.appendChild(o)});' +
    'var cur=current(),keep={};cur.forEach(function(r){if(sel[pk(r)])keep[pk(r)]=1});sel=keep;' +
    'var tb=$("tb");tb.textContent="";var na=0,nd=0;' +
    'cur.forEach(function(r){var tr=document.createElement("tr"),k=pk(r);if(r.state==="자리 비움"){tr.className="away";na++}else if(r.state==="제출함"){tr.className="done";nd++}if(sel[k])tr.className+=" sel";' +
    'var c=document.createElement("td"),cb=document.createElement("input");cb.type="checkbox";cb.checked=!!sel[k];cb.setAttribute("aria-label",r.name+" 선택");cb.onchange=function(){if(cb.checked)sel[k]=1;else delete sel[k];draw()};c.appendChild(cb);tr.appendChild(c);' +
    '[td(r.num),td(r.name),td(r.state,"st"),td(r.away),td(r.last.slice(11)||r.last),td(r.score)].forEach(function(e){tr.appendChild(e)});' +
    'var d=document.createElement("td"),b=document.createElement("button");b.className="icon";b.textContent="지우기";b.setAttribute("aria-label",r.name+" 지우기");b.onclick=function(){ask([r],r.name+"("+r.num+") 학생을 지울까요?")};d.appendChild(b);tr.appendChild(d);tb.appendChild(tr)});' +
    'if(!cur.length){var tr=document.createElement("tr"),c=td("아직 들어온 학생이 없어요.");c.colSpan=8;tr.appendChild(c);tb.appendChild(tr)}' +
    'var n=Object.keys(sel).length;$("selbar").hidden=!n;$("selTxt").textContent=n+"명 선택됨";$("all").checked=n>0&&n===cur.length;' +
    '$("nAll").textContent=cur.length;$("nAway").textContent=na;$("nDone").textContent=nd;$("stamp").textContent="마지막 갱신 "+data.now+" · 10초마다 자동 갱신"}' +
    'function load(){if(busy)return;google.script.run.withSuccessHandler(function(d){if(busy)return;data=d;draw()}).withFailureHandler(function(e){$("stamp").textContent="불러오기 실패: "+e.message}).dashboardData(KEY)}' +
    'function ask(people,title){if(!people.length){toast("지울 학생이 없어요.",false);return}pending=people;$("cTitle").textContent=title;$("hard").checked=false;$("menu").hidden=true;$("moreBtn").setAttribute("aria-expanded","false");$("confirm").hidden=false;$("cNo").focus()}' +
    'function toast(t,canUndo){$("tTxt").textContent=t;$("undo").hidden=!canUndo;$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){$("toast").hidden=true;undoRows=null},10000)}' +
    '$("cNo").onclick=function(){$("confirm").hidden=true;pending=null};' +
    '$("cYes").onclick=function(){if(!pending)return;var hard=$("hard").checked,people=pending.map(function(r){return{num:r.num,name:r.name}}),ws=picked;' +
    '$("confirm").hidden=true;busy=true;$("stamp").textContent="지우는 중…";' +
    'var gone={};people.forEach(function(p){gone[pk(p)]=1});data.rows=data.rows.filter(function(r){return !(r.ws===ws&&gone[pk(r)])});sel={};draw();' +
    'google.script.run.withSuccessHandler(function(res){busy=false;undoRows=hard?null:res.removed;' +
    'var msg=res.removed.length+"명을 현황에서 지웠어요"+(hard?" (기록 "+res.removedLog+"줄, 제출 "+res.removedSubmit+"줄도 지움)":"");toast(msg,!hard);load()})' +
    '.withFailureHandler(function(e){busy=false;toast("지우지 못했어요: "+e.message,false);load()}).dashboardDelete(KEY,ws,people,hard);pending=null};' +
    '$("undo").onclick=function(){if(!undoRows)return;var rows=undoRows;undoRows=null;$("toast").hidden=true;busy=true;' +
    'google.script.run.withSuccessHandler(function(r){busy=false;toast(r.restored+"명을 되돌렸어요",false);load()}).withFailureHandler(function(e){busy=false;toast("되돌리지 못했어요: "+e.message,false)}).dashboardRestore(KEY,rows)};' +
    '$("selClear").onclick=function(){sel={};draw()};' +
    '$("selDel").onclick=function(){var cur=current().filter(function(r){return sel[pk(r)]});ask(cur,"선택한 "+cur.length+"명을 지울까요?")};' +
    '$("all").onchange=function(){sel={};if(this.checked)current().forEach(function(r){sel[pk(r)]=1});draw()};' +
    '$("moreBtn").onclick=function(e){e.stopPropagation();var m=$("menu");m.hidden=!m.hidden;this.setAttribute("aria-expanded",String(!m.hidden))};' +
    'document.addEventListener("click",function(e){if(!$("menu").contains(e.target)){$("menu").hidden=true;$("moreBtn").setAttribute("aria-expanded","false")}});' +
    'document.addEventListener("keydown",function(e){if(e.key==="Escape"){$("menu").hidden=true;$("confirm").hidden=true;pending=null}});' +
    'Array.prototype.forEach.call(document.querySelectorAll("[data-bulk]"),function(b){b.onclick=function(){if(!data)return;var k=b.getAttribute("data-bulk"),all=data.rows.filter(function(r){return r.ws===picked}),t=(all[0]&&(all[0].title||all[0].ws))||"";' +
    'var people=k==="old"?all.filter(function(r){return r.last.slice(0,10)<data.today}):k==="test"?all.filter(function(r){return r.num==="00000"}):all;' +
    'ask(people,k==="all"?"「"+t+"」 현황 "+people.length+"명을 모두 지울까요?":k==="old"?"오늘 이전 "+people.length+"명을 지울까요?":"시험용 학생 "+people.length+"명을 지울까요?")}});' +
    '$("ws").onchange=function(){picked=this.value;sel={};draw()};$("today").onchange=function(){sel={};draw()};' +
    'var ALERT_URL="https://dallalan2277-lab.github.io/classroom-hub/teacher/#k="+encodeURIComponent(KEY);$("alertLink").href=ALERT_URL;' +
    '$("alertBtn").onclick=function(){$("alertBox").hidden=false;var q=$("qr");q.textContent="";if(window.QRCode)new QRCode(q,{text:ALERT_URL,width:220,height:220,correctLevel:QRCode.CorrectLevel.M});else q.textContent="QR을 불러오지 못했어요. 아래 버튼을 쓰세요."};' +
    '$("aClose").onclick=function(){$("alertBox").hidden=true};' +
    'load();setInterval(load,10000);' +
    '</script></body></html>';
}

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
const SHEET_ROSTER = '명단';   // (선택) A열 학번(10712 모양), B열 이름. 있으면 현황판 자리표에 이름과 '안 온 학생'을 보여 줘요.
// 현황판 '학습지' 목록에 보일 학습지(학습지 모음 첫 화면과 같은 순서). 여기 없는 학습지 기록은 시트에는 남지만 현황판에는 안 보여요.
const DASH_SHEETS = [
  ['gugak-class', '국악기 · 수업과 학습지'],
  ['stage-class', '음악극 탐험대 · 수업과 학습지'],
  ['dance-class', '춤을 세계 음악 속으로 · 수업과 학습지'],
  ['pansori-plus', '판소리와 창극 · 수업과 학습지(개선판)']
];

// 아래는 내부용이에요.
const PROP_SHEET_ID_ = 'HUB_SPREADSHEET_ID';
const PROP_TEACHER_KEY_ = 'HUB_TEACHER_KEY';
const HEADERS_LOG_ = ['서버시각', '학습지', '학번', '이름', '종류', '누적 이탈', '세부', '세션'];
const HEADERS_SUBMIT_ = ['서버시각', '학습지', '학번', '이름', '점수', '만점', '이탈 횟수',
  '걸린 시간(분)', '제출 차수', '틀린 문항', '답안(JSON)', '세션'];
const HEADERS_STATUS_ = ['학습지', '제목', '학번', '이름', '상태', '누적 이탈', '마지막 소식 시각', '점수', '마지막 신호(순서 확인용)'];

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
      [SHEET_STATUS, HEADERS_STATUS_, [140, 200, 80, 90, 90, 80, 160, 60, 260]]
    ];
    specs.forEach(function (spec) {
      const sheet = book.getSheetByName(spec[0]);
      if (sheet && sheet.getLastRow() > 0) {
        // 나중에 뒤쪽에 새 칸을 더한 경우(예전 시트는 그 칸이 비어 있음)도 받아들여요.
        const header = sheet.getRange(1, 1, 1, spec[1].length).getDisplayValues()[0];
        while (header.length && header[header.length - 1] === '') header.pop();
        const shortest = spec[1].length - (spec[0] === SHEET_STATUS ? 1 : 0);
        if (header.length < shortest || header.join('\t') !== spec[1].slice(0, header.length).join('\t')) {
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
    // 명단 탭은 없을 때만 머리글과 함께 만들어요(선생님이 채운 명단은 건드리지 않아요).
    if (!book.getSheetByName(SHEET_ROSTER)) {
      const roster = book.insertSheet(SHEET_ROSTER);
      roster.getRange(1, 1, 1, 2).setValues([['학번', '이름']]).setBackground('#1f4e78').setFontColor('#ffffff').setFontWeight('bold');
      roster.setFrozenRows(1);
    }
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
    try { const d = dashboardData(p.dash, true); d.ok = true; return json_(d); }
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
    // 같은 신호를 다시 받았거나(재전송) 더 나중 신호보다 늦게 도착했는지 먼저 봐요.
    const current = findStatus_(status, request);
    const order = eventOrder_(current.row, request);
    if (order === 'dup') return {ok: true, dup: true};
    sendAlert = Boolean(ALERT_EMAIL) && request.type === 'away' && request.away === ALERT_AT &&
      !hasAlertRecord_(log, request);
    const details = eventDetails_(request);
    appendRow_(log, [serverTime, request.ws, request.num, request.name, details.kind,
      request.away, details.text + (order === 'late' ? ' (늦게 도착해 현황에는 반영 안 함)' : ''), request.sid]);
    if (request.type === 'submit') {
      const d = request.data;
      appendRow_(submissions, [serverTime, request.ws, request.num, request.name, d.score, d.total,
        request.away, d.minutes, d.attempt, d.wrong.join(', '), request.answersJson, request.sid]);
    }
    if (order !== 'late' || request.type === 'submit') writeStatus_(status, current, request, serverTime, order);
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
    if (['hidden', 'blur', 'small'].indexOf(data.reason) < 0) throw new Error('이탈 사유는 hidden, blur, small 중 하나여야 해요.');
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
    return {kind: '이탈', text: request.data.reason === 'hidden' ? '다른 탭·앱으로 이동' :
      request.data.reason === 'small' ? '창 작아짐(화면 분할·팝업 의심)' : '창 밖 클릭 3초 이상'};
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

// (학습지, 학번, 이름)이 같은 현황 줄을 찾아요. 머리글 줄도 같은 호출로 읽어 '마지막 신호' 칸 머리글이 비었는지 봐요.
function findStatus_(sheet, request) {
  ensureColumns_(sheet, HEADERS_STATUS_.length);
  const last = sheet.getLastRow();
  const all = last > 0 ? sheet.getRange(1, 1, last, HEADERS_STATUS_.length).getDisplayValues() : [];
  const headerMissing = all.length > 0 && all[0][HEADERS_STATUS_.length - 1] === '';
  const rows = all.slice(1);
  const index = rows.findIndex(function (row) {
    return row[0] === request.ws && row[2] === request.num && row[3] === request.name;
  });
  return {index: index, row: index < 0 ? null : rows[index], lastRow: last, headerMissing: headerMissing};
}

// 마지막 신호 칸: "세션 기기시각 종류". 같은 세션(같은 기기·같은 로그인)의 신호끼리만 순서를 비교해요.
//  'dup'  같은 신호를 또 받음(재전송) → 아무것도 쓰지 않음
//  'late' 이미 반영한 신호보다 먼저 생긴 신호가 늦게 도착 → 기록에는 남기고 현황은 그대로
//  'new'  그 밖
function eventOrder_(row, request) {
  if (!row) return 'new';
  const mark = String(row[HEADERS_STATUS_.length - 1] || '').split(' ');
  if (mark.length < 3 || mark[0] !== request.sid) return 'new';
  const before = Date.parse(mark[1]);
  const now = Date.parse(request.t);
  if (!Number.isFinite(before) || !Number.isFinite(now)) return 'new';
  if (now === before && mark[2] === request.type) return 'dup';
  return now < before ? 'late' : 'new';
}

// 현황 줄을 갱신하고, 없으면 새로 만들어요.
// 이미 제출한 학생은 이탈·복귀가 와도 '제출함'을 지켜요(이탈 횟수만 늘어요).
function writeStatus_(sheet, current, request, serverTime, order) {
  if (current.headerMissing) {
    sheet.getRange(1, HEADERS_STATUS_.length, 1, 1).setValues([[HEADERS_STATUS_[HEADERS_STATUS_.length - 1]]]);
  }
  const prev = current.row;
  const rowNumber = current.index < 0 ? Math.max(current.lastRow, 1) + 1 : current.index + 2;
  let state = request.type === 'away' ? '자리 비움' : request.type === 'submit' ? '제출함' : '풀이 중';
  if (prev && prev[4] === '제출함' && (request.type === 'away' || request.type === 'back')) state = '제출함';
  const previousScore = !prev || prev[7] === '' ? '' : Number(prev[7]);
  const score = request.type === 'submit' ? request.data.score : request.type === 'start' ? '' : previousScore;
  const title = request.title || (prev ? prev[1] : '');
  if (order === 'late') {
    // 늦게 도착한 제출: 이미 '제출함'이면(더 나중 제출이 먼저 왔을 수 있음) 그대로 두고,
    // 아니면 상태와 점수만 반영하고 나머지는 더 나중 신호 그대로 둬요.
    if (prev[4] === '제출함') return;
    writeRow_(sheet, rowNumber, [prev[0], title, prev[2], prev[3], '제출함',
      /^\d+$/.test(prev[5]) ? Number(prev[5]) : prev[5], prev[6], score, prev[8]]);
    return;
  }
  // 창이 작아져서 생긴 자리 비움은 순서 칸 끝에 small 을 붙여 현황판이 색을 다르게 보여 줘요.
  const why = request.type === 'away' && request.data.reason === 'small' ? ' small' : '';
  writeRow_(sheet, rowNumber, [request.ws, title, request.num, request.name, state, request.away, serverTime, score,
    request.sid + ' ' + request.t + ' ' + request.type + why]);
}

// 시트 칸이 모자라면(예전에 칸을 줄여 둔 시트) 늘려요. 읽기 전에 불러야 범위 오류가 안 나요.
function ensureColumns_(sheet, n) {
  if (sheet.getMaxColumns() < n) sheet.insertColumnsAfter(sheet.getMaxColumns(), n - sheet.getMaxColumns());
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
  ensureColumns_(sheet, values.length);
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
// noRoster: 알림판(5초마다)은 명단이 필요 없어 읽지 않아요.
function dashboardData(key, noRoster) {
  if (!checkKey_(key)) throw new Error('현황판 주소가 올바르지 않아요.');
  const book = openBook_();
  if (!book) throw new Error('먼저 setup을 실행하세요.');
  const sheet = book.getSheetByName(SHEET_STATUS);
  if (sheet) ensureColumns_(sheet, HEADERS_STATUS_.length);
  const count = sheet ? sheet.getLastRow() - 1 : 0;
  const rows = count > 0 ? sheet.getRange(2, 1, count, HEADERS_STATUS_.length).getDisplayValues() : [];
  return {
    today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    now: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss'),
    nowFull: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    rows: rows.filter(function (r) { return r[0] !== ''; }).map(function (r) {
      return {ws: r[0], title: r[1], num: r[2], name: r[3], state: r[4], away: r[5], last: r[6], score: r[7],
        small: r[4] === '자리 비움' && / small$/.test(r[8]) ? 1 : 0};
    }),
    roster: noRoster === true ? [] : rosterData_(book)
  };
}

// 명단 탭(있으면)의 학번·이름. 학번은 10712 모양(학년 1자리·반 2자리·번호 2자리)만 받아요.
function rosterData_(book) {
  const sheet = book.getSheetByName(SHEET_ROSTER);
  const count = sheet ? sheet.getLastRow() - 1 : 0;
  if (count < 1) return [];
  const seen = {};
  return sheet.getRange(2, 1, Math.min(count, 2000), 2).getDisplayValues().map(function (r) {
    return {num: String(r[0]).replace(/[,\s]/g, ''), name: String(r[1]).trim().slice(0, 20)};
  }).filter(function (r) {
    // 로그인 창에서 고를 수 있는 학번(1~3학년, 1~9반, 1~30번)만 받아요.
    if (!/^[1-3]0[1-9](0[1-9]|[12]\d|30)$/.test(r.num) || seen[r.num]) return false;
    seen[r.num] = true;
    return true;
  });
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
      // 예전 현황판(8칸)에서 지운 줄도 되돌릴 수 있게 8칸이면 빈 칸을 하나 붙여요.
      if (Array.isArray(r) && r.length === HEADERS_STATUS_.length - 1) r = r.concat(['']);
      if (!Array.isArray(r) || r.length !== HEADERS_STATUS_.length) return;
      const v = r.map(function (x) { return String(x == null ? '' : x).slice(0, 200); });
      if (!/^[a-z0-9-]{1,40}$/.test(v[0]) || existing[v[0] + '\u0000' + v[2] + '\u0000' + v[3]]) return;
      writeRow_(sheet, sheet.getLastRow() + 1, [v[0], v[1], v[2], v[3], v[4],
        /^\d+$/.test(v[5]) ? Number(v[5]) : v[5], v[6], /^\d+$/.test(v[7]) ? Number(v[7]) : v[7], v[8]]);
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
    'a.abtn{display:inline-block;font-size:14px;padding:6px 12px;border:1px solid var(--accent);border-radius:8px;background:var(--accent);color:#fff;text-decoration:none;cursor:pointer}a.abtn:hover{filter:brightness(1.15)}' +
    '#aUrl{width:100%;box-sizing:border-box;font-size:12px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;margin-top:10px;color:var(--muted)}#aMsg{font-size:13px;min-height:1em;margin:8px 0 0;color:var(--accent)}' +
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
    '.seg{display:inline-flex;border:1px solid #c9d1cb;border-radius:8px;overflow:hidden}.seg button{border:0;border-radius:0;padding:6px 12px}.seg button.on{background:var(--accent);color:#fff}' +
    '.seats{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}' +
    '.seat{border:1px solid #cfe0d5;background:#fff;border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.4;min-height:64px}' +
    '.seat .no{font-weight:700;font-size:15px}.seat .nm{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.seat .st{display:block;font-size:12px;color:var(--muted)}' +
    '.seat.none{background:#eef0ed;border:1px dashed #b9c2bc;color:#7d8882}.seat.none .st{color:#7d8882;font-weight:700}' +
    '.seat.away{background:var(--redbg);border-color:#e9b7b2}.seat.away .st{color:var(--red);font-weight:700}' +
    '.seat.small{background:#fff1e0;border-color:#efc58f}.seat.small .st{color:#b35c00;font-weight:700}' +
    'tr.small td{background:#fff1e0}tr.small td.st{color:#b35c00;font-weight:700}.legend{font-size:12px;color:var(--muted);margin:0 0 8px}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin:0 4px 0 10px;vertical-align:-1px}' +
    '.seat.done{background:#e6f4ea;border-color:#b5dcc1}.seat.done .st{color:var(--green);font-weight:700}' +
    '.seat .warn{display:block;font-size:11px;color:#9a5b00;font-weight:700}.seathelp{font-size:13px;color:var(--muted);padding:16px;background:#fff;border-radius:10px}' +
    '.sum .gray b{color:#7d8882}' +
    '</style></head><body><h1>학습지 현황판</h1>' +
    '<div class="bar"><select id="ws" aria-label="학습지"></select><select id="cls" aria-label="반"><option value="">모든 반</option></select>' +
    '<span class="seg" role="group" aria-label="보기"><button id="vList" type="button">목록</button><button id="vSeat" type="button">자리표</button></span>' +
    '<label id="seatNWrap" hidden>인원 <select id="seatN" aria-label="반 인원"></select></label>' +
    '<label><input type="checkbox" id="today" checked> 오늘만 보기</label>' +
    '<span class="muted" id="stamp">불러오는 중…</span><span class="grow"></span>' +
    '<button id="alertBtn">알림판 열기</button><button id="moreBtn" aria-haspopup="true" aria-expanded="false">정리 ▾</button>' +
    '<div class="menu" id="menu" hidden role="menu">' +
    '<button data-bulk="old" role="menuitem">오늘 이전 줄 지우기</button>' +
    '<button data-bulk="test" role="menuitem">시험용 학생(00000) 지우기</button>' +
    '<button data-bulk="all" class="danger" role="menuitem">이 학습지 현황 모두 지우기</button></div></div>' +
    '<div class="sum"><div>접속<b id="nAll">0</b></div><div class="red">자리 비움<b id="nAway">0</b></div><div class="green">제출<b id="nDone">0</b></div><div class="gray" id="noneBox" hidden>안 옴<b id="nNone">0</b></div></div>' +
    '<div class="selbar" id="selbar" hidden><span id="selTxt"></span><span class="grow"></span><button id="selClear">선택 해제</button><button id="selDel" class="danger">현황에서 지우기</button></div>' +
    '<p class="legend">색: <i style="background:#fde8e6;border:1px solid #e9b7b2"></i>자리 비움 <i style="background:#fff1e0;border:1px solid #efc58f"></i>자리 비움(창이 작아짐 · 화면 분할·팝업 의심)</p>' +
    '<div class="seats" id="seats" hidden></div>' +
    '<div class="wrap" id="listWrap"><table><thead><tr><th><input type="checkbox" id="all" aria-label="모두 선택"></th><th>학번</th><th>이름</th><th>상태</th><th>이탈</th><th>마지막 소식</th><th>점수</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>' +
    '<div class="veil" id="confirm" hidden role="dialog" aria-modal="true" aria-labelledby="cTitle"><div class="box"><h2 id="cTitle"></h2>' +
    '<p>현황판에서만 사라져요. 시트의 기록·제출 탭에는 그대로 남아요. 지금 접속 중인 학생은 다음 신호를 보내면 다시 나타나요.</p>' +
    '<label><input type="checkbox" id="hard"> 기록·제출 탭에서도 완전히 지우기 <span style="color:var(--red)">(되돌릴 수 없어요)</span></label>' +
    '<div class="row"><button id="cNo">취소</button><button id="cYes" class="danger">지우기</button></div></div></div>' +
    '<div class="veil" id="alertBox" hidden role="dialog" aria-modal="true" aria-labelledby="aTitle"><div class="box" style="text-align:center"><h2 id="aTitle">선생님 알림판</h2>' +
    '<p>휴대폰 카메라로 비추면 알림판이 열려요. 오래 자리를 비운 학생이 생기면 소리와 빨간 화면으로 알려 줘요. 이 QR에는 비밀 키가 있으니 학생에게 보여 주지 마세요.</p>' +
    '<div id="qr" style="display:inline-block;margin:4px 0 12px"></div><div class="row" style="justify-content:center"><a id="alertLink" class="abtn" target="_blank" rel="noopener">이 컴퓨터에서 열기</a><button id="aCopy">주소 복사</button><button id="aClose">닫기</button></div>' +
    '<p id="aMsg" role="status"></p><input id="aUrl" readonly aria-label="알림판 주소" hidden></div></div>' +
    '<div class="toast" id="toast" hidden role="status"><span id="tTxt"></span><button id="undo">되돌리기</button></div>' +
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>' +
    'var SHEETS=' + JSON.stringify(DASH_SHEETS) + ',KEY=' + JSON.stringify(key) + ',data=null,picked="",cls="",view="list",sel={},pending=null,undoRows=null,busy=false,toastTimer=null;' +
    'var MEM={};function ls(k,v){if(v!==undefined)MEM[k]=v;try{if(v===undefined)return localStorage.getItem(k)||MEM[k]||null;localStorage.setItem(k,v)}catch(e){return MEM[k]||null}}' +
    'view=ls("hub:view")==="seat"?"seat":"list";cls=ls("hub:cls")||"";' +
    'function clsOf(n){return /^[1-3][0-9]{4}$/.test(n)?n.slice(0,3):""}' +
    'function clsName(c){return c.charAt(0)+"학년 "+Number(c.slice(1))+"반"}' +
    'function $(i){return document.getElementById(i)}' +
    'function pk(r){return r.num+"\\u0000"+r.name}' +
    'function td(t,c){var e=document.createElement("td");e.textContent=t;if(c)e.className=c;return e}' +
    'function visible(){if(!data)return[];var today=$("today").checked;return data.rows.filter(function(r){return !today||r.last.slice(0,10)===data.today})}' +
    'function current(){return visible().filter(function(r){return r.ws===picked&&(!cls||clsOf(r.num)===cls)}).sort(function(a,b){return a.num.localeCompare(b.num,"ko",{numeric:true})})}' +
    'function draw(){if(!data)return;var ok={},best="",bestAt="";SHEETS.forEach(function(w){ok[w[0]]=1});' +
    'data.rows.forEach(function(r){if(ok[r.ws]&&r.last>bestAt){bestAt=r.last;best=r.ws}});if(!ok[picked])picked=best||SHEETS[0][0];var s=$("ws");s.textContent="";' +
    'SHEETS.forEach(function(w){var o=document.createElement("option");o.value=w[0];o.textContent=w[1];if(w[0]===picked)o.selected=true;s.appendChild(o)});drawCls();' +
    'var cur=current(),keep={};cur.forEach(function(r){if(sel[pk(r)])keep[pk(r)]=1});sel=keep;' +
    'var tb=$("tb");tb.textContent="";var na=0,nd=0;' +
    'cur.forEach(function(r){var tr=document.createElement("tr"),k=pk(r);if(r.state==="자리 비움"){tr.className=r.small?"away small":"away";na++}else if(r.state==="제출함"){tr.className="done";nd++}if(sel[k])tr.className+=" sel";' +
    'var c=document.createElement("td"),cb=document.createElement("input");cb.type="checkbox";cb.checked=!!sel[k];cb.setAttribute("aria-label",r.name+" 선택");cb.onchange=function(){if(cb.checked)sel[k]=1;else delete sel[k];draw()};c.appendChild(cb);tr.appendChild(c);' +
    '[td(r.num),td(r.name),td(r.state,"st"),td(r.away),td(r.last.slice(11)||r.last),td(r.score)].forEach(function(e){tr.appendChild(e)});' +
    'var d=document.createElement("td"),b=document.createElement("button");b.className="icon";b.textContent="지우기";b.setAttribute("aria-label",r.name+" 지우기");b.onclick=function(){ask([r],r.name+"("+r.num+") 학생을 지울까요?")};d.appendChild(b);tr.appendChild(d);tb.appendChild(tr)});' +
    'if(!cur.length){var tr=document.createElement("tr"),c=td("아직 들어온 학생이 없어요.");c.colSpan=8;tr.appendChild(c);tb.appendChild(tr)}' +
    'var n=Object.keys(sel).length;$("selbar").hidden=!n;$("selTxt").textContent=n+"명 선택됨";$("all").checked=n>0&&n===cur.length;' +
    '$("nAll").textContent=cur.length;$("nAway").textContent=na;$("nDone").textContent=nd;$("stamp").textContent="마지막 갱신 "+data.now+" · 10초마다 자동 갱신";drawSeats(cur)}' +
    'function drawCls(){var have={};data.rows.forEach(function(r){if(r.ws===picked&&clsOf(r.num))have[clsOf(r.num)]=1});(data.roster||[]).forEach(function(r){have[clsOf(r.num)]=1});' +
    'if(cls)have[cls]=1;var s=$("cls");s.textContent="";var o=document.createElement("option");o.value="";o.textContent="모든 반";s.appendChild(o);' +
    'Object.keys(have).sort().forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=clsName(c);if(c===cls)o.selected=true;s.appendChild(o)})}' +
    'function seatN(){var n=Number(ls("hub:n:"+cls));return n>=1&&n<=30?n:25}' +
    'function drawSeats(cur){var seat=view==="seat";$("seats").hidden=!seat;$("listWrap").hidden=seat;$("vList").className=seat?"":"on";$("vSeat").className=seat?"on":"";' +
    'var ros=cls?(data.roster||[]).filter(function(r){return clsOf(r.num)===cls}):[];$("seatNWrap").hidden=!seat||!cls||ros.length>0;$("noneBox").hidden=!seat||!cls;' +
    'if(!seat)return;var box=$("seats");box.textContent="";' +
    'if(!cls){var h=document.createElement("div");h.className="seathelp";h.textContent="위에서 반을 고르면 번호마다 들어왔는지 보여 줘요. (구글 시트 명단 탭에 학번·이름을 적어 두면 이름도 나와요.)";box.appendChild(h);return}' +
    'var rn={},nos={},by={};ros.forEach(function(r){var k=Number(r.num.slice(3));rn[k]=r.name;nos[k]=1});' +
    'var lim=ros.length?0:seatN();if(!ros.length)for(var i=1;i<=lim;i++)nos[i]=1;cur.forEach(function(r){var k=Number(r.num.slice(3));if(k<1)return;nos[k]=1;(by[k]=by[k]||[]).push(r)});' +
    'var none=0;Object.keys(nos).map(Number).sort(function(a,b){return a-b}).forEach(function(k){var rows=(by[k]||[]).slice().sort(function(a,b){return b.last.localeCompare(a.last)}),r=rows[0],d=document.createElement("div");' +
    'var inRos=Object.prototype.hasOwnProperty.call(rn,k),nameOk=!r||!inRos||!rn[k]||rows.some(function(x){return x.name===rn[k]});' +
    'var st=!r?"none":r.state==="자리 비움"?(r.small?"small":"away"):r.state==="제출함"?"done":"on";if(!r||!nameOk)none++;d.className="seat "+st;' +
    'var no=document.createElement("span");no.className="no";no.textContent=k+"번";d.appendChild(no);' +
    'var nm=document.createElement("span");nm.className="nm";nm.textContent=r?rows.map(function(x){return x.name}).join(", "):(rn[k]||"");d.appendChild(nm);' +
    'var t=document.createElement("span");t.className="st";t.textContent=!r?"안 옴":r.state+(Number(r.away)>0?" · 이탈 "+r.away:"")+(r.state==="제출함"&&r.score!==""?" · "+r.score+"점":"");d.appendChild(t);' +
    'var ws=[];if(rows.length>1)ws.push("이름이 "+rows.length+"개예요");if(r&&!nameOk)ws.push("명단: "+rn[k]+" (안 옴으로 셈)");else if(r&&rn[k]&&rows.some(function(x){return x.name!==rn[k]}))ws.push("명단: "+rn[k]);' +
    'if(r&&ros.length&&!inRos)ws.push("명단에 없는 번호");if(r&&lim&&k>lim)ws.push("인원 밖 번호");' +
    'ws.forEach(function(w){var e=document.createElement("span");e.className="warn";e.textContent=w;d.appendChild(e)});d.title=k+"번 "+nm.textContent+" "+t.textContent;box.appendChild(d)});' +
    '$("nNone").textContent=none}' +
    'var loading=false;function load(){if(busy||loading)return;loading=true;google.script.run.withSuccessHandler(function(d){loading=false;if(busy)return;data=d;draw()}).withFailureHandler(function(e){loading=false;$("stamp").textContent="불러오기 실패: "+e.message}).dashboardData(KEY)}' +
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
    'Array.prototype.forEach.call(document.querySelectorAll("[data-bulk]"),function(b){b.onclick=function(){if(!data)return;var k=b.getAttribute("data-bulk"),all=data.rows.filter(function(r){return r.ws===picked}),t=picked;SHEETS.forEach(function(w){if(w[0]===picked)t=w[1]});' +
    'var people=k==="old"?all.filter(function(r){return r.last.slice(0,10)<data.today}):k==="test"?all.filter(function(r){return r.num==="00000"}):all;' +
    'ask(people,k==="all"?"「"+t+"」 현황 "+people.length+"명을 모두 지울까요?":k==="old"?"오늘 이전 "+people.length+"명을 지울까요?":"시험용 학생 "+people.length+"명을 지울까요?")}});' +
    '$("ws").onchange=function(){picked=this.value;sel={};draw()};$("today").onchange=function(){sel={};draw()};' +
    '$("cls").onchange=function(){cls=this.value;ls("hub:cls",cls);sel={};fillN();draw()};' +
    '$("vList").onclick=function(){view="list";ls("hub:view",view);draw()};$("vSeat").onclick=function(){view="seat";ls("hub:view",view);draw()};' +
    'function fillN(){var s=$("seatN");if(!s.options.length)for(var i=1;i<=30;i++){var o=document.createElement("option");o.value=String(i);o.textContent=i+"명";s.appendChild(o)}s.value=String(seatN())}fillN();' +
    '$("seatN").onchange=function(){ls("hub:n:"+cls,this.value);draw()};' +
    'var ALERT_URL="https://dallalan2277-lab.github.io/classroom-hub/teacher/#k="+encodeURIComponent(KEY);$("alertLink").href=ALERT_URL;' +
    '$("alertBtn").onclick=function(){$("alertBox").hidden=false;var q=$("qr");q.textContent="";if(window.QRCode)new QRCode(q,{text:ALERT_URL,width:220,height:220,correctLevel:QRCode.CorrectLevel.M});else q.textContent="QR을 불러오지 못했어요. 아래 버튼을 쓰세요."};' +
    '$("aClose").onclick=function(){$("alertBox").hidden=true;$("aMsg").textContent="";$("aUrl").hidden=true};' +
    'function showUrl(){var u=$("aUrl");u.value=ALERT_URL;u.hidden=false;u.focus();u.select()}' +
    'function copyUrl(done){var ok=function(){$("aMsg").textContent=done||"주소를 복사했어요. 새 탭 주소창에 붙여 넣어 주세요."};' +
    'var old=function(){showUrl();var r=false;try{r=document.execCommand("copy")}catch(e){}$("aMsg").textContent=r?(done||"주소를 복사했어요. 새 탭 주소창에 붙여 넣어 주세요."):"아래 주소를 복사(Ctrl+C)해 새 탭 주소창에 붙여 넣어 주세요."};' +
    'try{navigator.clipboard.writeText(ALERT_URL).then(ok,old)}catch(e){old()}}' +
    '$("aCopy").onclick=function(){copyUrl()};' +
    '$("alertLink").onclick=function(ev){var w=null;try{w=window.open(ALERT_URL,"_blank")}catch(e){}' +
    'if(w){ev.preventDefault();try{w.opener=null}catch(e){}$("aMsg").textContent="새 탭에 알림판을 열었어요."}' +
    'else{ev.preventDefault();copyUrl("새 탭이 막혀 주소를 복사했어요. 새 탭 주소창에 붙여 넣어 주세요.")}};' +
    'load();setInterval(load,10000);' +
    '</script></body></html>';
}

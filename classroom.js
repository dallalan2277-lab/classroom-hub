/*
 * classroom.js — 학습지 공용 연결 파일
 *
 * 학습지 HTML에 아래 한 줄만 넣으면 됩니다.
 *   <script src="https://dallalan2277-lab.github.io/classroom-hub/classroom.js"
 *           data-ws="gugak-instruments" data-title="국악기 학습지"></script>
 *
 *  - data-ws    : 학습지 구분 이름(영문 소문자·숫자·하이픈, 40자 이내). 시트의 '학습지' 칸에 들어가요.
 *  - data-title : 선생님 현황판에 보일 제목.
 *
 * 하는 일
 *  1) 처음 들어오면 학년·반·번호(골라서 → 학번 10712 모양)와 이름을 받아요.
 *     같은 기기에서 다시 열면 그대로 이어 가되, 날짜가 바뀌었거나 40분 넘게 쓰지 않았으면 "○○○ 학생 맞나요?"를 물어요
 *     (공용 태블릿을 다른 학생이 이어 쓰는 경우 대비). 날짜가 바뀐 경우에는 오늘 시작으로 다시 알려요.
 *  2) 다른 탭·앱으로 가거나 창 밖을 3초 넘게 누르면 '자리 비움'을 허브로 보내고, 돌아오면 경고를 보여 줘요.
 *     학습지 화면으로 돌아와 창을 누르거나 만지면 '복귀'는 저절로 보내요(경고 창 버튼을 안 눌러도 돼요).
 *     화면 분할·팝업 창으로 학습지 창이 평소보다 많이 작아진 채 5초가 지나도 '자리 비움'으로 보내고(사유 small),
 *     창이 다시 커지면 복귀를 보내요. 학생 경고 창 문구는 다른 이탈과 같아요(선생님 화면에서만 색이 달라요).
 *     시작·자리 비움·복귀 신호는 차례대로 보내고, 실패하면 저장해 두었다가 다시 보내요.
 *  3) 학습지가 Classroom.submit({...})을 부르면 결과를 허브로 보내요.
 *
 * 학습지 코드에서 쓰는 것
 *  Classroom.ready            : 학번·이름 입력이 끝나면 풀리는 Promise({num, name})
 *  Classroom.student          : 현재 학생 {num, name} 또는 null
 *  Classroom.submit(result)   : result = {score, total, wrong:[...], answers:{문항: '답'}}
 *                               → Promise<{ok:boolean, error?:string, offline?:boolean}>
 *  Classroom.online           : 허브 주소가 설정되어 실제로 전송하는지 여부
 *  Classroom.away             : 지금까지 자리 비움 횟수
 *  Classroom.switchStudent()  : 다른 학생으로 바꾸기(이 기기의 기록을 지우고 다시 입력)
 *  Classroom.teacher          : 교사 모드인지 여부
 *  document 이벤트            : 'classroom:away'(자리 비움 생김), 'classroom:switch'(학생 바뀜 → 학습지 기록 지우기)
 *
 * 교사 모드: 학습지 주소 뒤에 ?교사 (또는 ?teacher)를 붙여 열어요. 예) …/gugak/?교사  (…/gugak/#home?교사 처럼 # 뒤에 붙여도 돼요)
 *  - 학번·이름을 묻지 않고, 자리 비움을 세지 않고, 허브로 아무것도 보내지 않아요.
 *  - 제출하면 {ok:true, offline:true, teacher:true}가 돌아와 학습지가 채점·정답을 보여 줘요.
 *  - 이 기기의 학생 기록과 섞이지 않게, 교사 모드에서 쓰는 브라우저 저장은 'teacher:' 이름표를 붙여 따로 둬요.
 *  - 비밀번호가 없는 간단한 방식이라 학생도 주소를 알면 들어올 수 있어요(기록은 남지 않음).
 */
(function () {
  'use strict';

  // 중앙 허브(Apps Script 웹 앱) 주소. 배포 후 한 번만 채우면 모든 학습지에 적용돼요.
  var HUB_URL = 'https://script.google.com/macros/s/AKfycbyIvmwidYjUqyMIx5SdVP4NhY5tsqAhuWOGzOhtRUI4NSYAoQkKMt-6s7DFud7s5aMN/exec';

  var script = document.currentScript || document.querySelector('script[data-ws]');
  var WS = (script && script.getAttribute('data-ws') || '').trim();
  var TITLE = (script && script.getAttribute('data-title') || document.title || '').trim().slice(0, 60);
  var HUB = (script && script.getAttribute('data-hub')) || HUB_URL;
  // 시험용: 이 컴퓨터(localhost)에서 열 때만 ?hub=주소 로 허브를 바꿔 볼 수 있어요.
  try { var qh = new URLSearchParams(location.search).get('hub'); if (qh && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) HUB = qh; } catch (e) {}
  if (!/^[a-z0-9-]{1,40}$/.test(WS)) {
    console.error('[classroom] data-ws는 영문 소문자·숫자·하이픈 40자 이내여야 해요:', WS);
    return;
  }
  var ONLINE = /^https:\/\//.test(HUB) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(HUB);
  var KEY = 'classroom:' + WS;

  // ---- 교사 모드 (?교사 또는 ?teacher) ---------------------------------------
  var TEACHER = false;
  try { var tq = new URLSearchParams(location.search); TEACHER = tq.has('교사') || tq.has('teacher'); } catch (e) {}
  // 주소 끝에 #home 같은 것이 있을 때 그 뒤에 ?교사를 붙여도(…/#home?교사) 교사 모드로 열고,
  // 주소를 올바른 모양(…/?교사#home)으로 고쳐 둬요(새로고침해도 유지, 학습지의 # 길찾기가 안 헷갈리게).
  try {
    var hraw = location.hash, hdec = hraw; try { hdec = decodeURIComponent(hraw); } catch (e) {}
    var hre = /[?&](교사|teacher)(?=$|[&=])(=[^&]*)?/;
    if (!TEACHER && hre.test(hdec)) {
      TEACHER = true;
      var nh = hdec.replace(hre, '').replace(/[?&]$/, '').replace(/\?&/, '?');
      var nu = new URL(location.href); nu.hash = nh.length > 1 ? nh : ''; nu.searchParams.set('교사', '');
      history.replaceState(history.state, '', nu.pathname + nu.search.replace(/=(?=&|$)/g, '') + nu.hash);
    }
  } catch (e) {}
  if (TEACHER) {
    ONLINE = false;
    // 학습지들이 쓰는 localStorage 이름 앞에 'teacher:'를 붙여, 같은 기기의 학생 기록을 건드리지 않아요.
    // (classroom.js가 학습지 코드보다 먼저 실행되어야 해요.)
    try {
      var LS = window.localStorage, SP = Storage.prototype, g = SP.getItem, st = SP.setItem, rm = SP.removeItem;
      var tk = function (store, k) { return store === LS ? 'teacher:' + k : k; };
      SP.getItem = function (k) { return g.call(this, tk(this, k)); };
      SP.setItem = function (k, v) { return st.call(this, tk(this, k), v); };
      SP.removeItem = function (k) { return rm.call(this, tk(this, k)); };
    } catch (e) {}
  }
  function leaveTeacher() {
    try { var u = new URL(location.href); u.searchParams.delete('교사'); u.searchParams.delete('teacher'); location.href = u.toString(); }
    catch (e) { location.href = location.pathname; }
  }

  // ---- 저장 ----------------------------------------------------------------
  var S = {num: '', name: '', sid: '', away: 0, awayAt: 0, awayWhy: '', startAt: 0, seenAt: 0, attempt: 0, submitted: false, queue: [], big: {}};
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') for (var k in S) if (k in saved) S[k] = saved[k]; } catch (e) {}
  if (!Array.isArray(S.queue)) S.queue = [];
  if (!S.big || typeof S.big !== 'object') S.big = {};
  function save() { S.seenAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  // 본인 확인 창에 답하기 전에는 저장하지 않아요(답 없이 새로고침해도 다시 물어보게).
  window.addEventListener('pagehide', function () { if (tracking) save(); });

  // ---- 전송 ----------------------------------------------------------------
  function body(type, data) {
    return JSON.stringify({v: 1, ws: WS, title: TITLE, type: type, sid: S.sid, num: S.num, name: S.name,
      t: new Date().toISOString(), away: S.away, data: data || {}});
  }
  function post(text, signal) {
    var opt = {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: text};
    if (signal) opt.signal = signal;
    return fetch(HUB, opt).then(function (r) { return r.json(); });
  }
  // 화면이 가려지는 순간에는 sendBeacon(페이지가 숨겨져도 끝까지 보내짐)으로 먼저 보내요.
  // 서버 답을 알 수 없으니 같은 신호를 대기열에도 넣어 두고, 돌아오면 다시 보내요(허브가 같은 신호는 한 번만 기록해요).
  function beacon(text) {
    try { if (navigator.sendBeacon && navigator.sendBeacon(HUB, new Blob([text], {type: 'text/plain;charset=utf-8'}))) return; } catch (e) {}
    try { fetch(HUB, {method: 'POST', mode: 'no-cors', keepalive: true, headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: text}); } catch (e) {}
  }
  // 시작·자리 비움·복귀는 대기열에 넣고 맨 앞부터 하나씩 보내요(도착 순서가 뒤바뀌지 않게).
  // 실패하면 15~20초 뒤 저절로 다시 보내요.
  var flushing = false, flushTimer = null;
  function later(ms) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(function () { flushTimer = null; flush(); }, ms);
  }
  function flush() {
    if (flushing || !ONLINE || !S.queue.length) return;
    if (document.hidden) return; // 숨겨진 동안은 sendBeacon이 맡고, 돌아오면 이어서 보내요.
    if (navigator.onLine === false) { later(15000); return; }
    flushing = true;
    var item = S.queue[0], done = false;
    var finish = function (r) {
      if (done) return; done = true; flushing = false;
      // 받아들여졌거나, 다시 보내도 소용없는 거절(형식 오류 등)이면 대기열에서 빼요.
      if (r && (r.ok || r.error && !/잠시 후/.test(r.error))) {
        if (r && !r.ok) console.warn('[classroom]', r.error);
        var i = S.queue.indexOf(item); if (i >= 0) S.queue.splice(i, 1);
        save(); flush();
      } else later(15000 + Math.floor(Math.random() * 5000));
    };
    // 답이 오래 안 오면 실패로 보고 나중에 다시 보내요(같은 신호가 두 번 가도 허브가 한 번만 기록해요).
    var ctl = null; try { ctl = new AbortController(); } catch (e) {}
    var guard = setTimeout(function () { try { if (ctl) ctl.abort(); } catch (e) {} finish(null); }, 25000);
    post(item, ctl && ctl.signal).then(function (r) { clearTimeout(guard); finish(r); }, function () { clearTimeout(guard); finish(null); });
  }
  function send(type, data, useBeacon) {
    if (!ONLINE) return;
    var text = body(type, data);
    queue(text);
    if (useBeacon && document.hidden) beacon(text);
    flush();
  }
  function queue(text) {
    S.queue.push(text);
    if (S.queue.length > 30) S.queue.splice(0, S.queue.length - 30); // 너무 많이 쌓이면 오래된 것부터 버려요.
    save();
  }
  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });

  // ---- 화면 ----------------------------------------------------------------
  var css = '' +
    '.cr-veil{position:fixed;inset:0;z-index:2147483000;background:rgba(20,28,24,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
    '.cr-card{background:#fff;color:#1f2a24;border-radius:14px;max-width:360px;width:100%;padding:24px 22px;box-shadow:0 18px 50px rgba(0,0,0,.25);line-height:1.6}' +
    '.cr-card h2{margin:0 0 6px;font-size:19px}.cr-card p{margin:0 0 14px;font-size:14px;color:#55615a}' +
    '.cr-card label{display:block;font-size:13px;font-weight:700;margin:10px 0 4px}' +
    '.cr-card input{width:100%;box-sizing:border-box;font-size:16px;padding:10px 12px;border:1px solid #c9d1cb;border-radius:8px}' +
    '.cr-card .cr-row{display:flex;gap:8px}' +
    '.cr-card select{flex:1;min-width:0;box-sizing:border-box;font-size:16px;padding:10px 6px;border:1px solid #c9d1cb;border-radius:8px;background:#fff;color:#1f2a24}' +
    '.cr-card .cr-num{margin:6px 0 0;font-size:13px;color:#244b3a;font-weight:700;min-height:1em}' +
    '.cr-card button{margin-top:16px;width:100%;font-size:16px;font-weight:700;padding:12px;border:0;border-radius:10px;background:#244b3a;color:#fff;cursor:pointer}' +
    '.cr-card .cr-err{color:#b3261e;font-size:13px;min-height:1em;margin:8px 0 0}' +
    '.cr-card.cr-warn h2{color:#b3261e}' +
    '.cr-card .cr-who{font-size:18px;font-weight:700;color:#1f2a24;margin:4px 0 4px}' +
    '.cr-card button.cr-sub{margin-top:8px;background:#fff;color:#244b3a;border:1px solid #c9d1cb;font-weight:600}' +
    '.cr-chip{position:fixed;left:12px;bottom:12px;z-index:2147482999;background:#fff;border:1px solid #d5dbd6;border-radius:999px;padding:6px 12px;font-size:12px;color:#33413a;box-shadow:0 4px 14px rgba(0,0,0,.08);cursor:pointer;font-family:inherit}' +
    '.cr-chip b{font-weight:700}.cr-chip .cr-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#3a9a5b;margin-right:6px;vertical-align:1px}' +
    '.cr-chip.cr-off .cr-dot{background:#c48a1a}.cr-chip .cr-away{color:#b3261e;font-weight:700}' +
    '.cr-chip.cr-teacher{background:#fff4d6;border-color:#e0b23c;color:#5a4300}.cr-chip.cr-teacher .cr-dot{background:#d08a00}' +
    '@media print{.cr-chip,.cr-veil{display:none!important}}';
  var style = document.createElement('style'); style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  // 다른 학생으로 바꿔요. 학습지는 'classroom:switch' 신호를 받아 자기 기록을 지워요.
  function switchStudent() {
    try { document.dispatchEvent(new CustomEvent('classroom:switch')); } catch (e) {}
    S.num = ''; S.name = ''; S.sid = ''; S.away = 0; S.awayAt = 0; S.awayWhy = ''; S.attempt = 0; S.submitted = false; save(); location.reload();
  }
  var chip;
  function renderChip() {
    if (TEACHER) {
      if (!chip) {
        chip = el('button', 'cr-chip cr-teacher'); chip.type = 'button';
        chip.title = '교사 모드를 끄려면 누르세요';
        chip.appendChild(el('span', 'cr-dot'));
        chip.appendChild(el('b', null, '교사 모드'));
        chip.appendChild(document.createTextNode(' · 기록 안 보냄 · 끄기'));
        chip.addEventListener('click', function () { if (confirm('교사 모드를 끄고 학생 화면으로 열까요?')) leaveTeacher(); });
        document.body.appendChild(chip);
      }
      return;
    }
    if (!chip) {
      chip = el('button', 'cr-chip'); chip.type = 'button';
      chip.title = '다른 학생으로 바꾸려면 누르세요';
      chip.addEventListener('click', function () {
        if (confirm(S.num + ' ' + S.name + ' 학생이 아닌가요?\n확인을 누르면 이 기기에 남은 학습 기록을 지우고 학번·이름을 다시 입력해요.')) switchStudent();
      });
      document.body.appendChild(chip);
    }
    chip.className = 'cr-chip' + (ONLINE ? '' : ' cr-off');
    chip.textContent = '';
    chip.appendChild(el('span', 'cr-dot'));
    chip.appendChild(el('b', null, S.num + ' ' + S.name));
    chip.appendChild(document.createTextNode(' · '));
    chip.appendChild(el('span', S.away ? 'cr-away' : null, '자리 비움 ' + S.away + '회'));
    if (!ONLINE) chip.appendChild(document.createTextNode(' · 연습 모드'));
  }

  function loginDialog(done) {
    var veil = el('div', 'cr-veil'), card = el('form', 'cr-card');
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'crTitle');
    var h = el('h2', null, TITLE || '학습지'); h.id = 'crTitle';
    card.appendChild(h);
    card.appendChild(el('p', null, ONLINE ? '학년·반·번호를 고르고 이름을 쓰면 시작해요. 학습 기록과 화면 이탈이 선생님께 전달돼요.'
      : '학년·반·번호를 고르고 이름을 쓰면 시작해요. (연습 모드: 선생님께 전송되지 않아요)'));
    // 학번은 학년·반·번호를 골라서 만들어요. 1학년 7반 12번 → 10712 (학년 1자리 + 반 2자리 + 번호 2자리)
    var l1 = el('label', null, '학번'); l1.htmlFor = 'crGrade';
    var row = el('div', 'cr-row');
    var pre = /^([1-3])(0[1-9])(0[1-9]|[12]\d|30)$/.exec(S.num) || [];
    function pick(id, max, unit, label, val) {
      var s = el('select'); s.id = id; s.setAttribute('aria-label', label);
      var o = el('option', null, label); o.value = ''; s.appendChild(o);
      for (var n = 1; n <= max; n++) { var op = el('option', null, n + unit); op.value = String(n); s.appendChild(op); }
      if (val) s.value = String(Number(val));
      return s;
    }
    var sg = pick('crGrade', 3, '학년', '학년', pre[1]), sc = pick('crClass', 9, '반', '반', pre[2]), sn = pick('crNo', 30, '번', '번호', pre[3]);
    [sg, sc, sn].forEach(function (s) { row.appendChild(s); });
    var shown = el('p', 'cr-num');
    function numNow() { return sg.value && sc.value && sn.value ? sg.value + ('0' + sc.value).slice(-2) + ('0' + sn.value).slice(-2) : ''; }
    function showNum() { var n = numNow(); shown.textContent = n ? sg.value + '학년 ' + sc.value + '반 ' + sn.value + '번 → 학번 ' + n : ''; }
    [sg, sc, sn].forEach(function (s) { s.addEventListener('change', function () { showNum(); err.textContent = ''; }); });
    var l2 = el('label', null, '이름'), i2 = el('input'); i2.id = 'crName'; l2.htmlFor = 'crName';
    i2.autocomplete = 'off'; i2.maxLength = 20; i2.value = S.name;
    var err = el('p', 'cr-err'); err.setAttribute('role', 'alert');
    var btn = el('button', null, '시작하기'); btn.type = 'submit';
    [l1, row, shown, l2, i2, err, btn].forEach(function (n) { card.appendChild(n); });
    showNum();
    card.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var num = numNow(), name = i2.value.trim();
      var miss = !sg.value ? sg : !sc.value ? sc : !sn.value ? sn : null;
      if (miss) { err.textContent = (miss === sg ? '학년을' : miss === sc ? '반을' : '번호를') + ' 골라 주세요.'; miss.focus(); return; }
      if (!name) { err.textContent = '이름을 써 주세요.'; i2.focus(); return; }
      S.num = num; S.name = name; S.sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      S.away = 0; S.awayAt = 0; S.awayWhy = ''; S.attempt = 0; S.submitted = false; S.startAt = Date.now(); save();
      veil.remove(); done();
    });
    veil.appendChild(card); document.body.appendChild(veil);
    setTimeout(function () { (numNow() ? i2 : sg).focus(); }, 50);
  }

  // 저장된 학생으로 다시 열 때 본인인지 확인해요. yes(isNewDay) / no → 다른 학생으로 바꾸기
  var IDLE_ASK = 40 * 60000;
  function dayOf(ms) { var d = new Date(ms); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function needConfirm() {
    var last = S.seenAt || S.startAt || 0;
    if (!last) return {ask: true, newDay: true};
    var now = Date.now(), newDay = dayOf(last) !== dayOf(now);
    // 기기 시계가 뒤로 바뀌어 저장 시각이 미래인 경우도 물어봐요.
    return {ask: newDay || now - last >= IDLE_ASK || last > now + 60000, newDay: newDay || last > now + 60000};
  }
  function confirmDialog(done) {
    var veil = el('div', 'cr-veil'), card = el('div', 'cr-card');
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'crTitle');
    var h = el('h2', null, TITLE || '학습지'); h.id = 'crTitle'; card.appendChild(h);
    card.appendChild(el('p', null, '이 기기에 저장된 학생이에요. 본인이 맞나요?'));
    var m = /^([1-3])(\d{2})(\d{2})$/.exec(S.num);
    var who = el('p', 'cr-who', (m ? m[1] + '학년 ' + Number(m[2]) + '반 ' + Number(m[3]) + '번 ' : S.num + ' ') + S.name);
    card.appendChild(who);
    var yes = el('button', null, '네, 저예요'); yes.type = 'button';
    var no = el('button', 'cr-sub', '아니에요 (다른 학생으로 시작)'); no.type = 'button';
    yes.addEventListener('click', function () { veil.remove(); done(); });
    no.addEventListener('click', function () { switchStudent(); });
    card.appendChild(yes); card.appendChild(no);
    veil.appendChild(card); document.body.appendChild(veil);
    setTimeout(function () { yes.focus(); }, 50);
  }

  // ---- 자리 비움 감지 -------------------------------------------------------
  // S.awayAt: 자리를 비운 시각(아직 복귀를 보내지 않았으면 0이 아님). 복귀를 보내야 다음 자리 비움을 새로 세요.
  var warn = null, blurTimer = null, tracking = false;
  function warnText() {
    return '지금까지 자리 비움 ' + S.away + '회가 기록되었어요' + (ONLINE ? ' (선생님께 전송됨)' : '') +
      '. 학습을 마칠 때까지 이 화면에 머물러 주세요.';
  }
  function showWarn() {
    if (warn) { warn.msg.textContent = warnText(); return; }
    var veil = el('div', 'cr-veil'), card = el('div', 'cr-card cr-warn');
    card.setAttribute('role', 'alertdialog'); card.setAttribute('aria-modal', 'true');
    card.appendChild(el('h2', null, '학습지 화면을 벗어났어요'));
    var msg = el('p', null, warnText()); card.appendChild(msg);
    var btn = el('button', null, '학습지로 돌아가기'); btn.type = 'button';
    btn.addEventListener('click', function () { veil.remove(); warn = null; markBack(); });
    card.appendChild(btn); veil.appendChild(card); document.body.appendChild(veil);
    warn = {veil: veil, msg: msg};
    setTimeout(function () { btn.focus(); }, 50);
  }
  function markAway(reason) {
    if (!tracking || S.awayAt) return;
    S.away++; S.awayAt = Date.now(); S.awayWhy = reason; save(); renderChip();
    try { document.dispatchEvent(new CustomEvent('classroom:away', {detail: {away: S.away}})); } catch (e) {}
    send('away', {reason: reason}, true);
    showWarn();
  }
  // 학습지로 돌아왔어요: 복귀를 보내요(경고 창은 학생이 닫을 때까지 남겨 둬요).
  // 창이 작아서 생긴 자리 비움은 창이 다시 커져야 복귀예요(작은 창을 만지는 것만으로는 아니에요).
  function markBack() {
    if (!tracking || !S.awayAt) return;
    if (isSmall()) {
      // 최근 앱 화면을 거쳐 분할로 들어오면 먼저 '숨김' 이탈이 생겨요. 창이 작은 채로 돌아왔으면 복귀가 아니라
      // 같은 자리 비움을 '작은 창'으로 바꿔 알려요(횟수는 늘리지 않아요).
      if (S.awayWhy !== 'small') { S.awayWhy = 'small'; save(); send('away', {reason: 'small'}); }
      return;
    }
    var sec = Math.max(0, Math.round((Date.now() - S.awayAt) / 1000));
    S.awayAt = 0; S.awayWhy = ''; save();
    send('back', {seconds: sec});
  }

  // ---- 창 크기 (화면 분할·팝업) -----------------------------------------------
  // 갤럭시 실측(2026-11-18): 분할·팝업이 자리 잡은 뒤에는 blur·숨김 신호가 없고 창 크기만 평소의 40~56%로 줄어요.
  // 가로·세로 방향마다 지금까지 본 가장 큰 창 넓이를 기억해 두고(이 기기에 저장), 그 65% 미만이면 '작은 창'이에요.
  // 키보드는 창 크기(innerHeight)를 줄이지 않고, 주소창이 숨거나 나타나는 차이는 85% 정도라 걸리지 않아요.
  var SMALL_RATIO = 0.65, SMALL_WAIT = 5000, smallSince = 0;
  // 방향은 창 모양이 아니라 기기 화면 방향으로 봐요(위아래 분할 창은 가로로 넓적해서 창 모양으로는 헷갈려요).
  function orient() {
    var t = screen.orientation && screen.orientation.type;
    if (t) return /^portrait/.test(t) ? 'P' : 'L';
    if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90 ? 'L' : 'P';
    return screen.width > screen.height ? 'L' : 'P';
  }
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  // 실제 화면 점(물리 픽셀) 기준 넓이: 화면·글자 크기 배율을 바꿔도 같은 창이면 같은 값이에요.
  function area() { var d = window.devicePixelRatio || 1; return window.innerWidth * d * window.innerHeight * d; }
  function typing() { var a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)); }
  function isSmall() {
    var big = Number(S.big[orient()]) || 0, now = area();
    return big > 0 && now > 0 && now < big * SMALL_RATIO;
  }
  function sizeCheck() {
    // 숨김·전체 화면 영상·글자 입력(키보드) 중에는 재지 않아요.
    if (!tracking || document.hidden || isFull() || typing()) { smallSince = 0; return; }
    var o = orient(), now = area();
    if (now > (Number(S.big[o]) || 0)) { S.big[o] = now; save(); }
    if (!isSmall()) {
      smallSince = 0;
      if (S.awayAt && S.awayWhy === 'small') markBack();
      return;
    }
    if (!smallSince) smallSince = Date.now();
    else if (Date.now() - smallSince >= SMALL_WAIT && !S.awayAt) markAway('small');
  }
  window.addEventListener('resize', function () { setTimeout(sizeCheck, 300); });
  setInterval(sizeCheck, 1000);
  // 화면이 보이고 이 창에 초점이 있으면 돌아온 거예요. (화면 나누기로 옆 앱에 초점이 있으면 아직 아니에요.)
  function backIfFocused() { if (!document.hidden && document.hasFocus()) markBack(); }
  // 새로고침·페이지 닫기는 자리 비움으로 세지 않아요.
  var leaving = false;
  window.addEventListener('pagehide', function () { leaving = true; });
  window.addEventListener('beforeunload', function () { leaving = true; });
  window.addEventListener('pageshow', function (e) {
    leaving = false;
    // 뒤로 가기로 예전 화면이 그대로 돌아왔는데 오래 지났으면 처음부터 다시 열어 본인 확인을 해요.
    if (e && e.persisted && tracking && needConfirm().ask) location.reload();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (!leaving) markAway('hidden'); return; }
    backIfFocused(); setTimeout(backIfFocused, 700);
  });
  window.addEventListener('blur', function () {
    clearTimeout(blurTimer);
    blurTimer = setTimeout(function () {
      // 학습지 안의 영상(유튜브 등)을 누른 것은 이탈이 아니에요.
      var a = document.activeElement;
      if (leaving || a && a.tagName === 'IFRAME') return;
      if (!document.hasFocus() && !document.hidden) markAway('blur');
    }, 3000);
  });
  window.addEventListener('focus', function () { clearTimeout(blurTimer); backIfFocused(); });
  // 학습지 화면을 직접 누르거나 키를 쓰면 확실히 돌아온 거예요.
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (t) {
    window.addEventListener(t, function () { if (!document.hidden) markBack(); }, {capture: true, passive: true});
  });

  // ---- 시작 ----------------------------------------------------------------
  var resolveReady;
  var api = {
    ws: WS, online: ONLINE, teacher: TEACHER,
    ready: new Promise(function (r) { resolveReady = r; }),
    get student() { return S.num ? {num: S.num, name: S.name} : null; },
    get submitted() { return S.submitted; },
    get away() { return S.away; },
    switchStudent: switchStudent,
    submit: function (result) {
      result = result || {};
      if (!S.num || !tracking && !TEACHER) return Promise.resolve({ok: false, error: '학번과 이름을 먼저 확인해 주세요.'});
      var answers = {};
      Object.keys(result.answers || {}).slice(0, 200).forEach(function (k) { answers[String(k).slice(0, 40)] = String(result.answers[k] == null ? '' : result.answers[k]).slice(0, 2000); });
      var data = {
        score: Math.max(0, Math.round(Number(result.score) || 0)),
        total: Math.max(0, Math.round(Number(result.total) || 0)),
        minutes: Math.max(0, Math.round((Date.now() - (S.startAt || Date.now())) / 60000)),
        attempt: S.attempt + 1,
        wrong: (result.wrong || []).slice(0, 100).map(function (w) { return String(w).slice(0, 100); }),
        answers: answers
      };
      if (data.score > data.total) data.total = data.score;
      if (TEACHER) { S.attempt = data.attempt; S.submitted = true; return Promise.resolve({ok: true, offline: true, teacher: true}); }
      // 자리 비움 중이면(제출 답을 기다리다 나감) 복귀는 돌아왔을 때 따로 보내요.
      var finish = function () { S.attempt = data.attempt; S.submitted = true; save(); renderChip(); };
      if (!ONLINE) { finish(); return Promise.resolve({ok: true, offline: true}); }
      return post(body('submit', data)).then(function (r) {
        if (r && r.ok) { finish(); flush(); return {ok: true}; }
        return {ok: false, error: (r && r.error) || '전송에 실패했어요. 잠시 후 다시 눌러 주세요.'};
      }).catch(function () {
        return {ok: false, error: '인터넷 연결을 확인하고 다시 눌러 주세요.'};
      });
    }
  };
  window.Classroom = api;

  function begin(isNew) {
    tracking = true; renderChip();
    if (isNew) send('start');
    else {
      // 자리를 비운 채 새로고침했다면, 돌아온 것으로 알려요.
      markBack();
      flush();
    }
    resolveReady({num: S.num, name: S.name});
  }
  function boot() {
    if (TEACHER) {
      // 저장해 둔 학생 정보는 쓰지 않고, 기록도 보내지 않아요(자리 비움 감지도 꺼 둬요).
      S = {num: '00000', name: '교사 모드', sid: 'teacher', away: 0, awayAt: 0, startAt: Date.now(), attempt: 0, submitted: false, queue: []};
      save = function () {};
      renderChip(); resolveReady({num: S.num, name: S.name});
      return;
    }
    if (S.num && S.name && S.sid) {
      var c = needConfirm();
      if (!c.ask) begin(false);
      else confirmDialog(function () {
        // 창을 띄운 채 자정을 넘겼을 수 있어 누를 때 다시 따져요.
        if (!c.newDay && !needConfirm().newDay) { begin(false); return; }
        // 다른 날: 새 수업으로 시작해요(자리 비움 횟수는 새로 세고, 현황판 '오늘'에 다시 나타나요). 어제 남은 자리 비움은 버려요.
        S.sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        S.away = 0; S.awayAt = 0; S.awayWhy = ''; S.startAt = Date.now(); save();
        begin(true);
      });
    }
    else loginDialog(function () { begin(true); });
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();

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
 *  1) 처음 들어오면 학년·반·번호(골라서 → 학번 10712 모양)와 이름을 받아요(같은 기기에서는 다시 묻지 않아요).
 *  2) 다른 탭·앱으로 가거나 창 밖을 3초 넘게 누르면 '자리 비움'을 허브로 보내고, 돌아오면 경고를 보여 줘요.
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
  var S = {num: '', name: '', sid: '', away: 0, awayAt: 0, startAt: 0, attempt: 0, submitted: false, queue: []};
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') for (var k in S) if (k in saved) S[k] = saved[k]; } catch (e) {}
  if (!Array.isArray(S.queue)) S.queue = [];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // ---- 전송 ----------------------------------------------------------------
  function body(type, data) {
    return JSON.stringify({v: 1, ws: WS, title: TITLE, type: type, sid: S.sid, num: S.num, name: S.name,
      t: new Date().toISOString(), away: S.away, data: data || {}});
  }
  function post(text) {
    return fetch(HUB, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: text})
      .then(function (r) { return r.json(); });
  }
  // 화면이 가려지는 순간에는 sendBeacon(페이지가 숨겨져도 끝까지 보내짐)을 써요.
  function beacon(text) {
    try { if (navigator.sendBeacon && navigator.sendBeacon(HUB, new Blob([text], {type: 'text/plain;charset=utf-8'}))) return; } catch (e) {}
    try { fetch(HUB, {method: 'POST', mode: 'no-cors', keepalive: true, headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: text}); } catch (e) {}
  }
  // 실패한 신호는 저장해 두었다가 다음 전송 때 다시 보내요(제출은 따로 결과를 알려요).
  var flushing = false;
  function flush() {
    if (flushing || !ONLINE || !S.queue.length || !navigator.onLine) return;
    flushing = true;
    var item = S.queue[0];
    post(item).then(function (r) {
      flushing = false;
      // 보낸 그 항목이 아직 맨 앞에 있을 때만 지워요.
      if (r && r.ok || r && r.error && !/잠시 후/.test(r.error)) { if (S.queue[0] === item) S.queue.shift(); save(); flush(); }
      else setTimeout(flush, 15000);
    }).catch(function () { flushing = false; setTimeout(flush, 15000); });
  }
  function send(type, data, useBeacon) {
    if (!ONLINE) return;
    var text = body(type, data);
    if (useBeacon) { beacon(text); return; }
    post(text).then(function (r) {
      if (!r || !r.ok) { if (r && r.error && !/잠시 후/.test(r.error)) console.warn('[classroom]', r.error); else queue(text); }
      else flush();
    }).catch(function () { queue(text); });
  }
  function queue(text) { if (S.queue.length < 30) S.queue.push(text); save(); }
  window.addEventListener('online', flush);

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
    S.num = ''; S.name = ''; S.sid = ''; S.away = 0; S.awayAt = 0; S.attempt = 0; S.submitted = false; save(); location.reload();
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
    var pre = /^([1-3])(0[1-9])(0[1-9]|1\d|2[0-5])$/.exec(S.num) || [];
    function pick(id, max, unit, label, val) {
      var s = el('select'); s.id = id; s.setAttribute('aria-label', label);
      var o = el('option', null, label); o.value = ''; s.appendChild(o);
      for (var n = 1; n <= max; n++) { var op = el('option', null, n + unit); op.value = String(n); s.appendChild(op); }
      if (val) s.value = String(Number(val));
      return s;
    }
    var sg = pick('crGrade', 3, '학년', '학년', pre[1]), sc = pick('crClass', 9, '반', '반', pre[2]), sn = pick('crNo', 25, '번', '번호', pre[3]);
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
      S.away = 0; S.awayAt = 0; S.attempt = 0; S.submitted = false; S.startAt = Date.now(); save();
      veil.remove(); done();
    });
    veil.appendChild(card); document.body.appendChild(veil);
    setTimeout(function () { (numNow() ? i2 : sg).focus(); }, 50);
  }

  // ---- 자리 비움 감지 -------------------------------------------------------
  var warnOpen = false, blurTimer = null, tracking = false;
  function markAway(reason) {
    if (!tracking || warnOpen) return;
    warnOpen = true; S.away++; S.awayAt = Date.now(); save(); renderChip();
    try { document.dispatchEvent(new CustomEvent('classroom:away', {detail: {away: S.away}})); } catch (e) {}
    send('away', {reason: reason}, true);
    var veil = el('div', 'cr-veil'), card = el('div', 'cr-card cr-warn');
    card.setAttribute('role', 'alertdialog'); card.setAttribute('aria-modal', 'true');
    card.appendChild(el('h2', null, '학습지 화면을 벗어났어요'));
    card.appendChild(el('p', null, '지금까지 자리 비움 ' + S.away + '회가 기록되었어요' + (ONLINE ? ' (선생님께 전송됨)' : '') +
      '. 학습을 마칠 때까지 이 화면에 머물러 주세요.'));
    var btn = el('button', null, '학습지로 돌아가기'); btn.type = 'button';
    btn.addEventListener('click', function () {
      veil.remove(); warnOpen = false;
      if (S.awayAt) { send('back', {seconds: Math.max(0, Math.round((Date.now() - S.awayAt) / 1000))}); S.awayAt = 0; save(); }
    });
    card.appendChild(btn); veil.appendChild(card); document.body.appendChild(veil);
    setTimeout(function () { btn.focus(); }, 50);
  }
  // 새로고침·페이지 닫기는 자리 비움으로 세지 않아요.
  var leaving = false;
  window.addEventListener('pagehide', function () { leaving = true; });
  window.addEventListener('beforeunload', function () { leaving = true; });
  window.addEventListener('pageshow', function () { leaving = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && !leaving) markAway('hidden'); });
  window.addEventListener('blur', function () {
    clearTimeout(blurTimer);
    blurTimer = setTimeout(function () {
      // 학습지 안의 영상(유튜브 등)을 누른 것은 이탈이 아니에요.
      var a = document.activeElement;
      if (a && a.tagName === 'IFRAME') return;
      if (!document.hasFocus() && !document.hidden) markAway('blur');
    }, 3000);
  });
  window.addEventListener('focus', function () { clearTimeout(blurTimer); });

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
      if (!S.num) return Promise.resolve({ok: false, error: '학번과 이름을 먼저 입력해 주세요.'});
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
      var finish = function () { S.attempt = data.attempt; S.submitted = true; S.awayAt = 0; save(); renderChip(); };
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
      if (S.awayAt) { send('back', {seconds: Math.max(0, Math.round((Date.now() - S.awayAt) / 1000))}); S.awayAt = 0; save(); }
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
    if (S.num && S.name && S.sid) begin(false);
    else loginDialog(function () { begin(true); });
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();

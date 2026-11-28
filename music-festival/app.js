/* 사시사철 음악 축제 — 화면·저장·제출.
 * 수업 내용과 문항은 content.js에 두고, 학번·이름과 허브 연결은 classroom.js에 맡겨요.
 */
(function () {
  'use strict';
  var DATA = window.FESTIVAL, V = DATA.V, CH = DATA.CHAPTERS, FESTS = DATA.FESTIVALS;
  var CR = window.Classroom || null;
  var TEACHER = !!(CR && CR.teacher);
  var KEY = 'music-festival-v2', FS_KEY = 'music-festival-fs', SIDE_KEY = 'music-festival-side';
  var TITLE = '사시사철 음악 축제';
  var PAGES = CH.map(function (c) { return { id: c.id, nav: c.title, ch: c }; });
  PAGES.push({ id: 'submit', nav: '제출' });
  var ALLQ = [], QBY = {}, FESTBY = {};
  FESTS.forEach(function (f) { FESTBY[f.name] = f; });
  CH.forEach(function (c) {
    c.sheet = c.qs;
    c.qs.forEach(function (q) { QBY[q.id] = q; ALLQ.push(q); });
  });
  var GRADED = ALLQ.filter(function (q) { return q.ans !== undefined; });

  var view = document.getElementById('view'), nav = document.getElementById('nav');
  var sideProg = document.getElementById('sideProg');
  var root = document.documentElement, body = document.body;
  var showAns = false, sending = false, lastPage = -1, sheetOn = false, classOn = false;
  var pendingRadio = null, sheetObserver = null, sheetVisible = false, submitConfirm = false;

  var QSIG = ALLQ.map(function (q) { return q.id; }).join(',');
  var saveOk = true, saveWarned = false;
  function fresh() { return { a: {}, done: null, qs: QSIG }; }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.a && typeof s.a === 'object') {
        if (s.qs !== QSIG) {
          var a = {};
          ALLQ.forEach(function (q) {
            if (Object.prototype.hasOwnProperty.call(s.a, q.id)) a[q.id] = s.a[q.id];
          });
          return { a: a, done: null, qs: QSIG };
        }
        return s;
      }
    } catch (e) {}
    return fresh();
  }
  var state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveOk = true; }
    catch (e) {
      saveOk = false;
      if (!saveWarned) { saveWarned = true; toast('이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫지 마세요.'); }
    }
    var w = document.getElementById('saveWarn');
    if (w) w.hidden = saveOk;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ---------- 채점 ---------- */
  function val(q) {
    var v = state.a[q.id];
    if (q.type === 'multi') return Array.isArray(v) ? v : [];
    return typeof v === 'string' ? v : '';
  }
  function valText(q) {
    var v = val(q);
    return q.type === 'multi' ? q.opts.filter(function (o) { return v.indexOf(o) >= 0; }).join(', ') : v.trim();
  }
  function answered(q) { return valText(q) !== ''; }
  function correct(q) {
    return q.ans !== undefined && val(q) === q.ans;
  }
  function answerSig() { return JSON.stringify(ALLQ.map(valText)); }
  function submittedAnswers() { return !!(state.done && state.done.sig === answerSig()); }
  function marking() {
    if (classOn) return '';
    if (TEACHER) return showAns ? 'key' : '';
    return submittedAnswers() ? 'result' : '';
  }
  function markHTML(q, mode) {
    if (q.ans === undefined || !mode) return '';
    if (mode === 'key') return '<span class="mk no">정답 <b>' + esc(q.ans) + '</b></span>';
    if (!answered(q)) return '';
    var ok = correct(q);
    return '<span class="mk ' + (ok ? 'ok' : 'no') + '">' + (ok ? '맞았어요' : '다시 살펴봐요') + '</span>';
  }

  /* ---------- 수업 화면 조각 ---------- */
  function vidHTML(key, cap) {
    var v = V[key], title = esc(v.title);
    var mode = v.mode === 'solo' ? '태블릿 · 각자 짧게' : '칠판 · 다 같이';
    var player = v.id ? '<button class="vid-play" type="button" aria-label="' + title + ' 재생">' +
      '<span class="play" aria-hidden="true"></span><span class="vid-mask">' + title + '</span></button>' :
      '<div class="vid-pending"><span class="vid-mask">' + title + '</span><small>영상 준비 중</small></div>';
    return '<figure class="vid" data-video="' + esc(key) + '" data-yt="' + esc(v.id) + '" data-start="' + v.start + '" data-end="' + v.end + '">' +
      player + '<figcaption><div class="vid-head"><b>' + title + '</b><span class="play-mode">' + mode + '</span></div>' +
      (v.by ? '<small>' + esc(v.by) + '</small>' : '') + '<em>' + esc(cap || (v.end - v.start) + '초 듣기') + '</em></figcaption></figure>';
  }
  function artHTML(key) {
    var a = DATA.ART[key];
    return '<div hidden class="scene-art' + (a.w === 1200 ? ' art-four-three' : '') + '"><img class="art-img" src="img/' +
      esc(a.file) + '" alt="' + esc(a.alt) + '" width="' + a.w + '" height="' + a.h + '" decoding="async"></div>';
  }
  function warmupHTML(key) {
    var w = DATA.WARMUP[key];
    return '<div class="guess" role="group" aria-labelledby="guess-' + key + '">' +
      '<p id="guess-' + key + '">' + esc(w.prompt) + '</p>' +
      w.opts.map(function (o) { return '<button type="button" aria-pressed="false">' + esc(o) + '</button>'; }).join('') + '</div>';
  }
  function teacherHTML(key) {
    if (!TEACHER || key !== 'plan') return '';
    return '<details class="more teacher-guide"><summary>교사용 시간표 · 1차시 45분</summary><div class="time-plan"><section>' +
      '<h3>1차시 · 45분</h3><ol>' + CH.map(function (c) {
        return '<li><b>' + esc(c.time) + ' · ' + esc(c.title) + '</b><span>' + esc(c.task) + '</span></li>';
      }).join('') + '</ol></section></div></details>';
  }
  function build(html) {
    return (html || '').replace(/\{(\w+):([^}]*)\}/g, function (_, kind, value) {
      var p = value.split('|');
      if (kind === 'vid') return vidHTML(p[0], p[1]);
      if (kind === 'art') return artHTML(p[0]);
      if (kind === 'warmup') return warmupHTML(p[0]);
      if (kind === 'teacher') return teacherHTML(p[0]);
      if (kind === 'term') return '<div><dt>' + esc(p[0]) + '</dt><dd><b>' + esc(p[1]) + '</b>' + esc(p[2]) + '</dd></div>';
      return '';
    });
  }

  /* ---------- 축제 초대장 미리보기 (5장 체험) ---------- */
  function renderInvite() {
    var box = document.getElementById('invitePreview');
    if (!box) return;
    var fname = val(QBY['p-fest']), fest = FESTBY[fname];
    var who = val(QBY['p-who']);
    var vibes = val(QBY['p-vibe']);
    var slogan = val(QBY['p-slogan']).trim();
    var plan = val(QBY['p-plan']).trim();
    if (!fest && !who && !vibes.length && !slogan && !plan) {
      box.innerHTML = '<div class="invite-card is-empty"><p class="eyebrow">나만의 축제 초대장 미리보기</p>' +
        '<h3>아직 초대장이 비어 있어요</h3><p>위 학습지에서 가고 싶은 축제와 한 줄 문구를 고르거나 쓰면 이 자리에 초대장이 완성돼요.</p></div>';
      return;
    }
    var head = fest
      ? '<span class="invite-meta">' + esc(fest.season + ' · ' + fest.month + ' · ' + fest.region + ' · ' + fest.genre) + '</span>' +
        '<h3>' + esc(fest.name) + '</h3>'
      : '<span class="invite-meta">축제를 고르면 이름과 계절이 채워져요</span><h3>어느 축제로 초대할까요?</h3>';
    var vibeChips = vibes.length
      ? '<ul class="invite-vibes">' + vibes.map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul>'
      : '';
    box.innerHTML = '<article class="invite-card" aria-label="완성된 축제 초대장 미리보기">' +
      '<div class="invite-top"><p class="eyebrow">나만의 축제 초대장</p>' + head + '</div>' +
      '<div class="invite-body">' +
        (slogan ? '<p class="invite-slogan">“' + esc(slogan) + '”</p>' : '<p class="invite-slogan is-dim">“초대장 홍보 한 줄을 써 보세요”</p>') +
        (who ? '<p class="invite-line"><b>함께 갈 사람</b><span>' + esc(who) + '</span></p>' : '') +
        (fest ? '<p class="invite-line"><b>주변 볼거리</b><span>' + esc(fest.nearby) + '</span></p>' : '') +
        vibeChips +
        (plan ? '<p class="invite-plan">' + esc(plan) + '</p>' : '') +
      '</div></article>';
  }

  /* ---------- 학습지 문항 ---------- */
  function isWideQuestion(q) {
    return q.type === 'text' || q.type === 'multi' || (q.opts && q.opts.length > 4);
  }
  function qHTML(q, i, marks, wide) {
    var v = val(q), h = '', name = 'q-' + q.id, label = ' aria-labelledby="' + name + '-prompt"';
    if (q.type === 'pick') {
      h = '<select data-q="' + q.id + '"' + label + '><option value="">고르기</option>' + q.opts.map(function (o) {
        return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
    } else if (q.type === 'text') {
      h = '<textarea data-q="' + q.id + '" rows="2" maxlength="400" placeholder="' + esc(q.ph || '') + '"' + label + '>' + esc(v) + '</textarea>';
    } else {
      var multi = q.type === 'multi';
      h = '<div class="opts" role="' + (multi ? 'group' : 'radiogroup') + '"' + label + '>' + q.opts.map(function (o) {
        var checked = multi ? v.indexOf(o) >= 0 : o === v;
        return '<label><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name + '" data-q="' + q.id +
          '" value="' + esc(o) + '"' + (checked ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('') + '</div>';
    }
    var group = q.group ? '<h3 class="pick-group">' + esc(q.group) + '</h3>' : '';
    var prompt = esc(q.prompt).replace(/&lt;(\/?b)&gt;/g, '<$1>');
    return group + '<div class="q q-' + q.type + (wide ? ' q-wide' : '') + '" id="' + name + '"><p class="q-p" id="' + name + '-prompt">' +
      (i ? '<i aria-hidden="true">' + i + '</i>' : '') + '<span>' + prompt + '</span></p>' + h + markHTML(q, marks) + '</div>';
  }
  function refreshMarks() {
    var mode = marking();
    GRADED.forEach(function (q) {
      var box = document.getElementById('q-' + q.id);
      if (!box) return;
      var old = box.querySelector('.mk');
      if (old) old.remove();
      var mark = markHTML(q, mode);
      if (mark) box.insertAdjacentHTML('beforeend', mark);
    });
    var btn = document.getElementById('btnAns');
    if (btn) {
      btn.setAttribute('aria-pressed', String(showAns));
      btn.textContent = showAns ? '정답 숨기기' : '정답 보기';
    }
    syncHeadArt();
  }
  function progressMessage(total, left) {
    return left ? '학습지 ' + total + '문항 중 <b>' + (total - left) + '문항</b>에 답했어요.' : '이 장 학습지를 다 풀었어요.';
  }
  function nextEndHTML(c, idx) {
    var nextP = PAGES[idx + 1], total = c.sheet.length, left = total - c.sheet.filter(answered).length;
    var ready = left === 0;
    var label = nextP.id === 'submit' ? '제출하기 →' : '다음 장 · ' + (idx + 2) + '장 ' + esc(nextP.nav) + ' →';
    var box = total ? 'sheet-end' : 'lesson-end';
    var msg = total ? progressMessage(total, left) : '활동을 마치면 다음 장으로 가요.';
    return '<div class="' + box + (ready ? ' is-done' : '') + '" id="sheetEnd"><div class="sheet-end-row">' +
      '<p class="end-msg" id="endMsg">' + msg + '</p><a class="end-go' + (ready ? ' is-ready' : '') +
      '" id="endGo" href="#' + nextP.id + '">' + label + '</a></div></div>';
  }
  function sheetHTML(c, idx) {
    var total = c.sheet.length, n = c.sheet.filter(answered).length, marks = marking();
    var units = c.sheet.map(function (q, i) { return { q: q, i: i, wide: isWideQuestion(q) }; });
    for (var start = 0; start < units.length; ) {
      if (units[start].wide) { start++; continue; }
      var end = start;
      while (end < units.length && !units[end].wide) end++;
      if ((end - start) % 2 === 1) units[end - 1].wide = true;
      start = end;
    }
    var qsHTML = units.map(function (u) { return qHTML(u.q, u.i + 1, marks, u.wide); }).join('');
    return '<section class="sheet" id="sheet" aria-labelledby="sheetTitle">' +
      '<header class="sheet-head"><div><p class="eyebrow">' + (idx + 1) + '장 · ' + esc(c.title) + '</p>' +
      '<h2 id="sheetTitle">이 장 학습지 · ' + total + '문항</h2></div><span class="cnt" id="cnt">' + n + ' / ' + total + '</span></header>' +
      '<div class="sheet-body">' +
      '<p class="warn" id="saveWarn"' + (saveOk ? ' hidden' : '') + '>이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫거나 새로고침하지 마세요.</p>' +
      (TEACHER ? '<p class="t-note">교사 모드예요. <button type="button" class="mini" id="btnAns" aria-pressed="' +
        showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      '<div class="sheet-qs">' + qsHTML + '</div>' +
      (c.after ? '' : nextEndHTML(c, idx)) + '</div></section>';
  }

  /* ---------- 쪽 ---------- */
  function chapterHTML(c, idx) {
    var total = c.sheet.length, n = c.sheet.filter(answered).length;
    var guide = total ? '이 장: 위에서 보고 듣기 → 아래 학습지 ' + total + '문항' : '이 장은 학습지 없이 세 축제의 소리를 듣고 짐작해요';
    var chip = total ? '<a class="sheet-chip' + (n === total ? ' is-done' : '') + '" id="headChip" href="#' + c.id +
      '?sheet">이 장 학습지 <b id="headChipCnt">' + n + '/' + total + '</b> ↓</a>' : '';
    var head = '<section class="lesson"><header class="ch-head art" style="--art:url(img/head-' + c.id + '.webp?v=2)"><p class="eyebrow">' +
      (idx + 1) + '장 · ' + esc(c.time) + '</p><h1 class="ch-title"><span class="ch-num">' + (idx + 1) + '장</span><span>' + esc(c.title) +
      '</span></h1><p class="lead">' + esc(c.lead) + '</p><p class="ch-guide">' + guide + '</p>' + chip + '</header>' +
      build(c.lesson) + (total ? '' : nextEndHTML(c, idx)) + '</section>';
    if (!total) return head;
    return head +
      '<div class="bridge"><div class="bridge-card"><div class="bridge-copy">' +
        '<p class="bridge-norm"><b>여기까지 봤으면</b> 아래 학습지에서 ' + total + '문항을 풀어요.</p>' +
        '<p class="bridge-cls">태블릿 아래 ‘이 장 학습지’ ' + total + '문항을 풀어요</p></div>' +
        '<div class="bridge-acts"><a class="bridge-go" href="#' + c.id + '?sheet">학습지로 ↓</a>' +
        '<button type="button" class="mini cls" id="btnSheet" aria-pressed="' + sheetOn + '">' +
          (sheetOn ? '칠판에서 학습지 접기' : '칠판에 학습지 펼치기') + '</button></div></div></div>' +
      sheetHTML(c, idx) + (c.after ? '<section class="lesson after-sheet">' + build(c.after) +
        nextEndHTML(c, idx) + '</section>' : '');
  }
  function syncHeadArt() {
    var head = view.querySelector('.ch-head.art');
    if (!head) return;
    var id = PAGES[lastPage].id;
    var revealBox = document.getElementById('showIdentities');
    var allowed = !revealBox || !revealBox.hidden;
    head.classList.toggle('has-art', allowed && head.dataset.art === 'ready');
    if (!allowed || head.dataset.art) return;
    head.dataset.art = 'loading';
    var probe = new Image();
    probe.onload = function () {
      head.dataset.art = 'ready';
      if (head.isConnected) syncHeadArt();
    };
    probe.onerror = function () { head.dataset.art = 'missing'; };
    probe.src = 'img/head-' + id + '.webp?v=2';
  }

  /* ---------- 제출 ---------- */
  function result() {
    var wrong = [], score = 0;
    GRADED.forEach(function (q) { if (correct(q)) score++; else if (answered(q)) wrong.push(q.label); });
    var answers = {};
    ALLQ.forEach(function (q) { answers[q.label] = valText(q).slice(0, 400); });
    return { score: score, total: GRADED.length, wrong: wrong, answers: answers };
  }
  function submitHTML() {
    var left = GRADED.filter(function (q) { return !answered(q); }).length, d = state.done;
    var current = submittedAnswers(), changed = d && d.sig && !current;
    var rows = CH.map(function (c, k) {
      var n = c.qs.filter(answered).length;
      var g = c.sheet.filter(function (q) { return q.ans !== undefined; });
      var hits = !classOn && current && g.length ? '<span class="sum-correct"> · ' + g.filter(correct).length + ' / ' + g.length + ' 맞음</span>' : '';
      return '<li><a href="#' + c.id + (c.sheet.length ? '?sheet' : '') + '"><i>' + (k + 1) + '장</i><b>' + esc(c.title) +
        '</b><span>' + (c.qs.length ? n + ' / ' + c.qs.length + ' 답함' : '듣기·말하기') + hits + '</span></a></li>';
    }).join('');
    var showConfirm = submitConfirm && left > 0 && !sending;
    var btnLabel = sending ? '보내는 중…' : d ? '다시 제출하기' : '채점하고 제출하기';
    return '<section class="lesson"><header class="ch-head"><p class="eyebrow">마무리</p><h1>제출하기</h1></header>' +
      (d ? '<div class="score"><b>' + d.score + '</b><span>/ ' + d.total + '점</span></div><p>' + esc(d.msg || '') + '</p>' +
           (changed ? '<p class="warn">제출한 뒤에 답을 고쳤어요. 위 점수는 전에 낸 답의 점수예요. 고친 답을 다시 제출할 수 있어요.</p>' : '')
         : '<p class="lead">고르기 ' + GRADED.length + '문항을 채점해요. 축제 초대장과 생각 한 줄은 쓴 만큼 점수 없이 함께 보내요. 빈 글 칸이 있어도 제출할 수 있어요.</p>') +
      '<ul class="sum">' + rows + '</ul>' +
      (left ? '<p class="warn">아직 답하지 않은 채점 문항이 <b>' + left + '개</b> 있어요. 장 이름을 눌러 돌아갈 수 있어요.</p>' :
        '<p class="fine">채점 문항에 모두 답했어요.</p>') +
      (showConfirm ? '<div class="submit-confirm" role="alert">' +
        '<p class="warn">아직 답하지 않은 채점 문항이 <b>' + left + '개</b> 있어요. 빈 문항은 0점 처리돼요. 그래도 제출할까요?</p>' +
        '<div class="submit-confirm-btns">' +
          '<button type="button" class="mini is-ready" id="btnSubmitForce">그래도 제출하기</button>' +
          '<button type="button" class="mini" id="btnSubmitCancel">돌아가서 풀기</button>' +
        '</div></div>'
        : '<button type="button" class="go" id="btnSubmit"' + (sending ? ' disabled' : '') + '>' + btnLabel + '</button>') + '</section>';
  }
  function doSubmit(force) {
    if (sending) return;
    var left = GRADED.filter(function (q) { return !answered(q); }).length;
    if (left && !force) {
      submitConfirm = true;
      route(true);
      var cancel = document.getElementById('btnSubmitCancel');
      if (cancel) cancel.focus({ preventScroll: true });
      return;
    }
    submitConfirm = false;
    var r = result(), sig = answerSig(), sendingState = state;
    sending = true;
    route(true);
    var finish = function (res) {
      if (state !== sendingState) return;
      sending = false;
      var msg = !res ? '이 기기에서만 채점했어요.' : res.teacher ? '교사 모드라 이 화면에서만 채점했어요.' :
        res.ok && !res.offline ? '선생님께 보냈어요.' : res.ok ? '허브에 연결되면 제출할 수 있어요.' :
        '보내지 못했어요. 인터넷을 확인하고 다시 제출해 주세요.' + (res.error ? ' (' + res.error + ')' : '');
      state.done = { score: r.score, total: r.total, msg: msg, at: Date.now(), sig: res && res.ok ? sig : '' };
      save();
      if (PAGES[cur()].id === 'submit') {
        route(true);
        var btn = document.getElementById('btnSubmit');
        if (btn) btn.focus({ preventScroll: true });
      } else { toast(msg); refreshMarks(); }
    };
    if (!CR || !CR.submit) return finish(null);
    Promise.resolve().then(function () { return CR.submit(r); }).then(finish, function (e) { finish({ ok: false, error: e && e.message }); });
  }

  /* ---------- 길찾기 ---------- */
  function hashParts() {
    var h = location.hash.slice(1).split('?');
    return { id: h[0], sub: h[1] || '' };
  }
  function cur() {
    var i = PAGES.findIndex(function (p) { return p.id === hashParts().id; });
    return Math.max(0, i);
  }
  function navHTML(i) {
    var link = function (p, k) {
      var qs = p.ch ? p.ch.sheet : [], n = qs.filter(answered).length, on = k === i;
      var h = '<a href="#' + p.id + '"' + (on ? ' class="on" aria-current="page"' : '') + '><i>' +
        (p.ch ? k + 1 : '') + '</i><span>' + esc(p.nav) + '</span>' +
        (qs.length && n === qs.length ? '<em class="dot" title="학습지 다 풂"></em>' : '') + '</a>';
      if (qs.length) {
        h += '<a class="subl' + (on ? ' here' : '') + '" href="#' + p.id + '?sheet">학습지 <span>' + n + '/' + qs.length + '</span></a>';
      }
      return h;
    };
    var chapters = PAGES.slice(0, CH.length).map(function (p, k) { return link(p, k); }).join('');
    nav.innerHTML = '<div class="grp"><p>1차시</p>' + chapters + '</div>' + link(PAGES[CH.length], CH.length);
    var p = PAGES[i];
    document.getElementById('burger').textContent = p && p.ch ? (i + 1) + '장 · 목차' : '제출 · 목차';
  }
  function refreshSideProg() {
    if (!sideProg) return;
    var done = ALLQ.filter(answered).length, total = ALLQ.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    sideProg.innerHTML = '<div class="side-prog-head"><span>학습지 진행</span><b>' + done + ' / ' + total + '</b></div>' +
      '<span class="side-prog-bar"><i style="width:' + pct + '%"></i></span>' +
      '<small>1차시 · 45분 · ' + CH.length + '장</small>';
  }
  function closePagerPrompt() {
    var prompt = document.getElementById('pagerPrompt');
    if (!prompt || prompt.hidden) return;
    prompt.hidden = true;
    prompt.replaceChildren();
  }
  function showPagerPrompt(left) {
    var prompt = document.getElementById('pagerPrompt');
    if (!prompt) return;
    prompt.innerHTML = '<span class="prompt-msg" id="pagerPromptMsg">이 장 학습지 <b>' + left + '문항</b>이 남았어요</span>' +
      '<span class="prompt-acts">' +
        '<button type="button" class="mini is-ready prompt-sheet" aria-describedby="pagerPromptMsg">학습지로 ↓</button>' +
        '<button type="button" class="mini prompt-skip" aria-describedby="pagerPromptMsg">그냥 넘어가기 →</button>' +
      '</span>';
    prompt.hidden = false;
    var btn = prompt.querySelector('.prompt-sheet');
    if (btn) btn.focus({ preventScroll: true });
  }
  function focusFirstUnanswered(p) {
    if (!p || !p.ch || !p.ch.sheet.length) return;
    if (classOn && !sheetOn) setSheet(true);
    var targetQ = p.ch.sheet.find(function (q) { return !answered(q); }) || p.ch.sheet[0];
    var card = document.getElementById('q-' + targetQ.id);
    if (!card) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    var field = card.querySelector('input:checked, input, select, textarea');
    if (field) field.focus({ preventScroll: true });
  }
  function syncPager(i) {
    var p = PAGES[i], pgDo = document.getElementById('pgDo'), where = document.getElementById('where'), nx = document.getElementById('next');
    if (!p || !p.ch) {
      pgDo.hidden = true;
      where.hidden = false;
      where.textContent = '제출';
      nx.classList.remove('is-ready');
      document.getElementById('pgBar').style.width = '100%';
      return;
    }
    var total = p.ch.sheet.length, count = p.ch.sheet.filter(answered).length;
    var lastCh = i === CH.length - 1, done = count === total;
    document.getElementById('pgBar').style.width = Math.min(100, (i + 1) / CH.length * 100) + '%';
    if (lastCh && (total === 0 || done)) {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-ready';
      pgDo.dataset.action = 'submit';
      pgDo.innerHTML = '<span class="pg-long">제출하기 →</span><span class="pg-short">제출하기 →</span>';
      pgDo.setAttribute('aria-label', '제출하기');
      nx.classList.remove('is-ready');
    } else if (total === 0) {
      pgDo.hidden = true;
      where.hidden = false;
      where.textContent = (i + 1) + ' / ' + CH.length + '장';
      nx.classList.add('is-ready');
    } else if (done) {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-done';
      pgDo.dataset.action = 'to-sheet';
      pgDo.innerHTML = '<span class="pg-long">학습지 ' + total + '/' + total + ' 완료</span><span class="pg-short">' + total + '/' + total + ' 완료</span>';
      pgDo.setAttribute('aria-label', '학습지 ' + total + '/' + total + ' 완료, 학습지 보기');
      nx.classList.add('is-ready');
    } else if (sheetVisible) {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-working';
      pgDo.dataset.action = 'first-unanswered';
      pgDo.innerHTML = '<span class="pg-long">학습지 ' + count + '/' + total + '</span><span class="pg-short">학습지 ' + count + '/' + total + '</span>';
      pgDo.setAttribute('aria-label', '안 푼 문항으로 가기, 학습지 ' + count + '/' + total);
      nx.classList.remove('is-ready');
    } else {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-ready';
      pgDo.dataset.action = 'to-sheet';
      pgDo.innerHTML = '<span class="pg-long">↓ 이 장 학습지 ' + count + '/' + total + '</span><span class="pg-short">학습지 ' + count + '/' + total + ' ↓</span>';
      pgDo.setAttribute('aria-label', '이 장 학습지 ' + count + '/' + total + ' 풀러 내려가기');
      nx.classList.remove('is-ready');
    }
  }
  function observeSheet(i) {
    if (sheetObserver) { sheetObserver.disconnect(); sheetObserver = null; }
    sheetVisible = false;
    var p = PAGES[i], sheetEl = document.getElementById('sheet');
    if (!sheetEl || !p || !p.ch || !p.ch.sheet.length || typeof IntersectionObserver !== 'function') return;
    sheetObserver = new IntersectionObserver(function (entries) {
      var entry = entries[entries.length - 1];
      if (!entry) return;
      if (entry.isIntersecting !== sheetVisible) {
        sheetVisible = entry.isIntersecting;
        if (lastPage === i) syncPager(i);
      }
    }, { rootMargin: '-48px 0px -70px 0px', threshold: 0 });
    sheetObserver.observe(sheetEl);
  }
  function refreshCount() {
    var i = lastPage, c = PAGES[i] && PAGES[i].ch;
    var total = c ? c.sheet.length : 0, n = total ? c.sheet.filter(answered).length : 0;
    var left = total - n, all = total > 0 && left === 0;
    var nx = document.getElementById('next'), nextP = PAGES[i + 1];
    if (nextP) nx.setAttribute('aria-label', '다음 · ' + (nextP.ch ? (i + 2) + '장 ' : '') + nextP.nav + (all ? ' (이 장 학습지 완료)' : ''));
    else nx.removeAttribute('aria-label');
    refreshSideProg();
    if (!total) { syncPager(i); return; }
    document.getElementById('cnt').textContent = n + ' / ' + total;
    document.getElementById('headChipCnt').textContent = n + '/' + total;
    document.getElementById('headChip').classList.toggle('is-done', all);
    nav.querySelector('.subl.here span').textContent = n + '/' + total;
    var a = nav.querySelector('a.on'), dot = a.querySelector('.dot');
    if (all && !dot) a.insertAdjacentHTML('beforeend', '<em class="dot" title="학습지 다 풂"></em>');
    else if (!all && dot) dot.remove();
    document.getElementById('sheetEnd').classList.toggle('is-done', all);
    document.getElementById('endGo').classList.toggle('is-ready', all);
    document.getElementById('endMsg').innerHTML = progressMessage(total, left);
    if (all) closePagerPrompt();
    syncPager(i);
  }
  function route(keep) {
    var i = cur(), p = PAGES[i];
    closePagerPrompt();
    if (!keep) {
      if (pendingRadio) storeAnswer(pendingRadio);
      submitConfirm = false;
      stopVideos();
    }
    pendingRadio = null;
    view.innerHTML = p.ch ? chapterHTML(p.ch, i) : submitHTML();
    // 교사 모드는 학생 짐작을 고르지 않아도 '정체 공개'를 누를 수 있게 (지침 1절)
    if (TEACHER) { var revBtn = document.getElementById('btnReveal'); if (revBtn) revBtn.disabled = false; }
    lastPage = i;
    navHTML(i);
    var pv = document.getElementById('prev'), nx = document.getElementById('next');
    pv.disabled = i === 0;
    nx.disabled = i === PAGES.length - 1;
    var prevLabel = i ? (PAGES[i - 1].ch ? i + '장 ' + PAGES[i - 1].nav : PAGES[i - 1].nav) : '';
    var nextLabel = nx.disabled ? '' : (PAGES[i + 1].ch ? (i + 2) + '장 ' + PAGES[i + 1].nav : PAGES[i + 1].nav);
    pv.querySelector('b').textContent = prevLabel;
    pv.setAttribute('aria-label', i ? '이전 · ' + prevLabel : '이전');
    nx.querySelector('b').textContent = nextLabel;
    document.title = (p.ch ? p.ch.title + ' · ' : '') + TITLE;
    observeSheet(i);
    refreshCount();
    syncHeadArt();
    renderInvite();
    if (!keep) jump();
  }
  function setSheet(on) {
    sheetOn = on;
    body.classList.toggle('class-sheet', on);
    var sh = document.getElementById('sheet');
    if (!on && sh) stopVideos(sh);
    if (PAGES[lastPage] && PAGES[lastPage].ch) observeSheet(lastPage);
    var bs = document.getElementById('btnSheet');
    if (bs) { bs.setAttribute('aria-pressed', String(on)); bs.textContent = on ? '칠판에서 학습지 접기' : '칠판에 학습지 펼치기'; }
    if (PAGES[lastPage] && PAGES[lastPage].ch) syncPager(lastPage);
  }
  function jump() {
    var s = hashParts().sub === 'sheet' && document.getElementById('sheet');
    if (s) {
      if (classOn && !sheetOn) setSheet(true);
      s.scrollIntoView({ block: 'start', behavior: 'instant' });
      sheetVisible = true;
      if (lastPage >= 0) syncPager(lastPage);
    } else window.scrollTo(0, 0);
  }
  function go(d) { var i = cur() + d; if (i >= 0 && i < PAGES.length) location.hash = PAGES[i].id; }
  window.addEventListener('hashchange', function () {
    closeSide();
    closePagerPrompt();
    if (cur() === lastPage) { jump(); return; }
    stopVideos();
    route();
    view.focus({ preventScroll: true });
  });

  /* ---------- 계절·해외 탭 ---------- */
  function selectTab(tab) {
    if (!tab) return;
    var list = tab.closest('[role="tablist"]');
    if (!list) return;
    list.querySelectorAll('[role="tab"]').forEach(function (b) {
      var on = b === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (tab.scrollIntoView) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* ---------- 입력·활동 ---------- */
  function storeAnswer(el) {
    var id = el.dataset.q, q = QBY[id];
    if (!q) return;
    if (q.type === 'radio') {
      if (!el.checked) return;
      pendingRadio = null;
    }
    if (q.type === 'multi') {
      if (q.max && el.checked && el.closest('.opts').querySelectorAll('input:checked').length > q.max) {
        el.checked = false;
        toast('최대 ' + q.max + '개까지 골라요. 바꾸려면 고른 항목을 먼저 해제해요.');
        return;
      }
      state.a[id] = Array.from(el.closest('.opts').querySelectorAll('input:checked'), function (x) { return x.value; });
    } else {
      if (state.a[id] === el.value) return;
      state.a[id] = el.value;
    }
    save();
    refreshCount();
    if (id.indexOf('p-') === 0) renderInvite();
    if (state.done) refreshMarks();
  }
  view.addEventListener('input', function (e) { if (e.target.tagName === 'TEXTAREA') storeAnswer(e.target); });
  view.addEventListener('change', function (e) { storeAnswer(e.target); });
  // 방향키로 옮겨 보는 값은 저장하지 않고, Enter·Space, 클릭 또는 문항을 벗어날 때 확정해요.
  view.addEventListener('keydown', function (e) {
    var el = e.target;
    if (el.getAttribute('role') === 'tab' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      var tabs = Array.from(el.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
      var next = tabs[(tabs.indexOf(el) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      e.preventDefault();
      selectTab(next);
      next.focus();
      return;
    }
    if (el.type !== 'radio' || !el.dataset.q || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
      var radios = Array.from(el.closest('.opts').querySelectorAll('input'));
      var step = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
      pendingRadio = radios[(radios.indexOf(el) + step + radios.length) % radios.length];
      e.preventDefault();
      pendingRadio.checked = true;
      pendingRadio.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.checked = true;
      storeAnswer(el);
    }
  });
  view.addEventListener('focusout', function (e) {
    if (pendingRadio && pendingRadio.name === e.target.name && (!e.relatedTarget || e.relatedTarget.name !== pendingRadio.name)) {
      storeAnswer(pendingRadio);
    }
  });
  function stopVideos(scope) {
    (scope || view).querySelectorAll('.vid.playing').forEach(function (f) {
      f.querySelector('iframe').remove();
      f.classList.remove('playing');
      f.querySelector('.vid-play').hidden = false;
    });
  }
  function playVideo(button) {
    stopVideos();
    var f = button.parentNode, st = Number(f.dataset.start), en = Number(f.dataset.end);
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(f.dataset.yt) + '?autoplay=1&rel=0&playsinline=1' +
      (st ? '&start=' + st : '') + (en ? '&end=' + en : '');
    frame.title = button.getAttribute('aria-label');
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    button.hidden = true;
    f.prepend(frame);
    f.classList.add('playing');
  }
  function pickWarmup(t, group) {
    group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
    var guesses = document.getElementById('showGuesses');
    if (guesses) {
      var ready = guesses.querySelectorAll('[aria-pressed=true]').length === guesses.querySelectorAll('.guess').length;
      var btn = document.getElementById('btnReveal');
      var identities = document.getElementById('showIdentities');
      btn.disabled = !ready && !TEACHER;
      btn.classList.toggle('is-ready', ready && (!identities || identities.hidden));
    }
  }
  view.addEventListener('click', function (e) {
    var el = e.target;
    if (el.type === 'radio' && el.dataset.q) storeAnswer(el);
    var a = el.closest('a');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); jump(); }
    var t = el.closest('button');
    if (!t) return;
    if (t.getAttribute('role') === 'tab') selectTab(t);
    else if (t.dataset.nextTab !== undefined) {
      var target = document.getElementById('tab-' + t.dataset.nextTab);
      if (target) { selectTab(target); target.focus(); }
    } else if (t.id === 'btnSheet') {
      setSheet(!sheetOn);
      if (sheetOn) document.getElementById('sheet').scrollIntoView({ block: 'start' });
    } else if (t.classList.contains('vid-play')) playVideo(t);
    else if (t.parentNode.classList.contains('guess')) pickWarmup(t, t.parentNode);
    else if (t.id === 'btnReveal') {
      var identities = document.getElementById('showIdentities');
      identities.hidden = !identities.hidden;
      t.setAttribute('aria-expanded', String(!identities.hidden));
      t.textContent = identities.hidden ? '정체 공개' : '정체 숨기기';
      t.classList.toggle('is-ready', identities.hidden && !t.disabled);
      syncHeadArt();
    } else if (t.id === 'btnAns' && TEACHER && !classOn) {
      showAns = !showAns;
      refreshMarks();
    } else if (t.id === 'btnSubmit') doSubmit();
    else if (t.id === 'btnSubmitForce') doSubmit(true);
    else if (t.id === 'btnSubmitCancel') {
      submitConfirm = false;
      route(true);
      var btn = document.getElementById('btnSubmit');
      if (btn) btn.focus({ preventScroll: true });
    }
  });

  document.addEventListener('classroom:away', stopVideos);
  view.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.tagName !== 'DETAILS' || d.open) return;
    d.querySelectorAll('.vid.playing').forEach(function () { stopVideos(); });
  }, true);
  document.addEventListener('classroom:switch', function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = fresh();
    pendingRadio = null;
    showAns = false;
    sending = false;
    lastPage = -1;
    route();
  });
  // 그림이 준비된 경우에만 자리를 펼쳐요. 누락된 그림은 처음부터 공간을 쓰지 않아요.
  view.addEventListener('load', function (e) {
    if (e.target.classList && e.target.classList.contains('art-img')) e.target.parentNode.hidden = false;
  }, true);

  /* ---------- 목차·접기·글자 크기·수업 모드 ---------- */
  var side = document.getElementById('side'), burger = document.getElementById('burger'), scrim = document.getElementById('scrim');
  var btnCollapse = document.getElementById('btnCollapse');
  var mq = window.matchMedia('(max-width: 820px)');
  var sideClosed = false;
  try { sideClosed = localStorage.getItem(SIDE_KEY) === '1'; } catch (e) {}

  function syncSide() {
    var hidden = (mq.matches || body.classList.contains('side-closed')) && !body.classList.contains('side-open');
    side.inert = hidden;
    if (hidden) side.setAttribute('aria-hidden', 'true'); else side.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', String(!hidden));
  }
  function setSideClosed(on, persist) {
    sideClosed = !!on;
    body.classList.toggle('side-closed', sideClosed);
    if (sideClosed) body.classList.remove('side-open');
    if (persist) { try { localStorage.setItem(SIDE_KEY, sideClosed ? '1' : '0'); } catch (e) {} }
    syncSide();
  }
  function closeSide() { body.classList.remove('side-open'); scrim.hidden = true; syncSide(); }
  if (sideClosed) body.classList.add('side-closed');

  if (mq.addEventListener) mq.addEventListener('change', syncSide); else if (mq.addListener) mq.addListener(syncSide);
  burger.addEventListener('click', function () {
    if (!mq.matches && !classOn && body.classList.contains('side-closed')) {
      setSideClosed(false, true);
      btnCollapse.focus();
      return;
    }
    var on = !body.classList.contains('side-open');
    body.classList.toggle('side-open', on);
    scrim.hidden = !on;
    syncSide();
    if (on) (side.querySelector('a.on') || side.querySelector('a')).focus();
  });
  btnCollapse.addEventListener('click', function () {
    if (mq.matches || classOn) {
      closeSide();
      burger.focus();
    } else {
      setSideClosed(true, true);
      burger.focus();
    }
  });
  scrim.addEventListener('click', closeSide);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('side-open')) { closeSide(); burger.focus(); }
  });

  var FS_MIN = 15, FS_MAX = 30, fs = 0, fsBeforeClass = 0;
  try { fs = +localStorage.getItem(FS_KEY) || 0; } catch (e) {}
  function setFs(v, keep) {
    fs = Math.max(FS_MIN, Math.min(FS_MAX, v));
    root.style.setProperty('--fs', fs + 'px');
    if (!keep) { try { localStorage.setItem(FS_KEY, String(fs)); } catch (e) {} }
  }
  function baseFs() { return fs || parseFloat(getComputedStyle(root).fontSize) || 19; }
  if (fs) setFs(fs, true);
  document.getElementById('btnSmall').addEventListener('click', function () { setFs(baseFs() - 1); });
  document.getElementById('btnBig').addEventListener('click', function () { setFs(baseFs() + 1); });

  var btnClass = document.getElementById('btnClass');
  function setClass(on) {
    classOn = on;
    showAns = false;
    closePagerPrompt();
    closeSide();
    body.classList.toggle('class-mode', on);
    body.classList.toggle('side-closed', on ? true : sideClosed);
    if (!on && sheetOn) setSheet(false);
    else if (on && PAGES[lastPage] && PAGES[lastPage].ch) {
      var sh = document.getElementById('sheet');
      if (sh) stopVideos(sh);
      observeSheet(lastPage);
      syncPager(lastPage);
    }
    btnClass.textContent = on ? '수업 모드 끄기' : '수업 모드 켜기';
    btnClass.setAttribute('aria-pressed', String(on));
    refreshMarks();
    syncSide();
    if (on) {
      burger.focus();
      fsBeforeClass = fs;
      setFs(Math.max(baseFs(), 24), true);
      try { if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(function () {}); } catch (e) {}
    } else {
      if (fsBeforeClass) setFs(fsBeforeClass, true);
      else { fs = 0; root.style.removeProperty('--fs'); }
      try { if (document.fullscreenElement) Promise.resolve(document.exitFullscreen()).catch(function () {}); } catch (e) {}
      if (mq.matches || sideClosed) burger.focus(); else btnClass.focus();
    }
  }
  btnClass.setAttribute('aria-pressed', 'false');
  btnClass.addEventListener('click', function () { setClass(!classOn); });
  document.getElementById('btnFull').addEventListener('click', function () {
    var fail = function () { toast('이 기기에서는 전체 화면을 쓸 수 없어요.'); };
    try { Promise.resolve(document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen()).catch(fail); } catch (e) { fail(); }
  });
  document.querySelector('.skip').addEventListener('click', function (e) { e.preventDefault(); jump(); view.focus({ preventScroll: true }); });
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); closeSide(); jump(); }
  });
  syncSide();
  document.getElementById('prev').addEventListener('click', function () { closePagerPrompt(); go(-1); });
  document.getElementById('next').addEventListener('click', function () {
    var p = PAGES[lastPage];
    if (p && p.ch && !classOn && !TEACHER) {
      var left = p.ch.sheet.filter(function (q) { return !answered(q); }).length;
      if (left > 0) { showPagerPrompt(left); return; }
    }
    closePagerPrompt();
    go(1);
  });
  document.getElementById('pgDo').addEventListener('click', function () {
    closePagerPrompt();
    var p = PAGES[lastPage];
    if (!p || !p.ch) return;
    var action = this.dataset.action;
    if (action === 'submit') {
      location.hash = 'submit';
    } else if (action === 'first-unanswered') {
      focusFirstUnanswered(p);
    } else if (action === 'to-sheet') {
      if (classOn && !sheetOn) setSheet(true);
      var targetHash = '#' + p.id + '?sheet';
      if (location.hash === targetHash) jump();
      else location.hash = targetHash;
    }
  });
  document.getElementById('pagerPrompt').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('prompt-sheet')) {
      closePagerPrompt();
      focusFirstUnanswered(PAGES[lastPage]);
    } else if (btn.classList.contains('prompt-skip')) {
      closePagerPrompt();
      go(1);
    }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#pagerPrompt, #next')) closePagerPrompt();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (body.classList.contains('side-open')) { closeSide(); burger.focus(); return; }
      var prompt = document.getElementById('pagerPrompt');
      if (prompt && !prompt.hidden) { closePagerPrompt(); document.getElementById('next').focus(); return; }
    }
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') ||
        e.target.getAttribute('role') === 'tab') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });

  route();
})();

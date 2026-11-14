/* 판소리와 창극 — 화면 그리기·학습지 저장·채점·제출
 * 내용(문구·문항·영상)은 content.js. classroom.js 가 이 파일보다 먼저 실행되어야 해요.
 */
(function () {
  'use strict';
  var DATA = window.PANSORI, V = DATA.V, CH = DATA.CHAPTERS;
  var CR = window.Classroom || null;
  var TEACHER = !!(CR && CR.teacher);
  var KEY = 'pansori-class-v1';
  var SHARE_URL = 'https://dallalan2277-lab.github.io/classroom-hub/pansori-class/';
  var PAGES = [{ id: 'start', nav: '시작' }].concat(CH.map(function (c) { return { id: c.id, nav: c.nav, ch: c }; }), [{ id: 'submit', nav: '제출' }]);
  var ALLQ = []; CH.forEach(function (c) { c.qs.forEach(function (q) { q.ch = c.id; ALLQ.push(q); }); });
  var QBY = {}; ALLQ.forEach(function (q) { QBY[q.id] = q; });
  var GRADED = ALLQ.filter(function (q) { return q.type !== 'text'; });

  var view = document.getElementById('view'), nav = document.getElementById('nav');
  var state, showAns = false, sending = false; // state 는 아래 load() 정의 뒤에 채워요

  // 문항 구성이 바뀌면 이 값이 바뀌어요 → 예전 제출 점수는 지우고, 지금도 있는 문항의 답만 남겨요.
  var QSIG = ALLQ.map(function (q) { return q.id; }).join(',');
  var saveOk = true, saveWarned = false;
  function fresh() { return { a: {}, done: null, qs: QSIG }; }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.a && typeof s.a === 'object') {
        if (s.qs !== QSIG) {
          var a = {}; Object.keys(s.a).forEach(function (k) { if (QBY[k]) a[k] = s.a[k]; });
          s = { a: a, done: null, qs: QSIG };
        }
        return s;
      }
    } catch (e) {}
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveOk = true; }
    catch (e) {
      saveOk = false;
      if (!saveWarned) { saveWarned = true; toast('이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫지 마세요.'); }
      var w = document.getElementById('saveWarn'); if (w) w.hidden = false;
    }
  }
  // 지금 답이 마지막으로 제출한 답과 같은지 비교하는 데 써요
  function answerSig() { return JSON.stringify(ALLQ.map(function (q) { return valText(q); })); }
  state = load();
  document.addEventListener('classroom:switch', function () { try { localStorage.removeItem(KEY); } catch (e) {} state = fresh(); route(); });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s.,!?'"()·~]/g, ''); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600); }

  /* ---------- 채점 ---------- */
  function val(q) { var v = state.a[q.id]; return q.type === 'multi' ? (Array.isArray(v) ? v : []) : (typeof v === 'string' ? v : ''); }
  function answered(q) { var v = val(q); return q.type === 'multi' ? v.length > 0 : v.trim() !== ''; }
  function correct(q) {
    var v = val(q);
    if (q.type === 'blank') { var n = norm(v); return n !== '' && q.ans.some(function (a) { return norm(a) === n; }); }
    if (q.type === 'multi') return v.slice().sort().join('|') === q.ans.slice().sort().join('|');
    return v === q.ans;
  }
  function ansText(q) { return q.type === 'blank' ? q.ans[0] : q.type === 'multi' ? q.ans.join(', ') : q.ans; }
  function valText(q) { var v = val(q); return q.type === 'multi' ? q.opts.filter(function (o) { return v.indexOf(o) >= 0; }).join(', ') : v.trim(); }
  function marking() { return !!state.done || (TEACHER && showAns); }

  /* ---------- 수업 화면 조각 ---------- */
  function vidHTML(key, cap) {
    var v = V[key]; if (!v) return '';
    return '<figure class="vid" data-yt="' + esc(v.id) + '" data-start="' + (v.start || 0) + '" data-end="' + (v.end || 0) + '">' +
      '<button class="vid-play" type="button" aria-label="' + esc(v.title) + ' 재생"><img alt="" loading="lazy" src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg"><span>▶ 재생</span></button>' +
      '<figcaption><b>' + esc(v.title) + '</b><small>' + esc(v.by) + '</small>' + (cap ? '<em>' + esc(cap) + '</em>' : '') + '</figcaption></figure>';
  }
  var STAGE = {
    pansori:
      '<figure class="stage"><svg viewBox="0 0 640 300" role="img" aria-label="소리판 그림: 돗자리 위에 소리꾼이 서 있고 고수가 북 앞에 앉아 있으며 청중이 둘러앉아 있어요">' +
      '<ellipse cx="320" cy="212" rx="250" ry="70" class="mat"/>' +
      '<g class="aud"><circle cx="70" cy="150" r="15"/><circle cx="118" cy="112" r="15"/><circle cx="178" cy="86" r="15"/><circle cx="462" cy="86" r="15"/><circle cx="522" cy="112" r="15"/><circle cx="570" cy="150" r="15"/><circle cx="248" cy="70" r="15"/><circle cx="392" cy="70" r="15"/><circle cx="320" cy="64" r="15"/></g>' +
      '<g class="p-sori"><circle cx="270" cy="118" r="19"/><path d="M270 138 l-30 92 h60 z"/><path d="M286 160 l44 -26" class="arm"/><path d="M330 134 l26 -22 a34 34 0 0 1 12 34 z" class="fan"/></g>' +
      '<g class="p-gosu"><circle cx="420" cy="170" r="17"/><path d="M420 188 l-28 50 h56 z"/><ellipse cx="372" cy="226" rx="16" ry="24" class="drum"/><path d="M400 206 l-18 10" class="arm"/></g>' +
      '<text x="270" y="262" class="lb">소리꾼</text><text x="424" y="268" class="lb">고수</text><text x="320" y="36" class="lb">청중</text>' +
      '</svg><figcaption>소리판: 소리꾼 · 고수 · 청중</figcaption></figure>',
    changgeuk:
      '<figure class="stage"><svg viewBox="0 0 640 336" role="img" aria-label="창극 무대 그림: 막이 달린 무대 위에 여러 배우가 있고, 한쪽에 도창이 서 있으며, 무대 앞에 반주하는 연주자들이 앉아 있어요">' +
      '<rect x="40" y="20" width="560" height="190" rx="10" class="back"/><path d="M40 20 h560 v34 q-70 30 -140 0 q-70 30 -140 0 q-70 30 -140 0 q-70 30 -140 0 z" class="curtain"/>' +
      '<rect x="40" y="186" width="560" height="26" class="floor"/>' +
      '<g class="actor a1"><circle cx="170" cy="120" r="15"/><path d="M170 136 l-22 54 h44 z"/></g><g class="actor a2"><circle cx="250" cy="112" r="15"/><path d="M250 128 l-22 62 h44 z"/></g>' +
      '<g class="actor a3"><circle cx="330" cy="120" r="15"/><path d="M330 136 l-22 54 h44 z"/></g><g class="actor a4"><circle cx="410" cy="112" r="15"/><path d="M410 128 l-22 62 h44 z"/></g>' +
      '<g class="dochang"><circle cx="540" cy="118" r="15"/><path d="M540 134 l-22 56 h44 z"/><path d="M552 150 l22 -12" class="arm"/></g>' +
      '<g class="band"><circle cx="160" cy="254" r="13"/><circle cx="240" cy="262" r="13"/><circle cx="320" cy="266" r="13"/><circle cx="400" cy="262" r="13"/><circle cx="480" cy="254" r="13"/><path d="M130 286 q190 34 380 0" class="pit"/></g>' +
      '<text x="290" y="84" class="lb">배우</text><text x="540" y="92" class="lb">도창</text><text x="320" y="328" class="lb">반주</text>' +
      '</svg><figcaption>창극 무대: 배우 · 도창 · 반주</figcaption></figure>'
  };
  function build(html) {
    return html.replace(/\{(\w+):([^}]*)\}/g, function (_, kind, body) {
      var p = body.split('|');
      if (kind === 'flip') return '<button type="button" class="flip" aria-pressed="false"><span class="f-front"><b>' + esc(p[0]) + '</b><small>눌러서 확인</small></span><span class="f-back"><b>' + esc(p[0]) + ' = ' + esc(p[1]) + '</b><small>' + esc(p[2]) + '</small></span></button>';
      if (kind === 'vid') return vidHTML(p[0], p[1]);
      if (kind === 'stage') return STAGE[p[0]] || '';
      if (kind === 'madang') return '<article class="md ' + esc(p[5]) + '"><header><b>' + esc(p[0]) + '</b><button type="button" class="jd reveal" data-a="' + esc(p[2]) + '" aria-pressed="false">장단은?</button></header><h4>' + esc(p[1]) + '</h4><p>' + esc(p[3]) + '</p>' +
        '<div class="guess" role="group" aria-label="빠르기 짐작(점수 없음)"><span>짐작:</span><button type="button" aria-pressed="false">느릴 것 같아요</button><button type="button" aria-pressed="false">빠를 것 같아요</button></div>' + vidHTML(p[4]) + '</article>';
      if (kind === 'now') return '<article class="nw"><span class="from">' + esc(p[1]) + '</span>' + vidHTML(p[0]) + '</article>';
      return '';
    });
  }

  /* ---------- 학습지 문항 ---------- */
  function qHTML(q, i) {
    var v = val(q), m = marking() && q.ans !== undefined, ok = m && correct(q), h = '';
    var name = 'q-' + q.id;
    if (q.type === 'blank') h = '<input type="text" data-q="' + q.id + '" value="' + esc(v) + '" maxlength="20" autocomplete="off" aria-label="답 쓰기" placeholder="답 쓰기">';
    else if (q.type === 'pick') h = '<select data-q="' + q.id + '" aria-label="고르기"><option value="">고르기</option>' + q.opts.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    else if (q.type === 'radio') h = '<div class="opts">' + q.opts.map(function (o) { return '<label><input type="radio" name="' + name + '" data-q="' + q.id + '" value="' + esc(o) + '"' + (o === v ? ' checked' : '') + '><span>' + esc(o) + '</span></label>'; }).join('') + '</div>';
    else if (q.type === 'multi') h = '<div class="opts">' + q.opts.map(function (o) { return '<label><input type="checkbox" data-q="' + q.id + '" value="' + esc(o) + '"' + (v.indexOf(o) >= 0 ? ' checked' : '') + '><span>' + esc(o) + '</span></label>'; }).join('') + '</div>';
    else if (q.type === 'text') h = '<textarea data-q="' + q.id + '" rows="3" maxlength="400" placeholder="' + esc(q.ph || '') + '" aria-label="생각 쓰기">' + esc(v) + '</textarea>';
    var mark = m ? '<span class="mk ' + (ok ? 'ok' : 'no') + '">' + (ok ? '○ 맞았어요' : '✕ 정답: ' + esc(ansText(q))) + '</span>' : '';
    return (q.group ? '<h4 class="q-group">' + esc(q.group) + '</h4>' : '') +
      '<div class="q q-' + q.type + (m ? (ok ? ' is-ok' : ' is-no') : '') + '" id="' + name + '"><p class="q-p"><i>' + i + '</i><span>' + q.prompt + '</span></p>' + h + mark + '</div>';
  }
  function sheetHTML(c) {
    var n = c.qs.filter(answered).length;
    return '<section class="sheet" aria-label="' + esc(c.title) + ' 학습지"><header><span class="pen" aria-hidden="true">✎</span><h3>학습지 · ' + esc(c.title) + '</h3><span class="cnt" id="cnt">' + n + ' / ' + c.qs.length + '</span></header>' +
      '<p class="warn" id="saveWarn"' + (saveOk ? ' hidden' : '') + '>⚠ 이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫거나 새로고침하지 마세요.</p>' +
      (TEACHER ? '<p class="t-note">교사 모드예요. 기록이 남지 않아요. <button type="button" class="mini" id="btnAns" aria-pressed="' + showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      c.qs.map(function (q, i) { return qHTML(q, i + 1); }).join('') + '</section>';
  }

  /* ---------- 쪽 ---------- */
  function startHTML() {
    return '<section class="hero"><p class="eyebrow">중학교 음악 · 우리 음악극</p><h1>판소리와 창극</h1>' +
      '<p class="lead">한 사람이 끌고 가는 이야기, 여럿이 나누어 맡는 이야기. 두 음악극을 듣고 견주어 봐요.</p>' +
      '<ul class="goals"><li>판소리와 창극을 감상하고 특징을 비교할 수 있어요.</li><li>전통과 현대의 다양한 판소리를 감상하고, 국악의 문화적 가치를 알 수 있어요.</li></ul>' +
      '<a class="go" href="#' + CH[0].id + '">수업 시작하기 →</a></section>' +
      '<section class="flow"><h2>오늘의 순서</h2><ol>' + CH.map(function (c) { return '<li><a href="#' + c.id + '"><b>' + esc(c.title) + '</b><small>' + esc(c.time) + ' · 학습지 ' + c.qs.length + '문항</small></a></li>'; }).join('') +
      '<li><a href="#submit"><b>제출하기</b><small>채점하고 선생님께 보내기</small></a></li></ol>' +
      (TEACHER ? '<p class="t-plan">👩‍🏫 <b>선생님 안내</b> 45분 1차시 기준이에요. 2차시로 나눌 때는 <b>' + esc(CH.filter(function (c) { return c.split; }).map(function (c) { return c.title; }).join(', ')) + '</b> 장 뒤에서 끊고, 둘째 시간은 사랑가를 다시 짧게 들으며 시작해요. 학생 답은 각자 기기에 남으므로 둘째 시간에도 같은 기기·같은 브라우저로 들어오게 해 주세요. 제출은 마지막에 한 번 해요.</p>' : '') +
      '<p class="how">장마다 위쪽은 <b>수업 화면</b>, 아래쪽은 <b>✎ 학습지</b>예요. 쓴 답은 이 기기에 저절로 저장돼요. 영상은 이 화면 안에서 재생돼요.</p></section>' +
      '<details class="qr" id="qrBox"' + (TEACHER ? ' open' : '') + '><summary>📱 학생용 QR 코드</summary><div class="qr-body"><div id="qrImg" aria-label="학생용 주소 QR 코드"></div><div><p>휴대폰·태블릿 카메라로 비추면 이 수업이 열려요. 학년·반·번호와 이름을 넣고 시작해요.</p><code>' + esc(SHARE_URL) + '</code></div></div></details>' +
      '<details class="src"><summary>영상과 자료 출처</summary><ul>' + Object.keys(V).map(function (k) { return '<li>' + esc(V[k].title) + ' — ' + esc(V[k].by) + ' (YouTube)</li>'; }).join('') +
      '<li>내용: 중학교 음악 교과서 "판소리와 창극" 단원. 대목마다 붙인 장면 설명, 추임새의 예, 발림의 부채, 비교표의 일부 표현은 교과서에 없는 내용으로, 이 수업을 위해 덧붙였어요. 그림은 이 수업을 위해 새로 그린 단순 그림이에요.</li></ul></details>';
  }
  function chapterHTML(c, idx) {
    return '<section class="lesson"><p class="eyebrow">' + (idx + 1) + ' / ' + CH.length + ' · ' + esc(c.time) + '</p><h1>' + esc(c.title) + '</h1><p class="lead">' + esc(c.lead) + '</p>' + build(c.lesson) + '</section>' + sheetHTML(c);
  }
  function result() {
    var wrong = [], score = 0;
    // 틀린 문항에는 답을 쓴 문항만 넣어요(안 쓴 문항은 answers 에 빈 값으로 남아 구별돼요)
    GRADED.forEach(function (q) { if (correct(q)) score++; else if (answered(q)) wrong.push(q.label); });
    var answers = {}; ALLQ.forEach(function (q) { answers[q.label] = valText(q).slice(0, 400); });
    return { score: score, total: GRADED.length, wrong: wrong, answers: answers };
  }
  function submitHTML() {
    var left = ALLQ.filter(function (q) { return !answered(q); }), d = state.done;
    var changed = d && d.sig && d.sig !== answerSig();
    var rows = CH.map(function (c) {
      var g = c.qs.filter(function (q) { return GRADED.indexOf(q) >= 0; }), n = c.qs.filter(answered).length;
      return '<li><a href="#' + c.id + '"><b>' + esc(c.title) + '</b><span>' + n + ' / ' + c.qs.length + ' 씀' + (d && g.length ? ' · ' + g.filter(correct).length + ' / ' + g.length + ' 맞음' : '') + '</span></a></li>';
    }).join('');
    return '<section class="lesson"><p class="eyebrow">마무리</p><h1>제출하기</h1>' +
      (d ? '<div class="score"><b>' + d.score + '</b><span>/ ' + d.total + '점</span><p>' + esc(d.msg || '') + '</p></div>' +
           (changed ? '<p class="warn"><b>제출한 뒤에 답을 고쳤어요.</b> 위 점수는 예전 답의 점수예요. 고친 답은 <b>다시 제출해야</b> 선생님께 전해져요.</p>' : '') +
           '<p class="lead">장마다 돌아가면 맞은 것과 정답을 볼 수 있어요. 고쳐서 다시 낼 수도 있어요.</p>'
         : '<p class="lead">고르기·쓰기 문항은 바로 채점되고, 생각을 쓴 글은 선생님께 그대로 전해져요.</p>') +
      '<ul class="sum">' + rows + '</ul>' +
      (left.length ? '<p class="warn">아직 안 쓴 문항이 <b>' + left.length + '개</b> 있어요. 위 목록에서 장을 눌러 채워 봐요.</p>' : '<p class="fine">모든 문항을 썼어요. 👍</p>') +
      '<button type="button" class="go" id="btnSubmit"' + (sending ? ' disabled' : '') + '>' + (sending ? '보내는 중…' : d ? '고친 답 다시 제출하기' : '채점하고 제출하기') + '</button></section>';
  }
  function doSubmit() {
    if (sending) return;
    var left = ALLQ.filter(function (q) { return !answered(q); }).length;
    if (left && !window.confirm('안 쓴 문항이 ' + left + '개 있어요. 그래도 제출할까요?')) return;
    var r = result(), sig = answerSig(); sending = true; route();
    var finish = function (res) {
      sending = false;
      var msg = !res ? '이 기기에서만 채점했어요.' : res.teacher ? '교사 모드라 보내지 않고 채점만 했어요.' : res.ok && !res.offline ? '선생님께 보냈어요.' : res.ok ? '채점만 했어요. (허브에 연결되지 않았어요)' : '보내지 못했어요. 인터넷을 확인하고 다시 제출해 주세요.' + (res.error ? ' (' + res.error + ')' : '');
      // 보내지 못했으면 '보낸 답'으로 기록하지 않아요 → 다시 제출하라는 안내가 남아요
      state.done = { score: r.score, total: r.total, msg: msg, at: Date.now(), sig: res && res.ok ? sig : '' };
      save();
      // 그사이 다른 장으로 갔으면 화면을 다시 그리지 않아요(영상·입력이 끊기지 않게)
      if (PAGES[cur()].id === 'submit') route(); else toast(msg);
    };
    if (!CR || !CR.submit) return finish(null);
    Promise.resolve().then(function () { return CR.submit(r); }).then(finish, function (e) { finish({ ok: false, error: e && e.message }); });
  }

  /* ---------- 길찾기 ---------- */
  function cur() { var id = location.hash.replace(/^#/, '').split('?')[0]; for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return i; return 0; }
  function route() {
    var i = cur(), p = PAGES[i];
    view.innerHTML = p.id === 'start' ? startHTML() : p.id === 'submit' ? submitHTML() : chapterHTML(p.ch, i - 1);
    nav.innerHTML = PAGES.map(function (x, k) {
      var done = x.ch ? x.ch.qs.every(answered) : false;
      return '<a href="#' + x.id + '"' + (k === i ? ' class="on" aria-current="page"' : '') + '><i>' + (x.ch ? k : x.id === 'start' ? '⌂' : '✓') + '</i><span>' + esc(x.nav) + '</span>' + (done ? '<em aria-label="다 씀">●</em>' : '') + '</a>';
    }).join('');
    var pv = document.getElementById('prev'), nx = document.getElementById('next');
    pv.disabled = i === 0; nx.disabled = i === PAGES.length - 1;
    pv.querySelector('b').textContent = i ? PAGES[i - 1].nav : ''; nx.querySelector('b').textContent = i < PAGES.length - 1 ? PAGES[i + 1].nav : '';
    document.getElementById('where').textContent = (i + 1) + ' / ' + PAGES.length;
    document.title = (p.ch ? p.ch.title + ' · ' : '') + '판소리와 창극';
    if (p.id === 'start') drawQR();
    var on = nav.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function go(d) { var i = cur() + d; if (i >= 0 && i < PAGES.length) location.hash = PAGES[i].id; }
  window.addEventListener('hashchange', function () { route(); window.scrollTo(0, 0); view.focus({ preventScroll: true }); });

  function drawQR() {
    var d = document.getElementById('qrBox'), box = document.getElementById('qrImg'); if (!d || !box) return;
    var draw = function () {
      if (!d.open || box.firstChild) return;
      if (typeof QRCode === 'undefined') { box.textContent = 'QR 코드를 불러오지 못했어요. 옆의 주소를 칠판에 적어 주세요.'; return; }
      new QRCode(box, { text: SHARE_URL, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    };
    d.addEventListener('toggle', draw); draw();
  }

  /* ---------- 입력 ---------- */
  function refreshCount() {
    var p = PAGES[cur()]; if (!p.ch) return;
    var c = document.getElementById('cnt'); if (c) c.textContent = p.ch.qs.filter(answered).length + ' / ' + p.ch.qs.length;
  }
  function onInput(e) {
    var el = e.target, id = el.getAttribute && el.getAttribute('data-q'), q = id && QBY[id]; if (!q) return;
    if (q.type === 'multi') state.a[id] = Array.prototype.map.call(view.querySelectorAll('input[data-q="' + id + '"]:checked'), function (x) { return x.value; });
    else state.a[id] = el.value;
    save(); refreshCount();
  }
  view.addEventListener('input', onInput);
  view.addEventListener('change', function (e) {
    onInput(e);
    // 채점 표시가 켜져 있으면 고른 답에 맞게 그 문항만 다시 그려요(글 쓰는 칸은 건드리지 않음)
    var id = e.target.getAttribute && e.target.getAttribute('data-q'), q = id && QBY[id];
    if (q && marking() && q.type !== 'text') {
      var box = document.getElementById('q-' + id), c = PAGES[cur()].ch;
      if (box && c) { var t = document.createElement('div'); t.innerHTML = qHTML(q, c.qs.indexOf(q) + 1); var nw = t.querySelector('.q'); box.replaceWith(nw); }
    }
  });
  function stopVideos() {
    Array.prototype.forEach.call(document.querySelectorAll('.vid.playing'), function (f) {
      var fr = f.querySelector('iframe'); if (fr) fr.remove(); f.classList.remove('playing'); f.querySelector('.vid-play').hidden = false;
    });
  }
  view.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    if (t.classList.contains('flip')) { var on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', String(on)); return; }
    if (t.classList.contains('vid-play')) {
      stopVideos();
      var f = t.parentNode, id = f.getAttribute('data-yt'), st = +f.getAttribute('data-start') || 0, en = +f.getAttribute('data-end') || 0;
      var fr = document.createElement('iframe');
      fr.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1' + (st ? '&start=' + st : '') + (en ? '&end=' + en : '');
      fr.title = t.getAttribute('aria-label') || '영상'; fr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; fr.allowFullscreen = true;
      t.hidden = true; f.insertBefore(fr, f.firstChild); f.classList.add('playing'); return;
    }
    if (t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('guess')) {
      Array.prototype.forEach.call(t.parentNode.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b === t)); }); return;
    }
    if (t.classList.contains('reveal')) { var open = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', String(open)); t.textContent = open ? t.getAttribute('data-a') : '장단은?'; return; }
    if (t.id === 'btnAns') { showAns = !showAns; route(); return; }
    if (t.id === 'btnSubmit') doSubmit();
  });
  // 자리 비움 경고가 뜨면 영상을 멈춰요
  document.addEventListener('classroom:away', stopVideos);

  document.getElementById('prev').addEventListener('click', function () { go(-1); });
  document.getElementById('next').addEventListener('click', function () { go(1); });
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });
  var big = document.getElementById('btnBig');
  big.addEventListener('click', function () { var on = document.documentElement.classList.toggle('big'); big.setAttribute('aria-pressed', String(on)); });
  document.getElementById('btnFull').addEventListener('click', function () {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { toast('이 기기에서는 전체 화면을 쓸 수 없어요.'); }
  });

  route();
})();

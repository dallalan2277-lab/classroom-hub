/* 음악극 탐험대 개선판 — pansori-plus의 화면·저장·제출을 바탕으로 한 학습지.
 * 수업 내용과 문항은 content.js에 두고, 학번·이름과 허브 연결은 classroom.js에 맡겨요.
 */
(function () {
  'use strict';
  var DATA = window.STAGE, V = DATA.V, CH = DATA.CHAPTERS;
  var CR = window.Classroom || null;
  var TEACHER = !!(CR && CR.teacher);
  var KEY = 'stage-plus-v1', FS_KEY = 'stage-plus-fs', SIDE_KEY = 'stage-plus-side';
  var TITLE = '세계의 음악극';
  var SPLIT = CH.findIndex(function (c) { return c.split; });
  var PAGES = CH.map(function (c) { return { id: c.id, nav: c.title, ch: c }; });
  PAGES.push({ id: 'submit', nav: '제출' });
  var ALLQ = [], QBY = {};
  CH.forEach(function (c) {
    c.sheet = c.qs.filter(function (q) { return !q.activity; });
    c.qs.forEach(function (q) { QBY[q.id] = q; ALLQ.push(q); });
  });
  var GRADED = ALLQ.filter(function (q) { return q.ans !== undefined; });

  var view = document.getElementById('view'), nav = document.getElementById('nav');
  var root = document.documentElement, body = document.body;
  var showAns = false, sending = false, lastPage = -1, sheetOn = false, classOn = false;
  var pendingRadio = null;
  var sheetObserver = null, sheetVisible = false, submitConfirm = 0;

  function pageSession(idx) { return idx < SPLIT ? 1 : 2; }
  function isSessionEnd(idx) { return idx === SPLIT - 1 || idx === CH.length - 1; }

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
  function norm(s) {
    return String(s || '').normalize('NFC').toLowerCase().replace(/[\s·・.,()\[\]「」『』'"‘’“”\-–—~!?]/g, '');
  }
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
    var answer = norm(val(q));
    return answer !== '' && q.accept.some(function (a) { return norm(a) === answer; });
  }
  function scopedAllQ(s) {
    if (!s) return ALLQ;
    return CH.slice(0, s === 1 ? SPLIT : CH.length).reduce(function (acc, c) { return acc.concat(c.qs); }, []);
  }
  function answerSig(s) { return JSON.stringify(scopedAllQ(s).map(valText)); }
  function submittedAnswers() { return !!(state.done && state.done.sig && state.done.sig === answerSig(state.done.s)); }
  function marking(session) {
    if (classOn) return '';
    if (TEACHER) return showAns ? 'key' : '';
    if (!submittedAnswers()) return '';
    var doneScope = state.done.s || 2;
    var s = session || (PAGES[lastPage] && PAGES[lastPage].ch ? pageSession(lastPage) : 0);
    if (s && s > doneScope) return '';
    return 'result';
  }
  function markHTML(q, mode) {
    if (q.ans === undefined || !mode) return '';
    if (mode === 'key') return '<span class="mk no">정답 <b>' + esc(q.ans) + '</b></span>';
    if (!answered(q)) return '';
    var ok = correct(q);
    return '<span class="mk ' + (ok ? 'ok' : 'no') + '">' + (ok ? '맞았어요' : '다시 살펴봐요') + '</span>';
  }

  /* ---------- 수업 화면 조각 ---------- */
  function vidHTML(key, cap, repeatSeconds) {
    var v = V[key], end = repeatSeconds ? v.start + Number(repeatSeconds) : v.end;
    return '<figure class="vid" data-yt="' + esc(v.id) + '" data-start="' + v.start + '" data-end="' + end + '">' +
      '<button class="vid-play" type="button" aria-label="' + esc(v.title) + ' 재생">' +
        '<span class="play" aria-hidden="true"></span><span class="vid-mask" aria-hidden="true">' + esc(v.title) + '</span></button>' +
      '<figcaption><div class="vid-head"><b>' + esc(v.title) + '</b><span class="play-mode">칠판 · 다 같이</span></div>' +
      (v.by ? '<small>' + esc(v.by) + '</small>' : '') + (cap ? '<em>' + esc(cap) + '</em>' : '') + '</figcaption></figure>';
  }
  function linkHTML(key) {
    if (!TEACHER) return '';
    var v = V[key];
    return '<p class="video-link"><a href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener noreferrer">' +
      esc(v.title) + ' (새 창)</a> <span class="play-mode">칠판 · 다 같이</span></p>';
  }
  function art(file, alt, cls, w, h) {
    return '<div class="' + cls + '"><img class="art-img" src="img/' + esc(file) + '" alt="' + esc(alt) +
      '" width="' + w + '" height="' + h + '" loading="lazy" decoding="async"></div>';
  }
  function artHTML(key) {
    var a = DATA.ART[key];
    var img = art(a.file, a.alt, 'scene-art' + (a.w === 1200 ? ' art-four-three' : ''), a.w, a.h);
    return a.caption ? '<figure class="scene-with-caption">' + img + '<figcaption>' + esc(a.caption) + '</figcaption></figure>' : img;
  }
  function warmupHTML(key) {
    var w = DATA.WARMUP[key];
    return '<div class="guess" role="group" aria-labelledby="guess-' + key + '">' +
      '<p id="guess-' + key + '">' + esc(w.prompt) + '</p>' +
      w.opts.map(function (o) { return '<button type="button" aria-pressed="false">' + esc(o) + '</button>'; }).join('') + '</div>';
  }
  function teacherHTML(key) {
    if (!TEACHER) return '';
    if (key === 'plan') {
      return '<p class="hint teacher-guide"><b>선생님 안내</b> 1차시는 「뮤지컬 vs 오페라」 장에서 끝나요. 2차시는 「판소리」에서 시작해요. ' +
        '지난 답을 이어서 쓰려면 같은 기기와 브라우저를 사용해요. 차시가 끝날 때마다 그 차시까지 제출해요.</p>';
    }
    return '<p class="hint teacher-guide"><b>선생님 안내</b> 1막 첫 이중창 뒤, 수잔나가 피가로에게 무엇을 재고 있는지 묻는 대화(약 1분)를 찾아 트세요. ' +
      'content.js <code>V.recitative.start</code>에 초를 적으면 바로 그 자리에서 시작합니다.</p>';
  }
  function build(html) {
    return (html || '').replace(/\{(\w+):([^}]*)\}/g, function (_, kind, value) {
      var p = value.split('|');
      if (kind === 'vid') return vidHTML(p[0], p[1], p[2]);
      if (kind === 'link') return linkHTML(p[0]);
      if (kind === 'art') return artHTML(p[0]);
      if (kind === 'warmup') return warmupHTML(p[0]);
      if (kind === 'teacher') return teacherHTML(p[0]);
      if (kind === 'activity') return qHTML(QBY[p[0]]);
      if (kind === 'term') return '<div><dt>' + esc(p[0]) + '</dt><dd><b>' + esc(p[1]) + '</b>' + esc(p[2]) + '</dd></div>';
      return '';
    });
  }

  /* ---------- 학습지 문항 ---------- */
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
    return '<div class="q q-' + q.type + (q.activity ? ' inline-answer' : '') + (wide ? ' q-wide' : '') + '" id="' + name + '"><p class="q-p" id="' + name + '-prompt">' +
      (i ? '<i aria-hidden="true">' + i + '</i>' : '') + '<span>' + esc(q.prompt) + '</span></p>' + h + markHTML(q, marks) + '</div>';
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
    syncCompareArt(mode);
    syncHeadArt();
  }
  function nextEndHTML(c, idx) {
    var nextP = PAGES[idx + 1], total = c.sheet.length, left = total - c.sheet.filter(answered).length;
    var done = left === 0, session = pageSession(idx), sessionEnd = isSessionEnd(idx);
    var box = total ? 'sheet-end' : 'lesson-end';
    var msg = total ? (left ? '아직 <b>' + left + '문항</b> 남았어요' : '이 장 학습지를 다 풀었어요.') : '글 카드를 읽고 짝과 나눴다면 다음 장으로 가요.';
    var acts;
    if (sessionEnd) {
      var ready = done || !total;
      acts = '<a class="end-go' + (ready ? ' is-ready' : '') + '" id="endGo" href="#submit?s=' + session + '">' + session + '차시 제출하기 →</a>' +
        (nextP.id === 'submit' ? '' : '<a class="end-go" href="#' + nextP.id + '">다음 차시 · ' + (idx + 2) + '장 ' + esc(nextP.nav) + ' →</a>');
    } else {
      acts = '<a class="end-go' + (done ? ' is-ready' : '') + '" id="endGo" href="#' + nextP.id + '">다음 장 · ' + (idx + 2) + '장 ' + esc(nextP.nav) + ' →</a>';
    }
    return '<div class="' + box + (done ? ' is-done' : '') + '" id="sheetEnd"><div class="sheet-end-row">' +
      '<p class="end-msg" id="endMsg">' + msg + '</p><div class="end-acts">' + acts + '</div></div></div>';
  }
  function sheetHTML(c, idx) {
    var total = c.sheet.length, n = c.sheet.filter(answered).length, marks = marking(pageSession(idx));
    var wideFlags = c.sheet.map(function (q) { return q.type === 'text'; });
    for (var s = 0; s < c.sheet.length; ) {
      if (wideFlags[s]) { s++; continue; }
      var e = s;
      while (e < c.sheet.length && !wideFlags[e]) e++;
      if ((e - s) % 2 === 1) wideFlags[e - 1] = true;
      s = e;
    }
    return '<section class="sheet" id="sheet" aria-labelledby="sheetTitle"><header class="sheet-head"><div><p class="eyebrow">' +
      (idx + 1) + '장 · ' + esc(c.title) + '</p><h2 id="sheetTitle">이 장 학습지 · ' + total + '문항</h2></div>' +
      '<span class="cnt" id="cnt">' + n + ' / ' + total + '</span></header>' +
      '<div class="sheet-body">' +
      '<p class="warn" id="saveWarn"' + (saveOk ? ' hidden' : '') + '>이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫거나 새로고침하지 마세요.</p>' +
      (TEACHER ? '<p class="t-note">교사 모드예요. <button type="button" class="mini" id="btnAns" aria-pressed="' +
        showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      '<div class="sheet-qs">' + c.sheet.map(function (q, i) { return qHTML(q, i + 1, marks, wideFlags[i]); }).join('') + '</div>' +
      (c.after ? '' : nextEndHTML(c, idx)) + '</div></section>';
  }

  /* ---------- 쪽 ---------- */
  function chapterHTML(c, idx) {
    var total = c.sheet.length, n = c.sheet.filter(answered).length;
    var guide = total ? '이 장: 위에서 보고 듣기 → 아래 학습지 ' + total + '문항' : '이 장은 두 무대 영상을 보고 읽을 무대를 골라 탐험해요';
    var chip = total ? '<a class="sheet-chip' + (n === total ? ' is-done' : '') + '" id="headChip" href="#' + c.id +
      '?sheet">이 장 학습지 <b id="headChipCnt">' + n + '/' + total + '</b> ↓</a>' : '';
    var head = '<section class="lesson"><header class="ch-head art" style="--art:url(img/head-' + c.id + '.webp)"><p class="eyebrow">' +
      pageSession(idx) + '차시 · ' + (idx + 1) + '장 · ' + esc(c.time) + '</p>' +
      '<h1 class="ch-title"><span class="ch-num">' + (idx + 1) + '장</span><span>' + esc(c.title) + '</span></h1>' +
      '<p class="lead">' + esc(c.lead) + '</p><p class="ch-guide">' + guide + '</p>' + chip + '</header>' +
      build(c.lesson) + (total ? '' : nextEndHTML(c, idx)) + '</section>';
    if (!total) return head;
    return head +
      '<div class="bridge"><div class="bridge-card"><div class="bridge-copy">' +
        '<p class="bridge-norm">여기까지 봤으면 아래 학습지에서 ' + total + '문항을 풀어요.</p>' +
        '<p class="bridge-cls">태블릿 아래 ‘이 장 학습지’ ' + total + '문항을 풀어요</p></div>' +
        '<div class="bridge-acts"><a class="bridge-go" href="#' + c.id + '?sheet">학습지로 ↓</a>' +
        '<button type="button" class="mini cls" id="btnSheet" aria-pressed="' + sheetOn + '">' +
          (sheetOn ? '칠판에서 학습지 접기' : '칠판에 학습지 펼치기') + '</button></div></div></div>' +
      sheetHTML(c, idx) + (c.after ? '<section class="lesson after-sheet">' + build(c.after) +
        (c.id === 'compare' ? '<div id="compareArt"></div>' : '') + nextEndHTML(c, idx) + '</section>' : '');
  }
  function syncCompareArt(mode) {
    var box = document.getElementById('compareArt');
    if (!box) return;
    if (!mode) box.replaceChildren();
    else if (!box.firstElementChild) {
      box.innerHTML = '<details class="more post-art"><summary>두 무대 그림 보기</summary>' + artHTML('compare') + '</details>';
    }
  }
  function syncHeadArt() {
    var head = view.querySelector('.ch-head.art');
    if (!head) return;
    var id = PAGES[lastPage].id;
    // 첫 장 그림은 공연 정체를, 비교 장 그림은 마이크 사용을 미리 보여 줄 수 있어요.
    var allowed = id === 'start' ? !document.getElementById('showIdentities').hidden : id !== 'compare' || !!marking();
    head.classList.toggle('has-art', allowed && head.dataset.art === 'ready');
    if (!allowed || head.dataset.art) return;
    head.dataset.art = 'loading';
    var probe = new Image();
    probe.onload = function () {
      head.dataset.art = 'ready';
      if (head.isConnected) syncHeadArt();
    };
    probe.onerror = function () { head.dataset.art = 'missing'; };
    probe.src = 'img/head-' + id + '.webp';
  }

  /* ---------- 제출 ---------- */
  function submitScope() {
    var s = Number(new URLSearchParams(hashParts().sub || '').get('s'));
    if (s === 1 || s === 2) return s;
    for (var sess = 2; sess >= 1; sess--) {
      var from = sess === 1 ? 0 : SPLIT, to = sess === 1 ? SPLIT : CH.length;
      if (CH.slice(from, to).some(function (c) { return c.qs.some(answered); })) return sess;
    }
    return 1;
  }
  function scopedGraded(targetSession) {
    var end = targetSession === 1 ? SPLIT : CH.length;
    return CH.slice(0, end).reduce(function (acc, c) {
      return acc.concat(c.qs.filter(function (q) { return q.ans !== undefined; }));
    }, []);
  }
  function result(targetSession) {
    var s = targetSession || 2;
    var targetGraded = scopedGraded(s);
    var wrong = [], score = 0;
    targetGraded.forEach(function (q) { if (correct(q)) score++; else if (answered(q)) wrong.push(q.label); });
    var answers = {};
    ALLQ.forEach(function (q) { answers[q.label] = valText(q).slice(0, 400); });
    var sessionScores = [];
    for (var i = 1; i <= s; i++) {
      var from = i === 1 ? 0 : SPLIT, to = i === 1 ? SPLIT : CH.length;
      var sGraded = CH.slice(from, to).reduce(function (acc, c) {
        return acc.concat(c.qs.filter(function (q) { return q.ans !== undefined; }));
      }, []);
      sessionScores.push(i + '차시 ' + sGraded.filter(correct).length + '/' + sGraded.length);
    }
    answers['제출 차시'] = s + '차시까지';
    answers['차시별 점수'] = sessionScores.join(' · ');
    return { score: score, total: targetGraded.length, wrong: wrong, answers: answers };
  }
  function submitHTML() {
    var targetSession = submitScope();
    var targetGraded = scopedGraded(targetSession);
    var left = targetGraded.filter(function (q) { return !answered(q); }).length;
    var d = state.done, doneScope = d ? (d.s || 2) : 0;
    var current = submittedAnswers(), changed = d && d.sig && !current;
    var scopeTabs = '<div class="submit-scope" role="navigation" aria-label="제출 차시 고르기">' +
      [1, 2].map(function (s) {
        var active = s === targetSession;
        return '<a class="scope-link' + (active ? ' is-now' : '') + '" href="#submit?s=' + s + '"' +
          (active ? ' aria-current="page"' : '') + '>' + s + '차시까지</a>';
      }).join('') + '</div>';
    var sumGroups = [1, 2].map(function (s) {
      var from = s === 1 ? 0 : SPLIT, to = s === 1 ? SPLIT : CH.length;
      var isFuture = s > targetSession;
      var rows = CH.slice(from, to).map(function (c, offset) {
        var k = from + offset, n = c.qs.filter(answered).length, g = c.sheet;
        var hits = current && g.length && s <= doneScope && s <= targetSession ?
          '<span class="sum-correct"> · ' + g.filter(correct).length + ' / ' + g.length + ' 맞음</span>' : '';
        return '<li><a href="#' + c.id + (g.length ? '?sheet' : '') + '"><span>' + (k + 1) + '장</span><b>' + esc(c.title) +
          '</b><span>' + n + ' / ' + c.qs.length + ' 답함' + hits + '</span></a></li>';
      }).join('');
      return '<section class="sum-group' + (isFuture ? ' is-future' : '') + '">' +
        '<div class="sum-head"><b>' + s + '차시</b>' + (isFuture ? '<span class="sum-tag">다음 차시</span>' : '') + '</div>' +
        '<ul class="sum">' + rows + '</ul></section>';
    }).join('');
    var scopeText = targetSession === 1 ? '1차시' : '1~2차시';
    var btnLabel = sending ? '보내는 중…' : (d && doneScope >= targetSession ? '다시 제출하기' : targetSession + '차시까지 제출하기');
    var showConfirm = submitConfirm === targetSession && left > 0 && !sending;
    return '<section class="lesson submit-page"><header class="ch-head"><p class="eyebrow">마무리</p><h1>제출하기</h1>' +
      '<p class="lead">' + scopeText + ' 고르는 문제 ' + targetGraded.length + '문항을 채점해요. 공통점, 마무리 한 줄과 골라 탐험에서 고른 답은 점수 없이 함께 보내요.</p>' +
      scopeTabs + '</header>' +
      (d ? '<div class="submission-status"><div class="score"><b>' + d.score + '</b><span>/ ' + d.total + '점 <small class="score-scope">(' + doneScope + '차시까지)</small></span></div><p role="status">' + esc(d.msg || '') + '</p>' +
           (changed ? '<p class="warn">제출한 뒤에 답을 고쳤어요. 위 점수는 전에 낸 답의 점수예요. 고친 답을 다시 제출할 수 있어요.</p>' : '') + '</div>' : '') +
      '<div class="sum-groups">' + sumGroups + '</div>' +
      (left ? '<p class="warn">' + scopeText + '에서 아직 답하지 않은 채점 문항이 <b>' + left + '개</b> 있어요. 장 이름을 눌러 돌아갈 수 있어요.</p>' :
        '<p class="fine">' + scopeText + ' 채점 문항에 모두 답했어요.</p>') +
      (showConfirm ? '<div class="submit-confirm" role="alert"><p class="warn">아직 답하지 않은 채점 문항이 <b>' + left + '개</b> 있어요. 빈 문항은 0점 처리돼요. 그래도 제출할까요?</p>' +
        '<div class="submit-confirm-btns"><button type="button" class="mini is-ready" id="btnSubmitForce">그래도 제출하기</button>' +
        '<button type="button" class="mini" id="btnSubmitCancel">돌아가서 풀기</button></div></div>' :
        '<button type="button" class="go" id="btnSubmit"' + (sending ? ' disabled' : '') + '>' + btnLabel + '</button>') +
      '</section>';
  }
  function doSubmit(force) {
    if (sending) return;
    var targetSession = submitScope();
    var left = scopedGraded(targetSession).filter(function (q) { return !answered(q); }).length;
    if (left && !force) {
      submitConfirm = targetSession;
      view.innerHTML = submitHTML();
      var cancelBtn = document.getElementById('btnSubmitCancel');
      if (cancelBtn) cancelBtn.focus({ preventScroll: true });
      return;
    }
    submitConfirm = 0;
    var r = result(targetSession), sig = answerSig(targetSession), sendingState = state;
    sending = true;
    route(true);
    var finish = function (res) {
      if (state !== sendingState) return;
      sending = false;
      var msg = !res ? '이 기기에서만 채점했어요.' : res.teacher ? '교사 모드라 이 화면에서만 채점했어요.' :
        res.ok && !res.offline ? '선생님께 보냈어요.' : res.ok ? '허브에 연결되면 제출할 수 있어요.' :
        '보내지 못했어요. 인터넷을 확인하고 다시 제출해 주세요.' + (res.error ? ' (' + res.error + ')' : '');
      state.done = { score: r.score, total: r.total, s: targetSession, msg: msg, at: Date.now(), sig: res && res.ok ? sig : '' };
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
    var grp = function (t, from, to) {
      return '<div class="grp"><p>' + t + '</p>' + PAGES.slice(from, to).map(function (p, k) { return link(p, from + k); }).join('') + '</div>';
    };
    nav.innerHTML = grp('1차시', 0, SPLIT) + grp('2차시', SPLIT, CH.length) + link(PAGES[CH.length], CH.length);
    document.getElementById('burger').textContent = PAGES[i].ch ? (i + 1) + '장 · 목차' : '제출 · 목차';
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
    var first = prompt.querySelector('.prompt-sheet');
    if (first) first.focus({ preventScroll: true });
  }
  function focusFirstUnanswered(idx) {
    var c = PAGES[idx] && PAGES[idx].ch;
    if (!c || !c.sheet.length) return;
    if (classOn && !sheetOn) setSheet(true);
    var targetQ = c.sheet.filter(function (q) { return !answered(q); })[0] || c.sheet[0];
    var card = document.getElementById('q-' + targetQ.id);
    if (!card) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    var field = card.querySelector('input:checked, input, select, textarea');
    if (field) field.focus({ preventScroll: true });
  }
  function syncPager(i) {
    var pgDo = document.getElementById('pgDo');
    var where = document.getElementById('where');
    var nextBtn = document.getElementById('next');
    var p = PAGES[i];
    if (!p || !p.ch) {
      pgDo.hidden = true;
      where.hidden = false;
      where.textContent = '제출';
      nextBtn.classList.remove('is-ready');
      document.getElementById('pgBar').style.width = '100%';
      return;
    }
    var c = p.ch, total = c.sheet.length, count = c.sheet.filter(answered).length;
    var done = count === total, session = pageSession(i), sessionEnd = isSessionEnd(i);
    document.getElementById('pgBar').style.width = Math.min(100, (i + 1) / CH.length * 100) + '%';
    if (sessionEnd && (total === 0 || done)) {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-ready';
      pgDo.dataset.action = 'submit';
      pgDo.innerHTML = '<span class="pg-long">' + session + '차시 제출하기 →</span><span class="pg-short">' + session + '차시 제출 →</span>';
      pgDo.setAttribute('aria-label', session + '차시 제출하기');
      nextBtn.classList.remove('is-ready');
    } else if (total === 0) {
      pgDo.hidden = true;
      where.hidden = false;
      where.textContent = (i + 1) + ' / ' + CH.length + '장';
      nextBtn.classList.add('is-ready');
    } else if (done) {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-done';
      pgDo.dataset.action = 'to-sheet';
      pgDo.innerHTML = '<span class="pg-long">학습지 ' + total + '/' + total + ' 완료</span><span class="pg-short">' + total + '/' + total + ' 완료</span>';
      pgDo.setAttribute('aria-label', '학습지 ' + total + '/' + total + ' 완료, 학습지 보기');
      nextBtn.classList.add('is-ready');
    } else if (sheetVisible) {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-working';
      pgDo.dataset.action = 'first-unanswered';
      pgDo.innerHTML = '<span class="pg-long">학습지 ' + count + '/' + total + '</span><span class="pg-short">학습지 ' + count + '/' + total + '</span>';
      pgDo.setAttribute('aria-label', '안 푼 문항으로 가기, 학습지 ' + count + '/' + total);
      nextBtn.classList.remove('is-ready');
    } else {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-ready';
      pgDo.dataset.action = 'to-sheet';
      pgDo.innerHTML = '<span class="pg-long">↓ 이 장 학습지 ' + count + '/' + total + '</span><span class="pg-short">학습지 ' + count + '/' + total + ' ↓</span>';
      pgDo.setAttribute('aria-label', '이 장 학습지 ' + count + '/' + total + ' 풀러 내려가기');
      nextBtn.classList.remove('is-ready');
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
    }, { rootMargin: '-72px 0px -70px 0px', threshold: 0 });
    sheetObserver.observe(sheetEl);
  }
  function refreshCount() {
    var i = lastPage, c = PAGES[i] && PAGES[i].ch;
    var total = c ? c.sheet.length : 0, n = total ? c.sheet.filter(answered).length : 0;
    var left = total - n, all = total > 0 && left === 0;
    if (all) closePagerPrompt();
    if (total) {
      document.getElementById('cnt').textContent = n + ' / ' + total;
      document.getElementById('headChipCnt').textContent = n + '/' + total;
      document.getElementById('headChip').classList.toggle('is-done', all);
      nav.querySelector('.subl.here span').textContent = n + '/' + total;
      var a = nav.querySelector('a.on'), dot = a.querySelector('.dot');
      if (all && !dot) a.insertAdjacentHTML('beforeend', '<em class="dot" title="학습지 다 풂"></em>');
      else if (!all && dot) dot.remove();
      document.getElementById('sheetEnd').classList.toggle('is-done', all);
      document.getElementById('endGo').classList.toggle('is-ready', all);
      document.getElementById('endMsg').innerHTML = all ? '이 장 학습지를 다 풀었어요.' : '아직 <b>' + left + '문항</b> 남았어요';
    }
    syncPager(i);
  }
  function route(keep) {
    var i = cur(), p = PAGES[i];
    closePagerPrompt();
    if (lastPage !== i || p.ch) submitConfirm = 0;
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
    nx.setAttribute('aria-label', nx.disabled ? '다음' : '다음 · ' + nextLabel);
    document.title = (p.ch ? p.ch.title + ' · ' : '') + TITLE;
    observeSheet(i);
    refreshCount();
    syncExplore();
    syncCompareArt(marking());
    syncHeadArt();
    if (!keep) jump();
  }
  function setSheet(on) {
    sheetOn = on;
    body.classList.toggle('class-sheet', on);
    var sh = document.getElementById('sheet');
    if (!on && sh) stopVideos(sh);
    var bs = document.getElementById('btnSheet');
    if (bs) { bs.setAttribute('aria-pressed', String(on)); bs.textContent = on ? '칠판에서 학습지 접기' : '칠판에 학습지 펼치기'; }
    if (lastPage >= 0 && PAGES[lastPage] && PAGES[lastPage].ch) {
      observeSheet(lastPage);
      syncPager(lastPage);
    }
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
    if (cur() === lastPage && PAGES[cur()] && PAGES[cur()].ch) { jump(); return; }
    stopVideos();
    route();
    view.focus({ preventScroll: true });
  });

  /* ---------- 입력·활동 ---------- */
  function syncExplore() {
    var followup = document.getElementById('exploreFollowup');
    if (!followup) return;
    var choice = val(QBY.x1);
    view.querySelectorAll('[data-explore]').forEach(function (panel) { panel.hidden = panel.dataset.explore !== choice; });
    followup.hidden = QBY.x1.opts.indexOf(choice) < 0;
  }
  function storeAnswer(el) {
    var id = el.dataset.q, q = QBY[id];
    if (!q) return;
    if (q.type === 'radio') {
      if (!el.checked) return;
      pendingRadio = null;
    }
    if (q.type === 'multi') {
      state.a[id] = Array.from(el.closest('.opts').querySelectorAll('input:checked'), function (x) { return x.value; });
    } else {
      if (state.a[id] === el.value) return;
      state.a[id] = el.value;
    }
    save();
    refreshCount();
    if (id === 'x1') syncExplore();
    if (state.done) refreshMarks();
  }
  view.addEventListener('input', function (e) { if (e.target.tagName === 'TEXTAREA') storeAnswer(e.target); });
  view.addEventListener('change', function (e) { storeAnswer(e.target); });
  // 방향키로 옮겨 보는 값은 저장하지 않고, Enter·Space, 클릭 또는 문항을 벗어날 때 확정해요.
  view.addEventListener('keydown', function (e) {
    var el = e.target;
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
  function stopVideos(container) {
    (container || view).querySelectorAll('.vid.playing').forEach(function (f) {
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
      var btnRev = document.getElementById('btnReveal');
      var ready = guesses.querySelectorAll('[aria-pressed=true]').length === 3;
      btnRev.disabled = !ready && !TEACHER;
      btnRev.classList.toggle('is-ready', ready && document.getElementById('showIdentities').hidden);
    }
  }
  view.addEventListener('click', function (e) {
    var el = e.target;
    if (el.type === 'radio' && el.dataset.q) storeAnswer(el);
    var a = el.closest('a');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); jump(); }
    var t = el.closest('button');
    if (!t) return;
    if (t.id === 'btnSheet') {
      setSheet(!sheetOn);
      if (sheetOn) document.getElementById('sheet').scrollIntoView({ block: 'start', behavior: 'instant' });
    } else if (t.classList.contains('vid-play')) playVideo(t);
    else if (t.parentNode.classList.contains('guess')) pickWarmup(t, t.parentNode);
    else if (t.id === 'btnReveal') {
      var identities = document.getElementById('showIdentities');
      identities.hidden = !identities.hidden;
      t.setAttribute('aria-expanded', String(!identities.hidden));
      t.classList.toggle('is-ready', identities.hidden && document.getElementById('showGuesses').querySelectorAll('[aria-pressed=true]').length === 3);
      syncHeadArt();
    } else if (t.id === 'btnAns' && TEACHER && !classOn) {
      showAns = !showAns;
      refreshMarks();
    } else if (t.id === 'btnSubmit') doSubmit();
    else if (t.id === 'btnSubmitForce') doSubmit(true);
    else if (t.id === 'btnSubmitCancel') {
      submitConfirm = 0;
      view.innerHTML = submitHTML();
      var sb = document.getElementById('btnSubmit');
      if (sb) sb.focus({ preventScroll: true });
    }
  });

  document.addEventListener('classroom:away', stopVideos);
  view.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.tagName !== 'DETAILS' || d.open) return;
    d.querySelectorAll('.vid.playing').forEach(function () { stopVideos(); });
  }, true);
  document.addEventListener('classroom:switch', function () {
    stopVideos();
    closePagerPrompt();
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = fresh();
    pendingRadio = null;
    submitConfirm = 0;
    showAns = false;
    sending = false;
    lastPage = -1;
    route();
  });
  // 이미지 파일이 아직 없는 자리는 접어요. 그림 설명은 그림 없이도 읽을 수 있어요.
  view.addEventListener('error', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('art-img')) {
      var slot = t.closest('.post-art') || t.parentNode;
      slot.hidden = true;
    }
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

  function onSideResize() {
    if (!mq.matches && !classOn && body.classList.contains('side-open')) {
      closeSide();
      if (sideClosed) burger.focus();
    } else syncSide();
  }
  if (mq.addEventListener) mq.addEventListener('change', onSideResize); else if (mq.addListener) mq.addListener(onSideResize);
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
    if (mq.matches || classOn) closeSide();
    else setSideClosed(true, true);
    burger.focus();
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
    body.classList.toggle('side-closed', on || sideClosed);
    if (!on && sheetOn) setSheet(false);
    btnClass.textContent = on ? '수업 모드 끄기' : '수업 모드 켜기';
    btnClass.setAttribute('aria-pressed', String(on));
    refreshMarks();
    syncSide();
    if (lastPage >= 0 && PAGES[lastPage] && PAGES[lastPage].ch) {
      observeSheet(lastPage);
      syncPager(lastPage);
    }
    if (on) {
      var sh = document.getElementById('sheet');
      if (sh) stopVideos(sh);
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
  document.querySelector('.skip').addEventListener('click', function (e) { e.preventDefault(); view.focus(); });
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); closeSide(); jump(); }
  });
  syncSide();
  document.getElementById('prev').addEventListener('click', function () { closePagerPrompt(); go(-1); });
  document.getElementById('next').addEventListener('click', function () {
    var p = PAGES[cur()];
    if (p && p.ch && !classOn && !TEACHER) {
      var left = p.ch.sheet.filter(function (q) { return !answered(q); }).length;
      if (left > 0) { showPagerPrompt(left); return; }
    }
    closePagerPrompt();
    go(1);
  });
  document.getElementById('pgDo').addEventListener('click', function () {
    closePagerPrompt();
    var idx = cur(), p = PAGES[idx];
    if (!p || !p.ch) return;
    var action = document.getElementById('pgDo').dataset.action;
    if (action === 'submit') {
      location.hash = 'submit?s=' + pageSession(idx);
    } else if (action === 'first-unanswered') {
      focusFirstUnanswered(idx);
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
      focusFirstUnanswered(cur());
    } else if (btn.classList.contains('prompt-skip')) {
      closePagerPrompt();
      go(1);
    }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#pagerPrompt, #next')) closePagerPrompt();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('side-open')) { closeSide(); burger.focus(); return; }
    var promptEl = document.getElementById('pagerPrompt');
    if (e.key === 'Escape' && promptEl && !promptEl.hidden) { closePagerPrompt(); document.getElementById('next').focus(); return; }
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('a, button, input, select, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });

  route();
})();

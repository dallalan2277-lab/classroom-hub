/* 방구석 세계 음악 여행 — 화면·저장·제출.
 * 수업 내용과 문항은 content.js에 두고, 학번·이름과 허브 연결은 classroom.js에 맡겨요.
 */
(function () {
  'use strict';
  var DATA = window.WORLD, V = DATA.V, CH = DATA.CHAPTERS;
  var CR = window.Classroom || null;
  var TEACHER = !!(CR && CR.teacher);
  var KEY = 'world-music-v1', FS_KEY = 'world-music-fs', SIDE_KEY = 'world-music-side';
  var TITLE = '방구석 세계 음악 여행';
  var SPLIT = CH.findIndex(function (c) { return c.split; });
  var GROUPS = [];
  var PAGES = CH.map(function (c, idx) {
    if (idx === 0 || c.split) GROUPS.push([]);
    var session = GROUPS.length;
    var p = { id: c.id, nav: c.title, ch: c, index: idx, session: session };
    GROUPS[session - 1].push(p);
    return p;
  });
  PAGES.push({ id: 'submit', nav: '제출하기', index: PAGES.length });
  var SESSION_NAMES = ['세계의 악기와 음악', '세계의 노래'];
  var ALLQ = [], QBY = {};
  CH.forEach(function (c) {
    c.sheet = c.qs;
    c.qs.forEach(function (q) { QBY[q.id] = q; ALLQ.push(q); });
  });
  var GRADED = ALLQ.filter(function (q) { return q.ans !== undefined; });

  var view = document.getElementById('view'), nav = document.getElementById('nav');
  var root = document.documentElement, body = document.body;
  var showAns = false, sending = false, lastPage = -1, sheetOn = false, classOn = false;
  var pendingRadio = null;
  var sheetObserver = null, sheetVisible = false, submitConfirm = 0;

  function isSessionEnd(p) {
    if (!p || !p.ch) return false;
    var next = PAGES[p.index + 1];
    return !!(next && ((next.ch && next.ch.split) || next.id === 'submit'));
  }

  var QSIG = ALLQ.map(function (q) { return q.id; }).join(',');
  var EXTRA_KEYS = [];
  if (DATA.CAPSULE) Object.keys(DATA.CAPSULE).forEach(function (k) { EXTRA_KEYS.push(DATA.CAPSULE[k].id); });
  if (DATA.BALANCE) Object.keys(DATA.BALANCE).forEach(function (k) { EXTRA_KEYS.push(DATA.BALANCE[k].id); });
  if (DATA.CUES) Object.keys(DATA.CUES).forEach(function (k) { EXTRA_KEYS.push('cue-' + k); });
  if (DATA.MAPGAME) Object.keys(DATA.MAPGAME).forEach(function (k) { EXTRA_KEYS.push(DATA.MAPGAME[k].id); });
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
          EXTRA_KEYS.forEach(function (k) {
            if (Object.prototype.hasOwnProperty.call(s.a, k)) a[k] = s.a[k];
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
  function scopedQuestions(targetSession) {
    var out = [];
    PAGES.forEach(function (p) {
      if (p.ch && p.session <= targetSession) {
        p.ch.sheet.forEach(function (q) { out.push(q); });
      }
    });
    return out;
  }
  function scopedGraded(targetSession) {
    return scopedQuestions(targetSession).filter(function (q) { return q.ans !== undefined; });
  }
  // 차시별 제출: s차시까지의 문항 답만 견준다(다음 차시를 풀어도 앞 차시 채점 표시가 남게).
  // s가 없으면 예전 방식(모든 문항)으로 견준다 — 이 판 전에 제출한 기록 호환용.
  function answerSig(s) {
    var list = s ? scopedQuestions(s) : ALLQ;
    return JSON.stringify(list.map(valText));
  }
  function submittedAnswers() {
    return !!(state.done && state.done.sig && state.done.sig === answerSig(state.done.s));
  }
  function marking() {
    if (classOn) return '';
    if (TEACHER) return showAns ? 'key' : '';
    if (!submittedAnswers()) return '';
    var doneScope = state.done.s || GROUPS.length;
    var p = PAGES[lastPage];
    if (p && p.session && p.session > doneScope) return '';
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
  function thumbURL(yt) {
    return 'https://i.ytimg.com/vi/' + encodeURIComponent(yt) + '/hqdefault.jpg';
  }
  function vidHTML(key, cap) {
    var v = V[key], title = esc(v.title);
    var mode = v.mode === 'solo' ? '태블릿 · 각자 짧게' : '칠판 · 다 같이';
    var hasMedia = !!(v.audioSrc || v.id);
    var showThumb = !!(v.id && !v.audioOnly && !v.blind && !v.audioSrc);
    var attrs = ' data-video="' + esc(key) + '" data-yt="' + esc(v.id || '') + '" data-start="' + v.start + '" data-end="' + v.end + '"' +
      (v.audioOnly ? ' data-audio="1"' : '') + (v.blind ? ' data-blind="1"' : '') + (v.audioSrc ? ' data-audio-src="1"' : '');
    var thumb = showThumb ? '<img class="vid-thumb" src="' + thumbURL(v.id) + '" alt="" loading="lazy" decoding="async">' : '';
    var player = hasMedia ? '<button class="vid-play' + (showThumb ? ' has-thumb' : '') + '" type="button" data-label="' + title + '" aria-pressed="false" aria-label="' + title + ' 재생">' +
      thumb + '<span class="play" aria-hidden="true"></span><span class="vid-mask">' + title + '</span></button>' :
      '<div class="vid-pending"><span class="vid-mask">' + title + '</span><small>영상 준비 중</small></div>';
    var credit = v.credit ? '<p class="vid-credit"' + (v.blind ? ' hidden' : '') + '>음원: <a href="' + esc(v.credit.page) + '" target="_blank" rel="noopener noreferrer">' +
      esc(v.credit.title) + '</a> · ' + esc(v.credit.author) + ' · ' + esc(v.credit.license) + '</p>' : '';
    return '<figure class="vid"' + attrs + '>' +
      player + '<figcaption><div class="vid-head"><b>' + title + '</b><span class="play-mode">' + mode + '</span></div>' +
      (v.by ? '<small>' + esc(v.by) + '</small>' : '') + '<em>' + esc(cap || (v.end - v.start) + '초 듣기') + '</em>' + credit + '</figcaption></figure>';
  }
  function vidInlineHTML(key) {
    var v = V[key];
    if (!v) return '';
    var sec = Math.max(1, v.end - v.start), title = esc(v.title);
    var mode = v.mode === 'solo' ? '태블릿 · 각자 짧게' : '칠판 · 다 같이';
    var label = sec + '초 소리 듣기';
    var meta = title + ' · ' + mode;
    var player = v.id ? '<button class="vid-play vid-inline-play" type="button" data-label="' + esc(label) + '" data-meta="' + esc(meta) + '" aria-pressed="false" aria-label="' + title + ' ' + sec + '초 소리 재생">' +
      '<span class="play" aria-hidden="true"></span><span class="vid-mask">' + esc(label) + '</span>' +
      '<span class="vid-inline-meta">' + meta + '</span></button>' :
      '<div class="vid-pending"><span class="vid-mask">' + title + '</span><small>소리 준비 중</small></div>';
    return '<figure class="vid vid-inline" data-video="' + esc(key) + '" data-yt="' + esc(v.id) + '" data-start="' + v.start + '" data-end="' + v.end + '" data-audio="1">' +
      player + '</figure>';
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
      '<div class="guess-opts">' +
      w.opts.map(function (o) { return '<button type="button" aria-pressed="false">' + esc(o) + '</button>'; }).join('') +
      '</div></div>';
  }
  function capsuleHTML(key) {
    var c = DATA.CAPSULE && DATA.CAPSULE[key];
    if (!c) return '';
    var chosen = typeof state.a[c.id] === 'string' ? state.a[c.id] : '';
    return '<aside class="bigq capsule-box" data-capsule="' + esc(c.id) + '" role="group" aria-labelledby="cap-' + esc(key) + '">' +
      '<b>' + esc(c.eyebrow || '오늘의 질문 · 타임캡슐') + '</b>' +
      '<p id="cap-' + esc(key) + '">' + esc(c.question) + '</p>' +
      '<small class="cap-prompt">' + esc(c.prompt) + '</small>' +
      '<div class="cap-opts">' + c.opts.map(function (o) {
        var on = chosen === o;
        return '<button type="button" class="cap-btn" data-cap-id="' + esc(c.id) + '" data-cap-val="' + esc(o) + '" aria-pressed="' + String(on) + '">' + esc(o) + '</button>';
      }).join('') + '</div>' +
      '<p class="cap-status" aria-live="polite"' + (chosen ? '' : ' hidden') + '>' + (chosen ? '저장된 첫 생각: <b>' + esc(chosen) + '</b> (마지막 장에서 다시 열려요)' : '') + '</p>' +
      '</aside>';
  }
  function capsuleRecallHTML(key) {
    var c = DATA.CAPSULE && DATA.CAPSULE[key];
    if (!c) return '';
    var before = typeof state.a[c.id] === 'string' && state.a[c.id] ? state.a[c.id] : '';
    var extra = '';
    if (c.alsoRecall && DATA.CAPSULE[c.alsoRecall]) {
      var prev = DATA.CAPSULE[c.alsoRecall];
      var prevVal = typeof state.a[prev.id] === 'string' && state.a[prev.id] ? state.a[prev.id] : '';
      if (prevVal) extra = '<p class="cap-sub">1차시 타임캡슐 첫 생각: <b>' + esc(prevVal) + '</b></p>';
    }
    return '<aside class="capsule-recall">' +
      '<b>' + esc(c.recallTitle || '오늘의 질문 · 타임캡슐 열어 보기') + '</b>' +
      '<p class="cap-q">' + esc(c.question) + '</p>' +
      '<p class="cap-before">수업 시작 전 나의 생각: <b>' + esc(before || '선택 안 함') + '</b></p>' +
      extra + '<p class="cap-after">' + esc(c.recallPrompt) + '</p></aside>';
  }
  function getCueState(key, c) {
    var raw = state.a['cue-' + key];
    if (c.type === 'counter') {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return { count: Math.max(0, Number(raw.count) || 0), locked: !!raw.locked };
      }
      return { count: 0, locked: false };
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return { picked: Array.isArray(raw.picked) ? raw.picked.slice() : [], checked: !!raw.checked };
    }
    if (Array.isArray(raw)) return { picked: raw.slice(), checked: false };
    return { picked: [], checked: false };
  }
  function cueInnerHTML(key) {
    var c = DATA.CUES && DATA.CUES[key];
    if (!c) return '';
    var st = getCueState(key, c);
    if (c.type === 'counter') {
      var unit = c.unit || '번';
      return '<p class="cue-title"><b>귀로 세기</b> ' + esc(c.title) + '</p>' +
        '<div class="cue-counter-row">' +
          '<button type="button" class="cue-tap" data-cue-tap="' + esc(key) + '"' + (st.locked ? ' disabled' : '') + '>' + esc(c.btnLabel) + '</button>' +
          '<div class="cue-readout" aria-live="polite"><b>' + st.count + '</b><span>' + esc(unit) + '</span></div>' +
          '<div class="cue-counter-sub">' +
            '<button type="button" class="mini cue-minus" data-cue-minus="' + esc(key) + '" aria-label="1 빼기"' + (st.locked || st.count === 0 ? ' disabled' : '') + '>−1</button>' +
            '<button type="button" class="mini cue-reset" data-cue-reset="' + esc(key) + '">초기화</button>' +
            '<button type="button" class="mini cue-lock' + (st.count > 0 && !st.locked ? ' is-ready' : '') + '" data-cue-lock="' + esc(key) + '" aria-pressed="' + String(st.locked) + '">' + (st.locked ? '다시 세기' : '기록 확정') + '</button>' +
          '</div>' +
        '</div>' +
        '<p class="cue-fb' + (st.locked ? ' ok' : '') + '">' + (st.locked ? '내 기록 ' + st.count + unit + ' 확정! ' + esc(c.compare) : esc(c.compare)) + '</p>';
    }
    var picked = st.picked, checked = st.checked;
    var totalRight = c.items.filter(function (it) { return it.ok; }).length;
    var rightPicked = 0, wrongPicked = 0;
    picked.forEach(function (idx) {
      if (c.items[idx] && c.items[idx].ok) rightPicked++;
      else if (c.items[idx]) wrongPicked++;
    });
    var fbHTML = '';
    if (checked) {
      if (rightPicked === totalRight && wrongPicked === 0) {
        fbHTML = '<p class="cue-fb ok" role="status" aria-live="polite">소리 탐정 성공! 진짜 단서 ' + totalRight + '개를 정확히 찾아냈어요.</p>';
      } else if (wrongPicked > 0) {
        fbHTML = '<p class="cue-fb no" role="status" aria-live="polite">함정 단서 ' + wrongPicked + '개가 섞여 있어요! 빨간 칩을 해제하고 다시 귀 기울여 봐요.</p>';
      } else if (rightPicked === 0) {
        fbHTML = '<p class="cue-fb no" role="status" aria-live="polite">영상을 들으며 진짜라고 생각되는 단서 2개를 먼저 눌러 봐요.</p>';
      } else {
        fbHTML = '<p class="cue-fb warn" role="status" aria-live="polite">지금 고른 단서는 맞아요! 진짜 단서가 ' + (totalRight - rightPicked) + '개 더 있어요.</p>';
      }
    }
    return '<p class="cue-title"><b>소리 탐정</b> ' + esc(c.title) + '</p><div class="cue-chips">' +
      c.items.map(function (item, idx) {
        var on = picked.indexOf(idx) >= 0;
        var mark = '';
        var extraCls = '';
        if (checked && on) {
          if (item.ok) { extraCls = ' is-ok'; mark = '<em class="cue-tag">진짜</em>'; }
          else { extraCls = ' is-trap'; mark = '<em class="cue-tag">함정</em>'; }
        }
        return '<button type="button" class="cue-chip' + extraCls + '" data-cue-key="' + esc(key) + '" data-cue-idx="' + idx + '" aria-pressed="' + String(on) + '">' +
          '<span>' + esc(item.text) + '</span>' + mark + '</button>';
      }).join('') + '</div>' +
      '<div class="cue-acts"><span class="cue-picked-cnt">선택 ' + picked.length + ' / ' + totalRight + '</span>' +
      '<button type="button" class="mini cue-check' + (picked.length > 0 && !checked ? ' is-ready' : '') + '" data-cue-check="' + esc(key) + '">단서 검증하기</button></div>' +
      fbHTML;
  }
  function cueHTML(key) {
    var c = DATA.CUES && DATA.CUES[key];
    if (!c) return '';
    return '<div class="listen-cue cue-' + esc(c.type || 'detective') + '" data-cue="' + esc(key) + '" role="group" aria-label="' + esc(c.title) + '">' + cueInnerHTML(key) + '</div>';
  }
  function refreshCue(key) {
    var box = view.querySelector('[data-cue="' + key + '"]');
    if (!box) return;
    box.innerHTML = cueInnerHTML(key);
  }
  function balanceHTML(key) {
    var b = DATA.BALANCE && DATA.BALANCE[key];
    if (!b) return '';
    var chosen = typeof state.a[b.id] === 'string' ? state.a[b.id] : '';
    return '<section class="balance-box" data-balance="' + esc(b.id) + '" aria-labelledby="bal-' + esc(key) + '">' +
      '<p class="bal-eyebrow">1분 음악 밸런스 투표</p>' +
      '<h3 class="bal-q" id="bal-' + esc(key) + '">' + esc(b.prompt) + '</h3>' +
      '<div class="bal-grid" role="group" aria-labelledby="bal-' + esc(key) + '">' +
        '<button type="button" class="bal-btn" data-bal-id="' + esc(b.id) + '" data-bal-side="A" aria-pressed="' + String(chosen === 'A') + '">' +
          '<span class="bal-tag">선택 A</span><strong>' + esc(b.a.label) + '</strong><small>' + esc(b.a.sub) + '</small>' +
        '</button>' +
        '<button type="button" class="bal-btn" data-bal-id="' + esc(b.id) + '" data-bal-side="B" aria-pressed="' + String(chosen === 'B') + '">' +
          '<span class="bal-tag">선택 B</span><strong>' + esc(b.b.label) + '</strong><small>' + esc(b.b.sub) + '</small>' +
        '</button>' +
      '</div>' +
      '<div class="talk bal-talk' + (chosen ? ' is-active' : '') + '"><b>짝과 30초 토론</b>' + esc(b.talk) + '</div></section>';
  }
  var PIN_BY = {};
  (DATA.MAP_PINS || []).forEach(function (p) { PIN_BY[p.id] = p; });
  var mapUI = {};

  function mapDoneList(g) {
    var v = state.a[g.id];
    return Array.isArray(v) ? v.filter(function (n) { return typeof n === 'number' && n >= 0 && n < g.rounds.length; }) : [];
  }
  function getMapUI(key, g) {
    var done = mapDoneList(g);
    var ui = mapUI[key];
    if (!ui) {
      var nextIdx = 0;
      for (var i = 0; i < g.rounds.length; i++) { if (done.indexOf(i) < 0) { nextIdx = i; break; } }
      ui = mapUI[key] = { roundIdx: nextIdx, step: 1, listened: false, feedback: '', feedbackType: '', inspectIdx: -1 };
    }
    if (done.length < g.rounds.length && done.indexOf(ui.roundIdx) >= 0) {
      for (var j = 0; j < g.rounds.length; j++) { if (done.indexOf(j) < 0) { ui.roundIdx = j; break; } }
      ui.step = 1;
      ui.listened = false;
    }
    return ui;
  }
  function rotateOpts(opts, seed) {
    var out = opts.slice(), shift = (seed * 2 + 1) % out.length;
    return out.slice(shift).concat(out.slice(0, shift));
  }
  function mapStepsBarHTML(ui, allDone) {
    var curStep = allDone ? 4 : (ui.step === 2 ? 3 : (ui.listened ? 2 : 1));
    var steps = ['① 듣기', '② 지도에서 나라 누르기', '③ 이름 고르기'];
    return '<ol class="map-stage-steps" aria-label="미션 진행 단계">' + steps.map(function (label, idx) {
      var n = idx + 1;
      var isDone = allDone || n < curStep;
      var isCur = !allDone && n === curStep;
      var cls = isDone ? 'is-done' : (isCur ? 'is-current' : '');
      return (idx ? '<li class="map-stage-arrow" aria-hidden="true">→</li>' : '') +
        '<li data-mstep="' + n + '"' + (cls ? ' class="' + cls + '"' : '') + (isCur ? ' aria-current="step"' : '') + '>' + esc(label) + '</li>';
    }).join('') + '</ol>';
  }
  function mapStepGuideText(ui) {
    if (ui.step === 2) return '③ 이름 고르기';
    return ui.listened ? '② 지도에서 나라 누르기' : '① 소리 듣기 → ② 지도에서 나라 누르기';
  }
  function syncMapSteps(key) {
    var box = view.querySelector('[data-map-game="' + key + '"]');
    var g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!box || !g) return;
    var done = mapDoneList(g), ui = getMapUI(key, g), allDone = done.length >= g.rounds.length;
    var bar = box.querySelector('.map-stage-steps');
    if (bar) bar.outerHTML = mapStepsBarHTML(ui, allDone);
    var guide = box.querySelector('.map-step-guide');
    if (guide && !allDone) guide.textContent = mapStepGuideText(ui);
  }
  function mapRoundsHTML(key, g, done, ui, allDone) {
    return '<div class="map-round-bar"><span class="map-round-label">미션</span>' +
      '<div class="map-round-tabs" role="tablist" aria-label="미션 번호 고르기">' +
      g.rounds.map(function (r, idx) {
        var isSolved = done.indexOf(idx) >= 0;
        var isCur = allDone ? ui.inspectIdx === idx : ui.roundIdx === idx;
        var disabled = !allDone && isSolved;
        var p = PIN_BY[r.pin];
        var ariaLabel = (idx + 1) + '번 미션' + (isSolved ? ' · ' + (p ? p.name + ' ' : '') + r.answer + ' 완료' : '');
        return '<button type="button" class="map-round-tab' + (isSolved ? ' is-done' : '') + '" role="tab"' +
          ' data-map-key="' + esc(key) + '" data-map-round="' + idx + '"' +
          ' aria-selected="' + String(isCur) + '"' +
          (disabled ? ' disabled' : '') +
          ' aria-label="' + esc(ariaLabel) + '">' +
          (isSolved ? '<span class="map-tab-chk" aria-hidden="true">✓</span>' : '') + (idx + 1) + '</button>';
      }).join('') + '</div></div>';
  }
  function mapGameInnerHTML(key) {
    var g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!g) return '';
    var done = mapDoneList(g), ui = getMapUI(key, g), total = g.rounds.length;
    var allDone = done.length >= total;
    var matchedByPin = {};
    done.forEach(function (idx) {
      var r = g.rounds[idx];
      if (r) matchedByPin[r.pin] = { round: r, idx: idx };
    });

    var missionHTML = '';
    if (allDone) {
      var insp = ui.inspectIdx >= 0 && g.rounds[ui.inspectIdx] ? g.rounds[ui.inspectIdx] : null;
      var inspPin = insp ? PIN_BY[insp.pin] : null;
      missionHTML = '<div class="map-mission is-complete">' +
        '<p class="map-step-badge is-done">지도 완성 · ' + total + ' / ' + total + '</p>' +
        '<h4>세계 음악 지도를 모두 채웠어요!</h4>' +
        (ui.feedback ? '<p class="map-fb ' + esc(ui.feedbackType || '') + '" role="status" aria-live="polite">' + esc(ui.feedback) + '</p>' : '') +
        '<p class="map-clue">지도의 핀이나 위 번호를 누르면 각 나라의 소리와 음색 특징을 다시 확인할 수 있어요.</p>' +
        (insp && inspPin ? '<div class="map-inspect"><b>' + esc(inspPin.name) + ' · ' + esc(insp.answer) + '</b><span>' + esc(insp.tag) + '</span>' +
          '<p>' + esc(insp.clue) + '</p>' + vidInlineHTML(insp.listen) + '</div>' : '') +
        '</div>';
    } else {
      var r = g.rounds[ui.roundIdx], targetPin = PIN_BY[r.pin];
      var step2 = ui.step === 2;
      var fbHTML = ui.feedback ? '<p class="map-fb ' + esc(ui.feedbackType || '') + '" role="status" aria-live="polite">' + esc(ui.feedback) + '</p>' : '';
      var optsHTML = step2 ? '<div class="map-opts" role="group" aria-label="악기 또는 노래 고르기">' +
        '<p class="map-opts-prompt"><b>③ 이름 고르기</b> ' + esc(targetPin.name) + '에서 들은 이 소리의 이름은?</p>' +
        '<div class="map-opt-row">' + rotateOpts(r.opts, ui.roundIdx).map(function (opt) {
          return '<button type="button" class="map-opt" data-map-key="' + esc(key) + '" data-map-opt="' + esc(opt) + '">' + esc(opt) + '</button>';
        }).join('') + '</div></div>' : '';
      missionHTML = '<div class="map-mission">' +
        '<div class="map-mission-top"><span class="map-step-badge">미션 ' + (ui.roundIdx + 1) + ' / ' + total + ' · ' + esc(r.tag) + '</span>' +
        '<span class="map-step-guide">' + esc(mapStepGuideText(ui)) + '</span></div>' +
        fbHTML +
        optsHTML +
        '<p class="map-clue"><b>음색 단서</b> ' + esc(r.clue) + '</p>' +
        vidInlineHTML(r.listen) +
        '</div>';
    }

    var pinsHTML = g.pins.map(function (pid) {
      var p = PIN_BY[pid];
      if (!p) return '';
      var m = matchedByPin[pid];
      var isTargetActive = !allDone && ui.step === 2 && g.rounds[ui.roundIdx].pin === pid;
      var isInspected = allDone && ui.inspectIdx >= 0 && g.rounds[ui.inspectIdx].pin === pid;
      var cls = 'map-pin' + (m ? ' is-matched' : '') + (isTargetActive ? ' is-found' : '') + (isInspected ? ' is-inspect' : '');
      var label = m ? p.name + ' · ' + m.round.answer : p.name;
      return '<button type="button" class="' + cls + '" data-map-key="' + esc(key) + '" data-pin="' + esc(pid) + '" style="left:' + p.x + '%;top:' + p.y + '%" aria-label="' + esc(label) + '">' +
        '<i class="pin-dot" aria-hidden="true"></i><span class="pin-name">' + esc(p.name) + '</span>' +
        (m ? '<em class="pin-ans">' + esc(m.round.answer) + '</em>' : '') + '</button>';
    }).join('');

    var deckHTML = done.length ? '<ul class="map-deck">' + done.map(function (idx) {
      var r = g.rounds[idx], p = PIN_BY[r.pin];
      return '<li><b>' + esc(p.name) + '</b><span>' + esc(r.answer) + '</span><small>' + esc(r.tag) + '</small></li>';
    }).join('') + '</ul>' : '';

    return '<div class="map-head"><div><p class="map-eyebrow">' + esc(g.eyebrow) + '</p><h3>' + esc(g.title) + '</h3>' +
      '<p class="map-intro">' + esc(g.intro) + '</p></div>' +
      '<div class="map-meta"><span class="map-cnt">완료 <b>' + done.length + '</b> / ' + total + '</span>' +
      '<button type="button" class="mini map-reset" data-map-reset="' + esc(key) + '">처음부터 다시</button></div></div>' +
      mapStepsBarHTML(ui, allDone) +
      mapRoundsHTML(key, g, done, ui, allDone) +
      '<div class="map-board"><div class="map-stage"><img class="map-base" src="img/map-base.webp" width="1600" height="893" alt="세계 대륙과 바다를 그린 지도" decoding="async" onerror="this.hidden=true"><div class="map-pins">' + pinsHTML + '</div></div></div>' +
      '<p class="map-scroll-hint">지도를 좌우로 밀어 모든 나라 핀을 살펴볼 수 있어요.</p>' +
      missionHTML +
      deckHTML;
  }
  function mapGameHTML(key) {
    if (!DATA.MAPGAME || !DATA.MAPGAME[key]) return '';
    return '<section class="map-game" id="map-' + esc(key) + '" data-map-game="' + esc(key) + '">' + mapGameInnerHTML(key) + '</section>';
  }
  function refreshMapGame(key) {
    var box = view.querySelector('[data-map-game="' + key + '"]');
    if (!box) return;
    stopVideos(box);
    box.innerHTML = mapGameInnerHTML(key);
  }
  function scrollMapMission(key) {
    var m = view.querySelector('[data-map-game="' + key + '"] .map-mission');
    if (!m) return;
    var rect = m.getBoundingClientRect();
    if (rect.top < 72 || rect.bottom > window.innerHeight - 84) {
      m.scrollIntoView({ block: 'nearest' });
    }
  }
  function teacherHTML(key) {
    if (!TEACHER || key !== 'plan') return '';
    function timetable(chapters, lesson) {
      return '<section><h3>' + lesson + '차시 · 45분</h3><ol>' + chapters.map(function (c) {
        return '<li><b>' + esc(c.time) + ' · ' + esc(c.title) + '</b><span>' + esc(c.task) + '</span></li>';
      }).join('') + '</ol></section>';
    }
    return '<details class="more teacher-guide"><summary>교사용 시간표 · 두 차시</summary><div class="time-plan">' +
      timetable(CH.slice(0, SPLIT), 1) + timetable(CH.slice(SPLIT), 2) +
      '</div><p>둘째 시간에도 같은 기기와 브라우저로 열어요. 차시가 끝날 때마다 그 차시까지 제출해요.</p></details>';
  }
  function build(html) {
    return (html || '').replace(/\{(\w+):([^}]*)\}/g, function (_, kind, value) {
      var p = value.split('|');
      if (kind === 'vid') return vidHTML(p[0], p[1]);
      if (kind === 'art') return artHTML(p[0]);
      if (kind === 'warmup') return warmupHTML(p[0]);
      if (kind === 'capsule') return capsuleHTML(p[0]);
      if (kind === 'capsuleRecall') return capsuleRecallHTML(p[0]);
      if (kind === 'cue') return cueHTML(p[0]);
      if (kind === 'balance') return balanceHTML(p[0]);
      if (kind === 'mapGame') return mapGameHTML(p[0]);
      if (kind === 'teacher') return teacherHTML(p[0]);
      if (kind === 'term') return '<div><dt>' + esc(p[0]) + '</dt><dd><b>' + esc(p[1]) + '</b>' + esc(p[2]) +
        (p[3] ? '<span class="sing-tip"><strong>부를 때 살릴 점</strong> ' + esc(p[3]) + '</span>' : '') + '</dd></div>';
      return '';
    });
  }

  /* ---------- 학습지 문항 ---------- */
  function qHTML(q, i, marks, wide) {
    var v = val(q), h = '', name = 'q-' + q.id, label = ' aria-labelledby="' + name + '-prompt"';
    var listen = q.listen && V[q.listen] ? vidInlineHTML(q.listen) : '';
    if (q.type === 'pick') {
      label = ' aria-labelledby="pick-group ' + name + '-prompt"';
      h = '<select data-q="' + q.id + '"' + label + '><option value="">고르기</option>' + q.opts.map(function (o) {
        return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
    } else if (q.type === 'text') {
      var vocab = Array.isArray(q.vocab) && q.vocab.length ? '<div class="vocab-bar" role="group" aria-label="음악 감각 어휘 디딤돌">' +
        '<p class="vocab-guide">눌러서 글상자에 넣기:</p><div class="vocab-group">' + q.vocab.map(function (word) {
          var used = v.indexOf(word) >= 0;
          return '<button type="button" class="vocab-chip" data-vocab-for="' + esc(q.id) + '" data-word="' + esc(word) + '" aria-pressed="' + String(used) + '">' + esc(word) + '</button>';
        }).join('') + '</div></div>' : '';
      h = vocab + '<textarea data-q="' + q.id + '" rows="2" maxlength="400" placeholder="' + esc(q.ph || '') + '"' + label + '>' + esc(v) + '</textarea>';
    } else {
      var multi = q.type === 'multi';
      h = '<div class="opts" role="' + (multi ? 'group' : 'radiogroup') + '"' + label + '>' + q.opts.map(function (o) {
        var checked = multi ? v.indexOf(o) >= 0 : o === v;
        return '<label><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name + '" data-q="' + q.id +
          '" value="' + esc(o) + '"' + (checked ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('') + '</div>';
    }
    var group = q.group ? '<h3 class="pick-group" id="pick-group">' + esc(q.group) + '</h3>' : '';
    // 문항 본문에서 강조 태그만 허용하고, 입력값과 보기는 항상 이스케이프해요.
    var prompt = esc(q.prompt).replace(/&lt;(\/?b)&gt;/g, '<$1>');
    return group + '<div class="q q-' + q.type + (wide ? ' q-wide' : '') + '" id="' + name + '"><p class="q-p" id="' + name + '-prompt">' +
      (i ? '<i aria-hidden="true">' + i + '</i>' : '') + '<span>' + prompt + '</span></p>' + listen + h + markHTML(q, marks) + '</div>';
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
  function nextLink(p, done) {
    var next = PAGES[p.index + 1];
    if (isSessionEnd(p)) {
      var ready = done || !p.ch.sheet.length;
      var submitBtn = '<a class="end-go' + (ready ? ' is-ready' : '') + '" href="#submit?s=' + p.session + '">' + p.session + '차시 제출하기 →</a>';
      if (next.id === 'submit') return submitBtn;
      return submitBtn + '<a class="end-go" href="#' + next.id + '">다음 차시 · ' + (next.index + 1) + '장 ' + esc(next.nav) + ' →</a>';
    }
    var label = next.id === 'submit' ? '제출 화면으로 →' : '다음 장 · ' + (next.index + 1) + '장 ' + esc(next.nav) + ' →';
    return '<a class="end-go' + (done ? ' is-ready' : '') + '" href="#' + next.id + '">' + label + '</a>';
  }
  function nextEndHTML(c, idx) {
    var p = PAGES[idx], total = c.sheet.length, left = total - c.sheet.filter(answered).length;
    var box = total ? 'sheet-end' : 'lesson-end';
    var msg = total ? progressMessage(total, left) : '활동을 마치면 아래 버튼으로 이동해요.';
    return '<div class="' + box + (left ? '' : ' is-done') + '" id="sheetEnd"><div class="sheet-end-row">' +
      '<p class="end-msg" id="endMsg">' + msg + '</p><div class="end-acts">' + nextLink(p, left === 0) + '</div></div></div>';
  }
  function sheetHTML(c, idx) {
    var total = c.sheet.length, n = c.sheet.filter(answered).length, marks = marking();
    var wideFlags = c.sheet.map(function () { return false; });
    for (var wi = 0; wi < c.sheet.length; ) {
      if (c.sheet[wi].type === 'text') { wi++; continue; }
      var wEnd = wi + 1;
      while (wEnd < c.sheet.length && c.sheet[wEnd].type !== 'text' && !c.sheet[wEnd].group) wEnd++;
      if ((wEnd - wi) % 2 === 1) wideFlags[wEnd - 1] = true;
      wi = wEnd;
    }
    return '<section class="sheet" id="sheet" aria-labelledby="sheetTitle">' +
      '<header class="sheet-head"><div><p class="eyebrow">' + (idx + 1) + '장 · ' + esc(c.title) + '</p>' +
      '<h2 id="sheetTitle">이 장 학습지 · ' + total + '문항</h2></div><span class="cnt" id="cnt">' + n + ' / ' + total + '</span></header>' +
      '<div class="sheet-body">' +
      '<p class="warn" id="saveWarn"' + (saveOk ? ' hidden' : '') + '>이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫거나 새로고침하지 마세요.</p>' +
      (TEACHER ? '<p class="t-note">교사 모드예요. <button type="button" class="mini" id="btnAns" aria-pressed="' +
        showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      '<div class="sheet-qs">' + c.sheet.map(function (q, i) { return qHTML(q, i + 1, marks, wideFlags[i]); }).join('') + '</div>' +
      (c.after ? '' : nextEndHTML(c, idx)) + '</div></section>';
  }

  /* ---------- 쪽 ---------- */
  function chapterHTML(c, idx) {
    var p = PAGES[idx], total = c.sheet.length, n = c.sheet.filter(answered).length;
    var guideText = total
      ? '이 장: 위에서 보고 듣기 → 아래 학습지 ' + total + '문항'
      : (c.id === 'start' ? '이 장은 학습지 없이 소리 3개를 듣고 대륙을 짐작해요' : '이 장은 학습지 없이 지난 시간을 소리로 떠올려요');
    var chip = total ? '<a class="sheet-chip' + (n === total ? ' is-done' : '') + '" id="headChip" href="#' + c.id +
      '?sheet">이 장 학습지 <b id="headChipCnt">' + n + '/' + total + '</b> ↓</a>' : '';
    var head = '<section class="lesson"><header class="ch-head art" style="--art:url(img/head-' + c.id + '.webp)"><p class="eyebrow">' +
      p.session + '차시 · ' + (idx + 1) + '장 · ' + esc(c.time) + '</p>' +
      '<h1 class="ch-title"><span class="ch-num">' + (idx + 1) + '장</span><span>' + esc(c.title) + '</span></h1>' +
      '<p class="lead">' + esc(c.lead) + '</p>' +
      '<p class="ch-guide">' + guideText + '</p>' + chip + '</header>' +
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
    probe.src = 'img/head-' + id + '.webp';
  }

  /* ---------- 제출 ---------- */
  function submitScope() {
    var sub = hashParts().sub || '';
    var raw = new URLSearchParams(sub).get('s');
    var s = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
    if (s >= 1 && s <= GROUPS.length) return s;
    for (var i = GROUPS.length; i >= 1; i--) {
      if (GROUPS[i - 1].some(function (p) { return p.ch.sheet.some(answered); })) return i;
    }
    return 1;
  }
  function result(targetSession) {
    var sMax = targetSession || GROUPS.length;
    var targetGraded = scopedGraded(sMax);
    var wrong = [], score = 0;
    targetGraded.forEach(function (q) { if (correct(q)) score++; else if (answered(q)) wrong.push(q.label); });
    var answers = {};
    ALLQ.forEach(function (q) { answers[q.label] = valText(q).slice(0, 400); });
    var sessionScores = [];
    for (var s = 1; s <= sMax; s++) {
      var sGraded = GROUPS[s - 1].reduce(function (acc, p) {
        return acc.concat(p.ch.sheet.filter(function (q) { return q.ans !== undefined; }));
      }, []);
      var sScore = sGraded.filter(correct).length;
      sessionScores.push(s + '차시 ' + sScore + '/' + sGraded.length);
    }
    answers['제출 차시'] = sMax + '차시까지';
    answers['차시별 점수'] = sessionScores.join(' · ');
    return { score: score, total: targetGraded.length, wrong: wrong, answers: answers };
  }
  function submitHTML() {
    var targetSession = submitScope();
    var targetGraded = scopedGraded(targetSession);
    var left = targetGraded.filter(function (q) { return !answered(q); }), d = state.done;
    var doneScope = d ? (d.s || GROUPS.length) : 0;
    var current = !!(d && d.sig && d.sig === answerSig(d.s)), changed = !!(d && d.sig && !current);
    var scopeTabs = '<div class="submit-scope" role="navigation" aria-label="제출 차시 고르기">' +
      GROUPS.map(function (_, i) {
        var s = i + 1;
        var active = s === targetSession;
        return '<a class="scope-link' + (active ? ' is-now' : '') + '" href="#submit?s=' + s + '"' +
          (active ? ' aria-current="page"' : '') + '>' + s + '차시까지</a>';
      }).join('') + '</div>';
    var sumGroups = GROUPS.map(function (group, i) {
      var s = i + 1;
      var isFuture = s > targetSession;
      var rows = group.map(function (p) {
        var c = p.ch;
        var n = c.qs.filter(answered).length;
        var g = c.sheet.filter(function (q) { return q.ans !== undefined; });
        var hits = !isFuture && s <= doneScope && !classOn && current && g.length ? '<span class="sum-correct"> · ' + g.filter(correct).length + ' / ' + g.length + ' 맞음</span>' : '';
        return '<li><a href="#' + c.id + (c.sheet.length ? '?sheet' : '') + '"><span>' + (p.index + 1) + '장</span><b>' + esc(c.title) +
          '</b><span>' + (c.qs.length ? n + ' / ' + c.qs.length + ' 답함' : '듣기·말하기') + hits + '</span></a></li>';
      }).join('');
      return '<section class="sum-group' + (isFuture ? ' is-future' : '') + '">' +
        '<div class="sum-head"><b>' + s + '차시 · ' + esc(SESSION_NAMES[i] || '') + '</b>' +
        (isFuture ? '<span class="sum-tag">다음 차시</span>' : '') + '</div>' +
        '<ul class="sum">' + rows + '</ul></section>';
    }).join('');
    var scopeText = targetSession === 1 ? '1차시' : '1~' + targetSession + '차시';
    var btnLabel = sending ? '보내는 중…' : (d && doneScope >= targetSession ? '다시 제출하기' : targetSession + '차시까지 제출하기');
    var showConfirm = submitConfirm === targetSession && left.length > 0 && !sending;
    return '<section class="lesson submit-page"><header class="ch-head"><p class="eyebrow">마무리</p><h1>제출하기</h1>' +
      '<p class="lead">' + scopeText + ' 고르기 ' + targetGraded.length + '문항을 채점해요. 생각 한 줄과 활동 기록은 쓴 만큼 점수 없이 함께 보내요. 빈 글 칸이 있어도 제출할 수 있어요.</p>' +
      scopeTabs + '</header>' +
      (d ? '<div class="submission-status"><div class="score"><b>' + d.score + '</b><span>/ ' + d.total + '점</span><small class="score-scope">(' + doneScope + '차시까지)</small></div><p role="status">' + esc(d.msg || '') + '</p>' +
           (changed ? '<p class="warn">제출한 뒤에 답을 고쳤어요. 위 점수는 전에 낸 답의 점수예요. 고친 답을 다시 제출할 수 있어요.</p>' : '') + '</div>'
         : '') +
      '<div class="sum-groups">' + sumGroups + '</div>' +
      (left.length ? '<p class="warn">' + scopeText + '에서 아직 답하지 않은 채점 문항이 <b>' + left.length + '개</b> 있어요. 장 이름을 눌러 돌아갈 수 있어요.</p>' :
        '<p class="fine">' + scopeText + ' 채점 문항에 모두 답했어요.</p>') +
      (showConfirm ? '<div class="submit-confirm" role="alert">' +
        '<p class="warn">아직 답하지 않은 채점 문항이 <b>' + left.length + '개</b> 있어요. 빈 문항은 0점 처리돼요. 그래도 제출할까요?</p>' +
        '<div class="submit-confirm-btns">' +
          '<button type="button" class="mini is-ready" id="btnSubmitForce">그래도 제출하기</button>' +
          '<button type="button" class="mini" id="btnSubmitCancel">돌아가서 풀기</button>' +
        '</div></div>'
      : '<button type="button" class="go" id="btnSubmit"' + (sending ? ' disabled' : '') + '>' + btnLabel + '</button>') + '</section>';
  }
  function doSubmit(force) {
    if (sending) return;
    var targetSession = submitScope();
    var left = scopedGraded(targetSession).filter(function (q) { return !answered(q); }).length;
    if (left && !force) {
      submitConfirm = targetSession;
      route(true);
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
      state.done = { score: r.score, total: r.total, s: targetSession, msg: msg, at: Date.now(), sig: !res || res.ok ? sig : '' };
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
    document.getElementById('burger').textContent = PAGES[i] && PAGES[i].ch ? (i + 1) + '장 · 목차' : '제출 · 목차';
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
    var b = prompt.querySelector('.prompt-sheet');
    if (b) b.focus({ preventScroll: true });
  }
  function focusFirstUnanswered(p) {
    if (!p || !p.ch || !p.ch.sheet.length) return;
    if (classOn && !sheetOn) setSheet(true);
    var targetQ = p.ch.sheet.find(function (q) { return !answered(q); }) || p.ch.sheet[0];
    var card = document.getElementById('q-' + targetQ.id);
    if (!card) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    var field = card.querySelector('input[type="radio"]:checked, input[type="radio"], input[type="checkbox"]:checked, input[type="checkbox"], select, textarea');
    if (field) field.focus({ preventScroll: true });
  }
  function syncPager(p) {
    var pgDo = document.getElementById('pgDo');
    var where = document.getElementById('where');
    var nx = document.getElementById('next');
    if (!p || !p.ch) {
      pgDo.hidden = true;
      where.hidden = false;
      where.textContent = '제출';
      nx.classList.remove('is-ready');
      document.getElementById('pgBar').style.width = '100%';
      return;
    }
    var total = p.ch.sheet.length, count = p.ch.sheet.filter(answered).length;
    var sessionEnd = isSessionEnd(p), done = count === total;
    document.getElementById('pgBar').style.width = Math.min(100, (p.index + 1) / CH.length * 100) + '%';

    if (sessionEnd && (total === 0 || done)) {
      pgDo.hidden = false;
      where.hidden = true;
      pgDo.className = 'pg-do is-ready';
      pgDo.dataset.action = 'submit';
      pgDo.innerHTML = '<span class="pg-long">' + p.session + '차시 제출하기 →</span><span class="pg-short">' + p.session + '차시 제출 →</span>';
      pgDo.setAttribute('aria-label', p.session + '차시 제출하기');
      nx.classList.remove('is-ready');
    } else if (total === 0) {
      pgDo.hidden = true;
      where.hidden = false;
      where.textContent = (p.index + 1) + ' / ' + CH.length + '장';
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
  function observeSheet(p) {
    if (sheetObserver) {
      sheetObserver.disconnect();
      sheetObserver = null;
    }
    sheetVisible = false;
    var sheetEl = document.getElementById('sheet');
    if (!sheetEl || !p || !p.ch || !p.ch.sheet.length || typeof IntersectionObserver !== 'function') return;
    sheetObserver = new IntersectionObserver(function (entries) {
      var entry = entries[entries.length - 1];
      if (!entry) return;
      if (entry.isIntersecting !== sheetVisible) {
        sheetVisible = entry.isIntersecting;
        if (PAGES[lastPage] === p) syncPager(p);
      }
    }, { rootMargin: '-84px 0px -70px 0px', threshold: 0 });
    sheetObserver.observe(sheetEl);
  }
  function refreshCount() {
    var i = lastPage, p = PAGES[i], c = p && p.ch;
    var total = c ? c.sheet.length : 0, n = total ? c.sheet.filter(answered).length : 0;
    var left = total - n, all = total > 0 && left === 0;
    var nx = document.getElementById('next'), nextP = PAGES[i + 1];
    if (nextP) nx.setAttribute('aria-label', '다음 · ' + (nextP.ch ? (nextP.index + 1) + '장 ' + nextP.nav : nextP.nav) + (all ? ' (이 장 학습지 완료)' : ''));
    else nx.removeAttribute('aria-label');
    if (total) {
      document.getElementById('cnt').textContent = n + ' / ' + total;
      document.getElementById('headChipCnt').textContent = n + '/' + total;
      document.getElementById('headChip').classList.toggle('is-done', all);
      nav.querySelector('.subl.here span').textContent = n + '/' + total;
      var a = nav.querySelector('a.on'), dot = a.querySelector('.dot');
      if (all && !dot) a.insertAdjacentHTML('beforeend', '<em class="dot" title="학습지 다 풂"></em>');
      else if (!all && dot) dot.remove();
      document.getElementById('sheetEnd').classList.toggle('is-done', all);
      var endGo = view.querySelector('#sheetEnd .end-go');
      if (endGo) endGo.classList.toggle('is-ready', all);
      document.getElementById('endMsg').innerHTML = progressMessage(total, left);
      if (all) closePagerPrompt();
    }
    syncPager(p);
  }
  function route(keep) {
    var i = cur(), p = PAGES[i];
    closePagerPrompt();
    if (!keep && (lastPage !== i || !p.ch)) submitConfirm = 0;
    pendingRadio = null;
    lastPage = i;
    view.innerHTML = p.ch ? chapterHTML(p.ch, i) : submitHTML();
    navHTML(i);
    var pv = document.getElementById('prev'), nx = document.getElementById('next');
    pv.disabled = i === 0;
    nx.disabled = i === PAGES.length - 1;
    var prevLabel = i ? (PAGES[i - 1].ch ? (PAGES[i - 1].index + 1) + '장 ' + PAGES[i - 1].nav : PAGES[i - 1].nav) : '';
    var nextLabel = nx.disabled ? '' : (PAGES[i + 1].ch ? (PAGES[i + 1].index + 1) + '장 ' + PAGES[i + 1].nav : PAGES[i + 1].nav);
    pv.querySelector('b').textContent = prevLabel;
    pv.setAttribute('aria-label', prevLabel ? '이전 · ' + prevLabel : '');
    nx.querySelector('b').textContent = nextLabel;
    document.title = (p.ch ? p.ch.title + ' · ' : '') + TITLE;
    observeSheet(p);
    refreshCount();
    syncHeadArt();
    syncRevealUI();
    if (!keep) jump();
  }
  function setSheet(on) {
    sheetOn = on;
    body.classList.toggle('class-sheet', on);
    var sheetEl = document.getElementById('sheet');
    if (!on && sheetEl) stopVideos(sheetEl);
    var p = PAGES[lastPage];
    if (p && p.ch && p.ch.sheet.length) observeSheet(p);
    var bs = document.getElementById('btnSheet');
    if (bs) { bs.setAttribute('aria-pressed', String(on)); bs.textContent = on ? '칠판에서 학습지 접기' : '칠판에 학습지 펼치기'; }
    if (p) syncPager(p);
  }
  function jump() {
    var s = hashParts().sub === 'sheet' && document.getElementById('sheet');
    if (s) {
      if (classOn && !sheetOn) setSheet(true);
      s.scrollIntoView({ block: 'start' });
      sheetVisible = true;
      if (PAGES[lastPage]) syncPager(PAGES[lastPage]);
    } else window.scrollTo(0, 0);
  }
  function go(d) { var i = cur() + d; if (i >= 0 && i < PAGES.length) location.hash = PAGES[i].id; }
  window.addEventListener('hashchange', function () {
    closeSide();
    if (cur() === lastPage && PAGES[lastPage] && PAGES[lastPage].ch) { jump(); return; }
    stopVideos();
    route();
    view.focus({ preventScroll: true });
  });

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
        toast('정거장은 ' + q.max + '곳까지 골라요. 바꾸려면 고른 곳을 먼저 해제해요.');
        return;
      }
      state.a[id] = Array.from(el.closest('.opts').querySelectorAll('input:checked'), function (x) { return x.value; });
    } else {
      if (state.a[id] === el.value) return;
      state.a[id] = el.value;
    }
    save();
    refreshCount();
    if (state.done) refreshMarks();
  }
  function syncVocabChips(ta) {
    var box = ta.closest('.q');
    if (!box) return;
    var text = ta.value || '';
    box.querySelectorAll('.vocab-chip').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(text.indexOf(btn.dataset.word || '') >= 0));
    });
  }
  function insertVocab(btn) {
    var qid = btn.dataset.vocabFor, word = btn.dataset.word || '';
    var ta = view.querySelector('textarea[data-q="' + qid + '"]');
    if (!ta || !word) return;
    var curVal = ta.value || '';
    if (curVal.indexOf(word) >= 0) {
      toast('이미 들어간 표현이에요.');
      ta.focus();
      return;
    }
    var start = typeof ta.selectionStart === 'number' ? ta.selectionStart : curVal.length;
    var end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : curVal.length;
    var before = curVal.slice(0, start), after = curVal.slice(end);
    var leadSpace = before && !/[\s(]$/.test(before) ? ' ' : '';
    var trailSpace = after && !/^[\s,.)]/.test(after) ? ' ' : '';
    var maxLen = ta.maxLength > 0 ? ta.maxLength : 400;
    var nextVal = (before + leadSpace + word + trailSpace + after).slice(0, maxLen);
    ta.value = nextVal;
    var caret = Math.min(nextVal.length, (before + leadSpace + word).length);
    ta.focus();
    try { ta.setSelectionRange(caret, caret); } catch (e) {}
    storeAnswer(ta);
    syncVocabChips(ta);
  }
  view.addEventListener('input', function (e) {
    if (e.target.tagName === 'TEXTAREA') {
      storeAnswer(e.target);
      syncVocabChips(e.target);
    }
  });
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
  var currentAudio = null;
  function stopVideos(container) {
    var scope = container || view;
    if (currentAudio) {
      var a = currentAudio;
      currentAudio = null;
      a.onloadedmetadata = null;
      a.onseeked = null;
      a.ontimeupdate = null;
      a.onended = null;
      a.onerror = null;
      try { a.pause(); } catch (e) {}
      try { a.removeAttribute('src'); a.load(); } catch (e) {}
    }
    scope.querySelectorAll('.vid.playing').forEach(function (f) {
      var frame = f.querySelector('iframe');
      if (frame) frame.remove();
      f.classList.remove('playing', 'audio-playing');
      var play = f.querySelector('.vid-play');
      if (play) {
        play.hidden = false;
        play.setAttribute('aria-pressed', 'false');
        var mask = play.querySelector('.vid-mask');
        if (mask && play.dataset.label) mask.textContent = play.dataset.label;
        var meta = play.querySelector('.vid-inline-meta');
        if (meta && play.dataset.meta) meta.textContent = play.dataset.meta;
      }
    });
  }
  function openYouTubePlayer(f, button) {
    var st = Number(f.dataset.start), en = Number(f.dataset.end);
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(f.dataset.yt) +
      '?autoplay=1&rel=0&playsinline=1' +
      (st ? '&start=' + st : '') + (en ? '&end=' + en : '');
    frame.title = button.getAttribute('aria-label') || '영상 재생';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    f.classList.remove('audio-playing');
    f.classList.add('playing');
    if (f.classList.contains('vid-inline')) {
      button.hidden = false;
      button.setAttribute('aria-pressed', 'true');
      var mask = button.querySelector('.vid-mask');
      if (mask) mask.textContent = '재생 중 · 눌러서 멈추기';
      var meta = button.querySelector('.vid-inline-meta');
      if (meta) meta.textContent = '다시 누르면 닫혀요';
      f.appendChild(frame);
      return;
    }
    button.hidden = true;
    f.prepend(frame);
  }
  function playAudioClip(f, button, v) {
    var audioStart = Math.max(0, Number(v.audioStart) || 0);
    var duration = Math.max(1, (Number(f.dataset.end) - Number(f.dataset.start)) || 15);
    var stopAt = audioStart + duration;
    var audio = new Audio();
    currentAudio = audio;
    audio.preload = 'auto';
    var sought = audioStart === 0;
    if (audioStart > 0) audio.muted = true;
    audio.src = v.audioSrc;

    var fellBack = false;
    function fallbackToYouTube() {
      if (fellBack || currentAudio !== audio) return;
      fellBack = true;
      stopVideos();
      if (f.isConnected && f.dataset.yt) openYouTubePlayer(f, button);
    }
    function applyStart() {
      if (!sought && currentAudio === audio) {
        sought = true;
        try { audio.currentTime = audioStart; } catch (e) { audio.muted = false; }
      }
    }
    audio.onloadedmetadata = applyStart;
    audio.onseeked = function () {
      if (currentAudio === audio) audio.muted = false;
    };
    audio.ontimeupdate = function () {
      if (currentAudio !== audio) return;
      if (!sought && audio.readyState >= 1) applyStart();
      if (sought && audio.muted && audio.currentTime >= audioStart - 0.5) audio.muted = false;
      if (sought && audio.currentTime >= stopAt) stopVideos();
    };
    audio.onended = function () {
      if (currentAudio === audio) stopVideos();
    };
    audio.onerror = fallbackToYouTube;

    f.classList.add('playing', 'audio-playing');
    button.setAttribute('aria-pressed', 'true');
    var mask = button.querySelector('.vid-mask');
    if (mask) mask.textContent = '재생 중 · 눌러서 멈추기';
    var meta = button.querySelector('.vid-inline-meta');
    if (meta) meta.textContent = '자유이용 음원 재생 중';

    try {
      var p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          if (currentAudio === audio && (!err || err.name !== 'AbortError')) fallbackToYouTube();
        });
      }
    } catch (e) {
      fallbackToYouTube();
    }
  }
  function syncRevealUI() {
    var btn = document.getElementById('btnReveal');
    var guesses = document.getElementById('showGuesses');
    var identities = document.getElementById('showIdentities');
    if (!btn || !guesses || !identities) return;
    var total = guesses.querySelectorAll('.guess').length;
    var picked = guesses.querySelectorAll('[aria-pressed="true"]').length;
    var allPicked = total > 0 && picked === total;
    var isOpen = !identities.hidden;
    var ready = allPicked && !isOpen;
    btn.disabled = !allPicked && !TEACHER && !isOpen;
    btn.classList.toggle('is-ready', ready);
    btn.classList.toggle('is-open', isOpen);
    var bar = btn.closest('[data-reveal-bar]');
    if (bar) {
      bar.classList.toggle('is-ready', ready);
      bar.classList.toggle('is-open', isOpen);
    }
    var hint = document.getElementById('revealHint');
    if (hint) {
      var msg = isOpen ? btn.dataset.hintOpen
        : allPicked ? btn.dataset.hintReady
        : TEACHER ? btn.dataset.hintTeacher
        : btn.dataset.hintWait;
      if (!isOpen && !allPicked && !TEACHER && total > 1 && msg) {
        msg += ' (' + picked + ' / ' + total + ' 선택)';
      }
      hint.textContent = msg || '';
    }
    var flow = btn.closest('[data-reveal-flow]');
    if (flow) {
      var listened = flow.dataset.listened === '1' || picked > 0 || isOpen;
      var s1 = flow.querySelector('.flow-steps [data-step="1"]');
      var s2 = flow.querySelector('.flow-steps [data-step="2"]');
      var s3 = flow.querySelector('.flow-steps [data-step="3"]');
      if (s1) {
        s1.classList.toggle('is-done', listened);
        s1.classList.toggle('is-current', !listened);
      }
      if (s2) {
        s2.classList.toggle('is-done', allPicked || isOpen);
        s2.classList.toggle('is-current', listened && !allPicked && !isOpen);
      }
      if (s3) {
        s3.classList.toggle('is-done', isOpen);
        s3.classList.toggle('is-current', allPicked && !isOpen);
      }
    }
  }
  function playVideo(button) {
    var f = button.parentNode;
    if (f.classList.contains('playing')) {
      stopVideos();
      return;
    }
    stopVideos();
    var flow = f.closest('[data-reveal-flow]');
    if (flow) { flow.dataset.listened = '1'; syncRevealUI(); }
    var mapBox = f.closest('[data-map-game]');
    if (mapBox) {
      var mapKey = mapBox.dataset.mapGame;
      var g = DATA.MAPGAME && DATA.MAPGAME[mapKey];
      if (g) {
        var ui = getMapUI(mapKey, g);
        if (!ui.listened) { ui.listened = true; syncMapSteps(mapKey); }
      }
    }
    var v = V[f.dataset.video];
    if (v && v.audioSrc) {
      playAudioClip(f, button, v);
      return;
    }
    if (f.dataset.yt) openYouTubePlayer(f, button);
  }
  function pickWarmup(t, group) {
    group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
    syncRevealUI();
  }
  function pickCapsule(btn) {
    var box = btn.closest('.capsule-box'), capId = btn.dataset.capId, capVal = btn.dataset.capVal;
    if (!box || !capId) return;
    state.a[capId] = capVal;
    save();
    box.querySelectorAll('.cap-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    var status = box.querySelector('.cap-status');
    if (status) {
      status.hidden = false;
      status.innerHTML = '저장된 첫 생각: <b>' + esc(capVal) + '</b> (마지막 장에서 다시 열려요)';
    }
  }
  function toggleCue(btn) {
    var key = btn.dataset.cueKey, idx = Number(btn.dataset.cueIdx), c = DATA.CUES && DATA.CUES[key];
    if (!c) return;
    var st = getCueState(key, c);
    var pos = st.picked.indexOf(idx);
    if (pos >= 0) st.picked.splice(pos, 1);
    else st.picked.push(idx);
    st.checked = false;
    state.a['cue-' + key] = st;
    save();
    refreshCue(key);
  }
  function checkCue(key) {
    var c = DATA.CUES && DATA.CUES[key];
    if (!c) return;
    var st = getCueState(key, c);
    st.checked = true;
    state.a['cue-' + key] = st;
    save();
    refreshCue(key);
  }
  function updateCounterCue(key, action) {
    var c = DATA.CUES && DATA.CUES[key];
    if (!c) return;
    var st = getCueState(key, c);
    if (action === 'tap' && !st.locked) st.count++;
    else if (action === 'minus' && !st.locked) st.count = Math.max(0, st.count - 1);
    else if (action === 'reset') { st.count = 0; st.locked = false; }
    else if (action === 'lock') st.locked = !st.locked;
    state.a['cue-' + key] = st;
    save();
    refreshCue(key);
    if (action === 'tap') {
      var num = view.querySelector('[data-cue="' + key + '"] .cue-readout b');
      if (num) { num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); }
    }
  }
  function pickBalance(btn) {
    var box = btn.closest('.balance-box'), balId = btn.dataset.balId, sideVal = btn.dataset.balSide;
    if (!box || !balId) return;
    state.a[balId] = sideVal;
    save();
    box.querySelectorAll('.bal-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    var talk = box.querySelector('.bal-talk');
    if (talk) talk.classList.add('is-active');
  }
  function setMapFeedback(key, msg, type) {
    var box = view.querySelector('[data-map-game="' + key + '"]');
    if (!box) return;
    var fb = box.querySelector('.map-fb');
    if (fb) {
      fb.className = 'map-fb ' + (type || '');
      fb.textContent = msg;
      return;
    }
    var top = box.querySelector('.map-mission-top');
    var html = '<p class="map-fb ' + esc(type || '') + '" role="status" aria-live="polite">' + esc(msg) + '</p>';
    if (top) top.insertAdjacentHTML('afterend', html);
    else {
      var m = box.querySelector('.map-mission');
      if (m) m.insertAdjacentHTML('afterbegin', html);
    }
  }
  function clickMapRound(btn) {
    var key = btn.dataset.mapKey, idx = Number(btn.dataset.mapRound), g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!g || isNaN(idx) || idx < 0 || idx >= g.rounds.length) return;
    var done = mapDoneList(g), ui = getMapUI(key, g);
    if (done.length >= g.rounds.length) {
      ui.inspectIdx = idx;
      ui.feedback = '';
      ui.feedbackType = '';
      refreshMapGame(key);
      scrollMapMission(key);
      return;
    }
    if (done.indexOf(idx) >= 0) return;
    ui.roundIdx = idx;
    ui.step = 1;
    ui.listened = false;
    ui.feedback = '';
    ui.feedbackType = '';
    refreshMapGame(key);
  }
  function clickMapPin(btn) {
    var key = btn.dataset.mapKey, pid = btn.dataset.pin, g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!g) return;
    var done = mapDoneList(g), ui = getMapUI(key, g), p = PIN_BY[pid];
    if (done.length >= g.rounds.length) {
      var foundIdx = g.rounds.findIndex(function (r) { return r.pin === pid; });
      if (foundIdx >= 0) {
        ui.inspectIdx = foundIdx;
        ui.feedback = '';
        ui.feedbackType = '';
        refreshMapGame(key);
        scrollMapMission(key);
      }
      return;
    }
    ui.listened = true;
    var r = g.rounds[ui.roundIdx], target = PIN_BY[r.pin];
    if (ui.step === 2) {
      if (pid === r.pin) { scrollMapMission(key); return; }
      ui.feedback = target.name + ' 핀을 이미 찾았어요! 아래 ③ 이름 고르기에서 이름을 골라요.';
      ui.feedbackType = 'ok';
      refreshMapGame(key);
      scrollMapMission(key);
      return;
    }
    var already = done.some(function (idx) { return g.rounds[idx].pin === pid; });
    if (already) {
      ui.feedback = p.name + '는 이미 매칭했어요! 아직 채워지지 않은 핀을 찾아봐요.';
      ui.feedbackType = '';
      syncMapSteps(key);
      setMapFeedback(key, ui.feedback, ui.feedbackType);
      scrollMapMission(key);
      return;
    }
    if (pid === r.pin) {
      ui.step = 2;
      ui.feedback = '맞았어요! ' + p.name + '(' + p.region + ')을 찾았어요. 이제 이 소리의 이름을 골라요.';
      ui.feedbackType = 'ok';
      refreshMapGame(key);
      scrollMapMission(key);
    } else {
      ui.feedback = '이곳은 ' + p.region + '의 ' + p.name + '이에요. ' + target.region + ' 쪽 핀을 살펴볼까요?';
      ui.feedbackType = 'no';
      btn.classList.remove('is-wrong');
      void btn.offsetWidth;
      btn.classList.add('is-wrong');
      syncMapSteps(key);
      setMapFeedback(key, ui.feedback, 'no');
      scrollMapMission(key);
    }
  }
  function clickMapOpt(btn) {
    var key = btn.dataset.mapKey, opt = btn.dataset.mapOpt, g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!g) return;
    var done = mapDoneList(g), ui = getMapUI(key, g), r = g.rounds[ui.roundIdx], p = PIN_BY[r.pin];
    if (opt === r.answer) {
      if (done.indexOf(ui.roundIdx) < 0) done.push(ui.roundIdx);
      state.a[g.id] = done;
      save();
      ui.step = 1;
      ui.listened = false;
      ui.feedback = p.name + ' · ' + r.answer + ' 매칭 완료!';
      ui.feedbackType = 'ok';
      var nextIdx = -1;
      for (var i = 0; i < g.rounds.length; i++) {
        var cand = (ui.roundIdx + 1 + i) % g.rounds.length;
        if (done.indexOf(cand) < 0) { nextIdx = cand; break; }
      }
      if (nextIdx >= 0) ui.roundIdx = nextIdx;
      else ui.inspectIdx = ui.roundIdx;
      refreshMapGame(key);
    } else {
      ui.feedback = '조금 달라요! 음색 단서와 10초 소리를 다시 확인해 봐요.';
      ui.feedbackType = 'no';
      btn.classList.add('is-wrong');
      setMapFeedback(key, ui.feedback, 'no');
    }
  }
  function resetMapGame(key) {
    var g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!g) return;
    state.a[g.id] = [];
    save();
    mapUI[key] = { roundIdx: 0, step: 1, listened: false, feedback: '지도를 초기화했어요. 1번 미션부터 다시 도전해요!', feedbackType: '', inspectIdx: -1 };
    refreshMapGame(key);
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
      if (sheetOn) document.getElementById('sheet').scrollIntoView({ block: 'start' });
    } else if (t.classList.contains('vid-play')) playVideo(t);
    else if (t.classList.contains('vid-stop')) stopVideos();
    else if (t.classList.contains('cap-btn')) pickCapsule(t);
    else if (t.classList.contains('cue-chip')) toggleCue(t);
    else if (t.classList.contains('cue-check')) checkCue(t.dataset.cueCheck);
    else if (t.classList.contains('cue-tap')) updateCounterCue(t.dataset.cueTap, 'tap');
    else if (t.classList.contains('cue-minus')) updateCounterCue(t.dataset.cueMinus, 'minus');
    else if (t.classList.contains('cue-reset')) updateCounterCue(t.dataset.cueReset, 'reset');
    else if (t.classList.contains('cue-lock')) updateCounterCue(t.dataset.cueLock, 'lock');
    else if (t.classList.contains('bal-btn')) pickBalance(t);
    else if (t.classList.contains('vocab-chip')) insertVocab(t);
    else if (t.classList.contains('map-round-tab')) clickMapRound(t);
    else if (t.classList.contains('map-pin')) clickMapPin(t);
    else if (t.classList.contains('map-opt')) clickMapOpt(t);
    else if (t.classList.contains('map-reset')) {
      // 한 번 잘못 눌러 지도 진행이 지워지지 않게 두 번 눌러야 지움.
      if (t.dataset.sure) resetMapGame(t.dataset.mapReset);
      else {
        t.dataset.sure = '1';
        t.textContent = '한 번 더 누르면 지워져요';
        setTimeout(function () { if (t.isConnected) { delete t.dataset.sure; t.textContent = '처음부터 다시'; } }, 4000);
      }
    }
    else if (t.closest('.guess')) pickWarmup(t, t.closest('.guess'));
    else if (t.id === 'btnReveal') {
      stopVideos();
      var identities = document.getElementById('showIdentities');
      identities.hidden = !identities.hidden;
      t.setAttribute('aria-expanded', String(!identities.hidden));
      t.textContent = identities.hidden ? (t.dataset.labelOpen || '정체 공개') : (t.dataset.labelClose || '정체 숨기기');
      view.querySelectorAll('.vid[data-blind="1"]').forEach(function (card) {
        var creditEl = card.querySelector('.vid-credit');
        if (creditEl) creditEl.hidden = identities.hidden;
        if (card.dataset.audioSrc === '1') return;
        var play = card.querySelector('.vid-play'), yt = card.dataset.yt;
        if (!play || !yt) return;
        var existing = play.querySelector('.vid-thumb');
        if (!identities.hidden) {
          if (!existing) {
            var img = document.createElement('img');
            img.className = 'vid-thumb';
            img.src = thumbURL(yt);
            img.alt = '';
            img.decoding = 'async';
            play.prepend(img);
          }
          play.classList.add('has-thumb');
        } else {
          if (existing) existing.remove();
          play.classList.remove('has-thumb');
        }
      });
      syncHeadArt();
      syncRevealUI();
    } else if (t.id === 'btnAns' && TEACHER && !classOn) {
      showAns = !showAns;
      refreshMarks();
    } else if (t.id === 'btnSubmit') doSubmit();
    else if (t.id === 'btnSubmitForce') doSubmit(true);
    else if (t.id === 'btnSubmitCancel') {
      submitConfirm = 0;
      route(true);
      var b = document.getElementById('btnSubmit');
      if (b) b.focus({ preventScroll: true });
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
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = fresh();
    pendingRadio = null;
    mapUI = {};
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
    var p = PAGES[lastPage];
    if (on) {
      var sheetEl = document.getElementById('sheet');
      if (sheetEl) stopVideos(sheetEl);
      if (p && p.ch && p.ch.sheet.length) {
        observeSheet(p);
        syncPager(p);
      }
    } else {
      setSheet(false);
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
  document.querySelector('.skip').addEventListener('click', function (e) { e.preventDefault(); view.focus(); });
  side.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (href === location.hash || (!location.hash && href === '#' + PAGES[0].id)) {
      e.preventDefault();
      closeSide();
      jump();
    } else if (mq.matches || classOn) {
      closeSide();
    }
  });
  syncSide();
  document.getElementById('prev').addEventListener('click', function () { closePagerPrompt(); go(-1); });
  document.getElementById('next').addEventListener('click', function () {
    var p = PAGES[lastPage];
    if (p && p.ch && !classOn && !TEACHER) {
      var left = p.ch.sheet.filter(function (q) { return !answered(q); }).length;
      if (left > 0) {
        showPagerPrompt(left);
        return;
      }
    }
    closePagerPrompt();
    go(1);
  });
  document.getElementById('pgDo').addEventListener('click', function () {
    closePagerPrompt();
    var p = PAGES[lastPage];
    if (!p || !p.ch) return;
    var action = document.getElementById('pgDo').dataset.action;
    if (action === 'submit') {
      location.hash = 'submit?s=' + p.session;
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
    if (e.key === 'Escape' && body.classList.contains('side-open')) {
      closeSide();
      burger.focus();
      return;
    }
    var prompt = document.getElementById('pagerPrompt');
    if (e.key === 'Escape' && prompt && !prompt.hidden) {
      closePagerPrompt();
      document.getElementById('next').focus();
      return;
    }
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey ||
        (e.target.closest && e.target.closest('a, button, input, textarea, select, .map-board'))) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });

  route();
})();

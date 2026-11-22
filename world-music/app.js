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
  var PAGES = CH.map(function (c) { return { id: c.id, nav: c.title, ch: c }; });
  PAGES.push({ id: 'submit', nav: '제출' });
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
  function thumbURL(yt) {
    return 'https://i.ytimg.com/vi/' + encodeURIComponent(yt) + '/hqdefault.jpg';
  }
  function vidHTML(key, cap) {
    var v = V[key], title = esc(v.title);
    var mode = v.mode === 'solo' ? '태블릿 · 각자 짧게' : '칠판 · 다 같이';
    var showThumb = !!(v.id && !v.audioOnly && !v.blind);
    var attrs = ' data-video="' + esc(key) + '" data-yt="' + esc(v.id) + '" data-start="' + v.start + '" data-end="' + v.end + '"' +
      (v.audioOnly ? ' data-audio="1"' : '') + (v.blind ? ' data-blind="1"' : '');
    var thumb = showThumb ? '<img class="vid-thumb" src="' + thumbURL(v.id) + '" alt="" loading="lazy" decoding="async">' : '';
    var player = v.id ? '<button class="vid-play' + (showThumb ? ' has-thumb' : '') + '" type="button" data-label="' + title + '" aria-pressed="false" aria-label="' + title + ' 재생">' +
      thumb + '<span class="play" aria-hidden="true"></span><span class="vid-mask">' + title + '</span></button>' :
      '<div class="vid-pending"><span class="vid-mask">' + title + '</span><small>영상 준비 중</small></div>';
    return '<figure class="vid"' + attrs + '>' +
      player + '<figcaption><div class="vid-head"><b>' + title + '</b><span class="play-mode">' + mode + '</span></div>' +
      (v.by ? '<small>' + esc(v.by) + '</small>' : '') + '<em>' + esc(cap || (v.end - v.start) + '초 듣기') + '</em></figcaption></figure>';
  }
  function vidInlineHTML(key) {
    var v = V[key];
    if (!v) return '';
    var sec = Math.max(1, v.end - v.start), title = esc(v.title);
    var mode = v.mode === 'solo' ? '태블릿 · 각자 짧게' : '칠판 · 다 같이';
    var label = sec + '초 소리 듣기';
    var meta = title + ' · ' + mode;
    var player = v.id ? '<button class="vid-play vid-inline-play" type="button" data-label="' + esc(label) + '" data-meta="' + esc(meta) + '" aria-pressed="false" aria-label="' + title + ' ' + sec + '초 소리만 재생">' +
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
      w.opts.map(function (o) { return '<button type="button" aria-pressed="false">' + esc(o) + '</button>'; }).join('') + '</div>';
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
      '<p class="cap-status" aria-live="polite">' + (chosen ? '저장된 첫 생각: <b>' + esc(chosen) + '</b> (마지막 장에서 다시 열려요)' : '하나를 고르면 마지막 장 타임캡슐에 자동으로 저장돼요.') + '</p>' +
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
            '<button type="button" class="mini cls cue-lock" data-cue-lock="' + esc(key) + '" aria-pressed="' + String(st.locked) + '">' + (st.locked ? '다시 세기' : '기록 확정') + '</button>' +
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
      '<button type="button" class="mini cls cue-check" data-cue-check="' + esc(key) + '">단서 검증하기</button></div>' +
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
  var WORLD_MAP_SVG = '<svg class="map-svg" viewBox="0 0 1000 480" role="img" aria-label="세계 지도">' +
    '<defs><pattern id="mapGrid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="#d9ecea" stroke-width="1"/></pattern></defs>' +
    '<rect width="1000" height="480" fill="#f2f9f8"/><rect width="1000" height="480" fill="url(#mapGrid)"/>' +
    '<g class="map-land">' +
      /* 북아메리카 */
      '<path d="M54 96 L112 72 L212 68 L292 94 L322 122 L286 164 L274 202 L248 220 L238 258 L250 282 L228 286 L192 260 L166 236 L142 192 L116 168 L84 134 L54 126 Z"/>' +
      /* 그린란드 */
      '<path d="M336 44 L416 40 L402 104 L348 98 Z"/>' +
      /* 남아메리카 */
      '<path d="M258 288 L314 290 L376 336 L362 384 L328 418 L298 456 L278 446 L270 388 L248 334 Z"/>' +
      /* 유럽 */
      '<path d="M452 154 L478 122 L494 84 L554 74 L574 116 L576 160 L548 188 L526 178 L508 190 L482 178 L450 186 Z"/>' +
      '<path d="M454 118 L470 116 L472 138 L452 140 Z"/>' +
      /* 아프리카 */
      '<path d="M450 206 L516 200 L568 214 L592 246 L616 268 L586 332 L548 394 L518 396 L496 322 L488 292 L438 268 L438 228 Z"/>' +
      '<path d="M602 340 L618 344 L612 378 L598 372 Z"/>' +
      /* 아시아 */
      '<path d="M576 106 L632 68 L792 70 L884 106 L868 144 L824 166 L822 190 L798 226 L774 248 L748 274 L722 256 L682 276 L648 232 L614 238 L588 214 L576 160 Z"/>' +
      /* 일본 · 필리핀 · 인도네시아 */
      '<path d="M842 162 L862 172 L852 208 L832 198 Z"/>' +
      '<path d="M802 242 L820 248 L818 278 L800 272 Z"/>' +
      '<path d="M742 292 L788 298 L784 312 L738 306 Z"/>' +
      '<path d="M798 298 L838 304 L832 318 L794 312 Z"/>' +
      /* 호주 · 뉴질랜드 */
      '<path d="M764 364 L796 332 L858 334 L888 374 L868 412 L812 406 L768 392 Z"/>' +
      '<path d="M912 396 L936 406 L924 434 L904 424 Z"/>' +
    '</g>' +
    '<g class="map-regions" aria-hidden="true">' +
      '<text x="165" y="138">아메리카</text><text x="512" y="114">유럽</text><text x="518" y="294">아프리카</text><text x="700" y="148">아시아</text><text x="826" y="374">오세아니아</text>' +
    '</g></svg>';

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
      ui = mapUI[key] = { roundIdx: nextIdx, step: 1, feedback: '', feedbackType: '', inspectIdx: -1 };
    }
    if (done.length < g.rounds.length && done.indexOf(ui.roundIdx) >= 0) {
      for (var j = 0; j < g.rounds.length; j++) { if (done.indexOf(j) < 0) { ui.roundIdx = j; break; } }
      ui.step = 1;
    }
    return ui;
  }
  function rotateOpts(opts, seed) {
    var out = opts.slice(), shift = (seed * 2 + 1) % out.length;
    return out.slice(shift).concat(out.slice(0, shift));
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
        '<p class="map-clue">지도의 핀을 누르면 각 나라의 소리와 음색 특징을 다시 확인할 수 있어요.</p>' +
        (insp && inspPin ? '<div class="map-inspect"><b>' + esc(inspPin.name) + ' · ' + esc(insp.answer) + '</b><span>' + esc(insp.tag) + '</span>' +
          '<p>' + esc(insp.clue) + '</p>' + vidInlineHTML(insp.listen) + '</div>' : '') +
        '</div>';
    } else {
      var r = g.rounds[ui.roundIdx], targetPin = PIN_BY[r.pin];
      var step2 = ui.step === 2;
      var optsHTML = step2 ? '<div class="map-opts" role="group" aria-label="악기 또는 노래 고르기">' +
        '<p class="map-opts-prompt"><b>2단계</b> ' + esc(targetPin.name) + '에서 들은 이 소리의 이름은?</p>' +
        '<div class="map-opt-row">' + rotateOpts(r.opts, ui.roundIdx).map(function (opt) {
          return '<button type="button" class="map-opt" data-map-key="' + esc(key) + '" data-map-opt="' + esc(opt) + '">' + esc(opt) + '</button>';
        }).join('') + '</div></div>' : '';
      missionHTML = '<div class="map-mission">' +
        '<div class="map-mission-top"><span class="map-step-badge">미션 ' + (done.length + 1) + ' / ' + total + ' · ' + esc(r.tag) + '</span>' +
        '<span class="map-step-guide">' + (step2 ? '2단계: 이름 매칭하기' : '1단계: 지도에서 나라 핀 누르기') + '</span></div>' +
        '<p class="map-clue"><b>음색 단서</b> ' + esc(r.clue) + '</p>' +
        vidInlineHTML(r.listen) +
        optsHTML +
        (ui.feedback ? '<p class="map-fb ' + esc(ui.feedbackType || '') + '" role="status" aria-live="polite">' + esc(ui.feedback) + '</p>' : '') +
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
      missionHTML +
      '<div class="map-board"><div class="map-stage">' + WORLD_MAP_SVG + '<div class="map-pins">' + pinsHTML + '</div></div></div>' +
      '<p class="map-scroll-hint">지도를 좌우로 밀어 모든 나라 핀을 살펴볼 수 있어요.</p>' +
      deckHTML;
  }
  function mapGameHTML(key) {
    if (!DATA.MAPGAME || !DATA.MAPGAME[key]) return '';
    return '<section class="map-game" id="map-' + esc(key) + '" data-map-game="' + esc(key) + '">' + mapGameInnerHTML(key) + '</section>';
  }
  function refreshMapGame(key) {
    var box = view.querySelector('[data-map-game="' + key + '"]');
    if (!box) return;
    stopVideos();
    box.innerHTML = mapGameInnerHTML(key);
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
      '</div><p>둘째 시간에도 같은 기기와 브라우저로 열고, 마지막에 한 번 제출해요.</p></details>';
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
  function qHTML(q, i, marks) {
    var v = val(q), h = '', name = 'q-' + q.id, label = ' aria-labelledby="' + name + '-prompt"';
    var listen = q.listen && V[q.listen] ? vidInlineHTML(q.listen) : '';
    if (q.type === 'pick') {
      label = ' aria-labelledby="pick-group ' + name + '-prompt"';
      h = '<select data-q="' + q.id + '"' + label + '><option value="">고르기</option>' + q.opts.map(function (o) {
        return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
    } else if (q.type === 'text') {
      var vocab = Array.isArray(q.vocab) && q.vocab.length ? '<div class="vocab-bar" role="group" aria-label="음악 감각 어휘 디딤돌">' +
        '<span class="vocab-label">표현 디딤돌</span>' + q.vocab.map(function (word) {
          var used = v.indexOf(word) >= 0;
          return '<button type="button" class="vocab-chip' + (used ? ' is-used' : '') + '" data-vocab-for="' + esc(q.id) + '" data-word="' + esc(word) + '">' + esc(word) + '</button>';
        }).join('') + '</div>' : '';
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
    return group + '<div class="q q-' + q.type + '" id="' + name + '"><p class="q-p" id="' + name + '-prompt">' +
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
  function nextEndHTML(c, idx) {
    var nextP = PAGES[idx + 1], total = c.sheet.length, left = total - c.sheet.filter(answered).length;
    var label = nextP.id === 'submit' ? '제출 화면으로 →' : '다음 장 · ' + esc(nextP.nav) + ' →';
    var box = total ? 'sheet-end' : 'lesson-end';
    var msg = total ? progressMessage(total, left) : '활동을 마치면 다음 장으로 가요.';
    return '<div class="' + box + (left ? '' : ' is-done') + '" id="sheetEnd"><div class="sheet-end-row">' +
      '<p class="end-msg" id="endMsg">' + msg + '</p><a class="end-go' + (left ? '' : ' is-done') +
      '" id="endGo" href="#' + nextP.id + '">' + label + '</a></div></div>';
  }
  function sheetHTML(c, idx) {
    var total = c.sheet.length, n = c.sheet.filter(answered).length, marks = marking();
    return '<section class="sheet" id="sheet" aria-label="' + esc(c.title) + ' 학습지"><header><p class="eyebrow">학습지</p><h2>' +
      esc(c.title) + '</h2><span class="cnt" id="cnt">' + n + ' / ' + total + '</span></header>' +
      '<p class="warn" id="saveWarn"' + (saveOk ? ' hidden' : '') + '>이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫거나 새로고침하지 마세요.</p>' +
      (TEACHER ? '<p class="t-note">교사 모드예요. <button type="button" class="mini" id="btnAns" aria-pressed="' +
        showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      c.sheet.map(function (q, i) { return qHTML(q, i + 1, marks); }).join('') +
      (c.after ? '' : nextEndHTML(c, idx)) + '</section>';
  }

  /* ---------- 쪽 ---------- */
  function chapterHTML(c, idx) {
    var total = c.sheet.length, n = c.sheet.filter(answered).length;
    var chip = total ? '<a class="sheet-chip' + (n === total ? ' is-done' : '') + '" id="headChip" href="#' + c.id +
      '?sheet">이 장 학습지 <b id="headChipCnt">' + n + '/' + total + '</b> ↓</a>' : '';
    var head = '<section class="lesson"><header class="ch-head art" style="--art:url(img/head-' + c.id + '.webp)"><p class="eyebrow">' +
      (idx + 1) + '장 · ' + esc(c.time) + ' · ' + (idx < SPLIT ? '1차시' : '2차시') + '</p><h1>' + esc(c.title) +
      '</h1><p class="lead">' + esc(c.lead) + '</p>' + chip + '</header>' +
      build(c.lesson) + (total ? '' : nextEndHTML(c, idx)) + '</section>';
    if (!total) return head;
    return head +
      '<div class="bridge"><div class="bridge-card"><div class="bridge-copy">' +
        '<p class="bridge-norm"><b>여기까지 봤으면</b> 아래 학습지에서 ' + total + '문항을 풀어요.</p>' +
        '<p class="bridge-cls"><b>수업 모드</b> 함께 풀려면 학습지를 펼쳐요.</p></div>' +
        '<div class="bridge-acts"><a class="bridge-go" href="#' + c.id + '?sheet">학습지로 ↓</a>' +
        '<button type="button" class="mini cls" id="btnSheet" aria-pressed="' + sheetOn + '">' +
          (sheetOn ? '학습지 숨기기' : '학습지 함께 보기') + '</button></div></div></div>' +
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
  function result() {
    var wrong = [], score = 0;
    GRADED.forEach(function (q) { if (correct(q)) score++; else if (answered(q)) wrong.push(q.label); });
    var answers = {};
    ALLQ.forEach(function (q) { answers[q.label] = valText(q).slice(0, 400); });
    return { score: score, total: GRADED.length, wrong: wrong, answers: answers };
  }
  function submitHTML() {
    var left = GRADED.filter(function (q) { return !answered(q); }), d = state.done;
    var current = submittedAnswers(), changed = d && d.sig && !current;
    var rows = CH.map(function (c, k) {
      var n = c.qs.filter(answered).length;
      var g = c.sheet.filter(function (q) { return q.ans !== undefined; });
      var hits = !classOn && current && g.length ? '<span class="sum-correct"> · ' + g.filter(correct).length + ' / ' + g.length + ' 맞음</span>' : '';
      return '<li><a href="#' + c.id + (c.sheet.length ? '?sheet' : '') + '"><i>' + (k + 1) + '</i><b>' + esc(c.title) +
        '</b><span>' + (c.qs.length ? n + ' / ' + c.qs.length + ' 답함' : '듣기·말하기') + hits + '</span></a></li>';
    }).join('');
    return '<section class="lesson"><header class="ch-head"><p class="eyebrow">마무리</p><h1>제출하기</h1></header>' +
      (d ? '<div class="score"><b>' + d.score + '</b><span>/ ' + d.total + '점</span></div><p>' + esc(d.msg || '') + '</p>' +
           (changed ? '<p class="warn">제출한 뒤에 답을 고쳤어요. 위 점수는 전에 낸 답의 점수예요. 고친 답을 다시 제출할 수 있어요.</p>' : '')
         : '<p class="lead">고르기 17문항을 채점해요. 생각 한 줄과 마무리 기록은 쓴 만큼 점수 없이 함께 보내요. 빈 글 칸이 있어도 제출할 수 있어요.</p>') +
      '<ul class="sum">' + rows + '</ul>' +
      (left.length ? '<p class="warn">아직 답하지 않은 채점 문항이 <b>' + left.length + '개</b> 있어요. 장 이름을 눌러 돌아갈 수 있어요.</p>' :
        '<p class="fine">채점 문항에 모두 답했어요.</p>') +
      '<button type="button" class="go" id="btnSubmit"' + (sending ? ' disabled' : '') + '>' +
        (sending ? '보내는 중…' : d ? '다시 제출하기' : '채점하고 제출하기') + '</button></section>';
  }
  function doSubmit() {
    if (sending) return;
    var left = GRADED.filter(function (q) { return !answered(q); }).length;
    if (left && !window.confirm('아직 답하지 않은 채점 문항이 ' + left + '개 있어요. 그래도 제출할까요?')) return;
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
      if (PAGES[cur()].id === 'submit') route(true); else { toast(msg); refreshMarks(); }
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
  }
  function refreshCount() {
    var i = lastPage, c = PAGES[i].ch;
    var total = c ? c.sheet.length : 0, n = total ? c.sheet.filter(answered).length : 0;
    var left = total - n, all = total > 0 && left === 0;
    var nx = document.getElementById('next'), nextP = PAGES[i + 1];
    nx.classList.toggle('is-ready', all);
    if (nextP) nx.setAttribute('aria-label', '다음 장 · ' + nextP.nav + (all ? ' (이 장 학습지 완료)' : ''));
    else nx.removeAttribute('aria-label');
    if (!total) return;
    document.getElementById('cnt').textContent = n + ' / ' + total;
    document.getElementById('headChipCnt').textContent = n + '/' + total;
    document.getElementById('headChip').classList.toggle('is-done', all);
    nav.querySelector('.subl.here span').textContent = n + '/' + total;
    var a = nav.querySelector('a.on'), dot = a.querySelector('.dot');
    if (all && !dot) a.insertAdjacentHTML('beforeend', '<em class="dot" title="학습지 다 풂"></em>');
    else if (!all && dot) dot.remove();
    document.getElementById('sheetEnd').classList.toggle('is-done', all);
    document.getElementById('endGo').classList.toggle('is-done', all);
    document.getElementById('endMsg').innerHTML = progressMessage(total, left);
  }
  function route(keep) {
    var i = cur(), p = PAGES[i];
    pendingRadio = null;
    view.innerHTML = p.ch ? chapterHTML(p.ch, i) : submitHTML();
    lastPage = i;
    navHTML(i);
    var pv = document.getElementById('prev'), nx = document.getElementById('next');
    pv.disabled = i === 0;
    nx.disabled = i === PAGES.length - 1;
    pv.querySelector('b').textContent = i ? PAGES[i - 1].nav : '';
    pv.setAttribute('aria-label', i ? '이전 장 · ' + PAGES[i - 1].nav : '');
    nx.querySelector('b').textContent = nx.disabled ? '' : PAGES[i + 1].nav;
    document.getElementById('where').textContent = p.ch ? (i + 1) + ' / ' + CH.length + '장' : p.nav;
    document.getElementById('pgBar').style.width = (i / CH.length * 100) + '%';
    document.title = (p.ch ? p.ch.title + ' · ' : '') + TITLE;
    refreshCount();
    syncHeadArt();
    if (!keep) jump();
  }
  function setSheet(on) {
    sheetOn = on;
    body.classList.toggle('class-sheet', on);
    var bs = document.getElementById('btnSheet');
    if (bs) { bs.setAttribute('aria-pressed', String(on)); bs.textContent = on ? '학습지 숨기기' : '학습지 함께 보기'; }
  }
  function jump() {
    var s = hashParts().sub === 'sheet' && document.getElementById('sheet');
    if (s) {
      if (classOn && !sheetOn) setSheet(true);
      s.scrollIntoView({ block: 'start' });
    } else window.scrollTo(0, 0);
  }
  function go(d) { var i = cur() + d; if (i >= 0 && i < PAGES.length) location.hash = PAGES[i].id; }
  window.addEventListener('hashchange', function () {
    closeSide();
    if (cur() === lastPage) { jump(); return; }
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
      btn.classList.toggle('is-used', text.indexOf(btn.dataset.word || '') >= 0);
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
  var audioTimer = null;
  function stopVideos() {
    clearTimeout(audioTimer);
    audioTimer = null;
    document.querySelectorAll('.audio-only-frame').forEach(function (el) { el.remove(); });
    view.querySelectorAll('.vid.playing').forEach(function (f) {
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
  function playVideo(button) {
    var f = button.parentNode;
    if (f.classList.contains('audio-playing')) {
      stopVideos();
      return;
    }
    stopVideos();
    var st = Number(f.dataset.start), en = Number(f.dataset.end);
    var identities = document.getElementById('showIdentities');
    var blindLocked = f.dataset.blind === '1' && identities && identities.hidden;
    var audioOnly = f.dataset.audio === '1' || blindLocked;
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(f.dataset.yt) +
      '?autoplay=1&rel=0&playsinline=1' + (audioOnly ? '&controls=0' : '') +
      (st ? '&start=' + st : '') + (en ? '&end=' + en : '');
    frame.title = button.getAttribute('aria-label');
    if (audioOnly) {
      frame.className = 'audio-only-frame';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.allow = 'autoplay; encrypted-media';
      document.body.appendChild(frame);
      f.classList.add('playing', 'audio-playing');
      button.setAttribute('aria-pressed', 'true');
      var mask = button.querySelector('.vid-mask');
      if (mask) mask.textContent = '재생 중 · 눌러서 멈추기';
      var meta = button.querySelector('.vid-inline-meta');
      if (meta) meta.textContent = '소리만 재생 중 (화면 가림)';
      audioTimer = setTimeout(stopVideos, Math.max(5, (en - st) + 5) * 1000);
      return;
    }
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
      document.getElementById('btnReveal').disabled = guesses.querySelectorAll('[aria-pressed=true]').length !== guesses.querySelectorAll('.guess').length;
    }
  }
  function pickCapsule(btn) {
    var box = btn.closest('.capsule-box'), capId = btn.dataset.capId, capVal = btn.dataset.capVal;
    if (!box || !capId) return;
    state.a[capId] = capVal;
    save();
    box.querySelectorAll('.cap-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    var status = box.querySelector('.cap-status');
    if (status) status.innerHTML = '저장된 첫 생각: <b>' + esc(capVal) + '</b> (마지막 장에서 다시 열려요)';
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
  function clickMapPin(btn) {
    var key = btn.dataset.mapKey, pid = btn.dataset.pin, g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!g) return;
    var done = mapDoneList(g), ui = getMapUI(key, g), p = PIN_BY[pid];
    if (done.length >= g.rounds.length) {
      var foundIdx = g.rounds.findIndex(function (r) { return r.pin === pid; });
      if (foundIdx >= 0) {
        ui.inspectIdx = foundIdx;
        refreshMapGame(key);
      }
      return;
    }
    var r = g.rounds[ui.roundIdx], target = PIN_BY[r.pin];
    if (ui.step === 2) {
      if (pid === r.pin) return;
      ui.feedback = target.name + ' 핀을 이미 찾았어요! 위의 2단계에서 이름을 골라요.';
      ui.feedbackType = 'ok';
      refreshMapGame(key);
      return;
    }
    var already = done.some(function (idx) { return g.rounds[idx].pin === pid; });
    if (already) {
      ui.feedback = p.name + '는 이미 매칭했어요! 아직 채워지지 않은 핀을 찾아봐요.';
      ui.feedbackType = '';
      refreshMapGame(key);
      return;
    }
    if (pid === r.pin) {
      ui.step = 2;
      ui.feedback = '맞았어요! ' + p.name + '(' + p.region + ')을 찾았어요. 이제 이 소리의 이름을 골라요.';
      ui.feedbackType = 'ok';
      refreshMapGame(key);
    } else {
      ui.feedback = '이곳은 ' + p.region + '의 ' + p.name + '이에요. ' + target.region + ' 쪽 핀을 살펴볼까요?';
      ui.feedbackType = 'no';
      btn.classList.remove('is-wrong');
      void btn.offsetWidth;
      btn.classList.add('is-wrong');
      var fb = view.querySelector('[data-map-game="' + key + '"] .map-fb');
      if (fb) { fb.className = 'map-fb no'; fb.textContent = ui.feedback; }
      else {
        var m = view.querySelector('[data-map-game="' + key + '"] .map-mission');
        if (m) m.insertAdjacentHTML('beforeend', '<p class="map-fb no" role="status" aria-live="polite">' + esc(ui.feedback) + '</p>');
      }
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
      ui.feedback = p.name + ' · ' + r.answer + ' 매칭 완료!';
      ui.feedbackType = 'ok';
      var nextIdx = -1;
      for (var i = 0; i < g.rounds.length; i++) { if (done.indexOf(i) < 0) { nextIdx = i; break; } }
      if (nextIdx >= 0) ui.roundIdx = nextIdx;
      else ui.inspectIdx = ui.roundIdx;
      refreshMapGame(key);
    } else {
      ui.feedback = '조금 달라요! 음색 단서와 10초 소리를 다시 확인해 봐요.';
      ui.feedbackType = 'no';
      btn.classList.add('is-wrong');
      var fb = view.querySelector('[data-map-game="' + key + '"] .map-fb');
      if (fb) { fb.className = 'map-fb no'; fb.textContent = ui.feedback; }
    }
  }
  function resetMapGame(key) {
    var g = DATA.MAPGAME && DATA.MAPGAME[key];
    if (!g) return;
    state.a[g.id] = [];
    save();
    mapUI[key] = { roundIdx: 0, step: 1, feedback: '지도를 초기화했어요. 1번 미션부터 다시 도전해요!', feedbackType: '', inspectIdx: -1 };
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
    else if (t.classList.contains('map-pin')) clickMapPin(t);
    else if (t.classList.contains('map-opt')) clickMapOpt(t);
    else if (t.classList.contains('map-reset')) resetMapGame(t.dataset.mapReset);
    else if (t.parentNode.classList.contains('guess')) pickWarmup(t, t.parentNode);
    else if (t.id === 'btnReveal') {
      stopVideos();
      var identities = document.getElementById('showIdentities');
      identities.hidden = !identities.hidden;
      t.setAttribute('aria-expanded', String(!identities.hidden));
      t.textContent = identities.hidden ? (t.dataset.labelOpen || '정체 공개') : (t.dataset.labelClose || '정체 숨기기');
      view.querySelectorAll('.vid[data-blind="1"]').forEach(function (card) {
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
    } else if (t.id === 'btnAns' && TEACHER && !classOn) {
      showAns = !showAns;
      refreshMarks();
    } else if (t.id === 'btnSubmit') doSubmit();
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
    closeSide();
    body.classList.toggle('class-mode', on);
    body.classList.toggle('side-closed', on || sideClosed);
    if (!on && sheetOn) setSheet(false);
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
  document.getElementById('prev').addEventListener('click', function () { go(-1); });
  document.getElementById('next').addEventListener('click', function () { go(1); });
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });

  route();
})();

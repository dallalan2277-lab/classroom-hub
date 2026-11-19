/* 국악기 · 수업과 학습지 — 화면 그리기·학습지 저장·채점·제출
 * 악기 내용은 data.js, 문항은 questions.js, 영상 구간은 video-data.js, 사진 출처는 assets.js.
 * classroom.js 가 이 파일보다 먼저 실행되어야 해요.
 * 화면 틀(왼쪽 목차 · 아래 페이지 넘김 · 수업 모드 · 글자 크기 · 탭)은 pansori-plus 와 같아요.
 */
(function () {
  'use strict';
  var INST = window.INSTRUMENTS || [], CQ = window.CLASS_QUESTIONS || [], RV = window.REVIEW || [];
  var REVIEW_VERSION = window.REVIEW_VERSION || 1, PV = window.PERFORMANCE_VIDEO || { scenes: [] };
  var CR = window.Classroom || null;
  var TEACHER = !!(CR && CR.teacher);
  var KEY = 'gugak-class-v1', FS_KEY = 'gugak-class-fs';
  var SHARE_URL = 'https://dallalan2277-lab.github.io/classroom-hub/gugak-class/';

  var IBY = {}; INST.forEach(function (x) { IBY[x.id] = x; });
  var ABY = {}; (window.ASSETS || []).forEach(function (a) { ABY[a.id] = a; });
  var VST = {}; PV.scenes.forEach(function (s) { VST[s.id] = +s.start || 0; });
  var STARTS = PV.scenes.map(function (s) { return +s.start || 0; }).filter(function (v, k, a) { return a.indexOf(v) === k; }).sort(function (a, b) { return a - b; });
  function nextStart(st) { for (var k = 0; k < STARTS.length; k++) if (STARTS[k] > st) return STARTS[k]; return 0; }
  // 해설 없이 그 악기 소리만 나오는 구간. 없으면 null(예전처럼 해설 시작부터 틀어요)
  var VLS = {}; PV.scenes.forEach(function (s) {
    var l = s.listen; if (l && l.length === 2 && +l[1] > +l[0]) VLS[s.id] = [+l[0], +l[1]];
  });
  var FAMCH = { '관악기': 'wind', '현악기': 'strings', '타악기': 'perc' };
  function fam(f) { return INST.filter(function (x) { return x.family === f; }); }

  /* ---------- 장 구성 ---------- */
  function rq(i) { return { t: 'q', kind: 'review', key: String(i), q: RV[i] }; }
  var CH = [
    { id: 'kind', nav: '무엇이 떨리나', time: '10분', title: '무엇이 떨리나',
      lead: '국악기는 소리를 내는 방법에 따라 세 가족으로 나눠요. 숨, 줄, 두드림을 떠올려 봐요.',
      items: CQ.map(function (q, i) { return { t: 'q', kind: 'classification', key: String(i), q: q }; }) },
    { id: 'wind', nav: '관악기', time: '20분', title: '관악기 — 숨을 불어요', family: '관악기',
      lead: '숨을 불어 관 속의 공기를 떨게 해요. ' + fam('관악기').length + '가지 악기를 차례로 살펴봐요.',
      scene: { img: 'madang-wind.webp', alt: '대숲 사이로 바람이 불고, 한 연주자가 옆으로 대를 불어요', one: '입에 닿는 부분과 관의 모양을 살펴보세요. 가로로 불까요, 세로로 불까요?' },
      items: [0, 1, 2, 3, 4].map(rq) },
    { id: 'strings', nav: '현악기', time: '15분', title: '현악기 — 줄이 떨려요', family: '현악기', split: true,
      lead: '줄을 뜯고, 문지르고, 쳐서 소리를 내요. ' + fam('현악기').length + '가지 악기를 살펴봐요.',
      scene: { img: 'madang-strings.webp', alt: '줄을 뜯는 손가락, 활로 줄을 긋는 손, 가는 채로 줄을 치는 손', one: '줄을 어떻게 울릴까요? 손가락, 술대, 활, 채의 차이를 찾아보세요.' },
      items: [6, 7, 8, 9].map(rq) },
    { id: 'perc', nav: '타악기', time: '20분', title: '타악기 — 두드려요', family: '타악기',
      lead: '몸체나 가죽을 쳐서 소리를 내요. ' + fam('타악기').length + '가지 악기를 살펴봐요.',
      scene: { img: 'madang-perc.webp', alt: '궁궐 뜰 아침, 가죽 북과 매달린 돌, 매달린 쇠, 나무 상자', one: '재료와 모양에 주목해요. 가락을 내는 악기와 시작·끝을 알리는 악기도 있어요.' },
      items: [10, 11, 12, 13].map(rq) },
    { id: 'listen', nav: '귀로 구별하기', time: '15분', title: '귀로 구별하기',
      lead: '이제 눈을 감고 소리만으로 악기 가족을 맞혀 봐요.',
      items: [{ t: 'text', field: 'listen', max: 400, prompt: '소리만 듣고 악기 가족을 맞힌 방법을 적어 보세요. 어떤 소리가 단서였나요?' }] },
    { id: 'check', nav: '확인', time: '10분', title: '22종 한눈에',
      lead: '배운 악기를 가족별로 다시 모아 봐요.',
      items: [rq(5), { t: 'text', field: 'reflection', max: 1000, prompt: '오늘 배운 악기 가운데 가장 기억에 남는 악기와 그 까닭을 적어 보세요.' }] }
  ];
  var PAGES = [{ id: 'start', nav: '시작' }].concat(CH.map(function (c) { return { id: c.id, nav: c.nav, ch: c }; }), [{ id: 'submit', nav: '제출' }]);
  var SPLIT = 0; CH.forEach(function (c, k) { if (c.split) SPLIT = k; });
  function part(k) { return k <= SPLIT ? 1 : 2; }

  var view = document.getElementById('view'), nav = document.getElementById('nav');
  var root = document.documentElement, body = document.body;
  var state, showAns = false, sending = false, lastPage = -1, sheetOn = false, classOn = false;
  var curTab = {}, coverOn = true, revealed = {}, nowG = '', warmPick = {};

  /* ---------- 저장 ---------- */
  var saveOk = true, saveWarned = false;
  function fresh() { return { checks: {}, answers: {}, learned: {}, notes: {}, classification: {}, review: {}, first: {}, reflection: '', reviewVersion: REVIEW_VERSION, listen: '', lg: {}, done: null, owner: null }; }
  function plain(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function load() {
    var s = fresh();
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (plain(o)) {
        ['checks', 'answers', 'learned', 'notes', 'classification', 'review', 'first', 'lg'].forEach(function (k) { if (plain(o[k])) s[k] = o[k]; });
        if (typeof o.reflection === 'string') s.reflection = o.reflection.slice(0, 1000);
        if (typeof o.listen === 'string') s.listen = o.listen.slice(0, 400);
        if (plain(o.done)) s.done = o.done;
        if (o.owner) s.owner = String(o.owner);
        if (o.reviewVersion !== REVIEW_VERSION) {
          s.review = {};
          Object.keys(s.first).forEach(function (k) { if (k.indexOf('review:') === 0) delete s.first[k]; });
          s.done = null;
        }
      }
    } catch (e) {}
    s.reviewVersion = REVIEW_VERSION;
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveOk = true; }
    catch (e) {
      saveOk = false;
      if (!saveWarned) { saveWarned = true; toast('이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫지 마세요.'); }
      var w = document.getElementById('saveWarn'); if (w) w.hidden = false;
    }
  }
  function answerSig() { return JSON.stringify([state.answers, state.classification, state.review, state.notes, state.reflection, state.listen]); }
  state = load();
  document.addEventListener('classroom:switch', function () { try { localStorage.removeItem(KEY); } catch (e) {} state = fresh(); warmPick = {}; lastPage = -1; route(); });
  if (CR && CR.ready && CR.ready.then) CR.ready.then(function (st) {
    if (!st) return;
    if (state.owner && st.num && state.owner !== st.num) state = fresh();
    state.owner = st.num || state.owner; save(); route(true);
  });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function mmss(s) { s = +s || 0; return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function art(file, alt, cls, w, h) {
    return '<div class="' + cls + '"><img class="art-img" src="img/' + file + '" alt="' + esc(alt) + '" width="' + w + '" height="' + h + '" loading="lazy" decoding="async"></div>';
  }

  /* ---------- 채점 ---------- */
  function instQ(x) { return { q: x.question, options: x.options, answer: x.answer, explain: x.explanation, why: {} }; }
  function itemFilled(it) { return it.t === 'q' ? !!state[it.kind][it.key] : String(state[it.field] || '').trim() !== ''; }
  function isDone(id) { return !!state.learned[id]; }
  function firstScore(kind, list, keyOf, answerOf) {
    var r = { ok: 0, wrong: [], tried: 0 };
    list.forEach(function (x, i) {
      var f = state.first[kind + ':' + keyOf(x, i)]; if (!f) return;
      r.tried++; if (f === answerOf(x)) r.ok++; else r.wrong.push(i);
    });
    return r;
  }
  function stageCount() {
    var n = INST.filter(function (x) { return isDone(x.id); }).length;
    if (CQ.every(function (q, i) { return state.classification[i]; })) n++;
    if (RV.every(function (q, i) { return state.review[i]; })) n++;
    return n;
  }
  // 붙여 넣은 제어 문자는 전송할 때 \u0000 꼴로 길어져 한도를 넘길 수 있어 빼요
  function clean(s) { return String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim(); }
  function result() {
    var rv = firstScore('review', RV, function (q, i) { return i; }, function (q) { return q.answer; });
    var cl = firstScore('classification', CQ, function (q, i) { return i; }, function (q) { return q.answer; });
    var ia = firstScore('answers', INST, function (x) { return x.id; }, function (x) { return x.answer; });
    var learned = INST.filter(function (x) { return isDone(x.id); }).length;
    var answers = {
      '복습 첫 시도 정답': rv.ok + ' / ' + RV.length + ' (푼 문항 ' + rv.tried + ')',
      '분류 첫 시도 정답': cl.ok + ' / ' + CQ.length + ' (푼 문항 ' + cl.tried + ')',
      '악기 확인 문제 첫 시도 정답': ia.ok + ' / ' + INST.length + ' (푼 문항 ' + ia.tried + ')',
      '악기 확인 첫 오답': ia.wrong.length ? ia.wrong.map(function (i) { return INST[i].name; }).join(', ') : '없음',
      '복습 첫 오답 문항': rv.wrong.length ? rv.wrong.map(function (i) { return i + 1; }).join(', ') : '없음',
      '악기 학습 완료': learned + ' / ' + INST.length,
      '복습 완료': RV.every(function (q, i) { return state.review[i]; }) ? '예' : '아니요',
      '전체 진도': stageCount() + ' / ' + (INST.length + 2) + '단계',
      '악기 확인 고른 답': INST.filter(function (x) { return state.answers[x.id]; }).map(function (x) { return x.name + ': ' + state.answers[x.id]; }).join(' / ').slice(0, 1900) || '없음',
      '오늘의 돌아보기': clean(state.reflection).slice(0, 1000),
      '듣기 메모': clean(state.listen).slice(0, 400)
    };
    INST.forEach(function (x) { var n = clean(state.notes[x.id]); if (n) answers['메모 ' + x.name] = n.slice(0, 300); });
    return { score: rv.ok, total: RV.length, wrong: rv.wrong.map(function (i) { return '복습 ' + (i + 1); }), answers: answers };
  }

  /* ---------- 문항 조각 ---------- */
  // kind: classification | review | answers(악기 확인 문제), key: 문항 번호나 악기 id
  function qBlock(kind, key, q, n) {
    var v = state[kind][key] || '', show = !classOn || showAns, name = 'q-' + kind + '-' + key;
    var cls = show && v ? (v === q.answer ? ' is-ok' : ' is-no') : '';
    var fb = '';
    if (show && v) fb = v === q.answer ? '<b class="ok">✓ 맞았어요.</b> ' + esc(q.explain)
      : '<b class="no">다시 생각해 봐요.</b> ' + esc((q.why && q.why[v]) || '위의 설명과 관찰 체크를 다시 읽고 다른 답을 골라 보세요.');
    else if (showAns) fb = '<b class="ok">정답: ' + esc(q.answer) + '</b> ' + esc(q.explain);
    return '<div class="q q-radio' + cls + '" id="' + name + '" data-n="' + n + '"><p class="q-p"><i>' + n + '</i><span id="' + name + '-t">' + esc(q.q) + '</span></p>' +
      '<div class="opts" role="radiogroup" aria-labelledby="' + name + '-t">' + q.options.map(function (o) {
        var isAns = showAns && o === q.answer;
        return '<label' + (isAns ? ' class="ans"' : '') + '><input type="radio" name="' + name + '" data-kind="' + kind + '" data-key="' + esc(key) + '" value="' + esc(o) + '"' + (o === v ? ' checked' : '') + '><span>' + esc(o) + (isAns ? '<span class="sr"> (정답)</span>' : '') + '</span></label>';
      }).join('') + '</div>' + (fb ? '<p class="fb">' + fb + '</p>' : '') + '</div>';
  }
  function textBlock(it, n) {
    var v = String(state[it.field] || '');
    return '<div class="q q-text"><p class="q-p"><i>' + n + '</i><span>' + esc(it.prompt) + '</span></p>' +
      '<textarea data-field="' + it.field + '" rows="4" maxlength="' + it.max + '" aria-label="생각 쓰기">' + esc(v) + '</textarea><span class="cc">' + v.length + ' / ' + it.max + '</span></div>';
  }
  function sheetCount(c) { return c.items.filter(itemFilled).length; }
  function sheetHTML(c) {
    var note = TEACHER ? '교사 모드예요. 기록이 남지 않아요.' : classOn ? '수업 모드예요. 정답 풀이는 가려져 있어요.' : '';
    return '<section class="sheet" id="sheet" aria-label="' + esc(c.title) + ' 학습지"><header><p class="eyebrow">학습지</p><h2>' + esc(c.title) + '</h2><span class="cnt" id="cnt">' + sheetCount(c) + ' / ' + c.items.length + '</span></header>' +
      '<p class="warn" id="saveWarn"' + (saveOk ? ' hidden' : '') + '>이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫거나 새로고침하지 마세요.</p>' +
      (note ? '<p class="t-note">' + note + ' <button type="button" class="mini ansBtn" aria-pressed="' + showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      c.items.map(function (it, i) { return it.t === 'q' ? qBlock(it.kind, it.key, it.q, i + 1) : textBlock(it, i + 1); }).join('') + '</section>';
  }

  /* ---------- 악기 탭 ---------- */
  var LIC = {
    'KOGL Type 1: Attribution': ['공공누리 제1유형(출처표시)', 'https://www.kogl.or.kr/info/licenseType1.do'],
    'KOGL Type 4: Attribution + Noncommercial + No Derivatives': ['공공누리 제4유형(출처표시·비상업적 이용·변경금지)', 'https://www.kogl.or.kr/info/licenseType4.do']
  };
  function licHTML(l) {
    if (LIC[l]) return '<a href="' + LIC[l][1] + '" target="_blank" rel="noopener">' + esc(LIC[l][0]) + '</a>';
    var m = /CC BY-SA (\d)\.0/.exec(l || '');
    return m ? '<a href="https://creativecommons.org/licenses/by-sa/' + m[1] + '.0/" target="_blank" rel="noopener">' + esc(l) + '</a>' : esc(l || '');
  }
  function miniVid(x) {
    if (!(x.id in VST) || !PV.videoId) return '';
    var ls = VLS[x.id], st = ls ? ls[0] : VST[x.id], en = ls ? ls[1] : (nextStart(st) || st + 30);
    var solo = !!(ls || (en - st) <= 20);
    return '<figure class="vid mini" data-yt="' + esc(PV.videoId) + '" data-start="' + st + '" data-end="' + en + '">' +
      '<button class="vid-play" type="button" aria-label="' + esc(x.name) + ' 소리 듣기 영상 재생"><span class="play" aria-hidden="true"></span>소리 듣기 · ' + mmss(st) + '부터</button>' +
      '<figcaption><span class="play-mode' + (solo ? ' is-solo' : '') + '">' + (solo ? '태블릿 · 각자 짧게' : '칠판 · 다 같이') + '</span> <small>' + esc(PV.credit || '') + '</small></figcaption></figure>';
  }
  // 수업 모드에서 정답을 가렸으면 ✓도 감춰요(맞혔는지가 칠판에 드러나지 않게)
  function showDone(id) { return isDone(id) && (!classOn || showAns); }
  function tabLabel(x, k) { return '<i>' + (k + 1) + '</i>' + esc(x.name) + (showDone(x.id) ? '<i class="ck" aria-label="확인함">✓</i>' : ''); }
  function panelHTML(c, list, x, k, sel) {
    var a = ABY[x.id] || {}, checks = state.checks[x.id] || [], note = String(state.notes[x.id] || '');
    var nx = list[k + 1];
    var next = nx ? '<button type="button" class="next-md" data-next="t-' + esc(nx.id) + '">다음 악기: ' + esc(nx.name) + ' →</button>'
      : '<a class="next-md" href="#' + c.id + '?sheet">이 장 악기를 다 봤어요 · 학습지로 →</a>';
    var photo = a.img ? '<figure class="ph"><div class="ph-frame"><img class="art-img" src="' + esc(a.img) + '" width="' + (a.w || 800) + '" height="' + (a.h || 600) + '" alt="' + esc(x.name) + ' 사진" loading="lazy" decoding="async"></div>' +
      '<figcaption>사진: ' + esc(a.credit || '') + ' · ' + licHTML(a.license) + '<br>' +
      (a.source ? '<a href="' + esc(a.source) + '" target="_blank" rel="noopener">사진 원본 및 이용 조건 ↗</a>' : '') +
      (x.source ? '<a href="' + esc(x.source) + '" target="_blank" rel="noopener">국악사전 설명 ↗</a>' : '') + '</figcaption></figure>' : '';
    return '<div class="tp" role="tabpanel" id="p-' + esc(x.id) + '" aria-labelledby="t-' + esc(x.id) + '"' + (sel ? '' : ' hidden') + ' tabindex="0">' +
      '<div class="tp-head">' + photo + miniVid(x) + '</div>' +
      '<div class="tp-body"><p class="eyebrow">' + esc(x.family) + ' · ' + (k + 1) + ' / ' + list.length + '</p><h3>' + esc(x.name) + '</h3>' +
      '<div class="pills"><span>가족<b>' + esc(x.family) + '</b></span><span>소리 내는 법<b>' + esc(x.method) + '</b></span><span>재료<b>' + esc(x.material) + '</b></span></div>' +
      '<p class="desc">' + esc(x.description) + '</p>' +
      '<h4>관찰하고 체크해요 <span class="n" id="n-' + esc(x.id) + '">' + checks.length + ' / ' + x.clues.length + '</span></h4>' +
      '<ul class="clues">' + x.clues.map(function (t, i) { return '<li><label><input type="checkbox" data-clue="' + esc(x.id) + '" value="' + i + '"' + (checks.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + esc(t) + '</span></label></li>'; }).join('') + '</ul>' +
      (x.compare ? '<div class="cmpbox"><h4>비교해서 기억해요</h4><p>' + esc(x.compare) + '</p></div>' : '') +
      (x.extra ? '<details class="ext"><summary>더 알아보기</summary><p>' + esc(x.extra) + '</p></details>' : '') +
      '<div class="card-q">' + qBlock('answers', x.id, instQ(x), '?') +
      '<div class="q pad"><textarea data-note="' + esc(x.id) + '" rows="2" maxlength="300" aria-label="' + esc(x.name) + ' 메모" placeholder="이 악기를 친구에게 설명한다면? 기억할 단서를 내 말로 적어 보세요.">' + esc(note) + '</textarea><span class="cc">' + note.length + ' / 300</span></div>' +
      (TEACHER || classOn ? '<p class="t-note"><button type="button" class="mini ansBtn" aria-pressed="' + showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      '</div>' + next + '</div></div>';
  }
  function tabsHTML(c) {
    var list = fam(c.family), sel = curTab[c.id] && IBY[curTab[c.id]] && IBY[curTab[c.id]].family === c.family ? curTab[c.id] : list[0].id;
    curTab[c.id] = sel;
    return '<div class="tabs"><div class="tl" role="tablist" aria-label="' + esc(c.family) + '">' + list.map(function (x, k) {
      var on = x.id === sel;
      return '<button type="button" role="tab" id="t-' + esc(x.id) + '" data-id="' + esc(x.id) + '" aria-controls="p-' + esc(x.id) + '" aria-selected="' + on + '" tabindex="' + (on ? '0' : '-1') + '">' + tabLabel(x, k) + '</button>';
    }).join('') + '</div>' + list.map(function (x, k) { return panelHTML(c, list, x, k, x.id === sel); }).join('') + '</div>';
  }
  function sceneHTML(s, second) {
    return '<div class="scene">' + art(s.img, s.alt, 'scene-art', 1200, 900) + '<div class="scene-text"><p class="one">' + esc(s.one) + '</p><p>' + esc(second) + '</p></div></div>';
  }

  /* ---------- 장 본문 ---------- */
  var WARMUP = ['02', '10', '20'];
  function warmRange(id) {
    var ls = VLS[id];
    if (ls) return [ls[0], Math.min(ls[1], ls[0] + 10)];
    var st = VST[id] || 0;
    return [st, st + 10];
  }
  function warmNameHTML(id) {
    var x = IBY[id] || {}, pick = warmPick[id];
    var hint = { '관악기': '숨', '현악기': '줄', '타악기': '두드림' };
    return '<p class="lname"' + (pick ? '' : ' hidden') + '>' + esc(x.name || id) +
      '<small>' + esc(x.family || '') + (hint[x.family] ? ' (' + hint[x.family] + ')' : '') + '</small>' +
      (pick ? (pick === x.family ? '<span class="ok">맞았어요!</span>' : '<span class="no">정답은 ' + esc(x.family) + '(' + esc(hint[x.family] || '') + ')예요</span>') : '') + '</p>';
  }
  function lvPlayerHTML() {
    return '<div class="lv' + (coverOn ? ' covered' : '') + '" id="lv"><div class="lv-screen" id="lvScreen"><div class="lv-idle">카드의 듣기를 누르면 여기에서 소리가 나요.</div>' +
      '<div class="lv-cover" aria-hidden="true"><div class="wave"><i></i><i></i><i></i><i></i><i></i></div><b>소리 먼저 들어요</b><span>화면은 가려 두었어요.</span></div></div>' +
      '<div class="lv-bar"><button type="button" class="mini" id="lvCover" aria-pressed="' + coverOn + '">' + (coverOn ? '화면 가리기: 켬' : '화면 가리기: 끔') + '</button>' +
      '<button type="button" class="mini" id="lvStop">멈추기</button>' +
      '<span class="play-mode is-solo">태블릿 · 각자 짧게</span>' +
      '<span>영상: <a href="' + esc(PV.url || '#') + '" target="_blank" rel="noopener">' + esc(PV.title || '') + '</a> · ' + esc(PV.credit || '') + '</span></div></div>';
  }
  function kindHTML() {
    var how = { '관악기': '숨을 불어 소리를 내요.', '현악기': '줄의 떨림으로 소리를 내요.', '타악기': '몸체나 가죽 등을 두드려 소리를 내요.' };
    var warm = '<div class="bigq"><b>오늘의 질문</b><p>“눈을 감고 들어도 무슨 악기인지 알 수 있을까?”</p><small>먼저 화면을 가린 채 소리만 짧게 듣고, 무엇으로 낸 소리인지 느낌으로 골라 봐요.</small></div>' +
      '<section class="warmup" aria-label="짐작하고 듣기"><h3>짐작하고 듣기</h3>' +
      '<p class="hint">소리마다 10초쯤 나와요. <b>숨 · 줄 · 두드림</b> 가운데 하나를 고르면 악기 이름과 가족이 열려요. (점수에 들어가지 않아요)</p>' +
      lvPlayerHTML() +
      '<ol class="lcards wcards">' + WARMUP.map(function (id, k) {
        var rg = warmRange(id), pick = warmPick[id];
        return '<li class="lcard wcard" data-g="w:' + esc(id) + '" data-start="' + rg[0] + '" data-end="' + rg[1] + '"><div class="lh"><b>소리 ' + (k + 1) + '</b><button type="button" class="lplay" aria-label="짐작 소리 ' + (k + 1) + ' 듣기">듣기</button></div>' +
          '<div class="lg" role="group" aria-label="짐작 소리 ' + (k + 1) + ' 고르기">' + [['관악기', '숨?'], ['현악기', '줄?'], ['타악기', '두드림?']].map(function (f) {
            return '<button type="button" data-wg="' + f[0] + '" aria-pressed="' + (pick === f[0]) + '" aria-label="' + f[0] + ' (' + f[1] + ')">' + f[1] + '</button>';
          }).join('') + '</div>' + warmNameHTML(id) + '</li>';
      }).join('') + '</ol></section>';
    return warm + '<h3>소리 내는 방법으로 나눈 세 가족</h3><div class="fam3">' + ['관악기', '현악기', '타악기'].map(function (f) {
      var l = fam(f);
      return '<div><h3>' + f + '<small>' + l.length + '가지</small></h3><p class="how2">' + how[f] + '</p><ul>' +
        l.map(function (x) { return '<li><a href="#' + FAMCH[f] + '?i-' + esc(x.id) + '">' + esc(x.name) + '</a></li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>' +
      '<div class="callout"><p><b>헷갈리기 쉬운 악기</b> 양금은 채로 치지만 떨리는 것은 줄이에요. 그래서 현악기예요.</p>' +
      '<p><b>헷갈리기 쉬운 악기</b> 생황은 여러 관이 모여 있지만 숨을 불어 소리를 내요. 그래서 관악기예요.</p></div>' +
      '<h3>현악기는 줄을 울리는 방법이 세 가지예요</h3>' +
      '<div class="subs"><div><b>발현 (뜯기)</b><span>가야금·거문고 — 손가락이나 술대로 줄을 뜯어요.</span></div>' +
      '<div><b>찰현 (문지르기)</b><span>해금·아쟁 — 활로 줄을 문질러요.</span></div>' +
      '<div><b>타현 (치기)</b><span>양금 — 가는 채로 줄을 쳐요.</span></div></div>' +
      '<details class="ext"><summary>더 알아보기 · 팔음</summary><p>옛날에는 악기를 만든 재료에 따라 쇠·돌·실·대나무·박·흙·가죽·나무의 여덟 가지(팔음)로 나누기도 했어요. 오늘은 소리 내는 방법으로 나눠요. <a href="https://www.gugak.go.kr/ency/topic/view/1825" target="_blank" rel="noopener">국악사전 ↗</a></p></details>';
  }
  var LGROUPS = ['11', '01', '16', '09', '05', '13', '03', '20', '08', '21+22', '14', '04', '12', '07', '17', '10', '02', '18+19', '06', '15'];
  function gInfo(g) {
    var ids = g.split('+'), fm = (IBY[ids[0]] || {}).family || '';
    // 묶음 카드(나발+나각, 어+부)는 두 악기의 소리 구간을 이어서 틀어요
    var ls = ids.map(function (id) { return VLS[id]; });
    if (ls.every(Boolean)) return { ids: ids, start: Math.min.apply(null, ls.map(function (l) { return l[0]; })), end: Math.max.apply(null, ls.map(function (l) { return l[1]; })), family: fm };
    var st = VST[ids[0]] || 0, nx = nextStart(st);
    return { ids: ids, start: st, end: nx ? Math.min(st + 15, nx) : st + 15, family: fm };
  }
  function lnameHTML(g) {
    var gi = gInfo(g), pick = state.lg[g];
    return '<p class="lname"' + (revealed[g] ? '' : ' hidden') + '>' + gi.ids.map(function (id) { return esc((IBY[id] || {}).name || id); }).join('·') +
      '<small>' + esc(gi.family) + '</small>' +
      (pick ? (pick === gi.family ? '<span class="ok">✓ 가족을 맞혔어요</span>' : '<span class="no">고른 답: ' + esc(pick) + '</span>') : '') + '</p>';
  }
  function listenHTML() {
    return '<div class="bigq"><b>오늘의 질문 다시 꺼내기</b><p>“눈을 감고 들어도 무슨 악기인지 알 수 있을까?”</p><small>이제 답해 볼까요? 아래 소리를 듣고 학습지에 내가 찾은 단서를 적어 봐요.</small></div>' +
      sceneHTML({ img: 'madang-listen.webp', alt: '중학생 몇 명이 눈을 감고 멀리 무대에서 퍼져 오는 소리에 귀 기울여요', one: '화면을 가리고 소리만 들어요. 숨소리, 줄 떨림, 두드림 가운데 무엇이 들리나요?' },
      '카드의 듣기를 누르면 해설 없이 그 악기 소리만 짧게 나와요. 관·현·타 가운데 하나를 고른 뒤 악기 열기로 확인해요.') +
      lvPlayerHTML() +
      '<ol class="lcards">' + LGROUPS.map(function (g, k) {
        var gi = gInfo(g), pick = state.lg[g];
        return '<li class="lcard" data-g="' + g + '" data-start="' + gi.start + '" data-end="' + gi.end + '"><div class="lh"><b>소리 ' + (k + 1) + '</b><button type="button" class="lplay" aria-label="소리 ' + (k + 1) + ' 듣기">듣기</button></div>' +
          '<div class="lg" role="group" aria-label="소리 ' + (k + 1) + ' 악기 가족 고르기">' + [['관악기', '관'], ['현악기', '현'], ['타악기', '타']].map(function (f) {
            return '<button type="button" data-lg="' + f[0] + '" aria-pressed="' + (pick === f[0]) + '" aria-label="' + f[0] + '">' + f[1] + '</button>';
          }).join('') + '</div>' +
          '<button type="button" class="lopen" aria-expanded="' + !!revealed[g] + '">' + (revealed[g] ? '악기 닫기' : '악기 열기') + '</button>' + lnameHTML(g) + '</li>';
      }).join('') + '</ol>';
  }
  function checkHTML() {
    return '<p>✓ 표시가 없는 악기는 눌러서 확인 문제를 풀어요.</p><div class="all3">' + ['관악기', '현악기', '타악기'].map(function (f) {
      var l = fam(f);
      return '<div><h3>' + f + ' ' + l.length + '</h3><ol>' + l.map(function (x) {
        return '<li><a href="#' + FAMCH[f] + '?i-' + esc(x.id) + '">' + esc(x.name) + (showDone(x.id) ? '<em class="ok">✓ 확인</em>' : '<em>아직</em>') + '</a></li>';
      }).join('') + '</ol></div>';
    }).join('') + '</div><p class="home-note">남은 악기와 메모는 집에서 마저 해도 돼요. 제출은 몇 번이든 다시 할 수 있어요.</p>';
  }
  function lessonHTML(c) {
    if (c.id === 'kind') return kindHTML();
    if (c.family) return sceneHTML(c.scene, '탭을 눌러 악기를 하나씩 봐요. 사진의 단서를 체크하고, 영상으로 소리를 들은 뒤 확인 문제를 풀어요.') + tabsHTML(c);
    if (c.id === 'listen') return listenHTML();
    if (c.id === 'check') return checkHTML();
    return '';
  }
  function chapterHTML(c, idx) {
    return '<section class="lesson"><header class="ch-head art" style="--art:url(img/head-' + esc(c.id) + '.webp)"><p class="eyebrow">' + (idx + 1) + '장 · ' + esc(c.time) + ' · ' + part(idx) + '차시</p><h1>' + esc(c.title) + '</h1><p class="lead">' + esc(c.lead) + '</p></header>' +
      lessonHTML(c) + '</section>' +
      '<div class="bridge"><p><b>여기까지 함께 봤으면</b> 아래 종이 학습지에 답을 써요. ' + c.items.length + '문항이고, 쓴 답은 이 기기에 저절로 저장돼요.</p>' +
      '<button type="button" class="mini cls" id="btnSheet" aria-pressed="' + sheetOn + '">' + (sheetOn ? '학습지 숨기기' : '학습지 함께 보기') + '</button></div>' + sheetHTML(c);
  }

  /* ---------- 시작·제출 ---------- */
  function startHTML() {
    var row = function (c, k) { return '<li><a href="#' + c.id + '"><i>' + (k + 1) + '</i><b>' + esc(c.title) + '</b><small>' + esc(c.time) + ' · 학습지 ' + c.items.length + '문항</small></a></li>'; };
    var photoCredits = {}; (window.ASSETS || []).forEach(function (a) { photoCredits[a.credit] = 1; });
    return '<section class="hero"><p class="eyebrow">중학교 음악 · 우리 악기</p><h1>국악기</h1>' +
      '<p class="lead">숨을 불고, 줄을 울리고, 두드려요. 22가지 우리 악기를 소리 내는 방법으로 나누고, 귀로도 구별해 봐요.</p>' +
      '<a class="go" href="#' + CH[0].id + '">수업 시작하기</a></section>' +
      '<div class="hero-art">' + art('stage-orchestra.webp', '국악관현악 무대 전경: 한복 입은 연주자들이 따뜻한 조명 아래에서 연주해요', 'wide-art', 1600, 900) + '</div>' +
      '<section class="wrap two intro"><div><h2>오늘 배울 것</h2><ul class="goals"><li>국악기를 소리 내는 방법에 따라 관악기·현악기·타악기로 나눌 수 있어요.</li><li>사진과 영상으로 국악기 22종의 생김새와 소리를 알아볼 수 있어요.</li><li>소리만 듣고 악기 가족을 짐작할 수 있어요.</li></ul>' +
      '<p class="how">장마다 위쪽은 수업 화면, 아래쪽 밝은 종이는 학습지예요. 쓴 답은 이 기기에 저절로 저장되고, 마지막에 한 번 제출해요.</p></div>' +
      '<div><h2>오늘의 순서</h2><p class="part">1차시</p><ol class="flow">' + CH.slice(0, SPLIT + 1).map(function (c, k) { return row(c, k); }).join('') + '</ol>' +
      '<p class="part">2차시</p><ol class="flow">' + CH.slice(SPLIT + 1).map(function (c, k) { return row(c, k + SPLIT + 1); }).join('') +
      '<li><a href="#submit"><i></i><b>제출하기</b><small>채점하고 선생님께 보내기</small></a></li></ol></div></section>' +
      (TEACHER ? '<p class="t-plan"><b>선생님 안내</b> <b>2차시(45분×2)</b> 기준이에요. 1차시는 1~3장(분류·관악기·현악기), 2차시는 4~6장(타악기·귀로 구별하기·확인)이에요. 학생 답은 각자 기기에 남으므로 둘째 시간에도 같은 기기·같은 브라우저로 들어오게 해 주세요. 수업 모드를 켜면 목차가 숨고 글자가 커지며, 학습지와 정답 풀이가 가려져요. 정답 보기 버튼으로 함께 확인해요.</p>' : '') +
      '<details class="more qr" id="qrBox"' + (TEACHER ? ' open' : '') + '><summary>학생용 QR 코드</summary><div class="qr-body"><div id="qrImg" aria-label="학생용 주소 QR 코드"></div><div><p>휴대폰·태블릿 카메라로 비추면 이 수업이 열려요. 학년·반·번호와 이름을 넣고 시작해요.</p><code>' + esc(SHARE_URL) + '</code></div></div></details>' +
      '<details class="more src"><summary>영상과 자료 출처</summary><ul>' +
      '<li>영상: ' + esc(PV.title || '') + ' — ' + esc(PV.credit || '') + ' (<a href="' + esc(PV.url || '#') + '" target="_blank" rel="noopener">YouTube</a>)</li>' +
      '<li>악기 사진: ' + Object.keys(photoCredits).map(esc).join(', ') + '. 사진마다 아래에 출처와 이용 조건(공공누리·CC BY-SA)을 적었어요.</li>' +
      '<li>내용: 중학교 음악 교과서 국악기 단원과 <a href="https://www.gugak.go.kr/ency/topic/view/1675" target="_blank" rel="noopener">국립국악원 국악사전</a>을 참고해 정리했어요.</li>' +
      '<li>그림: 이 수업을 위해 새로 마련했어요(출처·라이선스: <a href="img/CREDITS.md" target="_blank" rel="noopener">img/CREDITS.md</a>).</li>' +
      '<li>더 연습하기: <a href="https://gugak-instrument-quiz.kjw2277.chatgpt.site/" target="_blank" rel="noopener">국악기 퀴즈</a> (20종이에요. 교과서는 나발·나각을 더해 22종이에요.)</li></ul></details>';
  }
  function leftCount() {
    var n = 0; CH.forEach(function (c) { n += c.items.length - sheetCount(c); });
    return n + INST.filter(function (x) { return !state.answers[x.id]; }).length;
  }
  function submitHTML() {
    var d = state.done, changed = d && d.sig && d.sig !== answerSig(), left = leftCount();
    var rows = CH.map(function (c, k) {
      return '<li><a href="#' + c.id + '?sheet"><i>' + (k + 1) + '</i><b>' + esc(c.title) + '</b><span>' + sheetCount(c) + ' / ' + c.items.length + ' 씀</span></a></li>';
    }).join('') + '<li><a href="#check"><i>✓</i><b>악기 확인 문제</b><span>' + INST.filter(function (x) { return state.answers[x.id]; }).length + ' / ' + INST.length + ' 풂</span></a></li>';
    return '<section class="lesson"><header class="ch-head"><p class="eyebrow">마무리</p><h1>제출하기</h1></header>' +
      (d ? '<div class="score"><b>' + d.score + '</b><span>/ ' + d.total + '점</span><p>' + esc(d.msg || '') + '</p></div>' +
           (changed ? '<p class="warn"><b>제출한 뒤에 답을 고쳤어요.</b> 고친 답은 <b>다시 제출해야</b> 선생님께 전해져요.</p>' : '') : '') +
      '<p class="lead">점수는 학습지 복습 문항 ' + RV.length + '개를 <b>처음 고른 답</b>으로 매겨요. 악기 확인 문제와 메모, 생각 쓰기는 선생님께 그대로 전해져요.</p>' +
      '<ul class="sum">' + rows + '</ul>' +
      (left ? '<p class="warn">아직 안 한 문항이 <b>' + left + '개</b> 있어요. 위 목록에서 눌러 채워 봐요.</p>' : '<p class="fine">모든 문항을 했어요.</p>') +
      '<button type="button" class="go" id="btnSubmit"' + (sending ? ' disabled' : '') + '>' + (sending ? '보내는 중…' : d ? '다시 제출하기' : '채점하고 제출하기') + '</button></section>';
  }
  function doSubmit() {
    if (sending) return;
    var left = leftCount();
    if (left && !window.confirm('안 한 문항이 ' + left + '개 있어요. 그래도 제출할까요?')) return;
    var r = result(), sig = answerSig(); sending = true; route(true);
    var finish = function (res) {
      sending = false;
      var msg = !res ? '이 기기에서만 채점했어요.' : res.teacher ? '교사 모드라 보내지 않고 채점만 했어요.' : res.ok && !res.offline ? '선생님께 보냈어요.' : res.ok ? '채점만 했어요. (허브에 연결되지 않았어요)' : '보내지 못했어요. 인터넷을 확인하고 다시 제출해 주세요.' + (res.error ? ' (' + res.error + ')' : '');
      state.done = { score: r.score, total: r.total, msg: msg, at: Date.now(), sig: res && res.ok ? sig : '' };
      save();
      if (PAGES[cur()].id === 'submit') route(true); else { toast(msg); navHTML(cur()); }
    };
    if (!CR || !CR.submit) return finish(null);
    Promise.resolve().then(function () { return CR.submit(r); }).then(finish, function (e) { finish({ ok: false, error: e && e.message }); });
  }

  /* ---------- 길찾기 ---------- */
  function hashParts() { var h = location.hash.replace(/^#/, '').split('?'); return { id: h[0], sub: h[1] || '' }; }
  function cur() { var id = hashParts().id; for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return i; return 0; }
  function navHTML(i) {
    var link = function (x, k) {
      var n = x.ch ? sheetCount(x.ch) : 0, done = x.ch ? n === x.ch.items.length : false, on = k === i;
      var h = '<a href="#' + x.id + '"' + (on ? ' class="on" aria-current="page"' : '') + '><i>' + (x.ch ? k : '') + '</i><span>' + esc(x.nav) + '</span>' + (done ? '<em class="dot" title="학습지 다 씀"></em>' : '') + '</a>';
      if (x.ch) h += '<a class="subl' + (on ? ' here' : '') + '" href="#' + x.id + '?sheet">학습지 <span>' + n + '/' + x.ch.items.length + '</span></a>';
      return h;
    };
    var grp = function (t, from, to) { var s = ''; for (var k = from; k <= to; k++) s += link(PAGES[k], k); return '<div class="grp"><p>' + t + '</p>' + s + '</div>'; };
    nav.innerHTML = link(PAGES[0], 0) + grp('1차시', 1, SPLIT + 1) + grp('2차시', SPLIT + 2, PAGES.length - 2) + link(PAGES[PAGES.length - 1], PAGES.length - 1);
  }
  function route(keep) {
    var i = cur(), p = PAGES[i], sub = hashParts().sub;
    if (!keep && p.ch && p.ch.family && /^i-/.test(sub) && IBY[sub.slice(2)]) curTab[p.ch.id] = sub.slice(2);
    var y = window.scrollY;
    view.innerHTML = p.id === 'start' ? startHTML() : p.id === 'submit' ? submitHTML() : chapterHTML(p.ch, i - 1);
    navHTML(i);
    var pv = document.getElementById('prev'), nx = document.getElementById('next');
    pv.disabled = i === 0; nx.disabled = i === PAGES.length - 1;
    pv.querySelector('b').textContent = i ? PAGES[i - 1].nav : ''; nx.querySelector('b').textContent = i < PAGES.length - 1 ? PAGES[i + 1].nav : '';
    document.getElementById('where').textContent = (i + 1) + ' / ' + PAGES.length;
    document.getElementById('pgBar').style.width = (i / (PAGES.length - 1) * 100) + '%';
    document.title = (p.ch ? p.ch.title + ' · ' : '') + '국악기';
    if (p.id === 'start') drawQR();
    lastPage = i;
    if (!keep) jump(); else window.scrollTo({ top: y, behavior: 'instant' });
  }
  function setSheet(on) {
    sheetOn = on; body.classList.toggle('class-sheet', on);
    var bs = document.getElementById('btnSheet');
    if (bs) { bs.setAttribute('aria-pressed', String(on)); bs.textContent = on ? '학습지 숨기기' : '학습지 함께 보기'; }
  }
  function jump() {
    var sub = hashParts().sub;
    if (sub === 'sheet') {
      if (classOn && !sheetOn) setSheet(true);
      var s = document.getElementById('sheet'); if (s) { s.scrollIntoView({ block: 'start' }); return; }
    }
    if (/^i-/.test(sub)) {
      var t = document.getElementById('t-' + sub.slice(2));
      if (t) { selectTab(t); var tb = t.closest('.tabs'); if (tb) tb.scrollIntoView({ block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
  }
  function go(d) { var i = cur() + d; if (i >= 0 && i < PAGES.length) location.hash = PAGES[i].id; }
  window.addEventListener('hashchange', function () {
    closeSide();
    if (cur() === lastPage) { jump(); return; } // 같은 장 안에서 이동할 때는 다시 그리지 않아요(영상·입력 유지)
    stopVideos(); route(); view.focus({ preventScroll: true });
  });

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
    var n = sheetCount(p.ch), m = p.ch.items.length;
    var c = document.getElementById('cnt'); if (c) c.textContent = n + ' / ' + m;
    var sl = nav.querySelector('.subl.here span'); if (sl) sl.textContent = n + '/' + m;
    var a = nav.querySelector('a.on'); if (a) { var dot = a.querySelector('.dot');
      if (n === m && !dot) a.insertAdjacentHTML('beforeend', '<em class="dot" title="학습지 다 씀"></em>'); else if (n !== m && dot) dot.remove(); }
  }
  function findQ(kind, key) {
    if (kind === 'answers') return IBY[key] ? instQ(IBY[key]) : null;
    if (kind === 'classification') return CQ[+key] || null;
    if (kind === 'review') return RV[+key] || null;
    return null;
  }
  view.addEventListener('input', function (e) {
    var el = e.target, f = el.getAttribute && (el.getAttribute('data-field') || el.getAttribute('data-note')), cc;
    if (!f) return;
    if (el.hasAttribute('data-note')) state.notes[f] = el.value.slice(0, 300); else state[f] = el.value.slice(0, f === 'reflection' ? 1000 : 400);
    save();
    cc = el.parentNode.querySelector('.cc'); if (cc) cc.textContent = el.value.length + ' / ' + el.maxLength;
    refreshCount();
  });
  view.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-clue')) {
      var id = el.getAttribute('data-clue');
      state.checks[id] = Array.prototype.map.call(view.querySelectorAll('input[data-clue="' + id + '"]:checked'), function (x) { return +x.value; });
      save();
      var n = document.getElementById('n-' + id), x = IBY[id]; if (n && x) n.textContent = state.checks[id].length + ' / ' + x.clues.length;
      return;
    }
    var kind = el.getAttribute && el.getAttribute('data-kind'), key = el.getAttribute && el.getAttribute('data-key'), q = kind && findQ(kind, key);
    if (!q) return;
    // 방향키로 선택지를 지나가는 중이면 아직 답을 정한 게 아니에요. Enter·Space를 누르거나 문항을 벗어날 때 확정해요
    if (kbPick) { kbPick = false; state[kind][key] = el.value; save(); return; }
    pickAnswer(el, true);
  });
  var kbPick = false;
  view.addEventListener('keydown', function (e) {
    var el = e.target; if (!el || el.type !== 'radio' || !el.hasAttribute('data-kind')) return;
    if (/^Arrow/.test(e.key)) kbPick = true;
    else if ((e.key === 'Enter' || e.key === ' ') && el.checked) { e.preventDefault(); pickAnswer(el, true); }
  });
  view.addEventListener('focusout', function (e) {
    var el = e.target, to = e.relatedTarget; if (!el || el.type !== 'radio' || !el.checked || !el.hasAttribute('data-kind')) return;
    if (to && to.name === el.name) return;
    var k = el.getAttribute('data-kind') + ':' + el.getAttribute('data-key');
    if (!state.first[k]) pickAnswer(el, false);
  });
  function pickAnswer(el, refocus) {
    var kind = el.getAttribute('data-kind'), key = el.getAttribute('data-key'), q = findQ(kind, key);
    if (!q) return;
    state[kind][key] = el.value;
    if (!state.first[kind + ':' + key]) state.first[kind + ':' + key] = el.value;
    if (kind === 'answers' && el.value === q.answer) state.learned[key] = true;
    save();
    var box = document.getElementById('q-' + kind + '-' + key);
    if (box) {
      var t = document.createElement('div'); t.innerHTML = qBlock(kind, key, q, box.getAttribute('data-n'));
      var nb = t.firstChild; box.replaceWith(nb);
      var inp = nb.querySelector('input[value="' + (window.CSS && CSS.escape ? CSS.escape(el.value) : el.value) + '"]'); if (inp && refocus) inp.focus();
    }
    refreshCount();
    if (kind === 'answers') {
      var tab = document.getElementById('t-' + key), x2 = IBY[key];
      if (tab && x2) { var list = fam(x2.family); tab.innerHTML = tabLabel(x2, list.indexOf(x2)); }
    }
  }
  function stopVideos() {
    Array.prototype.forEach.call(document.querySelectorAll('.vid.playing'), function (f) {
      var fr = f.querySelector('iframe'); if (fr) fr.remove(); f.classList.remove('playing'); f.querySelector('.vid-play').hidden = false;
    });
    var lv = document.getElementById('lv');
    if (lv) { var lf = lv.querySelector('iframe'); if (lf) lf.remove(); lv.classList.remove('on'); }
    Array.prototype.forEach.call(document.querySelectorAll('.lcard.now'), function (c) { c.classList.remove('now'); });
    nowG = '';
  }
  function syncCover() {
    var lv = document.getElementById('lv'); if (!lv) return;
    var isRev = nowG.indexOf('w:') === 0 ? !!warmPick[nowG.slice(2)] : !!revealed[nowG];
    lv.classList.toggle('covered', coverOn && !isRev);
  }
  function ytFrame(st, en, title) {
    var fr = document.createElement('iframe');
    fr.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(PV.videoId) + '?autoplay=1&rel=0&playsinline=1' + (st ? '&start=' + st : '') + (en ? '&end=' + en : '');
    fr.title = title || '영상'; fr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; fr.allowFullscreen = true;
    return fr;
  }
  function selectTab(t, focus) {
    var list = t.parentNode;
    Array.prototype.forEach.call(list.querySelectorAll('[role=tab]'), function (b) {
      var on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      var pn = document.getElementById(b.getAttribute('aria-controls')); if (pn) pn.hidden = !on;
    });
    var c = PAGES[cur()].ch; if (c && t.getAttribute('data-id')) curTab[c.id] = t.getAttribute('data-id');
    stopVideos();
    if (focus) t.focus();
  }
  // 본문 안 링크가 지금 주소와 같으면 hashchange가 없으니 직접 이동해요
  view.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); jump(); }
  });
  view.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    if (t.getAttribute('role') === 'tab') { selectTab(t); return; }
    if (t.classList.contains('next-md') && t.hasAttribute('data-next')) { var nt = document.getElementById(t.getAttribute('data-next')); if (nt) { selectTab(nt, true); var tb = nt.closest('.tabs'); if (tb) tb.scrollIntoView({ block: 'start' }); } return; }
    if (t.id === 'btnSheet') { setSheet(!sheetOn); if (sheetOn) { var sh = document.getElementById('sheet'); if (sh) sh.scrollIntoView({ block: 'start' }); } return; }
    if (t.classList.contains('ansBtn')) {
      var top = t.getBoundingClientRect().top; showAns = !showAns; route(true);
      var b2 = view.querySelector(t.closest('#sheet') ? '#sheet .ansBtn' : '.tp:not([hidden]) .ansBtn');
      if (b2) window.scrollBy({ top: b2.getBoundingClientRect().top - top, behavior: 'instant' });
      return;
    }
    if (t.classList.contains('vid-play')) {
      stopVideos();
      var f = t.parentNode, st = +f.getAttribute('data-start') || 0, en = +f.getAttribute('data-end') || 0;
      t.hidden = true; f.insertBefore(ytFrame(st, en, t.getAttribute('aria-label')), f.firstChild); f.classList.add('playing'); return;
    }
    var card = t.closest('.lcard');
    if (card) {
      var g = card.getAttribute('data-g');
      if (t.classList.contains('lplay')) {
        stopVideos();
        var scr = document.getElementById('lvScreen'), lv = document.getElementById('lv'); if (!scr) return;
        scr.insertBefore(ytFrame(+card.getAttribute('data-start'), +card.getAttribute('data-end'), t.getAttribute('aria-label')), scr.firstChild);
        lv.classList.add('on'); card.classList.add('now'); nowG = g; syncCover();
        if (lv.getBoundingClientRect().top < 0) lv.scrollIntoView({ block: 'start', behavior: 'instant' });
        return;
      }
      if (t.hasAttribute('data-wg')) {
        var wid = g.replace(/^w:/, '');
        warmPick[wid] = t.getAttribute('data-wg');
        Array.prototype.forEach.call(card.querySelectorAll('[data-wg]'), function (b) { b.setAttribute('aria-pressed', String(warmPick[wid] === b.getAttribute('data-wg'))); });
        var wln = card.querySelector('.lname'); if (wln) wln.outerHTML = warmNameHTML(wid);
        if (g === nowG) syncCover();
        return;
      }
      if (t.hasAttribute('data-lg')) {
        var v = t.getAttribute('data-lg');
        if (state.lg[g] === v) delete state.lg[g]; else state.lg[g] = v;
        save();
        Array.prototype.forEach.call(card.querySelectorAll('[data-lg]'), function (b) { b.setAttribute('aria-pressed', String(state.lg[g] === b.getAttribute('data-lg'))); });
        var ln = card.querySelector('.lname'); if (ln) ln.outerHTML = lnameHTML(g);
        return;
      }
      if (t.classList.contains('lopen')) {
        revealed[g] = !revealed[g];
        t.setAttribute('aria-expanded', String(!!revealed[g])); t.textContent = revealed[g] ? '악기 닫기' : '악기 열기';
        var ln2 = card.querySelector('.lname'); if (ln2) ln2.outerHTML = lnameHTML(g);
        if (g === nowG) syncCover();
        return;
      }
    }
    if (t.id === 'lvCover') { coverOn = !coverOn; t.setAttribute('aria-pressed', String(coverOn)); t.textContent = coverOn ? '화면 가리기: 켬' : '화면 가리기: 끔'; syncCover(); return; }
    if (t.id === 'lvStop') { stopVideos(); return; }
    if (t.id === 'btnSubmit') doSubmit();
  });
  view.addEventListener('keydown', function (e) {
    var t = e.target; if (!t || t.getAttribute('role') !== 'tab') return;
    var tabs = Array.prototype.slice.call(t.parentNode.querySelectorAll('[role=tab]')), k = tabs.indexOf(t), n = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (k + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (k - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
    if (n !== null) { e.preventDefault(); e.stopPropagation(); selectTab(tabs[n], true); }
  });
  document.addEventListener('classroom:away', stopVideos);
  // 그림 파일이 없거나 못 불러오면 그 칸만 숨겨요(error는 거품이 없어 캡처 단계로 받아요)
  view.addEventListener('error', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('art-img') && t.parentNode) t.parentNode.hidden = true; }, true);

  /* ---------- 틀: 목차·수업 모드·글자 크기 ---------- */
  var side = document.getElementById('side'), burger = document.getElementById('burger'), scrim = document.getElementById('scrim');
  var mq = window.matchMedia('(max-width: 820px)');
  function syncSide() {
    var hidden = (mq.matches || classOn) ? !body.classList.contains('side-open') : body.classList.contains('side-closed');
    side.inert = hidden; if (hidden) side.setAttribute('aria-hidden', 'true'); else side.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', String(!hidden));
  }
  function closeSide() { body.classList.remove('side-open'); scrim.hidden = true; syncSide(); }
  if (mq.addEventListener) mq.addEventListener('change', syncSide); else if (mq.addListener) mq.addListener(syncSide);
  burger.addEventListener('click', function () {
    if (!mq.matches && !classOn && body.classList.contains('side-closed')) { body.classList.remove('side-closed'); syncSide(); return; }
    var on = !body.classList.contains('side-open');
    body.classList.toggle('side-open', on); scrim.hidden = !on; syncSide();
    if (on) { var a = side.querySelector('a.on') || side.querySelector('a'); if (a) a.focus(); }
  });
  scrim.addEventListener('click', closeSide);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('side-open')) { closeSide(); burger.focus(); } });

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
    closeSide();
    body.classList.toggle('class-mode', on); body.classList.toggle('side-closed', on);
    if (!on && sheetOn) setSheet(false);
    showAns = false; // 수업 모드를 켜고 끌 때마다 정답 표시를 처음 상태로 돌려요
    btnClass.textContent = on ? '수업 모드 끄기' : '수업 모드 켜기'; btnClass.setAttribute('aria-pressed', String(on));
    syncSide(); if (on) burger.focus();
    if (on) {
      fsBeforeClass = fs; setFs(Math.max(baseFs(), 24), true);
      try { if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(function () {}); } catch (e) {}
    } else {
      if (fsBeforeClass) setFs(fsBeforeClass, true); else { fs = 0; root.style.removeProperty('--fs'); }
      try { if (document.fullscreenElement) Promise.resolve(document.exitFullscreen()).catch(function () {}); } catch (e) {}
    }
    route(true);
  }
  btnClass.setAttribute('aria-pressed', 'false');
  btnClass.addEventListener('click', function () { setClass(!classOn); });
  document.getElementById('btnFull').addEventListener('click', function () {
    var fail = function () { toast('이 기기에서는 전체 화면을 쓸 수 없어요.'); };
    try { Promise.resolve(document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen()).catch(fail); } catch (e) { fail(); }
  });

  document.querySelector('.skip').addEventListener('click', function (e) { e.preventDefault(); view.focus(); });
  nav.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); closeSide(); jump(); }
  });
  syncSide();

  document.getElementById('prev').addEventListener('click', function () { go(-1); });
  document.getElementById('next').addEventListener('click', function () { go(1); });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((t && t.tagName) || '') && t.getAttribute('role') === 'tab' || /^(INPUT|TEXTAREA|SELECT)$/.test((t && t.tagName) || '')) return;
    if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  });

  route();
})();

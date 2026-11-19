/* 판소리와 창극(개선판) — 화면 그리기·학습지 저장·채점·제출
 * 내용(문구·문항·영상)은 content.js. classroom.js 가 이 파일보다 먼저 실행되어야 해요.
 * 원본(../pansori-class/app.js)과 채점·저장·제출 방식은 같고, 화면 틀만 바뀌었어요(T008):
 * 왼쪽 목차 · 아래 페이지 넘김 · 수업 모드 · 글자 크기 · 탭 · 글자 배치도.
 */
(function () {
  'use strict';
  var DATA = window.PANSORI, V = DATA.V, CH = DATA.CHAPTERS;
  var CR = window.Classroom || null;
  var TEACHER = !!(CR && CR.teacher);
  var KEY = 'pansori-plus-v2', FS_KEY = 'pansori-plus-fs';
  var SHARE_URL = 'https://dallalan2277-lab.github.io/classroom-hub/pansori-plus/';
  var PAGES = [{ id: 'start', nav: '시작' }].concat(CH.map(function (c) { return { id: c.id, nav: c.nav, ch: c }; }), [{ id: 'submit', nav: '제출' }]);
  var ALLQ = []; CH.forEach(function (c) { c.qs.forEach(function (q) { q.ch = c.id; ALLQ.push(q); }); });
  var QBY = {}; ALLQ.forEach(function (q) { QBY[q.id] = q; });
  var GRADED = ALLQ.filter(function (q) { return q.ans !== undefined; });
  // 1차시는 split 이 붙은 장까지
  var SPLIT = 0; CH.forEach(function (c, k) { if (c.split) SPLIT = k; });
  function part(k) { return k <= SPLIT ? 1 : 2; }

  var view = document.getElementById('view'), nav = document.getElementById('nav');
  var root = document.documentElement, body = document.body;
  var state, showAns = false, sending = false, lastPage = -1, sheetOn = false;

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
  function answerSig() { return JSON.stringify(ALLQ.map(function (q) { return valText(q); })); }
  state = load();
  document.addEventListener('classroom:switch', function () { try { localStorage.removeItem(KEY); } catch (e) {} state = fresh(); lastPage = -1; route(); });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s.,!?'"()·~]/g, ''); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600); }

  /* ---------- 채점 ---------- */
  function val(q) {
    var v = state.a[q.id];
    if (q.type === 'multi') return Array.isArray(v) ? v : [];
    if (q.type === 'order') return Array.isArray(v) ? v.filter(function (x, i, a) { return q.opts.indexOf(x) >= 0 && a.indexOf(x) === i; }) : [];
    return typeof v === 'string' ? v : '';
  }
  function answered(q) { var v = val(q); return q.type === 'multi' ? v.length > 0 : q.type === 'order' ? v.length === q.opts.length : v.trim() !== ''; }
  function correct(q) {
    if (q.ans === undefined) return false;
    var v = val(q);
    if (q.type === 'blank') { var n = norm(v); return n !== '' && q.ans.some(function (a) { return norm(a) === n; }); }
    if (q.type === 'multi') return v.slice().sort().join('|') === q.ans.slice().sort().join('|');
    if (q.type === 'order') return v.length === q.ans.length && v.every(function (x, i) { return x === q.ans[i]; });
    return v === q.ans;
  }
  function ansText(q) { if (q.ans === undefined) return ''; return q.type === 'blank' ? q.ans[0] : q.type === 'multi' ? q.ans.join(', ') : q.type === 'order' ? q.ans.join(' → ') : q.ans; }
  function valText(q) { var v = val(q); return q.type === 'multi' ? q.opts.filter(function (o) { return v.indexOf(o) >= 0; }).join(', ') : q.type === 'order' ? v.join(' → ') : v.trim(); }
  function marking() { return !!state.done || (TEACHER && showAns); }

  /* ---------- 수업 화면 조각 ---------- */
  function playMode(v) {
    if (v && (v.mode === 'solo' || v.mode === 'board')) return v.mode;
    return v && v.end && (v.end - (v.start || 0)) <= 20 ? 'solo' : 'board';
  }
  function vidHTML(key, cap, mask) {
    var v = V[key]; if (!v) return '';
    var title = mask || v.title, by = mask ? '' : v.by;
    var mode = playMode(v), modeText = mode === 'solo' ? '태블릿 · 각자 짧게' : '칠판 · 다 같이';
    return '<figure class="vid" data-yt="' + esc(v.id) + '" data-start="' + (v.start || 0) + '" data-end="' + (v.end || 0) + '">' +
      // 정체를 가린 영상은 썸네일에도 곡 이름 글자가 박혀 있어서 그림 대신 글자 판을 띄워요(T016)
      '<button class="vid-play" type="button" aria-label="' + esc(title) + ' 재생">' +
        (mask ? '<span class="vid-mask" aria-hidden="true">' + esc((mask.match(/영상\s*([A-Z])/) || [, '?'])[1]) + '</span>'
              : '<img alt="" loading="lazy" src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg">') +
        '<span class="play" aria-hidden="true"></span></button>' +
      '<figcaption><div class="vid-head"><b>' + esc(title) + '</b><span class="play-mode' + (mode === 'solo' ? ' is-solo' : '') + '">' + modeText + '</span></div>' +
      (by ? '<small>' + esc(by) + '</small>' : '') +
      (cap ? '<em>' + esc(cap) + '</em>' : '') + '</figcaption></figure>';
  }
  function role(name, short, desc, cls) {
    return '<div class="role ' + (cls || '') + '"><b>' + esc(name) + '</b><span>' + esc(short) + '</span><p>' + esc(desc) + '</p></div>';
  }
  // 막대 인형 그림 대신 글자로 그린 배치도(T008)
  function art(file, alt, cls, w, h) {
    return '<div class="' + cls + '"><img class="art-img" src="img/' + file + '" alt="' + esc(alt) + '" width="' + w + '" height="' + h + '" loading="lazy" decoding="async"></div>';
  }
  var STAGE = {
    pansori:
      '<figure class="plan plan-pan">' + art('stage-pansori.webp', '소리판 그림: 돗자리 위에 부채를 든 소리꾼이 서 있고, 옆에 고수가 앉아 북을 치며, 앞쪽에 청중이 앉아 있어요', 'plan-art', 1600, 900) +
        '<div class="roles3">' +
          role('소리꾼', '소리로 이야기 전달', '고수의 북 장단에 맞추어 소리로 이야기를 전달해요.', 'r-main') +
          role('고수', '북 장단 + 추임새', '소리에 맞추어 북 장단을 치며 추임새로 흥을 돋워요.', 'r-side') +
          role('청중', '추임새로 함께', '소리에 어울리는 추임새를 알맞게 넣으며 관람해요.', 'r-aud') +
        '</div>' +
        '<figcaption>소리판 · 돗자리 하나, 북 하나, 부채 하나</figcaption></figure>',
    changgeuk:
      '<figure class="plan plan-chang">' + art('stage-changgeuk.webp', '창극 무대 그림: 배경 세트 앞에서 의상을 입은 여러 배우가 연기하고, 한쪽에 도창이 서 있으며, 무대 아래에서 관현악이 반주해요', 'plan-art', 1600, 900) +
        '<div class="roles3">' +
          role('배우', '배역을 나누어 연기', '여러 소리꾼이 저마다 한 인물을 맡아 노래하고 연기해요.', 'r-main') +
          role('도창', '해설', '줄거리가 잘 이어지도록 해설을 맡아요. 늘 있는 것은 아니고, 두기도 해요.', 'r-side') +
          role('반주', '국악 관현악', '여러 국악기가 함께 반주해요.', 'r-aud') +
        '</div>' +
        '<figcaption>창극 무대 · 배경과 의상, 여러 배우, 관현악</figcaption></figure>'
  };
  var MD_ALT = {
    chun: '춘향가 그림: 광한루 앞에서 그네를 타는 춘향과 이를 바라보는 몽룡',
    heung: '흥보가 그림: 흥보 부부가 박을 타자 쌀과 돈이 쏟아지고 제비가 날아요',
    su: '수궁가 그림: 자라 등에 올라탄 토끼가 바닷속 용궁으로 가요',
    sim: '심청가 그림: 넓은 바다 위 배에 탄 심청',
    jeok: '적벽가 그림: 배 위에서 조자룡이 활을 겨누고, 동남풍에 돛이 펄럭여요'
  };
  var STORY_KEYS = ['chun', 'heung', 'su', 'sim', 'jeok'];
  var storyShown = {};
  function storyList(st) {
    if (!st) return [];
    return Array.isArray(st.cuts) && st.cuts.length ? st.cuts : (Array.isArray(st.acts) ? st.acts : []);
  }
  function listenHTML(st) {
    if (!st || !Array.isArray(st.listen) || !st.listen.length) return '';
    var items = st.listen.map(function (l) {
      return '<article class="listen-card">' +
        '<h5 class="listen-t">' + esc(l.name) + '</h5>' +
        vidHTML(l.v) +
        '<dl class="listen-pts">' +
          (l.fun ? '<div><dt>재미</dt><dd>' + esc(l.fun) + '</dd></div>' : '') +
          (l.focus ? '<div><dt>집중</dt><dd>' + esc(l.focus) + '</dd></div>' : '') +
        '</dl>' +
      '</article>';
    }).join('');
    return '<div class="listen-sec">' +
      '<div class="listen-head"><h4>명장면 듣기</h4><p>이야기 속 가장 재미있는 대목을 직접 들어 봐요.</p></div>' +
      '<div class="listen-grid">' + items + '</div>' +
    '</div>';
  }
  function nextMadangBtn(key) {
    var idx = STORY_KEYS.indexOf(key);
    var nk = STORY_KEYS[(idx + 1) % STORY_KEYS.length];
    var nst = nk && (DATA.STORIES || {})[nk];
    return nst ? '<button type="button" class="next-md" data-next="tb-' + esc(nk) + '">다른 마당 보기: ' + esc(nst.name) + '</button>' : '';
  }
  function actsHTML(key, st) {
    var list = storyList(st);
    if (!list.length) return '';
    var total = list.length;
    var shown = Math.max(1, Math.min(total, storyShown[key] || 1));
    storyShown[key] = shown;
    var allOpen = shown >= total;
    var cards = list.slice(0, shown).map(function (a, i) {
      var alt = a.alt || (st.name + ' ' + (i + 1) + '컷 · ' + a.t);
      return '<li class="act-card cut-card' + (i === shown - 1 && !allOpen ? ' is-now' : '') + '">' +
        (a.img ? art(a.img, alt, 'cut-art', 1200, 900) : '') +
        '<div class="cut-body">' +
          '<div class="act-meta"><span class="act-n">' + (i + 1) + '컷</span>' +
          (a.mark ? '<span class="act-mark">대표 대목 · ' + esc(a.mark) + '</span>' : '') + '</div>' +
          '<h5 class="act-t">' + esc(a.t) + '</h5>' +
          '<p class="act-x">' + esc(a.x) + '</p>' +
          (a.say ? '<div class="cut-say"><p>“' + esc(a.say) + '”</p>' + (a.who ? '<cite>— ' + esc(a.who) + '</cite>' : '') + '</div>' : '') +
        '</div>' +
      '</li>';
    }).join('');
    var curAct = list[shown - 1], nBtn = nextMadangBtn(key);
    var foot = !allOpen
      ? '<div class="act-foot">' +
        (curAct && curAct.cut ? '<p class="act-cut">' + esc(curAct.cut) + '</p>' : '') +
        '<div class="act-actions">' +
          '<button type="button" class="act-next" data-story="' + esc(key) + '">다음 컷 (' + (shown + 1) + ' / ' + total + ') →</button>' +
          nBtn +
        '</div></div>'
      : listenHTML(st) +
        '<div class="act-foot act-done">' +
          '<p class="act-cut">' + esc(st.name) + ' 4컷 이야기를 끝까지 봤어요.</p>' +
          '<div class="act-actions">' +
            '<a class="act-sheet" href="#' + esc(PAGES[cur()].id) + '?sheet">학습지 쓰러 가기 ↓</a>' +
            nBtn +
          '</div>' +
        '</div>';
    return '<div class="acts" id="acts-' + esc(key) + '" data-story="' + esc(key) + '">' +
      '<div class="acts-head"><h4>4컷 이야기 <span class="acts-cnt">' + shown + ' / ' + total + '</span></h4>' +
      '<button type="button" class="mini act-all" data-story="' + esc(key) + '" aria-pressed="' + allOpen + '">' + (allOpen ? '1컷만 보기' : '4컷 한꺼번에 보기') + '</button></div>' +
      '<ol class="act-list' + (allOpen ? ' is-grid' : '') + '">' + cards + '</ol>' + foot + '</div>';
  }
  function updateActs(key, focusMode) {
    var st = (DATA.STORIES || {})[key];
    var box = document.getElementById('acts-' + key);
    if (!st || !box) return;
    stopVideos();
    var tmp = document.createElement('div');
    tmp.innerHTML = actsHTML(key, st);
    var nextBox = tmp.firstChild;
    if (!nextBox) return;
    box.replaceWith(nextBox);
    if (focusMode === 'next') {
      var nb = nextBox.querySelector('.act-next') || nextBox.querySelector('.act-sheet') || nextBox.querySelector('.act-all');
      if (nb) {
        nb.focus();
        if (nb.scrollIntoView) nb.scrollIntoView({ block: 'nearest' });
      }
    } else if (focusMode === 'all') {
      var ab = nextBox.querySelector('.act-all');
      if (ab) ab.focus();
    }
  }
  function storyPanel(key, k) {
    var st = (DATA.STORIES || {})[key]; if (!st) return '';
    return '<div class="tp" role="tabpanel" id="tp-' + esc(key) + '" aria-labelledby="tb-' + esc(key) + '"' + (k ? ' hidden' : '') + ' tabindex="0">' +
      '<div class="tp-head">' +
        art('madang-' + key + '.webp', MD_ALT[key] || st.name, 'md-art', 1200, 900) +
        '<div class="tp-intro">' +
          '<p class="eyebrow">다섯 마당 · ' + (k + 1) + '</p>' +
          '<h3>' + esc(st.name) + '</h3>' +
          '<p class="hook">' + esc(st.hook) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="tp-body">' +
        actsHTML(key, st) +
        '<details class="more tp-more"><summary>더 알아보기 · 세 줄 요약과 주제</summary>' +
          '<div class="tp-more-body">' +
            '<h4>세 줄 요약</h4><p class="story-sum">' + esc(st.story) + '</p>' +
            '<h4>주제</h4><ul>' + st.theme.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
            (st.care ? '<p class="care"><b>함께 생각해요</b> ' + esc(st.care) + '</p>' : '') +
          '</div>' +
        '</details>' +
      '</div></div>';
  }
  function build(html) {
    return html.replace(/\{(\w+):([^}]*)\}/g, function (_, kind, b) {
      var p = b.split('|');
      if (kind === 'term') return '<div><dt>' + esc(p[0]) + '</dt><dd><b>' + esc(p[1]) + '</b>' + esc(p[2]) + '</dd></div>';
      if (kind === 'vid') return vidHTML(p[0], p[1], p[2]);
      if (kind === 'stage') return STAGE[p[0]] || '';
      if (kind === 'madang') return '<article class="md"><div class="md-text"><p class="eyebrow">' + esc(p[0]) + '</p><h4>' + esc(p[1]) + '</h4><p>' + esc(p[3]) + '</p>' +
        '<div class="guess" role="group" aria-label="빠르기 짐작(점수 없음)"><span>짐작</span><button type="button" aria-pressed="false">느릴 것 같아요</button><button type="button" aria-pressed="false">빠를 것 같아요</button></div>' +
        '<button type="button" class="jd reveal" data-a="' + esc(p[2]) + '" aria-pressed="false">장단은?</button></div>' + vidHTML(p[4]) + '</article>';
      if (kind === 'tabs') {
        return '<div class="tabs"><div class="tl" role="tablist" aria-label="다섯 마당">' + p.map(function (key, k) {
          var st = (DATA.STORIES || {})[key]; if (!st) return '';
          return '<button type="button" role="tab" id="tb-' + esc(key) + '" aria-controls="tp-' + esc(key) + '" aria-selected="' + (k ? 'false' : 'true') + '" tabindex="' + (k ? '-1' : '0') + '"><i>' + (k + 1) + '</i>' + esc(st.name) + '</button>';
        }).join('') + '</div>' + p.map(storyPanel).join('') + '</div>';
      }
      if (kind === 'now') return '<article class="nw"><p class="eyebrow">' + esc(p[1]) + '</p>' + vidHTML(p[0]) + '</article>';
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
    else if (q.type === 'order') {
      var seq = v.length ? '<p class="ord-seq"><b>내 순서</b> ' + v.map(function (o, k) { return (k + 1) + '. ' + esc(o); }).join(' → ') + '</p>' : '';
      h = '<div class="ord" role="group" aria-label="순서 맞추기">' +
        '<div class="ord-bar"><span class="ord-hint">이야기 순서대로 하나씩 눌러요 (' + v.length + ' / ' + q.opts.length + ')</span>' +
        '<button type="button" class="ord-reset" data-ord-reset="' + q.id + '"' + (v.length ? '' : ' disabled') + '>다시 고르기</button></div>' +
        '<div class="ord-list">' + q.opts.map(function (o) {
          var k = v.indexOf(o);
          return '<button type="button" class="ord-btn' + (k >= 0 ? ' is-on' : '') + '" data-ord-q="' + q.id + '" data-ord-v="' + esc(o) + '" aria-pressed="' + (k >= 0 ? 'true' : 'false') + '">' +
            '<em class="ord-num" aria-hidden="true">' + (k >= 0 ? (k + 1) : '') + '</em><span>' + esc(o) + '</span></button>';
        }).join('') + '</div>' + seq + '</div>';
    }
    var mark = m ? '<span class="mk ' + (ok ? 'ok' : 'no') + '">' + (ok ? '맞았어요' : '정답: ' + esc(ansText(q))) + '</span>' : '';
    return (q.group ? '<h4 class="q-group">' + esc(q.group) + '</h4>' : '') +
      '<div class="q q-' + q.type + (m ? (ok ? ' is-ok' : ' is-no') : '') + '" id="' + name + '"><p class="q-p"><i>' + i + '</i><span>' + q.prompt + '</span></p>' + h + mark + '</div>';
  }
  function nextEndHTML(c, idx) {
    var nextP = PAGES[idx + 2]; if (!nextP) return '';
    var isSubmit = nextP.id === 'submit';
    var label = isSubmit ? '채점·제출하러 가기 →' : '다음 장: ' + esc(nextP.nav) + ' →';
    if (!c.qs.length) {
      return '<div class="lesson-end">' +
        '<p class="end-msg">이 장 활동을 마쳤으면 다음 장으로 넘어가요.</p>' +
        '<a class="end-go is-done" id="endGo" href="#' + esc(nextP.id) + '">' + label + '</a></div>';
    }
    var n = c.qs.filter(answered).length, total = c.qs.length, left = total - n, all = left === 0;
    return '<div class="sheet-end' + (all ? ' is-done' : '') + '" id="sheetEnd">' +
      (c.split ? '<p class="split-note"><b>1차시 마무리</b> 1차시는 여기까지! 다음 시간에 이어서 해요.</p>' : '') +
      '<div class="sheet-end-row">' +
        '<p class="end-msg" id="endMsg">' + (all ? '이 장 학습지 완료!' : '아직 <b>' + left + '문항</b> 남았어요') + '</p>' +
        '<a class="end-go' + (all ? ' is-done' : '') + '" id="endGo" href="#' + esc(nextP.id) + '">' + label + '</a>' +
      '</div></div>';
  }
  function sheetHTML(c, idx) {
    if (!c.qs.length) return '';
    var n = c.qs.filter(answered).length;
    return '<section class="sheet" id="sheet" aria-label="' + esc(c.title) + ' 학습지"><header><p class="eyebrow">학습지</p><h2>' + esc(c.title) + '</h2><span class="cnt" id="cnt">' + n + ' / ' + c.qs.length + '</span></header>' +
      '<p class="warn" id="saveWarn"' + (saveOk ? ' hidden' : '') + '>이 기기에 답이 저장되지 않아요. 제출할 때까지 이 화면을 닫거나 새로고침하지 마세요.</p>' +
      (TEACHER ? '<p class="t-note">교사 모드예요. 기록이 남지 않아요. <button type="button" class="mini" id="btnAns" aria-pressed="' + showAns + '">' + (showAns ? '정답 숨기기' : '정답 보기') + '</button></p>' : '') +
      c.qs.map(function (q, i) { return qHTML(q, i + 1); }).join('') + nextEndHTML(c, idx) + '</section>';
  }

  /* ---------- 쪽 ---------- */
  function startHTML() {
    var row = function (c, k) { return '<li><a href="#' + c.id + '"><i>' + (k + 1) + '</i><b>' + esc(c.title) + '</b><small>' + esc(c.time) + (c.qs.length ? ' · 학습지 ' + c.qs.length + '문항' : '') + '</small></a></li>'; };
    return '<section class="hero"><p class="eyebrow">중학교 음악 · 우리 음악극</p><h1>판소리와 창극</h1>' +
      '<p class="lead">한 사람이 끌고 가는 이야기, 여럿이 나누어 맡는 이야기. 두 음악극을 듣고 견주어 봐요.</p>' +
      '<a class="go" href="#' + CH[0].id + '">수업 시작하기</a></section>' +
      '<section class="wrap two intro"><div><h2>오늘 배울 것</h2><ul class="goals"><li>판소리와 창극을 감상하고 특징을 비교할 수 있어요.</li><li>전통과 현대의 다양한 판소리를 감상하고, 국악의 문화적 가치를 알 수 있어요.</li></ul>' +
      '<p class="how">장마다 위쪽은 수업 화면, 아래쪽 밝은 종이는 학습지예요. 쓴 답은 이 기기에 저절로 저장되고, 영상은 이 화면 안에서 재생돼요.</p></div>' +
      '<div><h2>오늘의 순서</h2><p class="part">1차시</p><ol class="flow">' + CH.slice(0, SPLIT + 1).map(function (c, k) { return row(c, k); }).join('') + '</ol>' +
      '<p class="part">2차시</p><ol class="flow">' + CH.slice(SPLIT + 1).map(function (c, k) { return row(c, k + SPLIT + 1); }).join('') +
      '<li><a href="#submit"><i></i><b>제출하기</b><small>채점하고 선생님께 보내기</small></a></li></ol></div></section>' +
      (TEACHER ? '<p class="t-plan"><b>선생님 안내</b> <b>2차시(45분×2)</b> 기준이에요. 장 시간은 차시마다 40분이고 5분은 여유예요. 첫째 시간은 <b>' + esc(CH[SPLIT].title) + '</b> 장까지 하고, 둘째 시간은 사랑가 두 무대 비교로 시작해 정리·제출까지 마쳐요. 학생 답은 각자 기기에 남으므로 둘째 시간에도 같은 기기·같은 브라우저로 들어오게 해 주세요. 제출은 마지막에 한 번 해요. 수업 모드 버튼을 누르면 목차가 숨고 글자가 커져요.</p>' : '') +
      '<details class="more qr" id="qrBox"' + (TEACHER ? ' open' : '') + '><summary>학생용 QR 코드</summary><div class="qr-body"><div id="qrImg" aria-label="학생용 주소 QR 코드"></div><div><p>휴대폰·태블릿 카메라로 비추면 이 수업이 열려요. 학년·반·번호와 이름을 넣고 시작해요.</p><code>' + esc(SHARE_URL) + '</code></div></div></details>' +
      '<details class="more src"><summary>영상과 자료 출처</summary><ul>' + Object.keys(V).map(function (k) { return '<li>' + esc(V[k].title) + ' — ' + esc(V[k].by) + ' (YouTube)</li>'; }).join('') +
      '<li>내용: 중학교 음악 교과서 "판소리와 창극" 단원. 대목마다 붙인 장면 설명, 추임새의 예, 발림의 부채, 비교표의 일부 표현은 교과서에 없는 내용으로, 이 수업을 위해 덧붙였어요. 그림은 이 수업을 위해 새로 마련했어요(출처·라이선스: <a href="img/CREDITS.md" target="_blank" rel="noopener">img/CREDITS.md</a>).</li>' +
      '<li>다섯 마당 이야기(교과서 밖 내용): <a href="https://www.gugak.go.kr/ency/" target="_blank" rel="noopener">국립국악원 국악사전</a>, <a href="https://encykorea.aks.ac.kr/" target="_blank" rel="noopener">한국민족문화대백과사전</a>을 참고해 정리했어요.</li></ul></details>';
  }
  function chapterHTML(c, idx) {
    var artFile = c.art || ('head-' + c.id + '.webp');
    var hasQ = c.qs.length > 0;
    var n = hasQ ? c.qs.filter(answered).length : 0, all = hasQ && n === c.qs.length;
    var chip = hasQ ? '<a class="sheet-chip' + (all ? ' is-done' : '') + '" id="headChip" href="#' + esc(c.id) + '?sheet">이 장 학습지 <b id="headChipCnt">' + n + '/' + c.qs.length + '</b> · 학습지로 ↓</a>' : '';
    var head = '<section class="lesson"><header class="ch-head art" style="--art:url(img/' + esc(artFile) + ')"><p class="eyebrow">' + (idx + 1) + '장 · ' + esc(c.time) + ' · ' + part(idx) + '차시</p><h1>' + esc(c.title) + '</h1><p class="lead">' + esc(c.lead) + '</p>' + chip + '</header>' +
      build(c.lesson) + (hasQ ? '' : nextEndHTML(c, idx)) + '</section>';
    if (!hasQ) return head;
    return head +
      '<div class="bridge"><div class="bridge-card">' +
        '<div class="bridge-copy">' +
          '<p class="bridge-norm"><b>여기까지 함께 봤으면</b> 아래 종이 학습지에 답을 써요. ' + c.qs.length + '문항이고, 쓴 답은 이 기기에 저절로 저장돼요.</p>' +
          '<p class="bridge-cls"><b>수업 모드</b> 학생 학습지(' + c.qs.length + '문항)는 숨겨져 있어요. 함께 보려면 오른쪽 버튼을 눌러요.</p>' +
        '</div>' +
        '<div class="bridge-acts">' +
          '<a class="bridge-go" href="#' + esc(c.id) + '?sheet">학습지 쓰기 ↓</a>' +
          '<button type="button" class="mini cls" id="btnSheet" aria-pressed="' + sheetOn + '">' + (sheetOn ? '학습지 숨기기' : '학습지 함께 보기') + '</button>' +
        '</div>' +
      '</div></div>' + sheetHTML(c, idx);
  }
  function result() {
    var wrong = [], score = 0;
    GRADED.forEach(function (q) { if (correct(q)) score++; else if (answered(q)) wrong.push(q.label); });
    var answers = {}; ALLQ.forEach(function (q) { answers[q.label] = valText(q).slice(0, 400); });
    return { score: score, total: GRADED.length, wrong: wrong, answers: answers };
  }
  function submitHTML() {
    var left = ALLQ.filter(function (q) { return !answered(q); }), d = state.done;
    var changed = d && d.sig && d.sig !== answerSig();
    var rows = CH.map(function (c, k) {
      if (!c.qs.length) return '';
      var g = c.qs.filter(function (q) { return GRADED.indexOf(q) >= 0; }), n = c.qs.filter(answered).length;
      return '<li><a href="#' + c.id + '?sheet"><i>' + (k + 1) + '</i><b>' + esc(c.title) + '</b><span>' + n + ' / ' + c.qs.length + ' 씀' + (d && g.length ? ' · ' + g.filter(correct).length + ' / ' + g.length + ' 맞음' : '') + '</span></a></li>';
    }).join('');
    return '<section class="lesson"><header class="ch-head"><p class="eyebrow">마무리</p><h1>제출하기</h1></header>' +
      (d ? '<div class="score"><b>' + d.score + '</b><span>/ ' + d.total + '점</span><p>' + esc(d.msg || '') + '</p></div>' +
           (changed ? '<p class="warn"><b>제출한 뒤에 답을 고쳤어요.</b> 위 점수는 예전 답의 점수예요. 고친 답은 <b>다시 제출해야</b> 선생님께 전해져요.</p>' : '') +
           '<p class="lead">장마다 돌아가면 맞은 것과 정답을 볼 수 있어요. 고쳐서 다시 낼 수도 있어요.</p>'
         : '<p class="lead">고르기 문항은 바로 채점되고, 생각을 쓴 글은 선생님께 그대로 전해져요.</p>') +
      '<ul class="sum">' + rows + '</ul>' +
      (left.length ? '<p class="warn">아직 안 쓴 문항이 <b>' + left.length + '개</b> 있어요. 위 목록에서 장을 눌러 채워 봐요.</p>' : '<p class="fine">모든 문항을 썼어요.</p>') +
      '<button type="button" class="go" id="btnSubmit"' + (sending ? ' disabled' : '') + '>' + (sending ? '보내는 중…' : d ? '고친 답 다시 제출하기' : '채점하고 제출하기') + '</button></section>';
  }
  function doSubmit() {
    if (sending) return;
    var left = ALLQ.filter(function (q) { return !answered(q); }).length;
    if (left && !window.confirm('안 쓴 문항이 ' + left + '개 있어요. 그래도 제출할까요?')) return;
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
      var hasQ = !!(x.ch && x.ch.qs.length);
      var done = hasQ ? x.ch.qs.every(answered) : false, on = k === i;
      var h = '<a href="#' + x.id + '"' + (on ? ' class="on" aria-current="page"' : '') + '><i>' + (x.ch ? k : '') + '</i><span>' + esc(x.nav) + '</span>' + (done ? '<em class="dot" title="학습지 다 씀"></em>' : '') + '</a>';
      if (hasQ) {
        var n = x.ch.qs.filter(answered).length;
        h += '<a class="subl' + (on ? ' here' : '') + '" href="#' + x.id + '?sheet">학습지 <span>' + n + '/' + x.ch.qs.length + '</span></a>';
      }
      return h;
    };
    var grp = function (t, from, to) { var s = ''; for (var k = from; k <= to; k++) s += link(PAGES[k], k); return '<div class="grp"><p>' + t + '</p>' + s + '</div>'; };
    nav.innerHTML = link(PAGES[0], 0) + grp('1차시', 1, SPLIT + 1) + grp('2차시', SPLIT + 2, PAGES.length - 2) + link(PAGES[PAGES.length - 1], PAGES.length - 1);
  }
  function syncNextUI() {
    var i = cur(), p = PAGES[i], hasQ = !!(p.ch && p.ch.qs.length);
    var n = hasQ ? p.ch.qs.filter(answered).length : 0, total = hasQ ? p.ch.qs.length : 0;
    var all = hasQ && n === total, left = total - n;
    var nx = document.getElementById('next'), nextP = i < PAGES.length - 1 ? PAGES[i + 1] : null;
    if (nx) {
      nx.classList.toggle('is-ready', all);
      if (nextP) nx.setAttribute('aria-label', (i === PAGES.length - 2 ? '다음: 채점·제출하러 가기' : '다음: ' + nextP.nav) + (all ? ' (이 장 학습지 완료)' : ''));
      else nx.removeAttribute('aria-label');
    }
    var chip = document.getElementById('headChip'), chipCnt = document.getElementById('headChipCnt');
    if (chip) chip.classList.toggle('is-done', all);
    if (chipCnt) chipCnt.textContent = n + '/' + total;
    var end = document.getElementById('sheetEnd'), msg = document.getElementById('endMsg'), goBtn = document.getElementById('endGo');
    if (end) end.classList.toggle('is-done', all);
    if (msg) msg.innerHTML = all ? '이 장 학습지 완료!' : '아직 <b>' + left + '문항</b> 남았어요';
    if (goBtn) goBtn.classList.toggle('is-done', all);
  }
  function route(keep) {
    var i = cur(), p = PAGES[i];
    view.innerHTML = p.id === 'start' ? startHTML() : p.id === 'submit' ? submitHTML() : chapterHTML(p.ch, i - 1);
    navHTML(i);
    var pv = document.getElementById('prev'), nx = document.getElementById('next');
    pv.disabled = i === 0; nx.disabled = i === PAGES.length - 1;
    pv.querySelector('small').textContent = '이전';
    pv.querySelector('b').textContent = i ? PAGES[i - 1].nav : '';
    pv.setAttribute('aria-label', i ? '이전: ' + PAGES[i - 1].nav : '');
    nx.querySelector('small').textContent = '다음:';
    nx.querySelector('b').textContent = i < PAGES.length - 1 ? PAGES[i + 1].nav : '';
    document.getElementById('where').textContent = p.ch ? (i + ' / ' + CH.length + '장') : p.nav;
    document.getElementById('pgBar').style.width = (i / (PAGES.length - 1) * 100) + '%';
    document.title = (p.ch ? p.ch.title + ' · ' : '') + '판소리와 창극';
    syncNextUI();
    if (p.id === 'start') drawQR();
    lastPage = i;
    if (!keep) jump();
  }
  function setSheet(on) {
    sheetOn = on; body.classList.toggle('class-sheet', on);
    var bs = document.getElementById('btnSheet');
    if (bs) { bs.setAttribute('aria-pressed', String(on)); bs.textContent = on ? '학습지 숨기기' : '학습지 함께 보기'; }
  }
  function jump() {
    // 수업 모드에서 학습지를 숨긴 채 학습지 링크를 누르면 학습지를 펼친 뒤 이동해요
    if (hashParts().sub === 'sheet' && body.classList.contains('class-mode') && !sheetOn) setSheet(true);
    var s = hashParts().sub === 'sheet' && document.getElementById('sheet');
    if (s) s.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
  }
  function go(d) { var i = cur() + d; if (i >= 0 && i < PAGES.length) location.hash = PAGES[i].id; }
  window.addEventListener('hashchange', function () {
    closeSide();
    if (cur() === lastPage) { jump(); return; } // 같은 장 안에서 학습지로 이동할 때는 다시 그리지 않아요(영상·입력 유지)
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
    var i = cur(), p = PAGES[i]; if (!p.ch || !p.ch.qs.length) return;
    var n = p.ch.qs.filter(answered).length;
    var c = document.getElementById('cnt'); if (c) c.textContent = n + ' / ' + p.ch.qs.length;
    var sl = nav.querySelector('.subl.here span'); if (sl) sl.textContent = n + '/' + p.ch.qs.length;
    var a = nav.querySelector('a.on'); if (a) { var dot = a.querySelector('.dot'), all = n === p.ch.qs.length;
      if (all && !dot) a.insertAdjacentHTML('beforeend', '<em class="dot" title="학습지 다 씀"></em>'); else if (!all && dot) dot.remove(); }
    syncNextUI();
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
    var id = e.target.getAttribute && e.target.getAttribute('data-q'), q = id && QBY[id];
    if (q && marking() && q.ans !== undefined) {
      var box = document.getElementById('q-' + id), c = PAGES[cur()].ch;
      if (box && c) { var t = document.createElement('div'); t.innerHTML = qHTML(q, c.qs.indexOf(q) + 1); box.replaceWith(t.querySelector('.q')); }
    }
  });
  function stopVideos() {
    Array.prototype.forEach.call(document.querySelectorAll('.vid.playing'), function (f) {
      var fr = f.querySelector('iframe'); if (fr) fr.remove(); f.classList.remove('playing'); f.querySelector('.vid-play').hidden = false;
    });
  }
  function selectTab(t, focus) {
    stopVideos();
    var list = t.parentNode;
    Array.prototype.forEach.call(list.querySelectorAll('[role=tab]'), function (b) {
      var on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      var pn = document.getElementById(b.getAttribute('aria-controls')); if (pn) pn.hidden = !on;
    });
    if (focus) t.focus();
  }
  // 본문 안 링크가 지금 주소와 같으면(예: #story?sheet로 들어온 뒤 '학습지로') hashchange가 없으니 직접 이동해요
  view.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); jump(); }
  });
  view.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    if (t.getAttribute('role') === 'tab') { selectTab(t); return; }
    if (t.classList.contains('next-md') && t.hasAttribute('data-next')) { var nt = document.getElementById(t.getAttribute('data-next')); if (nt) { selectTab(nt, true); var tl = nt.closest('.tl'); if (tl) tl.scrollIntoView({ block: 'start' }); } return; }
    if (t.classList.contains('act-next')) {
      var sk = t.getAttribute('data-story'), list1 = storyList((DATA.STORIES || {})[sk]);
      if (list1.length) { storyShown[sk] = Math.min(list1.length, (storyShown[sk] || 1) + 1); updateActs(sk, 'next'); }
      return;
    }
    if (t.classList.contains('act-all')) {
      var sk2 = t.getAttribute('data-story'), list2 = storyList((DATA.STORIES || {})[sk2]);
      if (list2.length) { storyShown[sk2] = (storyShown[sk2] || 1) >= list2.length ? 1 : list2.length; updateActs(sk2, 'all'); }
      return;
    }
    if (t.id === 'btnSheet') { setSheet(!sheetOn); if (sheetOn) { var sh = document.getElementById('sheet'); if (sh) sh.scrollIntoView({ block: 'start' }); } return; }
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
    if (t.classList.contains('ord-btn')) {
      var oq = QBY[t.getAttribute('data-ord-q')];
      if (oq && oq.type === 'order') {
        var ov = t.getAttribute('data-ord-v'), curA = val(oq).slice(), pos = curA.indexOf(ov);
        if (pos >= 0) curA.splice(pos, 1); else curA.push(ov);
        state.a[oq.id] = curA;
        save(); refreshCount();
        var obox = document.getElementById('q-' + oq.id), oc = PAGES[cur()].ch;
        if (obox && oc) {
          var ot = document.createElement('div');
          ot.innerHTML = qHTML(oq, oc.qs.indexOf(oq) + 1);
          var nextQ = ot.querySelector('.q');
          if (nextQ) {
            obox.replaceWith(nextQ);
            var sameBtn = Array.prototype.filter.call(nextQ.querySelectorAll('.ord-btn'), function (b) { return b.getAttribute('data-ord-v') === ov; })[0];
            if (sameBtn) sameBtn.focus();
          }
        }
      }
      return;
    }
    if (t.classList.contains('ord-reset')) {
      var rq = QBY[t.getAttribute('data-ord-reset')];
      if (rq && rq.type === 'order') {
        state.a[rq.id] = [];
        save(); refreshCount();
        var rbox = document.getElementById('q-' + rq.id), rc = PAGES[cur()].ch;
        if (rbox && rc) {
          var rt = document.createElement('div');
          rt.innerHTML = qHTML(rq, rc.qs.indexOf(rq) + 1);
          var nextRQ = rt.querySelector('.q');
          if (nextRQ) {
            rbox.replaceWith(nextRQ);
            var firstBtn = nextRQ.querySelector('.ord-btn');
            if (firstBtn) firstBtn.focus();
          }
        }
      }
      return;
    }
    if (t.id === 'btnAns') { showAns = !showAns; route(true); var s = document.getElementById('sheet'); if (s) s.scrollIntoView({ block: 'start' }); return; }
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
  // 목차가 실제로 보이는지에 맞춰 키보드·스크린리더 접근과 aria-expanded를 맞춰요
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

  var btnClass = document.getElementById('btnClass'), classOn = false;
  function setClass(on) {
    classOn = on;
    closeSide();
    body.classList.toggle('class-mode', on); body.classList.toggle('side-closed', on);
    if (!on && sheetOn) setSheet(false);
    btnClass.textContent = on ? '수업 모드 끄기' : '수업 모드 켜기'; btnClass.setAttribute('aria-pressed', String(on));
    syncSide(); if (on) burger.focus();
    if (on) {
      fsBeforeClass = fs; setFs(Math.max(baseFs(), 24), true);
      try { if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(function () {}); } catch (e) {}
    } else {
      if (fsBeforeClass) setFs(fsBeforeClass, true); else { fs = 0; root.style.removeProperty('--fs'); }
      try { if (document.fullscreenElement) Promise.resolve(document.exitFullscreen()).catch(function () {}); } catch (e) {}
    }
  }
  btnClass.setAttribute('aria-pressed', 'false');
  btnClass.addEventListener('click', function () { setClass(!classOn); });
  document.getElementById('btnFull').addEventListener('click', function () {
    var fail = function () { toast('이 기기에서는 전체 화면을 쓸 수 없어요.'); };
    try { Promise.resolve(document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen()).catch(fail); } catch (e) { fail(); }
  });

  // 본문 바로가기: 주소(#view)를 바꾸면 첫 화면으로 가 버리니 초점만 옮겨요
  document.querySelector('.skip').addEventListener('click', function (e) { e.preventDefault(); view.focus(); });
  // 지금 주소와 같은 목차 링크를 다시 눌러도(예: 학습지) 그 자리로 이동하고 목차를 닫아요
  nav.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); closeSide(); jump(); }
  });
  syncSide();

  document.getElementById('prev').addEventListener('click', function () { go(-1); });
  document.getElementById('next').addEventListener('click', function () { go(1); });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((t && t.tagName) || '') || (t && t.getAttribute && t.getAttribute('role') === 'tab')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });

  route();
})();

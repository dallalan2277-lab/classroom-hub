/* 한국 대중음악사 수업 화면, 활동, 학습지. 학생 확인과 전송은 classroom.js가 맡아요. */
(function () {
  'use strict';

  const view = document.getElementById('view');
  const body = document.body;
  const root = document.documentElement;
  const classroom = window.Classroom;
  const TEACHER = Boolean(classroom && classroom.teacher);
  const DATA = window.KPOP_DATA;
  const TITLE = '한국 대중음악사 · 100년의 소리 여행';
  if (!DATA) {
    body.classList.add('lesson-pending');
    view.textContent = '수업 자료를 불러오지 못했어요. 페이지를 새로고침해 주세요.';
    return;
  }

  const { V, ART, SESSIONS, RULER, CAPSULE, GUESS = {}, CUES = {}, BALANCE, JUKEBOX, BOARD, INTRO_QUIZ, CHAPTERS } = DATA;
  const KEY = 'kpop-history-plus-v1';
  const FS_KEY = 'kpop-history-plus-fs';
  const SIDE_KEY = 'kpop-history-plus-side';
  const groups = [];
  const pages = CHAPTERS.map((chapter, index) => {
    if (index === 0 || chapter.split) groups.push([]);
    const page = { ...chapter, index, session: groups.length };
    groups[page.session - 1].push(page);
    return page;
  });
  pages.push({ id: 'submit', title: '제출하기', index: pages.length });
  const byPage = new Map(pages.map(page => [page.id, page]));
  const questions = CHAPTERS.flatMap(chapter => chapter.qs);
  const byQuestion = new Map(questions.map(q => [q.id, q]));
  const graded = questions.filter(q => q.type === 'radio');
  const schema = questions.map(q => q.id).join(',');
  const byId = id => document.getElementById(id);
  const nav = byId('nav');
  const ruler = byId('chronoRuler');
  const boardUI = new Map();

  let state = loadState();
  let saveOk = true;
  let toastTimer;
  let renderedPage;
  let pendingRadio = null;
  let activeVideo = null;
  let showAns = false;
  let sending = false;
  let classOn = false;
  let sheetOn = false;

  function freshState() {
    return { a: {}, done: null, qs: schema };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved?.a || typeof saved.a !== 'object' || Array.isArray(saved.a)) return freshState();
      if (saved.qs === schema) return saved;

      // 같은 번호를 다른 문항에 다시 썼으므로 두 차시판의 답은 따로 보관해요.
      const updated = freshState();
      updated.previousAnswers = saved.a;
      const oldIntro = saved.a['intro-late'];
      for (const [key, quiz] of Object.entries(INTRO_QUIZ)) {
        const picked = oldIntro?.[key]?.picked;
        if (quiz.opts.some(opt => V[opt].title === picked)) {
          updated.a['intro-' + key] = { picked, revealed: Boolean(oldIntro[key].checked) };
        }
      }
      return updated;
    } catch {
      return freshState();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      saveOk = true;
    } catch {
      if (saveOk) toast('이 기기에 답을 저장하지 못했어요. 제출할 때까지 화면을 열어 두세요.');
      saveOk = false;
    }
    const warning = byId('saveWarn');
    if (warning) warning.hidden = saveOk;
  }

  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
  }

  function toast(message) {
    const box = byId('toast');
    box.textContent = message;
    box.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('on'), 3600);
  }

  function pickedFrom(key, choices) {
    return choices.includes(state.a[key]) ? state.a[key] : '';
  }

  /* 감상 카드 */
  function videoCaption(clip, label, masked) {
    const mode = clip.mode === 'solo' ? '태블릿 · 각자 짧게' : '칠판 · 다 같이';
    return `<div class="vid-head"><b>${esc(label)}</b><span class="play-mode">${mode}</span></div>
      ${!masked && clip.by ? `<small>${esc(clip.by)}</small>` : ''}`;
  }

  function videoButton(clip, label, thumbnail) {
    const thumb = thumbnail ? `<img class="vid-thumb" src="https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg"
      alt="" loading="lazy" decoding="async">` : '';
    return `${thumb}<span class="play" aria-hidden="true"></span><span class="vid-mask">${esc(thumbnail ? label : '재생')}</span>`;
  }

  function videoHTML(clip, { label = clip.title, compact = false, masked = false } = {}) {
    const thumb = !compact && !masked;
    return `<figure class="vid${compact ? ' vid-inline' : ''}" data-yt="${clip.id}" data-start="${clip.start}" data-end="${clip.end}">
      <button class="vid-play${thumb ? ' has-thumb' : ''}" type="button" aria-label="${esc(label)} 재생">
        ${videoButton(clip, label, thumb)}
      </button>
      <div class="vid-slot" hidden></div>
      <figcaption class="vid-meta"><div class="vid-caption">${videoCaption(clip, label, masked)}</div>
        <button class="mini vid-stop" type="button" hidden>영상 닫기</button></figcaption>
    </figure>`;
  }

  function shortListen(clip, seconds = clip.end - clip.start, title = '') {
    const excerpt = { ...clip, mode: 'board', end: clip.start + seconds };
    return videoHTML(excerpt, {
      label: `${title ? title + ' · ' : ''}${seconds}초 소리 듣기`,
      compact: true,
      masked: true
    });
  }

  function stopVideos(container = view) {
    if (!activeVideo || !container.contains(activeVideo)) return;
    const slot = activeVideo.querySelector('.vid-slot');
    slot.replaceChildren();
    slot.hidden = true;
    activeVideo.querySelector('.vid-play').hidden = false;
    activeVideo.querySelector('.vid-stop').hidden = true;
    activeVideo.classList.remove('playing');
    activeVideo.closest('.jukebox')?.classList.remove('is-playing');
    activeVideo = null;
  }

  function playVideo(button) {
    stopVideos();
    const card = button.closest('.vid');
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + card.dataset.yt +
      '?autoplay=1&controls=1&rel=0&playsinline=1&start=' + card.dataset.start + '&end=' + card.dataset.end;
    frame.title = card.querySelector('figcaption b').textContent;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    const slot = card.querySelector('.vid-slot');
    slot.append(frame);
    slot.hidden = false;
    const hadFocus = document.activeElement === button;
    button.hidden = true;
    card.classList.add('playing');
    card.closest('.jukebox')?.classList.add('is-playing');
    const stop = card.querySelector('.vid-stop');
    stop.hidden = false;
    activeVideo = card;
    if (hadFocus) stop.focus({ preventScroll: true });
  }

  function artHTML(key) {
    const art = ART[key];
    return `<div class="scene-art${art.w === 1200 ? ' art-four-three' : ''}" hidden>
      <img class="art-img" src="img/${art.file}" width="${art.w}" height="${art.h}" alt="${esc(art.alt)}" decoding="async">
    </div>`;
  }

  function timestamp(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }

  function tvHTML(page) {
    if (page.tvStartSec === undefined) return '';
    const start = page.tvStartSec;
    const end = page.tvEndSec;
    const link = TEACHER ? `<a class="tv-link" href="https://youtu.be/${V.main}?t=${start}" target="_blank" rel="noopener">원본 영상 이 구간 열기</a>` : '';
    return `<section class="tv-cue-card" aria-label="칠판 TV 구간">
      <div><p class="eyebrow">칠판 · TV</p>
        <div class="tv-time"><time datetime="PT${start}S">${timestamp(start)}</time> <span>–</span>
          <time datetime="PT${end}S">${timestamp(end)}</time></div>
      </div>
      <div class="tv-copy">
        <p>${esc(page.tvPoint)}</p>
        <p class="tv-next">${page.tvOnly ? '멈춘 뒤 → 아래 활동 하기' : '멈춘 뒤 → 아래 곡 듣기'}</p>
        ${link}
      </div>
    </section>
    <p class="tablet-rule">여기서부터 태블릿</p>`;
  }

  function recapHTML(keys) {
    const clips = keys.map((key, i) => shortListen(V[key], 10, '소리 ' + (i + 1))).join('');
    return `<section class="recap">
      <h2>소리로 떠올리기</h2>
      <p>세 소리를 차례로 듣고 지난 시간에 만난 노래를 말해 봐요.</p>
      <div class="listen-grid">${clips}</div>
    </section>`;
  }

  /* 짐작→공개 카드 */
  function guessState(key) {
    const g = GUESS[key];
    const raw = state.a['guess-' + key];
    const picked = typeof raw === 'string' && g.opts.includes(raw) ? raw : '';
    return { picked, opened: Boolean(state.a['guess-' + key + '-open'] && (picked || TEACHER)) };
  }

  function guessResult(key, { picked, opened }) {
    if (!opened) return '';
    const g = GUESS[key];
    const tone = picked ? (picked === g.ans ? 'ok' : 'no') : 'key';
    const head = picked ? (picked === g.ans ? `정답 ${g.ans}` : `정답은 ${g.ans}이에요`) : `정답 ${g.ans}`;
    return `<p class="intro-feedback ${tone}"><b>${esc(head)}</b><span>${esc(g.reveal)}</span></p>`;
  }

  function guessHTML(key) {
    const g = GUESS[key];
    if (!g) return '';
    const st = guessState(key);
    const ready = Boolean(st.picked || TEACHER);
    const steps = g.steps || (g.clip ? '1 듣기 → 2 고르기 → 3 공개' : '1 고르기 → 2 공개');
    return `<section class="guess-reveal-card guess-card" data-guess="${esc(key)}" aria-labelledby="guess-${esc(key)}">
      <p class="flow-steps">${steps}</p>
      ${g.clip ? shortListen(V[g.clip], g.seconds || 10) : ''}
      <h2 id="guess-${esc(key)}" class="guess-prompt">${esc(g.prompt)}</h2>
      <div class="chip-row guess-options" role="group" aria-labelledby="guess-${esc(key)}">
        ${g.opts.map(opt => {
          const isAns = st.opened && opt === g.ans;
          return `<button type="button" class="chip guess-opt${isAns ? ' is-answer' : ''}"
            data-opt="${esc(opt)}" aria-pressed="${st.picked === opt}">${esc(opt)}</button>`;
        }).join('')}
      </div>
      <div class="guess-actions">
        <button type="button" class="mini guess-reveal${ready ? ' is-ready' : ''}"${ready ? '' : ' disabled'}>공개</button>
        <small class="reveal-hint"${ready ? ' hidden' : ''}>먼저 하나를 골라요.</small>
      </div>
      <div class="guess-result" role="status">${guessResult(key, st)}</div>
    </section>`;
  }

  function updateGuess(button) {
    const card = button.closest('[data-guess]');
    const key = card.dataset.guess;
    const g = GUESS[key];
    const st = guessState(key);
    if (button.dataset.opt !== undefined) {
      st.picked = button.dataset.opt;
    } else {
      if (!st.picked && !TEACHER) return;
      st.opened = true;
    }
    state.a['guess-' + key] = st.picked;
    state.a['guess-' + key + '-open'] = st.opened;
    save();
    for (const opt of card.querySelectorAll('.guess-opt')) {
      opt.setAttribute('aria-pressed', String(st.picked === opt.dataset.opt));
      opt.classList.toggle('is-answer', st.opened && opt.dataset.opt === g.ans);
    }
    const ready = Boolean(st.picked || TEACHER);
    const rev = card.querySelector('.guess-reveal');
    rev.disabled = !ready;
    rev.classList.toggle('is-ready', ready);
    card.querySelector('.reveal-hint').hidden = ready;
    card.querySelector('.guess-result').innerHTML = guessResult(key, st);
  }

  /* 타임캡슐, 밸런스, 단서, 주크박스 */
  function capsuleHTML(key) {
    const capsule = CAPSULE[key];
    const picked = pickedFrom(key, capsule.opts);
    return `<section class="capsule-box" aria-labelledby="cap-${key}" data-choice="${key}">
      <p class="eyebrow">오늘의 질문 · 타임캡슐</p>
      <h2 id="cap-${key}">${esc(capsule.question)}</h2>
      <div class="chip-row" role="group" aria-labelledby="cap-${key}">
        ${capsule.opts.map(option => `<button class="chip cap-btn" type="button" data-option="${esc(option)}"
          aria-pressed="${option === picked}">${esc(option)}</button>`).join('')}
      </div>
      <p class="cap-status" role="status"${picked ? '' : ' hidden'}>첫 생각을 담았어요.</p>
    </section>`;
  }

  function capsuleRecallHTML(key) {
    const capsule = CAPSULE[key];
    const entries = [key, ...[].concat(capsule.alsoRecall || [])].filter(Boolean).map(id => {
      const entry = CAPSULE[id];
      const picked = pickedFrom(id, entry.opts);
      return `<div class="recall-entry"><dt>${esc(entry.question)}</dt>
        <dd>${picked ? esc(picked) : `<a href="#${entry.chapter}">첫 질문 다시 보기 →</a>`}</dd></div>`;
    }).join('');
    return `<section class="capsule-recall" aria-labelledby="recall-${key}">
      <h2 id="recall-${key}">${esc(capsule.recallTitle)}</h2>
      <dl>${entries}</dl><p>${esc(capsule.recallPrompt)}</p>
    </section>`;
  }

  function balanceHTML(key) {
    const balance = BALANCE[key];
    const picked = pickedFrom(key, balance.choices.map(([label]) => label));
    return `<section class="balance-box" data-choice="${key}" aria-labelledby="balance-${key}">
      <p class="eyebrow">밸런스 투표</p><h2 id="balance-${key}">${esc(balance.prompt)}</h2>
      <div class="bal-grid" role="group" aria-labelledby="balance-${key}">
        ${balance.choices.map(([label, detail]) => `<button type="button" class="chip bal-btn"
          data-option="${esc(label)}" aria-pressed="${label === picked}">
          <span><b>${esc(label)}</b><small>${esc(detail)}</small></span></button>`).join('')}
      </div>
      <p class="talk"><b>짝 이야기 30초</b> ${esc(balance.talk)}</p>
    </section>`;
  }

  function pickActivity(button) {
    const box = button.closest('[data-choice]');
    state.a[box.dataset.choice] = button.dataset.option;
    box.querySelectorAll('[data-option]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    const status = box.querySelector('.cap-status');
    if (status) status.hidden = false;
    save();
    refreshReflectContext();
  }

  function cueItem(item) {
    return Array.isArray(item) ? { text: item[0], ok: Boolean(item[1]) } : item;
  }

  function getCueState(key, c) {
    const raw = state.a['cue-' + key];
    if (c.type === 'counter') {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return { count: Math.max(0, Number(raw.count) || 0), locked: Boolean(raw.locked) };
      }
      return { count: 0, locked: false };
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return { picked: Array.isArray(raw.picked) ? raw.picked.slice() : [], checked: Boolean(raw.checked) };
    }
    return { picked: [], checked: false };
  }

  function cueInnerHTML(key) {
    const c = CUES[key];
    if (!c) return '';
    const st = getCueState(key, c);
    if (c.type === 'counter') {
      const unit = c.unit || '번';
      return `<p class="cue-title"><b>귀로 세기</b> ${esc(c.title)}</p>
        <div class="cue-counter-row">
          <button type="button" class="cue-tap" data-cue-tap="${esc(key)}"${st.locked ? ' disabled' : ''}>${esc(c.btnLabel)}</button>
          <div class="cue-readout" aria-live="polite"><b>${st.count}</b><span>${esc(unit)}</span></div>
          <div class="cue-counter-sub">
            <button type="button" class="mini cue-minus" data-cue-minus="${esc(key)}" aria-label="1 빼기"${st.locked || st.count === 0 ? ' disabled' : ''}>−1</button>
            <button type="button" class="mini cue-reset" data-cue-reset="${esc(key)}">초기화</button>
            <button type="button" class="mini cls cue-lock" data-cue-lock="${esc(key)}" aria-pressed="${st.locked}">${st.locked ? '다시 세기' : '기록 확정'}</button>
          </div>
        </div>
        <p class="cue-fb${st.locked ? ' ok' : ''}">${st.locked ? `내 기록 ${st.count}${esc(unit)} 확정! ${esc(c.compare)}` : esc(c.compare)}</p>`;
    }
    const items = (c.items || []).map(cueItem);
    const totalRight = items.filter(it => it.ok).length;
    let rightPicked = 0;
    let wrongPicked = 0;
    for (const idx of st.picked) {
      if (items[idx]?.ok) rightPicked++;
      else if (items[idx]) wrongPicked++;
    }
    let fbHTML = '';
    if (st.checked) {
      if (rightPicked === totalRight && wrongPicked === 0) {
        fbHTML = `<p class="cue-fb ok" role="status" aria-live="polite">소리 탐정 성공! 진짜 단서 ${totalRight}개를 정확히 찾아냈어요.</p>`;
      } else if (wrongPicked > 0) {
        fbHTML = `<p class="cue-fb no" role="status" aria-live="polite">함정 단서 ${wrongPicked}개가 섞여 있어요! 빨간 칩을 해제하고 다시 귀 기울여 봐요.</p>`;
      } else if (rightPicked === 0) {
        fbHTML = '<p class="cue-fb no" role="status" aria-live="polite">영상을 들으며 진짜라고 생각되는 단서 2개를 먼저 눌러 봐요.</p>';
      } else {
        fbHTML = `<p class="cue-fb warn" role="status" aria-live="polite">지금 고른 단서는 맞아요! 진짜 단서가 ${totalRight - rightPicked}개 더 있어요.</p>`;
      }
    }
    return `<p class="cue-title"><b>소리 탐정</b> ${esc(c.title)}</p>
      <div class="cue-chips">
        ${items.map((item, idx) => {
          const on = st.picked.includes(idx);
          let extraCls = '';
          let mark = '';
          if (st.checked && on) {
            if (item.ok) { extraCls = ' is-ok'; mark = '<em class="cue-tag">진짜</em>'; }
            else { extraCls = ' is-trap'; mark = '<em class="cue-tag">함정</em>'; }
          }
          return `<button type="button" class="chip cue-chip${extraCls}" data-cue-key="${esc(key)}" data-cue-idx="${idx}"
            aria-pressed="${on}"><span>${esc(item.text)}</span>${mark}</button>`;
        }).join('')}
      </div>
      <div class="cue-acts"><span class="cue-picked-cnt">선택 ${st.picked.length} / ${totalRight}</span>
        <button type="button" class="mini cls cue-check" data-cue-check="${esc(key)}">단서 검증하기</button>
      </div>${fbHTML}`;
  }

  function cueBoxHTML(key) {
    const c = CUES[key];
    if (!c) return '';
    return `<div class="listen-cue cue-box cue-${esc(c.type || 'detective')}" data-cue="${esc(key)}" role="group" aria-label="${esc(c.title)}">${cueInnerHTML(key)}</div>`;
  }

  function refreshCue(key) {
    const box = view.querySelector(`[data-cue="${key}"]`);
    if (box) box.innerHTML = cueInnerHTML(key);
  }

  function toggleCueChip(button) {
    const key = button.dataset.cueKey;
    const idx = Number(button.dataset.cueIdx);
    const c = CUES[key];
    if (!c) return;
    const st = getCueState(key, c);
    const pos = st.picked.indexOf(idx);
    if (pos >= 0) st.picked.splice(pos, 1);
    else st.picked.push(idx);
    st.checked = false;
    state.a['cue-' + key] = st;
    save();
    refreshCue(key);
  }

  function checkCueBox(key) {
    const c = CUES[key];
    if (!c) return;
    const st = getCueState(key, c);
    st.checked = true;
    state.a['cue-' + key] = st;
    save();
    refreshCue(key);
  }

  function updateCounterCue(key, action) {
    const c = CUES[key];
    if (!c) return;
    const st = getCueState(key, c);
    if (action === 'tap' && !st.locked) st.count++;
    else if (action === 'minus' && !st.locked) st.count = Math.max(0, st.count - 1);
    else if (action === 'reset') { st.count = 0; st.locked = false; }
    else if (action === 'lock') st.locked = !st.locked;
    state.a['cue-' + key] = st;
    save();
    refreshCue(key);
    if (action === 'tap') {
      const num = view.querySelector(`[data-cue="${key}"] .cue-readout b`);
      if (num) { num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); }
    }
  }

  function cueHTML(cues) {
    return `<div class="listen-cue">
      <p><b>소리 탐정</b> 무대에서 들리거나 보이는 단서를 두 개 골라요.</p>
      <div class="chip-row" role="group" aria-label="듣고 본 단서">
        ${cues.map((cue, index) => `<button type="button" class="chip cue-chip" data-cue="${index}"
          aria-pressed="false">${esc(cue.text)}</button>`).join('')}
      </div>
      <button type="button" class="mini cue-check" disabled>단서 검증하기</button>
      <div class="cue-feedback" role="status"></div>
    </div>`;
  }

  function updateCue(button) {
    const box = button.closest('.listen-cue');
    const feedback = box.querySelector('.cue-feedback');
    const chips = [...box.querySelectorAll('.cue-chip')];
    const selected = chips.filter(chip => chip.getAttribute('aria-pressed') === 'true');
    if (button.classList.contains('cue-chip')) {
      const wasPicked = selected.includes(button);
      if (selected.length === 2 && !wasPicked) {
        feedback.textContent = '다른 단서를 고르려면 먼저 하나를 눌러 해제해요.';
        return;
      }
      button.setAttribute('aria-pressed', String(!wasPicked));
      box.querySelector('.cue-check').disabled = selected.length + (wasPicked ? -1 : 1) !== 2;
      feedback.textContent = '';
      return;
    }
    const cues = JUKEBOX[box.closest('[data-jukebox]').dataset.jukebox].cues;
    feedback.innerHTML = selected.map(chip => {
      const cue = cues[Number(chip.dataset.cue)];
      return `<p><b class="${cue.ok ? 'ok' : 'no'}">${cue.ok ? '진짜' : '함정'}</b> ${esc(cue.text)}</p>`;
    }).join('');
  }

  function machineHTML(box) {
    if (!box.skin) return '';
    const side = box.side ? `<span class="m-side">${esc(box.side)}면</span>` : '';
    return `<div class="machine m-${esc(box.skin)}" aria-hidden="true"><img src="img/machine-${esc(box.skin)}.webp" alt=""
      width="800" height="600" decoding="async">${side}</div>`;
  }

  function trackHTML(key, index, page) {
    const { tracks, cues, toSheet } = JUKEBOX[key];
    const [song, , note] = tracks[index];
    const next = tracks[index + 1];
    const action = next ? `<button class="mini juke-next" type="button" data-track="${index + 1}">다음 곡 ${esc(V[next[0]].title)} →</button>` :
      (toSheet ? `<a class="mini juke-sheet" href="#${page.id}?sheet">학습지로 →</a>` : '');
    return `<p class="track-note">${esc(note)}</p>${videoHTML(V[song])}
      ${cues && index === 0 ? cueHTML(cues) : ''}
      ${action ? `<div class="tab-end">${action}</div>` : ''}`;
  }

  function jukeboxHTML(key, page) {
    const box = JUKEBOX[key];
    const pickedVote = box.vote ? pickedFrom('vote-' + key, box.tracks.map(([song]) => V[song].title)) : '';
    const voteHTML = box.vote ? `<div class="juke-vote" data-choice="vote-${esc(key)}">
      <p class="juke-vote-title">듣고 싶은 곡 하나 고르기</p>
      <div class="chip-row juke-vote-row" role="group" aria-label="듣고 싶은 곡 하나 고르기">
        ${box.tracks.map(([song]) => {
          const title = V[song].title;
          return `<button type="button" class="chip juke-vote-btn" data-option="${esc(title)}"
            aria-pressed="${title === pickedVote}">${esc(title)}</button>`;
        }).join('')}
      </div>
      <p class="juke-vote-note">고른 뒤 손을 들어요. 가장 많이 고른 두 곡을 칠판에서 들어요.</p>
    </div>` : '';
    const headHTML = box.skin ? `<div class="juke-head">${machineHTML(box)}
      <div>${box.eraLabel ? `<p class="eyebrow era-label">${esc(box.eraLabel)}</p>` : ''}<h3 id="jukebox-${key}">${esc(box.title)}</h3></div>
    </div>` : `<h3 id="jukebox-${key}">${esc(box.title)}</h3>`;
    const multi = box.tracks.length > 1;
    const tabsHTML = multi ? `<div class="juke-tabs" role="tablist" aria-labelledby="jukebox-${key}">
        ${box.tracks.map(([song, by], i) => `<button class="chip juke-tab" type="button" role="tab" id="${key}-tab-${i}"
          data-track="${i}" aria-controls="${key}-panel" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">
          ${esc(by ? by + ' ' + V[song].title : V[song].title)}</button>`).join('')}
      </div>
      <div class="juke-panel" role="tabpanel" tabindex="0" id="${key}-panel" aria-labelledby="${key}-tab-0">
        ${trackHTML(key, 0, page)}
      </div>` : `<div class="juke-panel" id="${key}-panel">
        ${trackHTML(key, 0, page)}
      </div>`;
    return `<section class="jukebox${box.skin ? ' skin-' + esc(box.skin) : ''}" data-jukebox="${key}" aria-labelledby="jukebox-${key}">
      ${headHTML}
      ${voteHTML}
      ${tabsHTML}
    </section>`;
  }

  function selectTrack(box, index) {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const tab = tabs[index];
    if (!tab) return;
    if (tab.getAttribute('aria-selected') !== 'true') {
      stopVideos();
      for (const other of tabs) {
        other.setAttribute('aria-selected', String(other === tab));
        other.tabIndex = other === tab ? 0 : -1;
      }
      const key = box.dataset.jukebox;
      const panel = box.querySelector('.juke-panel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.innerHTML = trackHTML(key, index, renderedPage);
    }
    tab.focus({ preventScroll: true });
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  /* 인트로 퀴즈 */
  function introState(key) {
    const record = state.a['intro-' + key];
    const picked = INTRO_QUIZ[key].opts.some(song => V[song].title === record?.picked) ? record.picked : '';
    return { picked, revealed: Boolean(record?.revealed && (picked || TEACHER)) };
  }

  function introResult(key, { picked, revealed }) {
    if (!revealed) return '';
    const answer = V[key].title;
    const tone = picked ? (picked === answer ? 'ok' : 'no') : 'key';
    return `<p class="intro-feedback ${tone}"><b>정답 ${esc(answer)}</b>
      <span>${esc(INTRO_QUIZ[key].fact)}</span></p>`;
  }

  function introHTML(keys) {
    return `<section class="intro-quiz">
      <h2>인트로 퀴즈</h2>
      <div class="intro-cards${keys.length > 1 ? ' intro-pair' : ''}">
        ${keys.map((key, index) => {
          const clip = V[key];
          const record = introState(key);
          const ready = Boolean(record.picked || TEACHER);
          const num = keys.length > 1 ? `${index + 1}번 곡` : '';
          const label = record.revealed ? clip.title : `${num ? num + ' · ' : ''}12초 소리 듣기`;
          return `<article class="guess-reveal-card intro-card" data-intro="${key}" data-revealed="${record.revealed}"
            aria-label="인트로 퀴즈 ${index + 1}">
            <p class="flow-steps">1 듣기 → 2 고르기 → 3 공개</p>
            ${TEACHER
              ? videoHTML(clip, { label, compact: !record.revealed, masked: !record.revealed })
              : `<p class="intro-listen"><span class="play-mode">칠판 · 다 같이</span>${num ? `<b>${num}</b>` : ''}
                  선생님이 들려주는 ${clip.end - clip.start}초를 듣고 곡 이름을 골라요.</p>`}
            <div class="chip-row intro-options" role="group" aria-label="곡 이름 고르기">
              ${INTRO_QUIZ[key].opts.map(song => `<button class="chip intro-opt" type="button" data-song="${song}"
                aria-pressed="${record.picked === V[song].title}">${esc(V[song].title)}</button>`).join('')}
            </div>
            <div class="intro-actions">
              <button class="mini intro-check${ready ? ' is-ready' : ''}" type="button"${ready ? '' : ' disabled'}>정답 공개</button>
              <small class="reveal-hint"${ready ? ' hidden' : ''}>먼저 곡 이름을 골라요.</small>
            </div>
            <div class="intro-result" role="status">${introResult(key, record)}</div>
          </article>`;
        }).join('')}
      </div>
    </section>`;
  }

  function updateIntro(button) {
    const card = button.closest('[data-intro]');
    const key = card.dataset.intro;
    const record = introState(key);
    if (button.dataset.song) {
      record.picked = V[button.dataset.song].title;
    } else {
      if (!record.picked && !TEACHER) return;
      record.revealed = true;
    }
    state.a['intro-' + key] = record;
    save();

    for (const opt of card.querySelectorAll('.intro-opt')) {
      opt.setAttribute('aria-pressed', String(record.picked === V[opt.dataset.song].title));
    }
    const ready = Boolean(record.picked || TEACHER);
    const reveal = card.querySelector('.intro-check');
    reveal.disabled = !ready;
    reveal.classList.toggle('is-ready', ready);
    card.querySelector('.reveal-hint').hidden = ready;
    card.querySelector('.intro-result').innerHTML = introResult(key, record);
    const figure = card.querySelector('.vid');
    if (record.revealed && card.dataset.revealed === 'false' && !figure) card.dataset.revealed = 'true';
    if (record.revealed && card.dataset.revealed === 'false') {
      const clip = V[key];
      const play = figure.querySelector('.vid-play');
      play.classList.add('has-thumb');
      play.innerHTML = videoButton(clip, clip.title, true);
      play.setAttribute('aria-label', clip.title + ' 재생');
      figure.classList.remove('vid-inline');
      figure.querySelector('.vid-caption').innerHTML = videoCaption(clip, clip.title, false);
      card.dataset.revealed = 'true';
    }
  }

  /* 줄자 정리판 */
  function finishedPins(key) {
    const saved = state.a[key];
    return BOARD[key].pins.filter(pin => Array.isArray(saved) && saved.includes(pin.song));
  }

  function splitPinLabel(label) {
    const idx = label.indexOf(' · ');
    if (idx < 0) return { head: label, sub: '' };
    return { head: label.slice(0, idx), sub: label.slice(idx + 3) };
  }

  function subjectParticle(n) {
    return [1, 3, 6, 7, 8, 10].includes(n) ? '이' : '가';
  }

  function boardState(key) {
    const board = BOARD[key];
    const { pins } = board;
    const order = board.order || pins.map(pin => pin.song);
    const bySong = new Map(pins.map(pin => [pin.song, pin]));
    const done = new Set(finishedPins(key).map(pin => pin.song));
    const nextSong = order.find(song => !done.has(song)) || null;
    const target = nextSong ? bySong.get(nextSong) : null;
    const ui = boardUI.get(key) || {};
    const solvedPin = target && ui.solvedSong && done.has(ui.solvedSong) ? bySong.get(ui.solvedSong) : null;
    const phase = !target ? 'complete' : (solvedPin ? 'solved' : 'playing');
    const currentIndex = target ? order.indexOf(target.song) : order.length;
    const solvedIndex = solvedPin ? order.indexOf(solvedPin.song) : -1;
    const inspectPin = !target && ui.inspectSong && bySong.has(ui.inspectSong) ? bySong.get(ui.inspectSong) : null;
    const wrongSong = phase === 'playing' ? (ui.wrongSong || null) : null;
    const justCompleted = Boolean(!target && ui.justCompleted);
    return { board, order, pins, bySong, done, target, solvedPin, phase, currentIndex, solvedIndex, inspectPin, wrongSong, justCompleted };
  }

  function boardGuideText(st) {
    return st.phase === 'complete'
      ? '모든 곡을 줄자에 이었어요. 핀을 눌러 다시 들어 봐요.'
      : '소리를 듣고 어울리는 핀을 맞히면 다음 곡이 열려요.';
  }

  function boardStepsHTML(st) {
    return `<ol class="map-steps" data-count="${st.order.length}" aria-label="곡 차례">
      ${st.order.map((song, idx) => {
        const num = idx + 1;
        const pin = st.bySong.get(song);
        const { head } = splitPinLabel(pin.label);
        if (st.done.has(song)) {
          const isRecent = st.phase === 'solved' && idx === st.solvedIndex;
          const isInspecting = st.phase === 'complete' && st.inspectPin?.song === song;
          const content = `<span class="map-step-top"><b>✓ 곡 ${num}</b><em>맞힘</em></span>
            <span class="map-step-val">${esc(head)}</span>`;
          if (st.phase === 'complete') {
            return `<li class="map-step${isRecent ? ' is-recent' : ''}${isInspecting ? ' is-inspecting' : ''}" data-state="done">
              <button type="button" class="map-step-btn map-step-inspect" data-pin="${esc(song)}"
                aria-pressed="${isInspecting}" aria-label="곡 ${num} · ${esc(pin.label)} 다시 듣기">${content}</button>
            </li>`;
          }
          return `<li class="map-step${isRecent ? ' is-recent' : ''}" data-state="done">${content}</li>`;
        }
        if (st.phase === 'playing' && idx === st.currentIndex) {
          return `<li class="map-step" data-state="current" aria-current="step">
            <span class="map-step-top"><b>곡 ${num}</b><em>지금</em></span>
            <span class="map-step-val">듣고 고르기</span>
          </li>`;
        }
        if (st.phase === 'solved' && idx === st.currentIndex) {
          return `<li class="map-step" data-state="ready">
            <button type="button" class="map-step-btn map-next-btn" aria-label="곡 ${num} 열기">
              <span class="map-step-top"><b>곡 ${num}</b><em>열림</em></span>
              <span class="map-step-val">눌러서 듣기 →</span>
            </button>
          </li>`;
        }
        return `<li class="map-step" data-state="locked">
          <span class="map-step-top"><b>곡 ${num}</b><em>잠김</em></span>
          <span class="map-step-val">맞히면 열림</span>
        </li>`;
      }).join('')}
    </ol>`;
  }

  function boardTask(key, st) {
    const total = st.order.length;
    if (st.phase === 'complete') {
      const pin = st.inspectPin;
      const clip = pin ? V[pin.song] : null;
      return `<div class="map-card-top">
          <span class="map-song-badge is-ok">${total}곡 모두 완료</span>
          ${st.justCompleted ? '<span class="map-pin-tag">마지막 곡까지 줄자에 붙었어요</span>' : ''}
        </div>
        <h3 tabindex="-1" class="map-task-title">${total}곡을 모두 줄자에 이었어요.</h3>
        <p class="map-complete-note">아래 줄자에서 핀을 누르면 그 노래를 다시 들을 수 있어요.</p>
        ${pin ? `<div class="map-inspect">
          <p class="map-inspect-era">${esc(pin.label)}</p>
          <div class="map-inspect-head"><b>${esc(clip.title)}</b>${clip.by ? ` <small class="map-by">${esc(clip.by)}</small>` : ''}</div>
          <p class="map-inspect-detail">${esc(pin.detail)}</p>
          ${shortListen(clip, 10, clip.title)}
        </div>` : ''}`;
    }
    if (st.phase === 'solved') {
      const num = st.solvedIndex + 1;
      const nextNum = st.currentIndex + 1;
      const clip = V[st.solvedPin.song];
      return `<div class="map-card-top">
          <span class="map-song-badge is-ok">곡 ${num} 맞혔어요</span>
          <span class="map-pin-tag">${esc(st.solvedPin.label)}</span>
        </div>
        <h3 tabindex="-1" class="map-task-title map-solved-title">${esc(clip.title)}${clip.by ? ` <small class="map-by">${esc(clip.by)}</small>` : ''}</h3>
        <p class="map-solved-detail">${esc(st.solvedPin.detail)}</p>
        <div class="map-next-bar">
          <p class="map-unlock-note">줄자 제자리에 핀이 붙고 <b>곡 ${nextNum}</b>${subjectParticle(nextNum)} 열렸어요.</p>
          <button type="button" class="go map-next-btn">곡 ${nextNum} 듣기 →</button>
        </div>`;
    }
    const num = st.currentIndex + 1;
    const pinKind = key === 'p2' ? '무대 핀' : '시대 핀';
    return `<div class="map-card-top">
        <span class="map-song-badge">곡 ${num} / ${total}</span>
        <p class="flow-steps">1 듣기 → 2 아래 줄자에서 핀 고르기</p>
      </div>
      <h3 tabindex="-1" class="map-task-title">곡 ${num} 소리를 듣고, 아래 줄자에서 어울리는 ${pinKind}을 골라요.</h3>
      <div class="map-listen-slot">${shortListen(V[st.target.song], 10, '곡 ' + num)}</div>`;
  }

  function boardRulerLabel(st) {
    if (st.phase === 'complete') return '완성된 줄자 · 핀을 눌러 다시 듣기';
    if (st.phase === 'solved') return '줄자 현황 · 방금 맞힌 핀이 제자리에 붙었어요';
    return '2단계 · 아래 줄자에서 어울리는 핀을 눌러요';
  }

  function boardPinsHTML(key, st) {
    return `<div class="map-stage" style="--pin-count:${st.pins.length}">
      ${st.pins.map(pin => {
        const isDone = st.done.has(pin.song);
        const isInspecting = st.phase === 'complete' && st.inspectPin?.song === pin.song;
        const isRecent = st.phase === 'solved' && st.solvedPin?.song === pin.song;
        const isWrong = st.phase === 'playing' && st.wrongSong === pin.song;
        const isPausedOther = st.phase === 'solved' && !isDone;
        const { head, sub } = splitPinLabel(pin.label);
        const classes = ['map-pin'];
        if (isRecent) classes.push('is-recent');
        if (isWrong) classes.push('is-wrong');
        return `<button class="${classes.join(' ')}" type="button" data-pin="${esc(pin.song)}"
          data-done="${isDone}"${isPausedOther ? ' data-paused="true"' : ''} aria-pressed="${isInspecting}">
          <span class="map-pin-era">${esc(head)}</span>
          ${sub ? `<span class="map-pin-sub">${esc(sub)}</span>` : ''}
          ${isDone ? `<span class="map-pin-song">✓ ${esc(V[pin.song].title)}</span>` :
            `<span class="map-pin-slot" aria-hidden="true">${isPausedOther ? '다음 곡 대기' : '이 핀 고르기'}</span>`}
        </button>`;
      }).join('')}
    </div>`;
  }

  function boardHTML(key) {
    const st = boardState(key);
    const total = st.order.length;
    const groupLabel = key === 'p2' ? '무대 핀 줄자' : '시대 핀 줄자';
    return `<section class="map-game" data-board="${key}" aria-labelledby="board-${key}">
      <div class="map-head">
        <div>
          <h2 id="board-${key}">${esc(st.board.title)}</h2>
          <p class="map-guide">${boardGuideText(st)}</p>
        </div>
        <span class="map-counter${st.phase === 'complete' ? ' is-done' : ''}" aria-label="완료한 곡">${st.done.size} / ${total}곡</span>
      </div>
      <div class="map-steps-wrap">${boardStepsHTML(st)}</div>
      <div class="map-mission" data-phase="${st.phase}">
        <div class="map-task">${boardTask(key, st)}</div>
        <p class="map-feedback" role="status" aria-live="polite"></p>
      </div>
      <div class="map-ruler-head">
        <p class="map-ruler-label">${boardRulerLabel(st)}</p>
      </div>
      <div class="map-board" data-phase="${st.phase}" role="group" aria-label="${groupLabel}">
        ${boardPinsHTML(key, st)}
      </div>
    </section>`;
  }

  function updateBoard(box) {
    const key = box.dataset.board;
    const st = boardState(key);
    const total = st.order.length;
    const task = box.querySelector('.map-task');
    stopVideos(task);
    box.querySelector('.map-guide').textContent = boardGuideText(st);
    const counter = box.querySelector('.map-counter');
    counter.textContent = `${st.done.size} / ${total}곡`;
    counter.classList.toggle('is-done', st.phase === 'complete');
    box.querySelector('.map-steps-wrap').innerHTML = boardStepsHTML(st);
    box.querySelector('.map-mission').dataset.phase = st.phase;
    task.innerHTML = boardTask(key, st);
    box.querySelector('.map-ruler-label').textContent = boardRulerLabel(st);
    const boardEl = box.querySelector('.map-board');
    boardEl.dataset.phase = st.phase;
    boardEl.innerHTML = boardPinsHTML(key, st);
  }

  function mapFeedback(box, message, tone = '', html = false, srOnly = false) {
    const feedback = box.querySelector('.map-feedback');
    if (html) feedback.innerHTML = message;
    else feedback.textContent = message;
    feedback.dataset.tone = tone;
    if (srOnly && message) feedback.dataset.sr = 'true';
    else delete feedback.dataset.sr;
  }

  function focusBoardMission(box, keyboard, selector = '.map-task-title') {
    const mission = box.querySelector('.map-mission');
    if (mission) {
      const rect = mission.getBoundingClientRect();
      const headerTop = parseFloat(getComputedStyle(document.body).getPropertyValue('--bar-height')) +
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ruler-height')) + 12;
      if (rect.top < headerTop || rect.top > window.innerHeight - 120) {
        mission.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }
    if (keyboard) box.querySelector(selector)?.focus({ preventScroll: true });
  }

  function pickPin(button, keyboard) {
    const box = button.closest('[data-board]');
    const key = box.dataset.board;
    const song = button.dataset.pin;
    const st = boardState(key);
    if (st.phase === 'complete') {
      if (st.inspectPin?.song === song) {
        if (keyboard) focusBoardMission(box, true);
        return;
      }
      boardUI.set(key, { inspectSong: song, justCompleted: false });
      updateBoard(box);
      mapFeedback(box, '');
      focusBoardMission(box, keyboard);
      return;
    }
    if (st.phase === 'solved') {
      const nextNum = st.currentIndex + 1;
      mapFeedback(box, `먼저 위 ‘곡 ${nextNum} 듣기 →’ 버튼을 눌러 다음 곡을 열어 봐요.`, 'info');
      focusBoardMission(box, keyboard, '.map-next-btn');
      return;
    }
    if (st.done.has(song)) {
      mapFeedback(box, '이미 줄자에 붙은 핀이에요. 아직 비어 있는 핀 가운데에서 골라 봐요.', 'info');
      return;
    }
    const target = st.target;
    if (song !== target.song) {
      const miss = Array.isArray(state.a[key + '-miss']) ? state.a[key + '-miss'] : [];
      if (!miss.includes(target.song)) {
        state.a[key + '-miss'] = [...miss, target.song];
        save();
      }
      boardUI.set(key, { ...(boardUI.get(key) || {}), wrongSong: song });
      for (const pinEl of box.querySelectorAll('.map-pin')) {
        const isThis = pinEl.dataset.pin === song;
        pinEl.classList.remove('is-wrong');
        if (isThis) {
          void pinEl.offsetWidth;
          pinEl.classList.add('is-wrong');
        }
      }
      const pickedLabel = st.bySong.get(song)?.label || '';
      mapFeedback(box, `<b>다시 들어 봐요.</b> ${esc(pickedLabel)} 핀이 아니에요. <span class="map-hint">힌트: ${esc(target.hint)}</span>`, 'no', true);
      return;
    }
    st.done.add(song);
    state.a[key] = [...st.done];
    save();
    const clip = V[song];
    const num = st.currentIndex + 1;
    if (st.done.size === st.order.length) {
      boardUI.set(key, { solvedSong: null, wrongSong: null, inspectSong: song, justCompleted: true });
      updateBoard(box);
      mapFeedback(box, `마지막 곡 ${clip.title}까지 모두 맞혔어요. 모든 곡을 줄자에 이었어요.`, 'ok', false, true);
    } else {
      const nextNum = num + 1;
      boardUI.set(key, { solvedSong: song, wrongSong: null, inspectSong: null, justCompleted: false });
      updateBoard(box);
      mapFeedback(box, `곡 ${num} ${clip.title}를 맞혔어요. 곡 ${nextNum}${subjectParticle(nextNum)} 열렸어요.`, 'ok', false, true);
    }
    focusBoardMission(box, keyboard);
  }

  function advanceBoard(button, keyboard) {
    const box = button.closest('[data-board]');
    const key = box.dataset.board;
    const st = boardState(key);
    if (st.phase !== 'solved') return;
    const nextNum = st.currentIndex + 1;
    boardUI.set(key, { solvedSong: null, wrongSong: null, inspectSong: null, justCompleted: false });
    updateBoard(box);
    mapFeedback(box, `곡 ${nextNum}${subjectParticle(nextNum)} 열렸어요. 소리를 듣고 어울리는 핀을 골라요.`, '', false, true);
    focusBoardMission(box, keyboard);
  }

  function piecesHTML() {
    const items = CHAPTERS.filter(chapter => chapter.piece)
      .map(chapter => `<li><b>${esc(chapter.era)}</b><span>${esc(chapter.piece)}</span></li>`).join('');
    return `<section class="pieces-list" aria-labelledby="pieces-title">
      <p class="eyebrow">100년의 소리 조각 모음</p>
      <h2 id="pieces-title">지금 K-POP으로 이어진 소리 조각</h2>
      <ol>${items}</ol>
    </section>`;
  }

  function build(page) {
    const render = {
      art: artHTML,
      vid: key => videoHTML(V[key]),
      openListen: (key, seconds) => shortListen(V[key], Number(seconds), V[key].title),
      recap: value => recapHTML(value.split(',')),
      guess: guessHTML,
      capsule: capsuleHTML,
      capsuleRecall: capsuleRecallHTML,
      cue: cueBoxHTML,
      balance: balanceHTML,
      jukebox: key => jukeboxHTML(key, page),
      introQuiz: value => introHTML(value.split(',')),
      board: boardHTML,
      pieces: piecesHTML
    };
    return page.lesson.replace(/\{(\w+)(?::([^}]+))?\}/g, (_, type, value) =>
      value !== undefined ? render[type](...value.split('|')) : render[type]());
  }

  /* 학습지 */
  function questionValue(q) {
    const value = state.a[q.id];
    if (typeof value !== 'string' || (q.type === 'radio' && !q.opts.includes(value))) return '';
    return value;
  }

  function answered(q) {
    return questionValue(q).trim() !== '';
  }

  function marksMode() {
    if (classOn) return '';
    if (TEACHER && showAns) return 'key';
    return state.done?.sig && state.done.sig === answerSignature() ? 'graded' : '';
  }

  function markHTML(q, mode) {
    if (!mode || q.type !== 'radio') return '';
    if (mode === 'key') return `<p class="mk key">정답 ${esc(q.ans)}</p>`;
    if (!answered(q)) return '<p class="mk no">답하지 않았어요.</p>';
    return questionValue(q) === q.ans ? '<p class="mk ok">맞았어요.</p>' : '<p class="mk no">다시 확인해 봐요.</p>';
  }

  function reflectContextHTML(q) {
    const ctx = q.ctx;
    if (!ctx) return '';
    const lines = [];
    if (ctx.vote && JUKEBOX[ctx.vote]) {
      const picked = pickedFrom('vote-' + ctx.vote, JUKEBOX[ctx.vote].tracks.map(([song]) => V[song].title));
      if (picked) lines.push('B면에서 고른 곡 ' + picked);
    }
    for (const cid of ctx.capsules || []) {
      const cap = CAPSULE[cid];
      if (!cap) continue;
      const picked = pickedFrom(cid, cap.opts);
      if (picked) {
        const session = byPage.get(cap.chapter)?.session || cid.replace(/\D/g, '');
        lines.push(`${session}차시 첫 생각 · ${picked}`);
      }
    }
    if (!lines.length) return '';
    return `<p class="reflect-context">${lines.map(esc).join('<br>')}</p>`;
  }

  function vocabGroupsHTML(q, text) {
    const groupsList = [];
    const songs = [];
    const seen = new Set();
    for (const key of q.ctx?.songs || []) {
      const title = V[key]?.title;
      if (title && !seen.has(title)) {
        seen.add(title);
        songs.push(title);
      }
    }
    if (q.ctx?.vote && JUKEBOX[q.ctx.vote]) {
      const picked = pickedFrom('vote-' + q.ctx.vote, JUKEBOX[q.ctx.vote].tracks.map(([song]) => V[song].title));
      if (picked && !seen.has(picked)) {
        seen.add(picked);
        songs.push(picked);
      }
    }
    if (songs.length) groupsList.push(['곡', songs]);
    if (q.ctx?.words?.list?.length) groupsList.push([q.ctx.words.label, q.ctx.words.list]);
    if (q.vocab?.length) groupsList.push(['표현', q.vocab]);
    return groupsList.map(([label, list]) => `<div class="vocab-group"><span class="vocab-label">${esc(label)}</span>${list.map(word =>
      `<button class="chip vocab-chip" type="button" data-q="${q.id}" data-word="${esc(word)}" aria-pressed="${text.includes(word)}">${esc(word)}</button>`
    ).join('')}</div>`).join('');
  }

  function refreshReflectContext() {
    if (!renderedPage?.qs) return;
    for (const q of renderedPage.qs) {
      if (q.type !== 'text' || !q.ctx) continue;
      const box = byId('q-' + q.id);
      const bar = box?.querySelector('.vocab-bar');
      if (!bar) continue;
      box.querySelector('.reflect-context')?.remove();
      const ctxHTML = reflectContextHTML(q);
      if (ctxHTML) bar.insertAdjacentHTML('beforebegin', ctxHTML);
      const textarea = box.querySelector('textarea');
      bar.innerHTML = vocabGroupsHTML(q, textarea ? textarea.value : questionValue(q));
    }
  }

  function questionHTML(q, index, mode, { listenLabel = '소리 듣기', wide = false } = {}) {
    const text = questionValue(q);
    const prompt = 'prompt-' + q.id;
    const fields = q.type === 'radio' ? `<div class="opts" role="radiogroup" aria-labelledby="${prompt}">
      ${q.opts.map(opt => `<label><input type="radio" name="${q.id}" data-q="${q.id}" value="${esc(opt)}"${text === opt ? ' checked' : ''}>
        <span>${esc(opt)}</span></label>`).join('')}</div>` :
      `${reflectContextHTML(q)}<div class="vocab-bar" role="group" aria-label="표현 디딤돌">
        ${vocabGroupsHTML(q, text)}
      </div>
      <textarea data-q="${q.id}" maxlength="400" aria-labelledby="${prompt}" placeholder="한 문장으로 적어 봐요.">${esc(text)}</textarea>`;
    const listen = q.listen ? `<div class="q-listen"><p class="eyebrow">${esc(listenLabel)}</p>${shortListen(q.listen)}</div>` : '';
    return `<div class="q${q.type === 'text' ? ' q-text' : ''}${wide ? ' q-wide' : ''}" id="q-${q.id}">
      <p class="q-p" id="${prompt}"><span class="q-number">${index + 1}</span><span>
        ${q.type === 'text' ? '<b>생각 한 줄</b> ' : ''}${esc(q.prompt)}</span></p>
      ${listen}${fields}${markHTML(q, mode)}
    </div>`;
  }

  function nextLink(page) {
    const next = pages[page.index + 1];
    return `<a class="end-go" href="#${next.id}">
      ${next.id === 'submit' ? '제출 화면으로 →' : `다음 장 · ${esc(next.title)} →`}</a>`;
  }

  function sheetNoteHTML(page) {
    if (!page.note?.length) return '';
    const rows = page.note.map(([id, label, arrow]) => {
      const q = byQuestion.get(id);
      const val = q ? questionValue(q) : '';
      const n = page.qs.findIndex(item => item.id === id) + 1;
      const sep = arrow === 'arrow' ? '──▶' : ':';
      return `<li><span class="note-label">${esc(label)}</span><span class="note-sep" aria-hidden="true">${sep}</span>
        <button type="button" class="note-slot${val ? ' is-filled' : ''}" data-note-q="${esc(id)}"
          aria-label="${n}번 문항으로 가기, ${esc(label)}: ${esc(val || '아직 비어 있음')}">${esc(val || '▢')}</button></li>`;
    }).join('');
    return `<aside class="sheet-note" aria-labelledby="note-${page.id}">
      <p class="eyebrow" id="note-${page.id}">내 정리 노트 · ${esc(page.era)}</p>
      <ol class="note-rows">${rows}</ol>
      <p class="note-help">문항에 답하면 고른 말이 칸에 채워져요. 칸을 누르면 그 문항으로 가요.</p>
    </aside>`;
  }

  function sheetHTML(page) {
    const mode = marksMode();
    const count = page.qs.filter(answered).length;
    const total = page.qs.length;
    const pairs = page.pairs || [];
    const units = [];
    for (let i = 0; i < page.qs.length; ) {
      const q = page.qs[i];
      const pair = pairs.find(([a, b]) => q.id === a && page.qs[i + 1]?.id === b);
      if (pair) {
        units.push({ kind: 'pair', a: [q, i], b: [page.qs[i + 1], i + 1] });
        i += 2;
      } else if (q.type === 'text') {
        units.push({ kind: 'text', q, index: i });
        i += 1;
      } else {
        units.push({ kind: 'radio', q, index: i, wide: false });
        i += 1;
      }
    }
    for (let start = 0; start < units.length; ) {
      if (units[start].kind !== 'radio') { start++; continue; }
      let end = start;
      while (end < units.length && units[end].kind === 'radio') end++;
      if ((end - start) % 2 === 1) units[end - 1].wide = true;
      start = end;
    }
    const qsHTML = units.map(u => {
      if (u.kind === 'pair') {
        return `<div class="q-pair" role="group" aria-label="소리 A와 소리 B 견주기"><p class="pair-title">두 소리를 견주어 들어요</p>${questionHTML(u.a[0], u.a[1], mode, { listenLabel: '소리 A' })}${questionHTML(u.b[0], u.b[1], mode, { listenLabel: '소리 B' })}</div>`;
      }
      return questionHTML(u.q, u.index, mode, { wide: u.wide });
    }).join('');
    return `<section class="sheet" id="sheet" aria-labelledby="sheetTitle">
      <header><div><p class="eyebrow">학습지</p><h2 id="sheetTitle">${esc(page.title)}</h2></div>
        <span class="cnt" id="cnt">${count} / ${total}</span></header>
      <p class="warn" id="saveWarn"${saveOk ? ' hidden' : ''}>이 기기에 답을 저장하지 못했어요. 제출할 때까지 화면을 열어 두세요.</p>
      ${TEACHER ? `<p class="t-note">교사 모드 <button class="mini" type="button" id="btnAns" aria-pressed="${showAns}">
        ${showAns ? '정답 숨기기' : '정답 보기'}</button></p>` : ''}
      ${sheetNoteHTML(page)}
      <div class="sheet-qs">${qsHTML}</div>
      <div class="sheet-end${count === total ? ' is-done' : ''}" id="sheetEnd">
        <p id="endMsg">${progressMessage(count, total)}</p>${nextLink(page)}</div>
    </section>`;
  }

  function progressMessage(count, total) {
    return count === total ? '이 장 학습지를 다 풀었어요.' : `${total}문항 중 ${count}문항에 답했어요.`;
  }

  function refreshMarks() {
    if (!renderedPage?.qs) return;
    const mode = marksMode();
    for (const q of renderedPage.qs) {
      const box = byId('q-' + q.id);
      box.querySelector('.mk')?.remove();
      box.insertAdjacentHTML('beforeend', markHTML(q, mode));
    }
    const button = byId('btnAns');
    if (button) {
      button.setAttribute('aria-pressed', String(showAns));
      button.textContent = showAns ? '정답 숨기기' : '정답 보기';
    }
  }

  function refreshCount(page) {
    const total = page.qs.length;
    const count = page.qs.filter(answered).length;
    const done = count === total;
    byId('cnt').textContent = `${count} / ${total}`;
    byId('headChipCnt').textContent = `${count}/${total}`;
    byId('headChip').classList.toggle('is-done', done);
    byId('sheetEnd').classList.toggle('is-done', done);
    byId('endMsg').textContent = progressMessage(count, total);
    nav.querySelector(`[data-nav-count="${page.id}"]`).textContent = `${count}/${total}`;
  }

  function refreshNoteSlot(q) {
    if (q.type !== 'radio' || !renderedPage?.note) return;
    const btn = view.querySelector(`.note-slot[data-note-q="${q.id}"]`);
    if (!btn) return;
    const entry = renderedPage.note.find(([id]) => id === q.id);
    const label = entry ? entry[1] : q.label;
    const val = questionValue(q);
    const n = renderedPage.qs.findIndex(item => item.id === q.id) + 1;
    btn.classList.toggle('is-filled', Boolean(val));
    btn.textContent = val || '▢';
    btn.setAttribute('aria-label', `${n}번 문항으로 가기, ${label}: ${val || '아직 비어 있음'}`);
  }

  function focusNoteTarget(button) {
    const card = byId('q-' + button.dataset.noteQ);
    if (!card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    const radio = card.querySelector('input[type="radio"]:checked') || card.querySelector('input[type="radio"]');
    radio?.focus({ preventScroll: true });
  }

  function storeQuestion(input) {
    const q = byQuestion.get(input.dataset.q);
    if (q.type === 'radio') {
      if (!input.checked) return;
      pendingRadio = null;
    }
    if (state.a[q.id] === input.value) return;
    state.a[q.id] = input.value;
    save();
    refreshCount(renderedPage);
    refreshNoteSlot(q);
    if (state.done) refreshMarks();
  }

  function syncVocabulary(textarea) {
    for (const button of textarea.closest('.q').querySelectorAll('.vocab-chip')) {
      button.setAttribute('aria-pressed', String(textarea.value.includes(button.dataset.word)));
    }
  }

  function insertVocabulary(button) {
    const textarea = button.closest('.q').querySelector('textarea');
    const word = button.dataset.word;
    if (!textarea.value.includes(word)) {
      const { value, selectionStart, selectionEnd, maxLength } = textarea;
      const before = value.slice(0, selectionStart);
      const after = value.slice(selectionEnd);
      const left = before && !/[\s(]$/.test(before) ? ' ' : '';
      const right = after && !/^[\s,.)]/.test(after) ? ' ' : '';
      const insertion = left + word + right;
      if (before.length + insertion.length + after.length <= maxLength) {
        textarea.setRangeText(insertion, selectionStart, selectionEnd, 'end');
        storeQuestion(textarea);
        syncVocabulary(textarea);
      } else {
        toast('생각 한 줄은 400자까지 적을 수 있어요.');
      }
    }
    textarea.focus();
  }
  /* 채점과 제출 */
  function answersForHub() {
    const answers = Object.fromEntries(questions.map(q => [q.id, questionValue(q).trim().slice(0, 400)]));
    for (const [key, capsule] of Object.entries(CAPSULE)) answers[key] = pickedFrom(key, capsule.opts);
    for (const key of Object.keys(GUESS)) answers['guess-' + key] = guessState(key).picked;
    for (const [key, c] of Object.entries(CUES)) {
      const st = getCueState(key, c);
      if (c.type === 'counter') answers['cue-' + key] = st.locked ? String(st.count) : '';
      else {
        const items = (c.items || []).map(cueItem);
        answers['cue-' + key] = st.picked.map(idx => items[idx]?.text).filter(Boolean).join(' / ');
      }
    }
    for (const [key, balance] of Object.entries(BALANCE)) answers[key] = pickedFrom(key, balance.choices.map(([label]) => label));
    for (const [key, box] of Object.entries(JUKEBOX)) {
      if (box.vote) answers['vote-' + key] = pickedFrom('vote-' + key, box.tracks.map(([song]) => V[song].title));
    }
    for (const key of Object.keys(INTRO_QUIZ)) answers['intro-' + key] = introState(key).picked;
    for (const [key, board] of Object.entries(BOARD)) {
      const miss = new Set(Array.isArray(state.a[key + '-miss']) ? state.a[key + '-miss'] : []);
      const firstTry = finishedPins(key).filter(pin => !miss.has(pin.song)).length;
      answers[key] = `${firstTry}/${board.pins.length}`;
    }
    return answers;
  }

  function answerSignature() {
    return JSON.stringify(answersForHub());
  }

  function result() {
    const answers = answersForHub();
    const score = graded.filter(q => answers[q.id] === q.ans).length;
    const wrong = graded.filter(q => answers[q.id] && answers[q.id] !== q.ans).map(q => q.label);
    return { score, total: graded.length, wrong, answers };
  }

  function submitHTML() {
    const left = graded.filter(q => !answered(q)).length;
    const done = state.done;
    const changed = done?.sig && done.sig !== answerSignature();
    return `<article class="lesson submit-page">
      <header class="ch-head"><h1>제출하기</h1>
        <p class="lead">고르는 문제 ${graded.length}문항을 채점해요. 생각 한 줄과 활동 기록도 함께 보내요.</p></header>
      ${done ? `<div class="submission-status"><p class="score"><b>${done.score}</b> / ${done.total}점</p>
        <p role="status">${esc(done.message)}</p>
        ${changed ? '<p class="warn">제출하고 나서 답을 바꿨어요. 고친 답으로 다시 제출할 수 있어요.</p>' : ''}</div>` : ''}
      <ul class="sum">
        ${pages.filter(page => page.qs?.length).map(page => `<li><a href="#${page.id}?sheet">
          <span>${page.index + 1}장</span><b>${esc(page.title)}</b>
          <span>${page.qs.filter(answered).length} / ${page.qs.length} 답함</span>
        </a></li>`).join('')}
      </ul>
      <p class="${left ? 'warn' : 'fine'}">${left ? `아직 답하지 않은 채점 문항이 <b>${left}개</b> 있어요.` : '채점 문항에 모두 답했어요.'}</p>
      <button class="go" type="button" id="btnSubmit"${sending ? ' disabled' : ''}>
        ${sending ? '보내는 중' : done ? '다시 제출하기' : '채점하고 제출하기'}</button>
    </article>`;
  }

  async function submit() {
    if (sending) return;
    const left = graded.filter(q => !answered(q)).length;
    if (left && !window.confirm(`아직 답하지 않은 채점 문항이 ${left}개 있어요. 그래도 제출할까요?`)) return;
    const record = state;
    const report = result();
    const signature = JSON.stringify(report.answers);
    sending = true;
    view.innerHTML = submitHTML();
    let response;
    try {
      if (classroom?.submit) response = await classroom.submit(report);
    } catch {
      response = { ok: false };
    }
    if (state !== record) return;
    sending = false;
    let message;
    if (!response) message = '이 기기에서 채점했어요.';
    else if (response.teacher) message = '교사 모드에서 채점했어요.';
    else if (response.ok) message = response.offline ? '이 기기에서 채점했어요. 연결되면 다시 제출할 수 있어요.' : '선생님께 보냈어요.';
    else message = response.error || '보내지 못했어요. 연결을 확인하고 다시 눌러 주세요.';
    state.done = { score: report.score, total: report.total, message, sig: !response || response.ok ? signature : '' };
    save();
    if (renderedPage.id === 'submit') {
      view.innerHTML = submitHTML();
      byId('btnSubmit').focus({ preventScroll: true });
    } else {
      toast(message);
      refreshMarks();
    }
  }

  /* 장과 목차, 100년 줄자 */
  function chapterHTML(page) {
    const total = page.qs.length;
    const count = page.qs.filter(answered).length;
    const piece = page.piece ? `<aside class="piece"><p class="eyebrow">지금 K-POP으로 이어진 소리 조각</p><p>${esc(page.piece)}</p></aside>` : '';
    return `<article class="lesson">
      <header class="ch-head art">
        <p class="eyebrow">${page.session}차시 · ${page.index + 1}장 · 약 ${page.minutes}분</p>
        <h1>${esc(page.title)}</h1>
        ${page.lead ? `<p class="lead">${esc(page.lead)}</p>` : ''}
        ${total ? `<a class="sheet-chip${count === total ? ' is-done' : ''}" id="headChip" href="#${page.id}?sheet">
          이 장 학습지 <b id="headChipCnt">${count}/${total}</b> ↓</a>` : ''}
      </header>
      ${tvHTML(page)}
      ${build(page)}
      ${piece}
      ${total ? `<div class="bridge">
        <p class="bridge-norm">여기까지 봤으면 아래 학습지에서 ${total}문항을 풀어요.</p>
        <p class="bridge-cls">칠판에서 함께 풀려면 학습지를 펼쳐요.</p>
        <a class="bridge-go" href="#${page.id}?sheet">학습지로 ↓</a>
        <button type="button" class="mini cls" id="btnSheet" aria-pressed="${sheetOn}">
          ${sheetOn ? '학습지 숨기기' : '학습지 함께 보기'}</button>
      </div>${sheetHTML(page)}` : `<div class="lesson-end">${nextLink(page)}</div>`}
    </article>`;
  }

  function navLink(page, active) {
    const on = page === active;
    const total = page.qs?.length;
    return `<a class="chapter-link${on ? ' on' : ''}" href="#${page.id}"${on ? ' aria-current="page"' : ''}>
      ${page.qs ? `<span class="nav-num">${page.index + 1}</span>` : ''}<span>${esc(page.title)}</span></a>
      ${total ? `<a class="subl${on ? ' here' : ''}" href="#${page.id}?sheet">
        학습지 <span data-nav-count="${page.id}">${page.qs.filter(answered).length}/${total}</span></a>` : ''}`;
  }

  function renderNav(active) {
    const sections = groups.map((group, index) => `<section class="grp">
      <p><b>${index + 1}차시</b><span>${esc(SESSIONS[index])}</span></p>
      ${group.map(page => navLink(page, active)).join('')}
    </section>`);
    nav.innerHTML = sections.join('') + navLink(byPage.get('submit'), active);
    const link = nav.querySelector('.on');
    if (link && !side.inert) {
      if (link.offsetTop < nav.scrollTop || link.offsetTop + link.offsetHeight > nav.scrollTop + nav.clientHeight) {
        nav.scrollTop = link.offsetTop - 16;
      }
    }
  }

  function renderRuler(active) {
    const ticks = RULER.map(([label, era, id], index) => {
      const page = byPage.get(id);
      const classes = ['ruler-tick'];
      if (page.index < active.index) classes.push('is-past');
      if (page === active) classes.push('is-now');
      if (page.session === active.session) classes.push('is-session');
      if (page.session > active.session) classes.push('is-future');
      const current = page === active && RULER.findIndex(tick => tick[2] === id) === index;
      return `<a class="${classes.join(' ')}" href="#${id}" aria-label="${esc(era)} 장으로 이동"${current ? ' aria-current="page"' : ''}>
        <span class="ruler-label">${label}</span></a>`;
    }).join('');
    const status = active.qs ? `지금: ${active.era} · ${active.session}차시 ${active.index + 1}장` : '100년 줄자 · 제출하기';
    ruler.innerHTML = `<div class="ruler-ticks">${ticks}</div><p class="ruler-status" aria-live="polite">${esc(status)}</p>`;
  }

  function loadArt(page) {
    const head = view.querySelector('.ch-head.art');
    if (head) {
      const path = 'img/head-' + page.id + '.webp';
      const img = new Image();
      img.onload = () => {
        if (!head.isConnected) return;
        head.style.setProperty('--art', `url("${path}")`);
        head.classList.add('has-art');
      };
      img.src = path;
    }
    for (const img of view.querySelectorAll('.art-img')) {
      if (img.complete && img.naturalWidth) img.parentNode.hidden = false;
    }
  }

  function pageLocation() {
    const [id, sub] = location.hash.slice(1).split('?');
    return { page: byPage.get(id) || pages[0], sub };
  }

  function renderPager(page) {
    const prev = pages[page.index - 1];
    const next = pages[page.index + 1];
    for (const [id, target, direction] of [['prev', prev, '이전'], ['next', next, '다음']]) {
      const button = byId(id);
      button.disabled = !target;
      button.querySelector('b').textContent = target?.title || '';
      button.setAttribute('aria-label', target ? `${direction} · ${target.title}` : direction);
    }
    byId('where').textContent = page.qs ? `${page.index + 1} / ${CHAPTERS.length}장` : '제출';
    byId('pgBar').style.width = Math.min(100, (page.index + 1) / CHAPTERS.length * 100) + '%';
  }

  function jump() {
    const sheet = pageLocation().sub === 'sheet' && byId('sheet');
    if (sheet) {
      if (classOn && !sheetOn) setSheet(true);
      sheet.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function route() {
    const { page } = pageLocation();
    if (renderedPage === page) {
      jump();
      return;
    }
    if (pendingRadio) storeQuestion(pendingRadio);
    stopVideos();
    renderedPage = page;
    view.innerHTML = page.qs ? chapterHTML(page) : submitHTML();
    renderNav(page);
    renderRuler(page);
    renderPager(page);
    loadArt(page);
    jump();
  }

  function go(step) {
    const next = pages[renderedPage.index + step];
    if (next) location.hash = next.id;
  }

  function currentLink(event) {
    const href = event.target.closest('a')?.getAttribute('href');
    if (!href?.startsWith('#')) return;
    closeSide();
    if (href === location.hash || (!location.hash && href === '#' + pages[0].id)) {
      event.preventDefault();
      jump();
    }
  }

  /* 공통 조작 */
  function onClick(event) {
    const target = event.target;
    if (target.matches('input[type="radio"][data-q]')) storeQuestion(target);
    currentLink(event);
    const button = target.closest('button');
    if (!button) return;
    const { classList } = button;
    if (classList.contains('vid-play')) playVideo(button);
    else if (classList.contains('vid-stop')) {
      const play = button.closest('.vid').querySelector('.vid-play');
      stopVideos();
      play.focus({ preventScroll: true });
    } else if (button.matches('.cap-btn, .bal-btn, .juke-vote-btn')) pickActivity(button);
    else if (button.matches('.guess-opt, .guess-reveal')) updateGuess(button);
    else if (button.matches('.juke-tab, .juke-next')) selectTrack(button.closest('[data-jukebox]'), Number(button.dataset.track));
    else if (button.matches('.cue-chip[data-cue-key]')) toggleCueChip(button);
    else if (button.matches('.cue-check[data-cue-check]')) checkCueBox(button.dataset.cueCheck);
    else if (button.matches('.cue-tap')) updateCounterCue(button.dataset.cueTap, 'tap');
    else if (button.matches('.cue-minus')) updateCounterCue(button.dataset.cueMinus, 'minus');
    else if (button.matches('.cue-reset')) updateCounterCue(button.dataset.cueReset, 'reset');
    else if (button.matches('.cue-lock')) updateCounterCue(button.dataset.cueLock, 'lock');
    else if (button.matches('.cue-chip, .cue-check')) updateCue(button);
    else if (button.matches('.intro-opt, .intro-check')) updateIntro(button);
    else if (classList.contains('map-pin') || classList.contains('map-step-inspect')) pickPin(button, event.detail === 0);
    else if (classList.contains('map-next-btn')) advanceBoard(button, event.detail === 0);
    else if (classList.contains('vocab-chip')) insertVocabulary(button);
    else if (classList.contains('note-slot')) focusNoteTarget(button);
    else if (button.id === 'btnSheet') {
      setSheet(!sheetOn);
      if (sheetOn) byId('sheet').scrollIntoView({ block: 'start', behavior: 'instant' });
    } else if (button.id === 'btnAns' && TEACHER && !classOn) {
      showAns = !showAns;
      refreshMarks();
    } else if (button.id === 'btnSubmit') submit();
  }

  function onKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const el = event.target;
    const key = event.key;
    if (el.matches('[role="tab"]') && /^(ArrowLeft|ArrowRight|Home|End)$/.test(key)) {
      const box = el.closest('[data-jukebox]');
      const count = box.querySelectorAll('[role="tab"]').length;
      const current = Number(el.dataset.track);
      const next = key === 'Home' ? 0 : key === 'End' ? count - 1 : (current + (key === 'ArrowLeft' ? -1 : 1) + count) % count;
      event.preventDefault();
      selectTrack(box, next);
    } else if (el.matches('input[type="radio"][data-q]')) {
      if (/^Arrow(Up|Down|Left|Right)$/.test(key)) {
        const radios = [...el.closest('.opts').querySelectorAll('input')];
        const step = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
        pendingRadio = radios[(radios.indexOf(el) + step + radios.length) % radios.length];
        event.preventDefault();
        pendingRadio.checked = true;
        pendingRadio.focus();
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        el.checked = true;
        storeQuestion(el);
      }
    }
  }

  view.addEventListener('click', onClick);
  view.addEventListener('keydown', onKey);
  view.addEventListener('change', event => {
    if (event.target.matches('input[type="radio"][data-q]')) storeQuestion(event.target);
  });
  view.addEventListener('input', event => {
    if (!event.target.matches('textarea[data-q]')) return;
    storeQuestion(event.target);
    syncVocabulary(event.target);
  });
  view.addEventListener('focusout', event => {
    if (pendingRadio && event.target.name === pendingRadio.name && event.relatedTarget?.name !== pendingRadio.name) {
      storeQuestion(pendingRadio);
    }
  });
  view.addEventListener('load', event => {
    if (event.target.matches('.art-img')) event.target.parentNode.hidden = false;
  }, true);
  view.addEventListener('toggle', event => {
    if (event.target.matches('details.more:not([open])')) stopVideos(event.target);
  }, true);
  document.addEventListener('classroom:away', () => stopVideos());
  document.addEventListener('classroom:switch', () => {
    stopVideos();
    try { localStorage.removeItem(KEY); } catch {}
    state = freshState();
    pendingRadio = null;
    boardUI.clear();
    showAns = false;
    sending = false;
    renderedPage = null;
    route();
  });

  /* 목차, 글자 크기, 수업 모드 */
  const side = byId('side');
  const burger = byId('burger');
  const scrim = byId('scrim');
  const collapse = byId('btnCollapse');
  const classButton = byId('btnClass');
  const mobile = window.matchMedia('(max-width: 820px)');
  let sideClosed = false;
  let size = 0;
  let previousSize = 0;
  try {
    sideClosed = localStorage.getItem(SIDE_KEY) === '1';
    size = Number(localStorage.getItem(FS_KEY)) || 0;
  } catch {}

  function syncSide() {
    body.classList.toggle('side-closed', classOn || sideClosed);
    const overlay = body.classList.contains('side-open');
    const hidden = (mobile.matches || classOn || sideClosed) && !overlay;
    side.inert = hidden;
    if (hidden) side.setAttribute('aria-hidden', 'true');
    else side.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', String(!hidden));
    scrim.hidden = !overlay;
  }

  function closeSide() {
    body.classList.remove('side-open');
    syncSide();
  }

  function setSideClosed(closed) {
    sideClosed = closed;
    try { localStorage.setItem(SIDE_KEY, closed ? '1' : '0'); } catch {}
    closeSide();
  }

  function setSize(px, persist = false) {
    size = px ? Math.max(classOn ? 24 : 15, Math.min(30, px)) : 0;
    if (size) root.style.setProperty('--fs', size + 'px');
    else root.style.removeProperty('--fs');
    if (persist && !classOn) {
      try { localStorage.setItem(FS_KEY, String(size)); } catch {}
    }
  }

  function fontSize() {
    return size || parseFloat(getComputedStyle(root).fontSize);
  }

  function setSheet(on) {
    sheetOn = on;
    body.classList.toggle('class-sheet', on);
    const sheet = byId('sheet');
    if (!on && sheet) stopVideos(sheet);
    const button = byId('btnSheet');
    if (button) {
      button.setAttribute('aria-pressed', String(on));
      button.textContent = on ? '학습지 숨기기' : '학습지 함께 보기';
    }
  }

  function setClass(on) {
    classOn = on;
    showAns = false;
    body.classList.toggle('class-mode', on);
    closeSide();
    classButton.textContent = on ? '수업 모드 끄기' : '수업 모드 켜기';
    classButton.setAttribute('aria-pressed', String(on));
    if (on) {
      const sheet = byId('sheet');
      if (sheet) stopVideos(sheet);
      previousSize = size;
      setSize(Math.max(24, fontSize()));
      burger.focus({ preventScroll: true });
      if (!document.fullscreenElement) root.requestFullscreen?.().catch(() => {});
    } else {
      setSheet(false);
      setSize(previousSize);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      (mobile.matches || sideClosed ? burger : classButton).focus({ preventScroll: true });
    }
    refreshMarks();
  }

  burger.addEventListener('click', () => {
    if (!classOn && !mobile.matches && sideClosed) {
      setSideClosed(false);
      collapse.focus();
      return;
    }
    body.classList.add('side-open');
    syncSide();
    (nav.querySelector('.on') || collapse).focus();
  });
  collapse.addEventListener('click', () => {
    if (classOn || mobile.matches) closeSide();
    else setSideClosed(true);
    burger.focus();
  });
  scrim.addEventListener('click', () => { closeSide(); burger.focus(); });
  mobile.addEventListener('change', closeSide);
  side.addEventListener('click', currentLink);
  ruler.addEventListener('click', currentLink);
  classButton.addEventListener('click', () => setClass(!classOn));
  byId('btnSmall').addEventListener('click', () => setSize(fontSize() - 1, true));
  byId('btnBig').addEventListener('click', () => setSize(fontSize() + 1, true));
  byId('btnFull').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch {
      toast('이 기기에서는 전체 화면을 쓸 수 없어요.');
    }
  });
  byId('prev').addEventListener('click', () => go(-1));
  byId('next').addEventListener('click', () => go(1));
  document.querySelector('.skip').addEventListener('click', event => {
    event.preventDefault();
    jump();
    view.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && body.classList.contains('side-open')) {
      closeSide();
      burger.focus();
      return;
    }
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest?.('a, button, input, textarea, .map-board, .juke-tabs')) return;
    if (event.key === 'ArrowRight') go(1);
    if (event.key === 'ArrowLeft') go(-1);
  });
  window.addEventListener('hashchange', () => {
    const moved = renderedPage !== pageLocation().page;
    closeSide();
    route();
    if (moved) view.focus({ preventScroll: true });
  });

  setSize(size);
  syncSide();
  route();
})();

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

  const { V, ART, SESSIONS, RULER, CAPSULE, BALANCE, JUKEBOX, BOARD, INTRO_QUIZ, CHAPTERS } = DATA;
  const KEY = 'kpop-history-v1';
  const FS_KEY = 'kpop-history-fs';
  const SIDE_KEY = 'kpop-history-side';
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

  /* 타임캡슐, 밸런스, 주크박스 */
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
    const entries = [key, capsule.alsoRecall].filter(Boolean).map(id => {
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

  function trackHTML(key, index, page) {
    const { tracks, cues } = JUKEBOX[key];
    const [song, , note] = tracks[index];
    const next = tracks[index + 1];
    const action = next ? `<button class="mini juke-next" type="button" data-track="${index + 1}">다음 곡 ${esc(V[next[0]].title)} →</button>` :
      `<a class="mini juke-sheet" href="#${page.id}?sheet">학습지로 →</a>`;
    return `<p class="track-note">${esc(note)}</p>${videoHTML(V[song])}
      ${cues && index === 0 ? cueHTML(cues) : ''}
      <div class="tab-end">${action}</div>`;
  }

  function jukeboxHTML(key, page) {
    const box = JUKEBOX[key];
    return `<section class="jukebox" data-jukebox="${key}" aria-labelledby="jukebox-${key}">
      <h3 id="jukebox-${key}">${esc(box.title)}</h3>
      <div class="juke-tabs" role="tablist" aria-labelledby="jukebox-${key}">
        ${box.tracks.map(([song, by], i) => `<button class="chip juke-tab" type="button" role="tab" id="${key}-tab-${i}"
          data-track="${i}" aria-controls="${key}-panel" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">
          ${esc(by ? by + ' ' + V[song].title : V[song].title)}</button>`).join('')}
      </div>
      <div class="juke-panel" role="tabpanel" tabindex="0" id="${key}-panel" aria-labelledby="${key}-tab-0">
        ${trackHTML(key, 0, page)}
      </div>
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
      const panel = box.querySelector('.juke-panel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.innerHTML = trackHTML(box.dataset.jukebox, index, renderedPage);
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
          const label = record.revealed ? clip.title : '12초 소리 듣기';
          return `<article class="guess-reveal-card intro-card" data-intro="${key}" data-revealed="${record.revealed}"
            aria-label="인트로 퀴즈 ${index + 1}">
            <p class="flow-steps">1 듣기 → 2 고르기 → 3 공개</p>
            ${videoHTML(clip, { label, compact: !record.revealed, masked: !record.revealed })}
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
    if (record.revealed && card.dataset.revealed === 'false') {
      const clip = V[key];
      const figure = card.querySelector('.vid');
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

  function boardState(key) {
    const pins = BOARD[key].pins;
    const done = new Set(finishedPins(key).map(pin => pin.song));
    const target = pins.find(pin => !done.has(pin.song));
    const selected = boardUI.get(key);
    return { done, target, selected, pins };
  }

  function songOptions(pins, target) {
    const i = pins.indexOf(target);
    const options = [...pins.slice(i + 1), ...pins.slice(0, i)].slice(0, 2);
    options.splice((i + 1) % 3, 0, target);
    return options.map(pin => `<button class="chip map-opt" type="button" data-match="${pin.song}"
      aria-pressed="false">${esc(V[pin.song].title)}</button>`).join('');
  }

  function boardTask(key) {
    const { target, selected, pins } = boardState(key);
    if (!target) {
      const pin = pins.find(item => item.song === selected);
      return `<h3 tabindex="-1" class="map-task-title">시대와 소리를 모두 이었어요.</h3>
        <p>핀을 누르면 그 시대의 노래를 다시 들을 수 있어요.</p>
        ${pin ? `<div class="map-inspect"><b>${esc(V[pin.song].title)}</b><p>${esc(pin.detail)}</p>
          ${shortListen(V[pin.song], 10, V[pin.song].title)}</div>` : ''}`;
    }
    if (selected === target.song) {
      return `<h3 tabindex="-1" class="map-task-title">2 소리와 곡 이름 잇기</h3>
        <p>${esc(target.era)}의 소리를 듣고 곡 이름을 골라요.</p>
        ${shortListen(V[target.song], 10)}
        <div class="chip-row" role="group" aria-label="소리와 어울리는 곡 이름">${songOptions(pins, target)}</div>`;
    }
    return `<h3 tabindex="-1" class="map-task-title">1 시대 핀 찾기</h3>
      <p>줄자에서 <b>${esc(target.era)}</b> 핀을 눌러요.</p>`;
  }

  function boardHTML(key) {
    const { title } = BOARD[key];
    const { pins, done, selected } = boardState(key);
    return `<section class="map-game" data-board="${key}" aria-labelledby="board-${key}">
      <div class="map-head">
        <h2 id="board-${key}">${esc(title)}</h2>
        <span class="map-counter" aria-label="완료한 시대">${done.size} / ${pins.length}</span>
      </div>
      <div class="map-mission"><div class="map-task">${boardTask(key)}</div>
        <p class="map-feedback" role="status"></p>
      </div>
      <div class="map-board" role="group" aria-label="시대 핀">
        <div class="map-stage" style="--pin-count:${pins.length}">
          ${pins.map(pin => `<button class="chip map-pin" type="button" data-pin="${pin.song}"
            data-done="${done.has(pin.song)}" aria-pressed="${selected === pin.song}">${esc(pin.era)}</button>`).join('')}
        </div>
      </div>
      <p class="map-scroll-hint">옆으로 밀어서 뒤 시대의 핀도 살펴봐요.</p>
    </section>`;
  }

  function updateBoardTask(box) {
    const key = box.dataset.board;
    const task = box.querySelector('.map-task');
    stopVideos(task);
    task.innerHTML = boardTask(key);
    const { done, selected, pins } = boardState(key);
    box.querySelector('.map-counter').textContent = `${done.size} / ${pins.length}`;
    for (const pin of box.querySelectorAll('.map-pin')) {
      pin.dataset.done = String(done.has(pin.dataset.pin));
      pin.setAttribute('aria-pressed', String(pin.dataset.pin === selected));
    }
  }

  function mapFeedback(box, message, tone = '') {
    const feedback = box.querySelector('.map-feedback');
    feedback.textContent = message;
    feedback.dataset.tone = tone;
  }

  function pickPin(button, keyboard) {
    const box = button.closest('[data-board]');
    const key = box.dataset.board;
    const song = button.dataset.pin;
    const { target, selected, done } = boardState(key);
    if (song === selected) return;
    if (target && song !== target.song) {
      mapFeedback(box, done.has(song) ? '이미 이은 시대예요.' : '찾는 시대와 달라요. 시대 이름을 비교해 봐요.', 'no');
      return;
    }
    boardUI.set(key, song);
    updateBoardTask(box);
    mapFeedback(box, target ? '시대를 찾았어요. 위에서 10초 소리를 들어요.' : '', 'ok');
    if (keyboard) box.querySelector('.map-task-title').focus();
  }

  function matchSong(button, keyboard) {
    const box = button.closest('[data-board]');
    const key = box.dataset.board;
    const { target, selected, done } = boardState(key);
    if (!target || selected !== target.song) return;
    if (button.dataset.match !== target.song) {
      box.querySelectorAll('.map-opt').forEach(opt => opt.setAttribute('aria-pressed', String(opt === button)));
      mapFeedback(box, '다른 곡이에요. 소리를 한 번 더 들어 봐요.', 'no');
      return;
    }
    done.add(target.song);
    state.a[key] = [...done];
    boardUI.delete(key);
    save();
    updateBoardTask(box);
    mapFeedback(box, `${V[target.song].title}의 시대와 소리를 이었어요.`, 'ok');
    if (keyboard) box.querySelector('.map-task-title').focus();
  }

  function build(page) {
    const render = {
      art: artHTML,
      vid: key => videoHTML(V[key]),
      openListen: (key, seconds) => shortListen(V[key], Number(seconds), V[key].title),
      recap: value => recapHTML(value.split(',')),
      capsule: capsuleHTML,
      capsuleRecall: capsuleRecallHTML,
      balance: balanceHTML,
      jukebox: key => jukeboxHTML(key, page),
      introQuiz: value => introHTML(value.split(',')),
      board: boardHTML
    };
    return page.lesson.replace(/\{(\w+):([^}]+)\}/g, (_, type, value) => render[type](...value.split('|')));
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

  function questionHTML(q, index, mode) {
    const text = questionValue(q);
    const prompt = 'prompt-' + q.id;
    const fields = q.type === 'radio' ? `<div class="opts" role="radiogroup" aria-labelledby="${prompt}">
      ${q.opts.map(opt => `<label><input type="radio" name="${q.id}" data-q="${q.id}" value="${esc(opt)}"${text === opt ? ' checked' : ''}>
        <span>${esc(opt)}</span></label>`).join('')}</div>` :
      `<div class="vocab-bar" role="group" aria-label="표현 디딤돌">
        ${q.vocab.map(word => `<button class="chip vocab-chip" type="button" data-q="${q.id}" data-word="${esc(word)}"
          aria-pressed="${text.includes(word)}">${esc(word)}</button>`).join('')}
      </div>
      <textarea data-q="${q.id}" maxlength="400" aria-labelledby="${prompt}" placeholder="한 문장으로 적어 봐요.">${esc(text)}</textarea>`;
    return `<div class="q" id="q-${q.id}">
      <p class="q-p" id="${prompt}"><span class="q-number">${index + 1}</span><span>
        ${q.type === 'text' ? '<b>생각 한 줄</b> ' : ''}${esc(q.prompt)}</span></p>
      ${q.listen ? shortListen(q.listen) : ''}${fields}${markHTML(q, mode)}
    </div>`;
  }

  function nextLink(page) {
    const next = pages[page.index + 1];
    return `<a class="end-go" href="#${next.id}">
      ${next.id === 'submit' ? '제출 화면으로 →' : `다음 장 · ${esc(next.title)} →`}</a>`;
  }

  function sheetHTML(page) {
    const mode = marksMode();
    const count = page.qs.filter(answered).length;
    const total = page.qs.length;
    return `<section class="sheet" id="sheet" aria-labelledby="sheetTitle">
      <header><div><p class="eyebrow">학습지</p><h2 id="sheetTitle">${esc(page.title)}</h2></div>
        <span class="cnt" id="cnt">${count} / ${total}</span></header>
      <p class="warn" id="saveWarn"${saveOk ? ' hidden' : ''}>이 기기에 답을 저장하지 못했어요. 제출할 때까지 화면을 열어 두세요.</p>
      ${TEACHER ? `<p class="t-note">교사 모드 <button class="mini" type="button" id="btnAns" aria-pressed="${showAns}">
        ${showAns ? '정답 숨기기' : '정답 보기'}</button></p>` : ''}
      ${page.qs.map((q, index) => questionHTML(q, index, mode)).join('')}
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
    for (const [key, balance] of Object.entries(BALANCE)) answers[key] = pickedFrom(key, balance.choices.map(([label]) => label));
    for (const key of Object.keys(INTRO_QUIZ)) answers['intro-' + key] = introState(key).picked;
    for (const [key, board] of Object.entries(BOARD)) answers[key] = `${finishedPins(key).length}/${board.pins.length}`;
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
    } else if (button.matches('.cap-btn, .bal-btn')) pickActivity(button);
    else if (button.matches('.juke-tab, .juke-next')) selectTrack(button.closest('[data-jukebox]'), Number(button.dataset.track));
    else if (button.matches('.cue-chip, .cue-check')) updateCue(button);
    else if (button.matches('.intro-opt, .intro-check')) updateIntro(button);
    else if (classList.contains('map-pin')) pickPin(button, event.detail === 0);
    else if (classList.contains('map-opt')) matchSong(button, event.detail === 0);
    else if (classList.contains('vocab-chip')) insertVocabulary(button);
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

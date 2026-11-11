(() => {
  'use strict';

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const button = (text, label, className = '') => {
    const element = make('button', `mt-button ${className}`.trim(), text);
    element.type = 'button';
    if (label) element.setAttribute('aria-label', label);
    return element;
  };
  const live = (className = 'mt-sr-only') => {
    const element = make('p', className);
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'true');
    return element;
  };
  const panel = (root, className, title) => {
    root.classList.add('mt-panel', className);
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', title);
    root.append(make('h2', 'mt-title', title));
  };

  function initBeatLab(root) {
    // Round before toFixed: binary 4.85 otherwise displays as 4.8 at 97 BPM.
    const threeSecondBeats = bpm => (Math.round(3 * bpm / 60 * 10) / 10).toFixed(1);
    panel(root, 'mt-beat-lab', '박 실험실');
    const owner = root.closest('.slide[data-slide]');
    const controls = make('div', 'mt-beat-controls');
    const toggle = button('시작', '메트로놈 시작', 'mt-primary');
    toggle.setAttribute('aria-pressed', 'false');
    const tempoGroup = make('div', 'mt-tempo-controls');
    tempoGroup.setAttribute('role', 'group');
    tempoGroup.setAttribute('aria-label', '템포 조절');
    const slower = button('−', '템포 1 느리게');
    const faster = button('+', '템포 1 빠르게');
    const tempoLabel = make('div', 'mt-tempo-label');
    const tempoValue = make('strong', 'mt-tempo-value', '97');
    tempoValue.setAttribute('aria-live', 'polite');
    tempoValue.setAttribute('aria-atomic', 'true');
    tempoLabel.append(make('span', 'mt-caption', '템포'), tempoValue, make('span', 'mt-caption', 'BPM · 1분에 치는 박 수'));
    tempoGroup.append(slower, tempoLabel, faster);
    controls.append(toggle, tempoGroup);

    const beats = make('div', 'mt-beats');
    beats.setAttribute('role', 'group');
    beats.setAttribute('aria-label', '4/4박자: 첫 박을 힘주어, 하나 둘 셋 넷');
    const lamps = Array.from({ length: 4 }, (_, index) => {
      const lamp = make('div', `mt-beat${index === 0 ? ' mt-first-beat' : ''}`);
      lamp.setAttribute('aria-hidden', 'true');
      lamp.append(make('strong', 'mt-beat-number', String(index + 1)), make('span', 'mt-beat-name', index === 0 ? '첫 박' : '박'));
      beats.append(lamp);
      return lamp;
    });
    const experimentButton = button('3초는 몇 박?', '현재 템포로 3초 동안 박 세기', 'mt-experiment-button');
    const experimentView = make('div', 'mt-experiment');
    const counterLabel = make('p', 'mt-caption', '3초 동안 들린 박');
    const counter = make('strong', 'mt-count', '0');
    const counterRow = make('div', 'mt-count-row');
    counterRow.append(counter, make('span', 'mt-count-unit', '박'));
    const track = make('div', 'mt-experiment-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', '3초 박 실험 진행');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '3');
    track.setAttribute('aria-valuenow', '0');
    const fill = make('span', 'mt-experiment-fill');
    track.append(fill);
    const result = live('mt-result');
    result.textContent = '3초 동안 몇 번의 박이 들리는지 세어 보세요.';
    const formula = make('p', 'mt-formula');
    const audioStatus = live('mt-audio-status');
    experimentView.append(counterLabel, counterRow, track, result, formula);
    root.append(controls, make('p', 'mt-meter-label', '4/4박자 · 네 박씩 반복해요'), beats, experimentButton, experimentView,
      make('p', 'mt-help', '템포는 악보마다 조금씩 달라요. 음원을 들으며 −/+로 맞춰 보세요.'), audioStatus);

    let tempo = 97;
    let audio = null;
    let running = false;
    let starting = false;
    let generation = 0;
    let scheduleId = null;
    let frameId = null;
    let nextTime = 0;
    let nextBeat = 0;
    let experiment = null;
    let experimentPending = false;
    const queue = [];
    const voices = new Set();
    const isShown = () => root.isConnected && !root.closest('[hidden]') && (!owner || !owner.hidden);

    function syncControls() {
      tempoValue.textContent = String(tempo);
      slower.disabled = tempo <= 60 || Boolean(experiment) || experimentPending;
      faster.disabled = tempo >= 160 || Boolean(experiment) || experimentPending;
      experimentButton.disabled = Boolean(experiment) || experimentPending;
      toggle.textContent = starting ? '시작 취소' : running ? '정지' : '시작';
      toggle.setAttribute('aria-label', starting ? '메트로놈 시작 취소' : running ? '메트로놈 정지' : '메트로놈 시작');
      toggle.setAttribute('aria-pressed', String(running || starting));
      if (!experiment && !experimentPending) {
        formula.textContent = `1분(60초)에 ${tempo}박이니까, 1초에는 ${tempo} ÷ 60박, 3초에는 3 × ${tempo} ÷ 60 = ${threeSecondBeats(tempo)}박이에요.`;
      }
    }

    function stop(message = '') {
      generation += 1; // Invalidate a resume() still waiting for browser permission.
      running = false;
      starting = false;
      clearTimeout(scheduleId);
      cancelAnimationFrame(frameId);
      scheduleId = null;
      frameId = null;
      queue.length = 0;
      voices.forEach(({ oscillator, gain }) => {
        try { oscillator.stop(); } catch {}
        oscillator.disconnect();
        gain.disconnect();
      });
      voices.clear();
      lamps.forEach(lamp => lamp.classList.remove('mt-active'));
      if (experiment || experimentPending) {
        experiment = null;
        experimentPending = false;
        counter.textContent = '0';
        fill.style.width = '0%';
        track.setAttribute('aria-valuenow', '0');
        result.textContent = '실험을 멈췄어요. 다시 눌러 3초를 세어 보세요.';
      }
      audioStatus.textContent = message;
      syncControls();
    }

    function clickAt(time, beat) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const voice = { oscillator, gain };
      voices.add(voice);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(beat === 0 ? 1100 : 740, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.24, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.onended = () => {
        voices.delete(voice);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(time);
      oscillator.stop(time + 0.05);
      queue.push({ time, beat });
    }

    function schedule() {
      if (!running) return;
      if (!isShown()) { stop(); return; }
      if (audio.state !== 'running') { stop('소리가 일시 중단됐어요. 시작을 다시 눌러 주세요.'); return; }
      try {
        const now = audio.currentTime;
        const step = 60 / tempo;
        // Skip stale beats after a delayed callback instead of playing a burst.
        if (nextTime < now) {
          const missed = Math.ceil((now - nextTime) / step);
          nextTime += missed * step;
          nextBeat = (nextBeat + missed) % 4;
        }
        while (nextTime < now + 0.1) {
          clickAt(nextTime, nextBeat);
          nextTime += step;
          nextBeat = (nextBeat + 1) % 4;
        }
        scheduleId = setTimeout(schedule, 25);
      } catch {
        stop('소리를 재생하지 못했어요. 시작을 다시 눌러 주세요.');
      }
    }

    function draw() {
      if (!running) return;
      const now = audio.currentTime;
      let currentBeat = null;
      while (queue.length && queue[0].time <= now) {
        const event = queue.shift();
        currentBeat = event.beat;
        if (experiment && event.time >= experiment.start && event.time < experiment.end) experiment.count += 1;
      }
      if (currentBeat !== null) lamps.forEach((lamp, index) => lamp.classList.toggle('mt-active', index === currentBeat));
      if (experiment) {
        const elapsed = Math.min(3, Math.max(0, now - experiment.start));
        counter.textContent = String(experiment.count);
        fill.style.width = `${elapsed / 3 * 100}%`;
        track.setAttribute('aria-valuenow', elapsed.toFixed(1));
        if (now >= experiment.end) {
          const value = threeSecondBeats(experiment.tempo);
          result.textContent = `3초 ≈ ${value}박 (템포 ${experiment.tempo} 기준: 3 × ${experiment.tempo} ÷ 60 = ${value}박). 실제로 들린 박은 ${experiment.count}번이에요.`;
          experiment = null;
          syncControls();
        }
      }
      frameId = requestAnimationFrame(draw);
    }

    async function start() {
      if (running) return true;
      if (starting || !isShown()) return false;
      const token = ++generation;
      starting = true;
      audioStatus.textContent = '';
      syncControls();
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error('Web Audio unavailable');
        if (!audio || audio.state === 'closed') audio = new Audio();
        if (audio.state !== 'running') await audio.resume();
        if (token !== generation) return false;
        if (!isShown() || audio.state !== 'running') { stop(); return false; }
        starting = false;
        running = true;
        nextTime = audio.currentTime + 0.04;
        nextBeat = 0;
        syncControls();
        schedule();
        if (running) frameId = requestAnimationFrame(draw);
        return running;
      } catch {
        if (token === generation) stop('이 환경에서는 소리를 켤 수 없어요. 브라우저의 소리 설정을 확인한 뒤 시작을 다시 눌러 주세요.');
        return false;
      }
    }

    toggle.addEventListener('click', () => {
      if (running || starting) stop();
      else void start();
    });
    const changeTempo = delta => {
      if (experiment || experimentPending) return;
      tempo = Math.max(60, Math.min(160, tempo + delta));
      syncControls();
    };
    slower.addEventListener('click', () => changeTempo(-1));
    faster.addEventListener('click', () => changeTempo(1));
    experimentButton.addEventListener('click', async () => {
      if (experiment || experimentPending || starting) return;
      experimentPending = true;
      syncControls();
      const readiness = running || start();
      const token = generation;
      const ready = await readiness;
      if (token !== generation || !experimentPending) return;
      experimentPending = false;
      if (!ready) { syncControls(); return; }
      const time = audio.currentTime;
      experiment = { start: time, end: time + 3, tempo, count: 0 };
      counter.textContent = '0';
      result.textContent = `템포 ${tempo} 기준으로 3초를 세고 있어요. 실험 동안 템포는 그대로예요.`;
      fill.style.width = '0%';
      track.setAttribute('aria-valuenow', '0');
      syncControls();
    });
    window.addEventListener('lesson:slide', event => {
      if ((owner && String(event.detail?.index) !== owner.dataset.slide) || !isShown()) stop();
    });
    window.addEventListener('reader:state', () => { if (!isShown()) stop(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', () => stop());
    syncControls();
  }

  function initTimer(root) {
    root.classList.add('mt-timer');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', '현재 화면 수업 타이머');
    const readout = make('div', 'mt-timer-readout');
    const label = make('span', 'mt-timer-label', '남은 시간');
    const value = make('span', 'mt-timer-value');
    value.setAttribute('role', 'timer');
    value.setAttribute('aria-live', 'off');
    readout.append(label, value);
    const toggle = button('시작', '수업 타이머 시작');
    toggle.setAttribute('aria-pressed', 'false');
    const reset = button('다시', '현재 화면 권장 시간으로 타이머 리셋');
    const status = live();
    root.append(readout, toggle, reset, status);

    let index = document.querySelector('.slide[data-slide]:not([hidden])')?.dataset.slide
      ?? document.querySelector('.lesson-nav [aria-current="step"][data-go]')?.dataset.go ?? '0';
    let duration = null;
    let remaining = 0;
    let startedAt = null;
    let interval = null;
    let minuteAnnounced = false;
    let endAnnounced = false;
    const clockText = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const timeLeft = () => remaining - (startedAt === null ? 0 : Math.max(0, Date.now() - startedAt));

    function render() {
      const left = timeLeft();
      const ended = duration !== null && left <= 0;
      root.classList.toggle('mt-timer-warning', duration !== null && left > 0 && left <= 60000);
      root.classList.toggle('mt-timer-ended', ended);
      label.textContent = duration === null ? '권장 시간 없음' : ended ? '시간 끝' : '남은 시간';
      value.textContent = duration === null ? '--:--' : ended ? `+${clockText(Math.floor(-left / 1000))}` : clockText(Math.ceil(left / 1000));
      value.setAttribute('aria-label', duration === null ? '권장 시간이 없습니다' : `${ended ? '시간 끝, 초과 시간' : '남은 시간'} ${value.textContent}`);
      root.title = duration === null ? '메뉴에 분 단위 권장 시간을 넣어 주세요.' : `${ended ? '초과 시간' : '남은 시간'} ${value.textContent}`;
      toggle.textContent = startedAt === null ? '시작' : '일시정지';
      toggle.setAttribute('aria-label', startedAt === null ? '수업 타이머 시작 또는 이어서 진행' : '수업 타이머 일시정지');
      toggle.setAttribute('aria-pressed', String(startedAt !== null));
      toggle.disabled = duration === null;
      reset.disabled = duration === null;
      if (startedAt !== null && ended && !endAnnounced) {
        status.textContent = '시간 끝. 이제 초과 시간을 셉니다.';
        endAnnounced = true;
      } else if (startedAt !== null && !ended && left <= 60000 && !minuteAnnounced) {
        status.textContent = '남은 시간이 1분 이하예요.';
        minuteAnnounced = true;
      }
    }

    function resetTimer(announce = false) {
      clearInterval(interval);
      interval = null;
      startedAt = null;
      // Read text, not a separate hard-coded duration table.
      const nav = Array.from(document.querySelectorAll('.lesson-nav [data-go]')).find(item => item.dataset.go === String(index));
      const match = nav?.querySelector('.nav-time')?.textContent.match(/(\d+(?:\.\d+)?)\s*분/);
      const minutes = match ? Number(match[1]) : NaN;
      duration = Number.isFinite(minutes) && minutes > 0 && Number.isSafeInteger(minutes * 60000) ? minutes * 60000 : null;
      remaining = duration ?? 0;
      minuteAnnounced = false;
      endAnnounced = false;
      status.textContent = announce ? '현재 화면의 권장 시간으로 돌아갔어요. 시작을 눌러 주세요.' : '';
      render();
    }

    function pause() {
      if (startedAt === null) return;
      remaining = timeLeft();
      startedAt = null;
      clearInterval(interval);
      interval = null;
      status.textContent = '타이머를 일시정지했어요.';
      render();
    }
    toggle.addEventListener('click', () => {
      if (duration === null) return;
      if (startedAt !== null) { pause(); return; }
      startedAt = Date.now();
      status.textContent = '타이머를 시작했어요.';
      interval = setInterval(render, 200);
      render();
    });
    reset.addEventListener('click', () => resetTimer(true));
    window.addEventListener('lesson:slide', event => {
      const next = event.detail?.index;
      if (next === undefined || next === null || String(next) === String(index)) return;
      index = String(next);
      resetTimer();
    });
    window.addEventListener('pagehide', pause);
    resetTimer();
  }

  function initScoreboard(root) {
    const key = 'signal-scoreboard-v1';
    let count = 4;
    let scores = [0, 0, 0, 0];
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(key));
      if (saved && Number.isInteger(saved.count) && saved.count >= 3 && saved.count <= 6
        && Array.isArray(saved.scores) && saved.scores.length === saved.count
        && saved.scores.every(score => Number.isSafeInteger(score) && score >= 0)) {
        count = saved.count;
        scores = saved.scores.slice();
      }
    } catch {}
    const save = () => {
      try { window.sessionStorage.setItem(key, JSON.stringify({ count, scores })); } catch {}
    };
    panel(root, 'mt-scoreboard', '모둠 점수판');
    const toolbar = make('div', 'mt-score-toolbar');
    const choices = make('div', 'mt-group-choices');
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', '모둠 수 선택');
    choices.append(make('span', 'mt-caption', '모둠 수'));
    const reset = button('점수 초기화', '모든 모둠 점수 초기화, 두 번 눌러 확인', 'mt-score-reset');
    const grid = make('div', 'mt-score-grid');
    const status = live('mt-score-status');
    const countButtons = [];
    let cards = [];
    let confirmUntil = 0;
    let confirmId = null;

    function disarm() {
      clearTimeout(confirmId);
      confirmId = null;
      confirmUntil = 0;
      reset.textContent = '점수 초기화';
      reset.classList.remove('mt-confirm-reset');
    }
    function renderScores() {
      const highest = Math.max(...scores);
      const leaders = scores.filter(score => score === highest).length;
      cards.forEach((card, i) => {
        const leading = scores[i] === highest;
        card.element.classList.toggle('mt-leading', leading);
        card.score.textContent = String(scores[i]);
        card.score.setAttribute('aria-label', `${i + 1}모둠 ${scores[i]}점`);
        card.leader.textContent = leaders > 1 ? '공동 1위' : '1위';
        card.leader.hidden = !leading;
        card.minus.disabled = scores[i] === 0;
        card.plus.disabled = scores[i] === Number.MAX_SAFE_INTEGER;
      });
      countButtons.forEach((item, i) => item.setAttribute('aria-pressed', String(count === i + 3)));
    }
    function buildCards() {
      grid.replaceChildren();
      cards = scores.map((_, i) => {
        const element = make('article', 'mt-score-card');
        element.setAttribute('aria-label', `${i + 1}모둠 점수`);
        const header = make('div', 'mt-score-header');
        const leader = make('span', 'mt-leader-label');
        header.append(make('h3', 'mt-group-name', `${i + 1}모둠`), leader);
        const score = make('strong', 'mt-score-value');
        const actions = make('div', 'mt-score-actions');
        const minus = button('−1', `${i + 1}모둠 1점 빼기`);
        const plus = button('+1', `${i + 1}모둠 1점 더하기`, 'mt-primary');
        const change = delta => {
          const next = scores[i] + delta;
          if (!Number.isSafeInteger(next) || next < 0) return;
          disarm();
          scores[i] = next;
          renderScores();
          save();
          status.textContent = `${i + 1}모둠 ${next}점`;
        };
        minus.addEventListener('click', () => change(-1));
        plus.addEventListener('click', () => change(1));
        actions.append(minus, plus);
        element.append(header, score, actions);
        grid.append(element);
        return { element, score, minus, plus, leader };
      });
      renderScores();
    }
    for (let size = 3; size <= 6; size += 1) {
      const choice = button(String(size), `${size}모둠으로 진행`);
      choice.addEventListener('click', () => {
        if (count === size) return;
        disarm();
        count = size;
        scores = Array.from({ length: count }, (_, i) => scores[i] ?? 0);
        buildCards();
        save();
        status.textContent = `${count}모둠으로 진행해요.`;
      });
      countButtons.push(choice);
      choices.append(choice);
    }
    reset.addEventListener('click', () => {
      if (confirmUntil && Date.now() < confirmUntil) {
        disarm();
        scores.fill(0);
        renderScores();
        save();
        status.textContent = '모든 모둠 점수를 0점으로 초기화했어요.';
      } else {
        disarm();
        confirmUntil = Date.now() + 4000;
        reset.textContent = '한 번 더 누르면 초기화';
        reset.classList.add('mt-confirm-reset');
        status.textContent = '점수를 지우려면 4초 안에 한 번 더 눌러 주세요.';
        confirmId = setTimeout(() => {
          disarm();
          status.textContent = '초기화를 취소했어요. 점수는 그대로예요.';
        }, 4000);
      }
    });
    toolbar.append(choices, reset);
    root.append(toolbar, make('p', 'mt-help', '가장 높은 점수는 노란 테두리로 표시해요. 같은 점수면 함께 표시해요.'), grid, status);
    window.addEventListener('pagehide', disarm);
    buildCards();
  }

  function initSingCheck(root) {
    panel(root, 'mt-sing-check', '함께 부른 뒤 확인해요');
    const items = [
      ['박을 지켰어요', '서두르거나 느려지지 않고, 일정한 박에 맞춰 불렀어요.'],
      ['후렴에 제때 들어갔어요', '후렴이 시작되는 곳을 듣고, 첫마디를 함께 불렀어요.'],
      ['후렴에서 소리를 키웠어요(셈여림)', '목에 힘을 주지 않고, 후렴에서 앞부분보다 조금 크게 불렀어요.']
    ];
    const list = make('div', 'mt-check-list');
    const checked = items.map(() => false);
    const toggles = [];
    const status = live('mt-check-status');
    const reset = button('다시 부르기', '노래 체크리스트 모두 해제');
    function render() {
      toggles.forEach((item, index) => item.setAttribute('aria-pressed', String(checked[index])));
      const total = checked.filter(Boolean).length;
      root.classList.toggle('mt-complete', total === 3);
      status.textContent = total === 3 ? '초록불! 1절 완주' : `${total} / 3 · 함께 부른 모습을 하나씩 확인해요.`;
    }
    items.forEach(([title, description], index) => {
      const toggle = button('', '', 'mt-check-toggle');
      const signal = make('span', 'mt-check-signal', '✓');
      signal.setAttribute('aria-hidden', 'true');
      const text = make('span', 'mt-check-copy');
      text.append(make('strong', 'mt-check-title', title), make('span', 'mt-check-description', description));
      toggle.append(signal, text);
      toggle.addEventListener('click', () => { checked[index] = !checked[index]; render(); });
      toggles.push(toggle);
      list.append(toggle);
    });
    reset.addEventListener('click', () => {
      checked.fill(false);
      render();
      status.textContent = '체크를 모두 해제했어요. 다시 함께 불러 봐요.';
    });
    root.append(list, status, reset);
    render();
  }

  function init() {
    document.querySelectorAll('[data-beat-lab]').forEach(initBeatLab);
    const timer = document.getElementById('lesson-timer');
    if (timer) initTimer(timer);
    document.querySelectorAll('[data-scoreboard]').forEach(initScoreboard);
    document.querySelectorAll('[data-sing-check]').forEach(initSingCheck);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

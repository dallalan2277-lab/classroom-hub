(() => {
  const root = document.querySelector('.relay-slide');
  const data = window.LESSON_DATA;
  if (!root || !data || !Array.isArray(data.lines) || !Array.isArray(data.rounds) || !data.rounds.length) return;

  const get = (id) => document.getElementById(id);
  const ui = {
    number: get('relay-number'), caption: get('relay-draw-caption'), draw: get('relay-draw'), redraw: get('relay-redraw'),
    roundLabel: get('relay-round-label'), roundNumber: get('relay-round-number'), roundTotal: get('relay-round-total'),
    progress: get('relay-round-progress'), locked: get('relay-locked'), question: get('relay-question'),
    lines: get('relay-lines'), answerHelp: get('relay-answer-help'), complete: get('relay-complete'),
    actions: get('relay-question-actions'), reveal: get('relay-reveal'), next: get('relay-next'),
    maximum: get('relay-maximum'), settings: get('relay-settings'), error: get('relay-error'),
    pool: get('relay-number-pool'), poolCount: get('relay-pool-count'), poolEmpty: get('relay-pool-empty'),
    refill: get('relay-refill'), restart: get('relay-restart'), announcement: get('relay-announcement'),
  };
  if (Object.values(ui).some((element) => !element)) return;

  let maximum = 25;
  let available = [];
  let drawn = [];
  let index = 0;
  let selected = null;
  let phase = 'waiting';
  let entries = [];
  const total = data.rounds.length;
  const storageKey = 'signal-relay-v1';
  let pendingMaximum = null;
  let confirmationTimer = null;
  const format = (value) => String(value).padStart(2, '0');
  const currentRound = () => data.rounds[Math.min(index, total - 1)];
  const refillNumbers = () => { available = Array.from({ length: maximum }, (_, i) => i + 1); drawn = []; };
  const announce = (text) => { ui.announcement.textContent = text; };

  function saveState() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ index, phase, drawn, maximum, selected }));
    } catch (_) { /* Storage may be unavailable. */ }
  }

  function restoreState() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return false;
      const state = JSON.parse(raw);
      if (!state || typeof state !== 'object' || !Number.isInteger(state.index) || state.index < 0 || state.index >= total ||
          !Number.isInteger(state.maximum) || state.maximum < 1 || state.maximum > 100 ||
          !['waiting', 'question', 'revealed', 'complete'].includes(state.phase) ||
          !Array.isArray(state.drawn) || state.drawn.some((number) => !Number.isInteger(number) || number < 1 || number > state.maximum) ||
          new Set(state.drawn).size !== state.drawn.length ||
          (state.selected !== null && (!Number.isInteger(state.selected) || !state.drawn.includes(state.selected))) ||
          (state.phase === 'waiting' && state.selected !== null) ||
          ((state.phase === 'question' || state.phase === 'revealed') && state.selected === null) ||
          (state.phase === 'complete' && state.index !== total - 1)) return false;
      ({ index, phase, drawn, maximum, selected } = state);
      available = Array.from({ length: maximum }, (_, i) => i + 1).filter((number) => !drawn.includes(number));
      ui.maximum.value = String(maximum);
      return true;
    } catch (_) { return false; }
  }

  function clearConfirmation() {
    pendingMaximum = null;
    if (confirmationTimer !== null) clearTimeout(confirmationTimer);
    confirmationTimer = null;
  }

  function publish() {
    const round = currentRound();
    const state = {
      from: round.from, to: round.to, visible: phase === 'question' || phase === 'revealed',
      answerRevealed: phase === 'revealed' || phase === 'complete', gaps: round.gaps || [],
      phase, complete: phase === 'complete', index, total, selectedNumber: selected,
    };
    window.relayState = state;
    window.dispatchEvent(new CustomEvent('relay:state', { detail: state }));
  }

  function renderPool() {
    const fragment = document.createDocumentFragment();
    for (let number = 1; number <= maximum; number += 1) {
      const chip = document.createElement('span');
      const used = drawn.includes(number);
      chip.className = 'relay-number-chip' + (used ? ' is-used' : '') + (selected === number ? ' is-current' : '');
      chip.textContent = String(number);
      chip.setAttribute('aria-label', `${number}번, ${used ? '이미 뽑음' : '추첨 가능'}${selected === number ? ', 현재 번호' : ''}`);
      fragment.appendChild(chip);
    }
    ui.pool.replaceChildren(fragment);
    ui.poolCount.textContent = `${available.length}명 남음 · ${drawn.length}명 뽑음`;
    ui.poolEmpty.hidden = available.length !== 0 || phase === 'complete';
    ui.refill.hidden = available.length !== 0 || phase === 'complete';
    ui.refill.disabled = phase !== 'waiting';
    if (!ui.poolEmpty.hidden) {
      ui.poolEmpty.textContent = phase === 'waiting'
        ? '설정한 번호를 모두 뽑았어요. ‘번호 다시 채우기’를 누르면 현재 가사 구간부터 이어갈 수 있어요.'
        : '설정한 번호를 모두 뽑았어요. 이번 정답을 확인하고 다음 구간으로 이동한 뒤 번호를 다시 채워 주세요.';
    }
  }

  function renderQuestion() {
    ui.lines.replaceChildren();
    entries = [];
    if (phase !== 'question' && phase !== 'revealed') return;
    const round = currentRound();
    let gapNumber = 0;
    for (let lineIndex = round.from; lineIndex <= round.to; lineIndex += 1) {
      const line = String(data.lines[lineIndex] || '');
      const paragraph = document.createElement('p');
      paragraph.className = 'relay-line';
      const matches = (round.gaps || []).filter((gap) => gap.line === lineIndex)
        .map((gap) => ({ text: String(gap.text), position: line.indexOf(String(gap.text)) }))
        .filter((gap) => gap.position >= 0 && gap.text.length > 0)
        .sort((a, b) => a.position - b.position);
      let cursor = 0;
      for (const gap of matches) {
        if (gap.position < cursor) continue;
        paragraph.appendChild(document.createTextNode(line.slice(cursor, gap.position)));
        gapNumber += 1;
        const wrap = document.createElement('span');
        wrap.className = 'relay-gap-wrap';
        const input = document.createElement('input');
        input.className = 'relay-gap-input';
        input.type = 'text';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.id = `relay-gap-${index}-${gapNumber}`;
        input.setAttribute('aria-label', `${index + 1}번째 구간, ${gapNumber}번째 가사 빈칸`);
        input.placeholder = String(gapNumber);
        input.style.setProperty('--gap-width', `${Math.max(76, Math.min(165, gap.text.length * 17 + 20))}px`);
        const answer = document.createElement('span');
        answer.className = 'relay-gap-answer';
        answer.textContent = gap.text;
        answer.hidden = true;
        wrap.append(input, answer);
        paragraph.appendChild(wrap);
        entries.push({ input, answer });
        cursor = gap.position + gap.text.length;
      }
      paragraph.appendChild(document.createTextNode(line.slice(cursor)));
      ui.lines.appendChild(paragraph);
    }
  }

  function renderState({ questionChanged = false } = {}) {
    const round = currentRound();
    const isComplete = phase === 'complete';
    const visible = phase === 'question' || phase === 'revealed';
    ui.number.textContent = selected === null ? '—' : String(selected);
    ui.caption.textContent = isComplete ? '1절 가사 잇기 완료!' : selected === null
      ? (available.length ? '먼저 번호를 뽑아 주세요.' : '번호를 다시 채워 주세요.')
      : `${selected}번 학생, 가사를 이어 주세요.`;
    ui.draw.disabled = phase !== 'waiting' || !available.length;
    ui.redraw.disabled = phase !== 'question' || !available.length;
    ui.roundLabel.textContent = isComplete ? '1절 · 모든 구간 완료' : `1절 · ${round.label}`;
    ui.roundNumber.textContent = format(isComplete ? total : index + 1);
    ui.roundTotal.textContent = format(total);
    ui.progress.style.width = `${((isComplete ? total : index) / total) * 100}%`;
    ui.locked.hidden = phase !== 'waiting';
    ui.question.hidden = !visible;
    ui.complete.hidden = !isComplete;
    ui.actions.hidden = isComplete;
    ui.reveal.disabled = phase !== 'question';
    ui.reveal.textContent = phase === 'revealed' ? '정답 공개됨' : '정답 확인';
    ui.next.disabled = phase !== 'revealed';
    ui.next.firstChild.textContent = index === total - 1 ? '활동 마치기 ' : '다음 가사 ';
    ui.answerHelp.hidden = phase !== 'revealed';
    if (questionChanged) renderQuestion();
    entries.forEach(({ input, answer }) => { input.readOnly = phase === 'revealed'; answer.hidden = phase !== 'revealed'; });
    renderPool();
    publish();
    saveState();
  }

  function pickIndex(length) {
    const values = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / length) * length;
    do { window.crypto.getRandomValues(values); } while (values[0] >= limit);
    return values[0] % length;
  }

  ui.draw.addEventListener('click', () => {
    if (phase !== 'waiting' || !available.length) return;
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
      ui.error.hidden = false;
      ui.error.textContent = '이 브라우저에서는 번호 추첨을 실행할 수 없습니다. HTTPS 사이트 또는 최신 브라우저에서 열어 주세요.';
      return;
    }
    selected = available.splice(pickIndex(available.length), 1)[0];
    drawn.push(selected);
    phase = 'question';
    renderState({ questionChanged: true });
    announce(`${selected}번입니다. ${index + 1}번째 가사 구간의 빈칸에 답해 주세요.`);
  });
  // 다시 뽑기: 정답 공개 전에만. 방금 번호는 뽑은 것으로 남기고(결석·자리 비움), 같은 가사 구간에서 다른 번호를 뽑는다.
  ui.redraw.addEventListener('click', () => {
    if (phase !== 'question' || !available.length || !window.crypto || typeof window.crypto.getRandomValues !== 'function') return;
    const skipped = selected;
    selected = available.splice(pickIndex(available.length), 1)[0];
    drawn.push(selected);
    renderState({ questionChanged: true });
    announce(`${skipped}번 대신 ${selected}번입니다. 같은 가사 구간의 빈칸에 답해 주세요.`);
  });
  ui.reveal.addEventListener('click', () => {
    if (phase !== 'question') return;
    phase = 'revealed';
    renderState();
    announce('정답을 공개했습니다. 확인한 뒤 다음 가사로 이동해 주세요.');
  });
  ui.next.addEventListener('click', () => {
    if (phase !== 'revealed') return;
    if (index + 1 >= total) {
      phase = 'complete';
      renderState({ questionChanged: true });
      announce('1절의 모든 가사 구간을 완료했습니다.');
      return;
    }
    index += 1;
    selected = null;
    phase = 'waiting';
    renderState({ questionChanged: true });
    announce(`${index + 1}번째 가사 구간입니다. ${available.length ? '다음 번호를 뽑아 주세요.' : '설정한 번호를 모두 뽑았습니다. 번호 다시 채우기를 눌러 주세요.'}`);
  });
  ui.settings.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = Number(ui.maximum.value);
    if (!ui.maximum.value.trim() || !Number.isInteger(value) || value < 1 || value > 100) {
      clearConfirmation();
      ui.error.hidden = false;
      ui.error.textContent = '최대 번호는 1부터 100까지의 정수로 입력해 주세요.';
      ui.maximum.setAttribute('aria-invalid', 'true');
      return;
    }
    ui.maximum.removeAttribute('aria-invalid');
    if (value === maximum) {
      clearConfirmation();
      ui.error.hidden = true;
      return;
    }
    if (value < maximum && drawn.length &&
        (!pendingMaximum || pendingMaximum.value !== value || Date.now() > pendingMaximum.expires)) {
      clearConfirmation();
      pendingMaximum = { value, expires: Date.now() + 5000 };
      ui.error.hidden = false;
      ui.error.textContent = "이미 뽑은 번호 기록이 지워져요. 바꾸려면 '적용'을 한 번 더 누르세요.";
      confirmationTimer = setTimeout(() => {
        pendingMaximum = null;
        confirmationTimer = null;
        ui.error.hidden = true;
      }, 5000);
      return;
    }
    clearConfirmation();
    ui.error.hidden = true;
    const expanding = value > maximum;
    if (expanding) {
      for (let number = maximum + 1; number <= value; number += 1) available.push(number);
      maximum = value;
    } else {
      maximum = value;
      selected = null;
      if (phase !== 'complete') phase = 'waiting';
      refillNumbers();
    }
    renderState({ questionChanged: !expanding });
    announce(expanding ? `최대 번호를 ${maximum}번으로 늘렸습니다. 뽑은 번호는 그대로 유지됩니다.` : `1번부터 ${maximum}번까지 번호를 새로 채웠습니다. 가사 구간은 그대로 유지됩니다.`);
  });
  ui.maximum.addEventListener('input', () => {
    if (!pendingMaximum) return;
    clearConfirmation();
    ui.error.hidden = true;
  });
  ui.refill.addEventListener('click', () => {
    if (phase !== 'waiting' || available.length) return;
    selected = null;
    refillNumbers();
    renderState();
    announce(`1번부터 ${maximum}번까지 번호를 다시 채웠습니다. ${index + 1}번째 가사 구간부터 계속합니다.`);
  });
  ui.restart.addEventListener('click', () => {
    index = 0;
    selected = null;
    phase = 'waiting';
    refillNumbers();
    clearConfirmation();
    ui.error.hidden = true;
    renderState({ questionChanged: true });
    try { sessionStorage.removeItem(storageKey); } catch (_) { /* Storage may be unavailable. */ }
    announce('가사와 번호를 초기화했습니다. 1절 첫 구간부터 시작합니다.');
    ui.draw.focus({ preventScroll: true });
  });
  if (!restoreState()) refillNumbers();
  renderState({ questionChanged: true });
})();

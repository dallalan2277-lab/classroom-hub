(() => {
  const root = document.querySelector('.term-quiz-slide');
  const lines = window.LESSON_DATA?.lines;
  if (!root || !Array.isArray(lines)) return;

  const names = { intro:'Intro', verse:'Verse', prechorus:'Pre-chorus', chorus:'Chorus', bridge:'Bridge', outro:'Outro' };
  const questions = [
    { answer:'verse', from:0, to:2, clue:'노래가 시작되고 처음 나오는 가사예요. 노래 속 사람이 겪는 일을 처음 들려줘요.', explanation:'Verse(이야기 부분)는 노래 속 상황과 이야기를 들려주는 부분이에요.' },
    { answer:'chorus', from:14, to:17, listen:'이 부분(1절 후렴)을 들려줘요. 노래를 끝까지 들으면서 같은 가락이 다시 나올 때마다 손을 번쩍 들어요!', clue:'똑같은 가사와 가락이 노래에서 세 번이나 나와요.', explanation:'Chorus(후렴)는 되풀이되면서 노래의 가장 중요한 마음을 전해요.' },
    { answer:'prechorus', from:10, to:13, clue:'첫 후렴 바로 앞이에요. 분위기가 점점 올라가요.', explanation:'Pre-chorus(후렴 전 연결)는 이야기와 후렴 사이를 이어 주며 기대감을 만들어요.' },
    { answer:'bridge', from:39, to:42, listen:'두 번째 후렴 뒤를 들려줘요. 처음 듣는 가락이면 주먹을 쥐어요!', clue:'두 번째 후렴이 끝난 뒤, 지금까지와 다른 새로운 가사가 나와요.', explanation:'Bridge(새로운 변화)는 되풀이되던 흐름에 새 느낌을 더해요.' },
    { answer:'intro', listen:'노래 맨 처음을 들려줘요. 목소리가 나오는 순간 손을 들어요!', noLyrics:'가사 없음 · 반주만', clue:'노래가 시작됐지만, 아직 아무도 노래를 부르지 않아요.', explanation:'Intro(시작)는 노래 부르기 전에 반주로 분위기를 여는 부분이에요.' },
    { answer:'outro', listen:'마지막 후렴 끝부분을 들려줘요. 목소리가 끝나면 손을 내려요!', noLyrics:'가사 없음 · 마무리 반주', clue:'마지막 가사까지 다 부른 뒤, 반주만 남아 노래를 끝내요.', explanation:'Outro(마무리)는 노래의 끝을 정리하고 여운을 남겨요.' }
  ];
  const get = id => document.getElementById(id);
  const ui = {
    number:get('term-quiz-number'), total:get('term-quiz-total'), score:get('term-quiz-score'),
    question:get('term-quiz-question'), cueTitle:get('term-quiz-cue-title'), lyrics:get('term-quiz-lyrics'),
    clue:get('term-quiz-clue'), listen:get('term-quiz-listen'), listenText:get('term-quiz-listen-text'), example:get('term-quiz-example'), feedback:get('term-quiz-feedback'),
    feedbackTitle:get('term-quiz-feedback-title'), feedbackText:get('term-quiz-feedback-text'),
    reveal:get('term-quiz-reveal'), next:get('term-quiz-next'), complete:get('term-quiz-complete'),
    result:get('term-quiz-result-score'), restart:get('term-quiz-restart'), announcement:get('term-quiz-announcement')
  };
  if (Object.values(ui).some(element => !element)) return;
  const options = Array.from(root.querySelectorAll('input[name="term-quiz-answer"]'));
  let index = 0;
  let score = 0;
  let answered = false;
  let complete = false;
  const total = questions.length;
  const storageKey = 'signal-termquiz-v1';
  let answers = Array(total).fill(null);

  function saveState() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ index, score, answers, complete }));
    } catch (_) { /* The quiz works even when storage is unavailable. */ }
  }
  function clearState() {
    try { sessionStorage.removeItem(storageKey); } catch (_) { /* Storage is optional. */ }
  }
  function restoreState() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state || !Number.isInteger(state.index) || state.index < 0 || state.index >= total ||
          !Number.isInteger(state.score) || state.score < 0 || state.score > total ||
          typeof state.complete !== 'boolean' || !Array.isArray(state.answers) || state.answers.length !== total ||
          state.answers.some((answer, i) => answer !== null && !options.some(option => option.value === answer)) ||
          state.answers.some((answer, i) => i < state.index ? answer === null : i > state.index && answer !== null) ||
          (state.complete && (state.index !== total - 1 || state.answers[state.index] === null)) ||
          state.answers.reduce((count, answer, i) => count + (answer === questions[i].answer ? 1 : 0), 0) !== state.score) return;
      index = state.index;
      score = state.score;
      answers = state.answers;
      complete = state.complete;
    } catch (_) { /* Ignore blocked storage and invalid JSON. */ }
  }
  restoreState();
  const format = value => String(value).padStart(2,'0');

  function publish() {
    const question = questions[index];
    window.termQuizState = { index, total, complete, answered, from:question.from ?? null, to:question.to ?? null };
    window.dispatchEvent(new CustomEvent('termquiz:state', { detail:window.termQuizState }));
  }
  function announce(message) { ui.announcement.textContent = message; }
  function updateScore() { ui.score.textContent = `맞힌 문제 ${score} / ${total}`; }
  function render() {
    const question = questions[index];
    answered = answers[index] !== null;
    ui.number.textContent = format(index + 1);
    ui.total.textContent = format(total);
    ui.question.hidden = false;
    ui.complete.hidden = true;
    ui.feedback.hidden = true;
    ui.reveal.disabled = true;
    ui.reveal.textContent = '정답 확인';
    ui.next.disabled = true;
    ui.next.textContent = index === total - 1 ? '결과 보기 →' : '다음 문제 →';
    options.forEach(option => {
      option.checked = false;
      option.disabled = false;
      option.closest('.term-quiz-option')?.classList.remove('is-correct','is-wrong');
    });
    ui.lyrics.replaceChildren();
    ui.lyrics.classList.toggle('term-quiz-no-lyrics', Boolean(question.noLyrics));
    if (question.noLyrics) {
      const mark = document.createElement('span');
      mark.className = 'term-quiz-instrumental-mark';
      mark.textContent = '♬';
      mark.setAttribute('aria-hidden','true');
      const text = document.createElement('p');
      text.textContent = question.noLyrics;
      ui.lyrics.append(mark,text);
    } else {
      const fragment = document.createDocumentFragment();
      for (let line = question.from; line <= question.to; line += 1) {
        const text = document.createElement('p');
        text.textContent = lines[line];
        fragment.append(text);
      }
      ui.lyrics.append(fragment);
    }
    ui.example.hidden = !question.noLyrics;
    ui.cueTitle.textContent = question.noLyrics ? '귀로 들어 보세요' : '가사를 읽어 보세요';
    ui.clue.textContent = question.clue;
    ui.listen.hidden = !question.listen;
    ui.listenText.textContent = question.listen || '';
    updateScore();
    if (answered) showAnswer();
    if (complete) showComplete();
    publish();
  }
  function showComplete() {
    ui.question.hidden = true;
    ui.complete.hidden = false;
    ui.result.textContent = String(score);
  }
  function showAnswer() {
    const question = questions[index];
    const selected = options.find(option => option.value === answers[index]);
    const correct = selected.value === question.answer;
    selected.checked = true;
    options.forEach(option => {
      option.disabled = true;
      const label = option.closest('.term-quiz-option');
      label?.classList.toggle('is-correct', option.value === question.answer);
      label?.classList.toggle('is-wrong', option.checked && !correct);
    });
    ui.feedbackTitle.textContent = correct ? `맞았어요! ${names[question.answer]}` : `정답은 ${names[question.answer]}입니다.`;
    ui.feedbackText.textContent = question.explanation;
    ui.feedback.hidden = false;
    ui.reveal.disabled = true;
    ui.reveal.textContent = '확인 완료';
    ui.next.disabled = false;
  }
  options.forEach(option => option.addEventListener('change', () => {
    if (answered || complete) return;
    ui.reveal.disabled = !options.some(item => item.checked);
  }));
  ui.reveal.addEventListener('click', () => {
    if (answered || complete) return;
    const selected = options.find(option => option.checked);
    if (!selected) return;
    const question = questions[index];
    answered = true;
    answers[index] = selected.value;
    if (selected.value === question.answer) score += 1;
    showAnswer();
    saveState();
    updateScore();
    publish();
    announce(`${index+1}번 문제. ${ui.feedbackTitle.textContent} ${question.explanation}`);
  });
  ui.next.addEventListener('click', () => {
    if (!answered || complete) return;
    if (index === total - 1) {
      complete = true;
      showComplete();
      saveState();
      publish();
      announce(`${total}문제 중 ${score}문제를 맞혔습니다. 구조 퀴즈를 완료했습니다.`);
      ui.restart.focus({preventScroll:true});
      return;
    }
    index += 1;
    saveState();
    render();
    announce(`${total}문제 중 ${index+1}번째 문제입니다. 가사와 위치 단서를 살펴보세요.`);
    ui.cueTitle.focus({preventScroll:true});
  });
  ui.restart.addEventListener('click', () => {
    index = 0;
    score = 0;
    complete = false;
    answers = Array(total).fill(null);
    clearState();
    render();
    announce('첫 번째 문제부터 다시 시작합니다.');
    ui.cueTitle.focus({preventScroll:true});
  });
  render();
})();

(() => {
  const options = Array.from(document.querySelectorAll('input[name="story-answer"]'));
  const reveal = document.getElementById('story-reveal');
  const feedback = document.getElementById('story-feedback');
  const feedbackTitle = document.getElementById('story-feedback-title');
  if (reveal && feedback && feedbackTitle) {
    options.forEach(option => option.addEventListener('change', () => {
      reveal.disabled = false;
      feedback.hidden = true;
      options.forEach(item => item.closest('.choice-option')?.classList.toggle('is-selected', item.checked));
    }));
    reveal.addEventListener('click', () => {
      const selected = options.find(option => option.checked);
      if (!selected) return;
      feedbackTitle.textContent = selected.value === '2' ? '정답! 2번이에요. 무엇을 무엇에 빗댔는지 함께 정리해 봐요.' : '아쉬워요. 정답은 2번이에요. 왜 그런지 함께 볼까요?';
      feedback.hidden = false;
    });
  }

  const concepts = {
    "intro": {
      "number": "01",
      "title": "INTRO",
      "reading": "인트로 · 노래의 시작 (전주)",
      "definition": "노래가 시작되기 전에 반주만 먼저 나오는 부분이에요. 앞으로 어떤 분위기의 노래인지 미리 알려 줘요.",
      "clue": "노래 부르는 목소리가 나오기 전에 어떤 악기 소리가 들리는지 들어 보세요.",
      "note": "전주 없이 바로 노래로 시작하는 곡도 있어요."
    },
    "verse": {
      "number": "02",
      "title": "VERSE",
      "reading": "벌스 · 이야기 부분",
      "definition": "노래 속 사람이 겪는 일과 상황을 이야기처럼 들려주는 부분이에요. 1절과 2절은 가락은 비슷하지만 가사가 달라요.",
      "clue": "새로운 이야기가 나오는 곳을 찾아보세요. 1절과 2절의 가사를 비교해 보면 쉽게 알 수 있어요.",
      "note": "우리가 말하는 ‘1절’ 안에는 벌스뿐 아니라 후렴 전 연결 부분과 후렴도 들어 있어요."
    },
    "prechorus": {
      "number": "03",
      "title": "PRE-CHORUS",
      "reading": "프리코러스 · 후렴 전 연결 부분",
      "definition": "이야기 부분(벌스)과 후렴 사이를 이어 주는 다리예요. 분위기가 점점 올라가서 ‘이제 후렴이 나오겠다!’ 하는 기대감을 만들어요.",
      "clue": "후렴 바로 앞에서 노래가 점점 고조되는지 들어 보세요.",
      "note": "이 부분 없이 바로 후렴으로 넘어가는 곡도 있어요."
    },
    "chorus": {
      "number": "04",
      "title": "CHORUS",
      "reading": "코러스 · 후렴",
      "definition": "중심이 되는 가사와 가락이 여러 번 되풀이되는, 노래에서 가장 중요한 부분이에요. 되풀이될 때 가사가 조금 달라지기도 해요. 노래 제목을 떠올리면 가장 먼저 생각나는 부분이기도 해요.",
      "clue": "노래를 듣고 나서 머릿속에 계속 맴도는 부분을 찾아보세요. 몇 번 되풀이되는지도 세어 봐요.",
      "note": "소리가 크다고 다 후렴은 아니에요. ‘되풀이’와 ‘중요한 마음’을 함께 확인해요."
    },
    "bridge": {
      "number": "05",
      "title": "BRIDGE",
      "reading": "브리지 · 새로운 변화",
      "definition": "후렴이 몇 번 나온 뒤, 지금까지와 다른 가락이나 가사가 나오는 부분이에요. 노래가 지루하지 않게 새로운 느낌을 줘요.",
      "clue": "후렴을 두 번 들은 뒤, 처음 듣는 듯한 새로운 부분이 나오는지 들어 보세요.",
      "note": "후렴 전 연결 부분(프리코러스)과 헷갈리지 않도록 위치를 잘 살펴봐요."
    },
    "outro": {
      "number": "06",
      "title": "OUTRO",
      "reading": "아웃트로 · 마무리 (후주)",
      "definition": "노래가 끝날 때 반주나 반복되는 말로 마무리하는 부분이에요. 노래의 여운을 남겨요.",
      "clue": "마지막 가사가 끝난 뒤 어떤 소리로 노래가 끝나는지 들어 보세요.",
      "note": "후렴과 함께 바로 끝나서 마무리 부분이 따로 없는 곡도 있어요."
    }
  };
  const dialog = document.getElementById('form-dialog');
  const close = document.getElementById('concept-dialog-close');
  if (!dialog || !close) return;
  let trigger = null;
  document.querySelectorAll('[data-concept]').forEach(button => button.addEventListener('click', () => {
    const concept = concepts[button.dataset.concept];
    if (!concept) return;
    trigger = button;
    document.getElementById('concept-dialog-index').textContent = `SONG FORM ${concept.number}`;
    document.getElementById('concept-dialog-reading').textContent = concept.reading;
    document.getElementById('concept-dialog-title').textContent = concept.title;
    document.getElementById('concept-dialog-definition').textContent = concept.definition;
    document.getElementById('concept-dialog-clue').textContent = concept.clue;
    document.getElementById('concept-dialog-note').textContent = concept.note;
    dialog.showModal();
    close.focus({preventScroll:true});
  }));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => trigger?.focus({preventScroll:true}));
})();

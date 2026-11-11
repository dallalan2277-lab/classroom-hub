(() => {
  const map = document.getElementById('song-map');
  const detail = document.getElementById('song-map-detail');
  const data = window.LESSON_DATA;
  if (!map || !detail || !data?.sections || !data?.lines) return;

  const parts = {
    'Intro':      { ko: '시작', kind: 'intro',  role: '목소리가 나오기 전, 반주로 분위기를 열어요.' },
    'Verse 1':    { ko: '이야기', kind: 'verse', role: '노래 속 사람이 겪는 일을 들려줘요.' },
    'Verse 2':    { ko: '이야기', kind: 'verse', role: '1절과 비슷한 가락에 새로운 이야기가 나와요.' },
    'Pre-chorus': { ko: '연결', kind: 'pre',   role: '분위기를 끌어올려 후렴을 준비해요.' },
    'Chorus':     { ko: '후렴', kind: 'chorus', role: '가장 중요한 마음이 되풀이돼요.' },
    'Bridge':     { ko: '변화', kind: 'bridge', role: '지금까지와 다른 새로운 가락과 가사가 나와요.' },
    'Outro':      { ko: '마무리', kind: 'outro', role: '반주로 노래를 끝맺어요.' }
  };
  const blocks = [
    { form: 'Intro', label: '노래 시작', from: null, to: null, size: 3 },
    ...data.sections.map(s => ({ form: s.form, label: s.label, from: s.from, to: s.to, size: s.to - s.from + 1 })),
    { form: 'Outro', label: '노래 끝', from: null, to: null, size: 3 }
  ];
  let chorusCount = 0;
  const pad = n => String(n).padStart(2, '0');

  const buttons = blocks.map((block, i) => {
    const info = parts[block.form] || { ko: block.form, kind: 'verse', role: '' };
    if (info.kind === 'chorus') chorusCount += 1;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `song-block song-${info.kind}`;
    b.style.flexGrow = String(block.size);
    b.dataset.index = String(i);
    b.setAttribute('aria-pressed', 'false');
    const ko = document.createElement('b');
    ko.textContent = info.kind === 'chorus' ? `${info.ko} ${chorusCount}` : info.ko;
    const en = document.createElement('small');
    en.textContent = block.form.replace(' 1', '').replace(' 2', '');
    b.append(ko, en);
    b.setAttribute('aria-label', `${block.label}, ${info.ko} (${block.form})`);
    b.addEventListener('click', () => select(i));
    map.append(b);
    return b;
  });

  const note = document.getElementById('song-map-count');
  if (note) note.textContent = `후렴이 모두 ${chorusCount}번 나와요`;

  function select(i) {
    const block = blocks[i];
    const info = parts[block.form] || { ko: block.form, role: '' };
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    detail.replaceChildren();
    const head = document.createElement('p');
    head.className = 'song-detail-head';
    head.textContent = `${block.label} · ${info.ko} (${block.form})`;
    const role = document.createElement('p');
    role.className = 'song-detail-role';
    role.textContent = info.role;
    detail.append(head, role);
    if (block.from !== null) {
      const first = document.createElement('p');
      first.className = 'song-detail-line';
      first.textContent = `가사 ${pad(block.from + 1)}–${pad(block.to + 1)} · “${data.lines[block.from]} …”`;
      detail.append(first);
    } else {
      const inst = document.createElement('p');
      inst.className = 'song-detail-line';
      inst.textContent = '가사 없음 · 반주만 나와요';
      detail.append(inst);
    }
    window.songMapState = block.from === null ? null : { from: block.from, to: block.to };
    window.dispatchEvent(new CustomEvent('songmap:state', { detail: window.songMapState }));
  }
})();

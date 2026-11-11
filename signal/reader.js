(() => {
  const root = document.querySelector('.reader-slide');
  const lines = window.LESSON_DATA?.lines;
  if (!root || !Array.isArray(lines)) return;

  const steps = [
    {
      "from": 0,
      "to": 2,
      "label": "첫걸음",
      "ask": "가고 싶은 곳이 생겼는데 누가 막는다면, 어떤 기분이 들까?",
      "title": "가고 싶은데 앞이 막혔어요",
      "tag": "빨간불 · 멈춤",
      "signal": "red",
      "technique": "‘목적지’는 내가 정한 목표, 앞을 ‘막아서는’ 신호는 지금 부딪힌 어려움에 빗대었어요.",
      "interpretation": "하고 싶은 것을 정했는데 주변 상황 때문에 바로 시작할 수 없어 답답한 마음이에요.",
      "evidence": "목적지 → 나의 목표 / 막아서네 → 앞을 가로막는 어려움"
    },
    {
      "from": 3,
      "to": 4,
      "label": "빨간 얼굴",
      "ask": "얼굴이 ‘새빨개지는’ 건 언제일까?",
      "title": "빨간불이 화난 얼굴로 바뀌어요",
      "tag": "빨강 · 색으로 본 마음",
      "signal": "red",
      "technique": "신호등의 빨간색을 ‘새빨간 얼굴’로 이어서, 색깔로 마음을 보여 줘요.",
      "interpretation": "‘화를 냈던’이라는 말과 함께 읽으면, 빨강은 화나고 답답한 마음이에요.",
      "evidence": "신호등의 빨강 → 새빨간 얼굴 → 화난 마음"
    },
    {
      "from": 5,
      "to": 7,
      "label": "서두르라는 신호",
      "ask": "아직 준비가 안 됐는데 ‘빨리 해!’ 소리를 들으면 어떨까?",
      "title": "초록불은 빨리 가라고 재촉해요",
      "tag": "초록불 · 재촉",
      "signal": "green",
      "technique": "출발하라는 초록 신호를, 준비가 덜 됐는데도 서두르라고 하는 세상에 빗대었어요.",
      "interpretation": "이미 출발은 했지만 세상이 원하는 속도를 따라가기 힘든 마음이에요.",
      "evidence": "재촉하네 ↔ 걷기도 힘든데 → 원하는 속도와 내 속도가 달라요"
    },
    {
      "from": 8,
      "to": 9,
      "label": "파란 얼굴",
      "ask": "‘새파랗게 질렸다’는 말은 어떤 상황에서 쓸까?",
      "title": "초록불이 겁먹은 얼굴로 바뀌어요",
      "tag": "파랑 · 색으로 본 마음",
      "signal": "green",
      "technique": "신호등의 초록(푸른)색을 ‘새파랗게 겁에 질려’라는 표현으로 이어 썼어요.",
      "interpretation": "앞의 화난 마음과 달리, 무섭고 움츠러든 마음을 색으로 보여 줘요.",
      "evidence": "신호등의 푸른색 → 새파랗게 → 겁먹은 마음"
    },
    {
      "from": 10,
      "to": 11,
      "label": "도로의 모습",
      "listen": "듣고 손 신호: 후렴 전 연결 부분이 시작되면, 음악이 점점 커지는 만큼 손을 조금씩 높이 올려 봐요.",
      "ask": "횡단보도를 위에서 보면 무엇처럼 보일까?",
      "title": "건반처럼 생긴 도로 위의 나",
      "tag": "도로 · 눈에 보이는 비유",
      "signal": "neutral",
      "technique": "흰 줄과 검은 줄이 번갈아 있는 횡단보도를 피아노 건반에 빗대었어요.",
      "interpretation": "수많은 사람과 차가 오가는 도로는, 초보에게 복잡하고 정신없는 세상처럼 느껴져요.",
      "evidence": "건반처럼 생긴 도로 → 모양이 닮은 것끼리 빗댐"
    },
    {
      "from": 12,
      "to": 13,
      "label": "규칙과 판단",
      "listen": "듣고 손 신호: 이 연결 부분이 끝나고 후렴으로 넘어가는 순간 손을 번쩍! 그때 소리가 얼마나 커지는지(셈여림) 느껴 봐요.",
      "ask": "‘시키는 대로 하기’와 ‘내가 정하기’ 중 뭐가 더 어려울까?",
      "title": "시키는 건 쉬운데, 정하는 건 어려워요",
      "tag": "규칙 · 내 판단",
      "signal": "neutral",
      "technique": "정해진 신호대로 멈추고 가는 일과, 스스로 판단하는 일을 나눠서 보여 줘요.",
      "interpretation": "규칙을 지키는 건 문제없지만, 애매한 순간에 직접 골라야 할 때가 진짜 어려운 거예요.",
      "evidence": "말은 잘 들어 / 문제가 아냐 → 시키는 대로는 할 수 있어요"
    },
    {
      "type": "video",
      "from": 14,
      "to": 17,
      "label": "노란불 배경 영상"
    },
    {
      "type": "beat",
      "from": 14,
      "to": 15,
      "label": "3초는 몇 박?"
    },
    {
      "from": 14,
      "to": 17,
      "label": "노란 신호",
      "listen": "듣고 그리기: 후렴 가락이 올라가면 손을 올리고, 내려가면 손을 내리며 가락선을 그려 봐요.",
      "ask": "빨강과 초록 사이 ‘3초’ 동안, 운전자는 무엇을 고민할까?",
      "title": "후렴에 신호등의 세 색이 모여요",
      "tag": "세 색 · 제목과 연결",
      "signal": "yellow",
      "technique": "빨강·초록·노랑을 한꺼번에 불러서 제목 ‘신호등’을 다시 떠올리게 해요.",
      "interpretation": "그 사이 짧은 3초는, 혼자 빨리 결정해야 해서 불안한 초보의 마음이에요.",
      "evidence": "붉은색 · 푸른색 · 노란색 → 제목 ‘신호등’의 세 색"
    },
    {
      "from": 18,
      "to": 21,
      "label": "머릿속이 하얘질 때",
      "ask": "너무 당황해서 머릿속이 ‘텅 빈’ 적이 있었나요?",
      "title": "노란불 앞에서 눈앞이 캄캄해요",
      "tag": "노랑 · 색으로 본 마음",
      "signal": "yellow",
      "technique": "신호등의 노란색을 ‘눈앞이 샛노랄 뿐’이라는 말로 이어 썼어요.",
      "interpretation": "빠른지 느린지도 모를 만큼 당황해서 아무 생각도 나지 않는 마음이에요.",
      "evidence": "신호등의 노랑 → 눈앞이 샛노랄 뿐 → 당황한 마음"
    },
    {
      "from": 22,
      "to": 24,
      "label": "어린 시절",
      "ask": "‘어릴 때가 더 좋았다’고 느낀 적이 있다면, 왜였을까?",
      "title": "그때가 더 좋았던 것 같아요",
      "tag": "그리움 · 책임",
      "signal": "neutral",
      "technique": "운전대를 잡기 전 어린 시절은, 스스로 책임질 일이 적던 때를 뜻해요.",
      "interpretation": "지금 짊어진 부담이 클수록, 걱정 없던 어린 시절이 그리워져요.",
      "evidence": "운전대를 못 잡던 어릴 때 ↔ 지금의 나"
    },
    {
      "from": 25,
      "to": 26,
      "label": "함께 걷던 친구",
      "ask": "새 학년 첫날, 옆에 친한 친구가 있으면 무엇이 달라질까?",
      "title": "곁에 있던 친구가 그리워요",
      "tag": "함께 · 든든함",
      "signal": "neutral",
      "technique": "함께 걷던 친구는, 혼자 결정하지 않아도 됐던 든든함을 떠올리게 해요.",
      "interpretation": "그리운 것은 어린 나이만이 아니라, 옆에 있어 주던 친구일 수도 있어요.",
      "evidence": "함께 온 세상을 거닐 친구 → 그때가 좋았던 이유"
    },
    {
      "from": 27,
      "to": 30,
      "label": "아직 초보인 나",
      "ask": "‘초짜’라고 말하는 사람은 주변에 무엇을 바랄까?",
      "title": "나는 아직 초보란 말이야",
      "tag": "초보 · 성장",
      "signal": "green",
      "technique": "빠르게 번갈아 비추는 조명은, 빨리 바뀌는 세상과 나를 보는 시선 같아요.",
      "interpretation": "아직 서툰 나를 조금만 기다려 주고 이해해 달라는 마음으로 읽을 수 있어요.",
      "evidence": "빠르게 비추는 조명 ↔ 난 아직 초짜"
    },
    {
      "from": 31,
      "to": 34,
      "label": "다시 돌아온 신호",
      "listen": "듣고 손 신호: 1절 후렴과 같은 가락이 돌아오는 순간 손을 들어요. 1절과 무엇이 같고 무엇이 다른가요?",
      "ask": "같은 후렴이 또 나오면, 처음 들을 때와 느낌이 같을까?",
      "title": "후렴이 다시 돌아와요",
      "tag": "후렴 · 되풀이",
      "signal": "yellow",
      "technique": "1절과 똑같은 후렴이 되풀이되면서 노래의 가장 중요한 마음을 다시 강조해요.",
      "interpretation": "2절의 그리움을 듣고 나서 부르는 후렴은, 혼란이 더 생생하게 느껴져요.",
      "evidence": "같은 후렴이 다시 나옴 → 가장 중요한 마음 강조"
    },
    {
      "from": 35,
      "to": 38,
      "label": "나만의 속도",
      "ask": "나에게 맞는 속도는 빠른 걸까, 느린 걸까?",
      "title": "나에게 맞는 속도 찾기",
      "tag": "노란불 · 내 속도",
      "signal": "yellow",
      "technique": "‘빠른지도 느린지도 모르겠다’는 말이 반복되며, 고민이 계속되고 있음을 보여 줘요.",
      "interpretation": "이런 고민은 자라면서 많은 사람이 겪을 수 있어요. 남의 속도 말고 나에게 맞는 속도를 생각해 봐요.",
      "evidence": "반복되는 ‘모르겠어’ → 나만의 속도 돌아보기"
    }
  ];

  const get = id => document.getElementById(id);
  const ui = {
    label:get('reader-lyric-label'),range:get('reader-line-range'),lines:get('reader-lyric-lines'),
    title:get('reader-analysis-title'),tag:get('reader-technique-tag'),technique:get('reader-technique'),
    interpretation:get('reader-interpretation'),evidence:get('reader-evidence-text'),
    current:get('reader-count-current'),total:get('reader-count-total'),note:get('reader-position-note'),
    prev:get('reader-prev'),next:get('reader-next'),one:get('reader-jump-one'),two:get('reader-jump-two'),videoJump:get('reader-jump-video'),announcement:get('reader-announcement'),
    grid:root.querySelector('.reader-grid'),beat:get('reader-beat-step'),listen:get('reader-listen'),listenText:get('reader-listen-text'),ask:get('reader-ask'),reveal:get('reader-reveal'),answer:get('reader-answer'),video:get('reader-video-step'),countLabel:get('reader-count-label'),
    feedback:get('dilemma-feedback'),connection:get('dilemma-connection')
  };
  if (Object.values(ui).some(element => !element)) return;
  let index = 0;
  const format = n => String(n).padStart(2,'0');
  const videoIndex = steps.findIndex(step => step.type === 'video');
  const secondVerseIndex = steps.findIndex(step => step.from === 22);
  // 아티팩트에서는 YouTube를 페이지 안에 넣을 수 없어서, 영상은 새 탭 링크로 엽니다.
  function stopDilemmaVideo() {}

  const choices = [...root.querySelectorAll('[data-dilemma-choice]')];
  choices.forEach(button => button.addEventListener('click', () => {
    const correct = button.dataset.dilemmaChoice === '2';
    choices.forEach(choice => {
      choice.setAttribute('aria-pressed', String(choice === button));
      choice.classList.toggle('is-correct', choice === button && correct);
      choice.classList.toggle('is-retry', choice === button && !correct);
    });
    ui.feedback.textContent = correct ? '맞아요! 아주 짧은 시간 안에 멈출지 갈지 정해야 해서 부담스러워요.' : '다시 생각해 봐요. 색깔이나 길보다, ‘짧은 시간에 정해야 한다’는 점이 중요해요.';
    ui.feedback.dataset.correct = String(correct);
    ui.connection.hidden = !correct;
  }));

  window.addEventListener('lesson:slide', event => {
    if (event.detail.index !== Number(root.dataset.slide)) stopDilemmaVideo();
  });

  function render({announce=false}={}) {
    const step = steps[index];
    const verse = index < secondVerseIndex ? '1절' : '2절';
    const isBeat = step.type === 'beat';
    const isVideo = step.type === 'video';
    const isSpecial = isVideo || isBeat;
    ui.grid.hidden = isSpecial;
    ui.video.hidden = !isVideo;
    ui.beat.hidden = !isBeat;
    ui.countLabel.textContent = isVideo ? '배경 이해' : isBeat ? '박 세기' : '가사 읽기';
    if (!isVideo) stopDilemmaVideo();
    if (!isSpecial) {
      ui.listen.hidden = !step.listen;
      ui.listenText.textContent = step.listen || '';
      const fragment = document.createDocumentFragment();
      for(let i=step.from;i<=step.to;i++) {
        const p=document.createElement('p');
        p.textContent=lines[i];
        fragment.append(p);
      }
      ui.lines.replaceChildren(fragment);
      ui.label.textContent=`${verse} · ${step.label}`;
      ui.range.textContent=`가사 ${format(step.from+1)}–${format(step.to+1)}`;
      ui.title.textContent=step.title;
      ui.tag.textContent=step.tag;
      ui.tag.dataset.signal=step.signal;
      ui.technique.textContent=step.technique;
      ui.interpretation.textContent=step.interpretation;
      ui.evidence.textContent=step.evidence;
      ui.ask.textContent=step.ask;
      setRevealed(false);
    }
    ui.current.textContent=format(index+1);
    ui.total.textContent=format(steps.length);
    ui.note.textContent=isBeat ? '첫 후렴 전 · 가사 속 ‘3초’를 박으로 세어 봐요' : isVideo ? '첫 후렴 전 · 영상 보기 → 문제 풀기 → 가사와 연결' : `${verse} · 가사 ${format(step.from+1)}–${format(step.to+1)}을 읽고 있어요.`;
    ui.prev.disabled=index===0;
    ui.next.disabled=index===steps.length-1;
    ui.one.setAttribute('aria-pressed',String(index<secondVerseIndex && !isSpecial));
    ui.two.setAttribute('aria-pressed',String(index>=secondVerseIndex));
    ui.videoJump.setAttribute('aria-pressed',String(isVideo));
    window.readerState={from:step.from,to:step.to,index,total:steps.length,label:`${verse} · ${step.label}`};
    window.dispatchEvent(new CustomEvent('reader:state',{detail:window.readerState}));
    if(announce) ui.announcement.textContent=`${steps.length}개 구간 중 ${index+1}번째. ${verse}, ${step.label}.`;
  }

  function setRevealed(open){
    ui.answer.hidden=!open;
    ui.reveal.setAttribute('aria-expanded',String(open));
    ui.reveal.textContent=open?'해설 접기':'해설 보기';
  }
  ui.reveal.addEventListener('click',()=>setRevealed(ui.answer.hidden));

  ui.prev.addEventListener('click',()=>{if(index>0){index--;render({announce:true});}});
  ui.next.addEventListener('click',()=>{if(index<steps.length-1){index++;render({announce:true});}});
  ui.one.addEventListener('click',()=>{index=0;render({announce:true});});
  ui.two.addEventListener('click',()=>{index=secondVerseIndex;render({announce:true});});
  ui.videoJump.addEventListener('click',()=>{index=videoIndex;render({announce:true});});
  render();
})();

(() => {
  const { lines, sections } = window.LESSON_DATA;
  const rail = document.getElementById('lyrics-rail');
  const body = document.getElementById('lyrics-body');
  const mobileToggle = document.getElementById('lyrics-toggle');
  let activeRange = null;
  let lastSlide = -1;
  let stage = null;
  let reader = window.readerState;
  sections.forEach(section => {
    const group = document.createElement('section');
    group.className = 'lyrics-group';
    group.id = `lyrics-${section.id}`;
    group.dataset.from = section.from;
    group.dataset.to = section.to;
    const header = document.createElement('h3');
    const name = document.createElement('span');
    name.textContent = section.label;
    const tag = document.createElement('small');
    tag.textContent = section.form;
    header.append(name,tag);
    if(section.exam) group.classList.add('exam-lyrics');
    group.append(header);
    for(let i=section.from;i<=section.to;i++) {
      const line = document.createElement('p');
      line.className='lyrics-line';
      line.dataset.line=i;
      const number=document.createElement('span');
      number.className='lyrics-line-number';
      number.textContent=String(i+1).padStart(2,'0');
      const text=document.createElement('span');
      text.className='lyrics-line-text';
      text.textContent=lines[i];
      line.append(number,text);
      group.append(line);
    }
    body.append(group);
  });
  const getSlide=()=>Number(document.querySelector('.slide:not([hidden])')?.dataset.slide||0);
  function update({scroll=false}={}) {
    const slide=getSlide();
    const game=slide===5 ? (stage||window.relayState) : null;
    let range=null;
    if(game && !game.complete && Number.isInteger(game.from)) range={from:game.from,to:game.to};
    else if(slide===2 && reader) range={from:reader.from,to:reader.to};
    else if(slide===3 && window.songMapState) range={from:window.songMapState.from,to:window.songMapState.to};
    else if(slide===4) range={from:0,to:21};
    activeRange=range;
    body.querySelectorAll('.lyrics-line').forEach(line=>{
      const index=Number(line.dataset.line);
      const isCurrent=Boolean(range&&index>=range.from&&index<=range.to);
      line.classList.toggle('current-line',isCurrent);
      if(isCurrent) line.setAttribute('aria-current','true'); else line.removeAttribute('aria-current');
      const text=line.querySelector('.lyrics-line-text');
      text.replaceChildren();
      const gaps=game&&!game.answerRevealed ? (game.gaps||[]).filter(g=>g.line===index) : [];
      const hiddenByDraw=game&&game.visible===false&&isCurrent;
      if(hiddenByDraw) {
        const mask=document.createElement('span');
        mask.className='lyrics-wait-mask';
        mask.textContent='번호를 뽑으면 펼쳐져요';
        text.append(mask);
      } else if(gaps.length) {
        let remaining=lines[index];
        const parts=[];
        let cursor=0;
        const positions=gaps.map(g=>({...g,start:remaining.indexOf(g.text)})).filter(g=>g.start>=0).sort((a,b)=>a.start-b.start);
        for(const gap of positions){
          parts.push(document.createTextNode(remaining.slice(cursor,gap.start)));
          const mask=document.createElement('span');
          mask.className='lyrics-answer-mask';
          mask.textContent='빈칸';
          mask.setAttribute('aria-label','현재 문제의 빈칸');
          parts.push(mask);
          cursor=gap.start+gap.text.length;
        }
        parts.push(document.createTextNode(remaining.slice(cursor)));
        text.append(...parts);
      } else text.textContent=lines[index];
    });
    const note=document.getElementById('lyrics-mode-note');
    note.textContent=slide===5 ? '활동 중인 구간의 정답은 전문에서도 함께 가립니다.' : '가사 전문을 보면서 해설과 노래를 함께 따라가세요.';
    document.querySelectorAll('[data-lyrics-jump]').forEach(button=>{
      const target=Number(button.dataset.lyricsJump);
      const active=range ? (target===0&&range.to<=21)||(target===22&&range.from>=22&&range.to<=38)||(target===39&&range.from>=39) : false;
      button.classList.toggle('active',active);
    });
    if(scroll&&range) scrollToLine(range.from);
    lastSlide=slide;
  }
  function scrollToLine(index){
    const group=[...body.querySelectorAll('.lyrics-group')].find(g=>index>=Number(g.dataset.from)&&index<=Number(g.dataset.to));
    const line=body.querySelector(`[data-line="${index}"]`);
    if(!line)return;
    const target=index===Number(group?.dataset.from)?group:line;
    const top=target.getBoundingClientRect().top-body.getBoundingClientRect().top+body.scrollTop-14;
    body.scrollTo({top,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  }
  document.querySelectorAll('[data-lyrics-jump]').forEach(button=>button.addEventListener('click',()=>scrollToLine(Number(button.dataset.lyricsJump))));
  document.getElementById('lyrics-current').addEventListener('click',()=>scrollToLine(activeRange?.from||0));
  mobileToggle.addEventListener('click',()=>{
    const open=rail.classList.toggle('mobile-open');
    mobileToggle.setAttribute('aria-expanded',String(open));
    mobileToggle.querySelector('span').textContent=open?'가사 접기':'가사 전문';
    if(open&&activeRange)scrollToLine(activeRange.from);
  });
  document.getElementById('lyrics-close').addEventListener('click',()=>{
    rail.classList.remove('mobile-open');
    mobileToggle.setAttribute('aria-expanded','false');
    mobileToggle.querySelector('span').textContent='가사 전문';
    mobileToggle.focus();
  });
  window.addEventListener('lesson:slide',()=>update({scroll:true}));
  window.addEventListener('relay:state',event=>{
    const previous=stage;
    stage=event.detail;
    if(getSlide()===5)update({scroll:previous?.from!==stage.from||lastSlide!==5});
  });
  window.addEventListener('songmap:state',()=>{ if(getSlide()===3) update({scroll:true}); });
  window.addEventListener('reader:state',event=>{
    reader=event.detail;
    if(getSlide()===2)update({scroll:true});
  });
  const smaller=document.getElementById('lyrics-smaller');
  const larger=document.getElementById('lyrics-larger');
  let size=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lyrics-size'))||17;
  function resizeLyrics(change){
    size=Math.max(16,Math.min(24,size+change));
    document.documentElement.style.setProperty('--lyrics-size',`${size}px`);
    smaller.disabled=size<=16;
    larger.disabled=size>=24;
  }
  smaller?.addEventListener('click',()=>resizeLyrics(-1));
  larger?.addEventListener('click',()=>resizeLyrics(1));
  update();
})();

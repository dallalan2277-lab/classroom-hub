'use strict';
function videoTime(seconds){return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
function performanceSection(instrument){
  const video=window.PERFORMANCE_VIDEO,scene=video?.scenes.find(s=>s.id===instrument.id);
  if(!scene)return '';
  const time=videoTime(scene.start),url=video.url+'&t='+scene.start+'s';
  const pair=['18','19'].includes(instrument.id)?'어와 부가':['21','22'].includes(instrument.id)?'나발과 나각이':'';const shared=pair?`<p class="video-shared-note">${pair} 함께 소개되는 구간에서 시작해요.</p>`:'';
  return `<section class="performance-panel" id="performanceVideo" data-instrument="${instrument.id}" aria-labelledby="performanceTitle"><div class="performance-heading"><div><span class="section-kicker">WATCH & LISTEN · 연주 감상</span><h2 id="performanceTitle">${esc(instrument.name)}, 실제 연주로 만나요.</h2></div><span class="video-time-badge">${time}부터</span></div><div class="performance-grid"><div class="video-stage" id="performanceStage"><button class="video-poster" id="playPerformance" aria-label="${esc(instrument.name)} 연주 장면 ${time}부터 재생"><span class="video-play-icon" aria-hidden="true">▶</span><strong>${esc(instrument.name)} 연주 장면 보기</strong><span>${time}부터 재생</span></button></div><div class="performance-copy"><h3>눈으로 보고, 귀로 발견해요.</h3><p>연주자의 손과 입을 살펴보세요.<br>어느 부분이 움직이며 소리가 날까요?</p><p>소리의 높낮이와 울림은 어떤가요?<br>알게 된 특징을 아래 메모에 남겨 보세요.</p>${shared}<div class="performance-actions"><button class="video-restart" id="restartPerformance" hidden>↺ 이 장면 처음부터 다시 보기</button><a class="video-external" href="${esc(url)}" target="_blank" rel="noopener">YouTube에서 ${time}부터 보기 ↗</a></div><p class="video-help">영상이 재생되지 않으면 YouTube 링크를 이용해 주세요. 지정된 장면부터 시작한 뒤 다음 내용으로 이어집니다.</p></div></div><p class="performance-credit">${esc(video.title)} · ${esc(video.credit)}</p></section>`;
}
function bindPerformanceVideo(){
  const section=document.querySelector('#performanceVideo');
  if(!section)return;
  const video=window.PERFORMANCE_VIDEO,scene=video.scenes.find(s=>s.id===section.dataset.instrument);
  const play=()=>{
    const frame=document.createElement('iframe');
    frame.id='performancePlayer';
    frame.title=scene.name+' 연주 영상 · '+videoTime(scene.start)+'부터';
    frame.src='https://www.youtube-nocookie.com/embed/'+video.videoId+'?start='+scene.start+'&autoplay=1&rel=0&playsinline=1';
    frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.allowFullscreen=true;
    section.querySelector('#performanceStage').replaceChildren(frame);
    section.querySelector('#restartPerformance').hidden=false;
  };
  const start=section.querySelector('#playPerformance');
  if(start)start.onclick=play;
  section.querySelector('#restartPerformance').onclick=play;
}

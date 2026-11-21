/* 방구석 세계 음악 여행 · 교과서 24~25쪽 */
(function () {
  'use strict';

  function clip(id, title, start, seconds, by, mode) {
    return { id: id, title: title, by: by, start: start, end: start + seconds, mode: mode || 'board' };
  }
  var V = {
    shamisen: clip('iJhlX6Lkq_Y', '소리 1', 8, 30, ''),
    pipa: clip('ksiM1wRcutQ', '소리 2', 32, 30, 'The Met'),
    kulintang: clip('Czh1oqx0Bpw', '필리핀의 작은 징 합주', 12, 30, 'Harold Andre'),
    banjo: clip('fnMhUPewk6c', '미국의 줄 악기', 3, 30, 'WillowOsborne'),
    mariachi: clip('zPIeuoaOrTY', '멕시코의 악단', 120, 40, ''),
    samba: clip('DdSQNrkXm9U', '브라질의 축제 음악', 150, 30, ''),
    didgeridoo: clip('BvbSNhdvs8c', '호주의 나무 대롱', 0, 30, ''),
    bandoneon: clip('9bcLWrCxCA0', '독일에서 온 주름상자', 0, 30, 'Judith Brandenburg'),
    orutu: clip('CRTHaSTBVoE', '케냐의 줄 하나 악기', 0, 30, 'Eric O Meli', 'solo'),
    haka: clip('etTpaLR6avI', '마오리의 전통 춤', 0, 40, 'NZ Defence Force', 'solo'),
    jambo: clip('yNsOo2mW6JM', '케냐의 노래', 0, 75, 'Them Mushrooms'),
    molihua: clip('LUnCaLHftLA', '중국의 노래', 0, 75, 'Taicang Youth Choir 太倉青年合唱團'),
    range: clip('7l7J0OHCcFU', '미국의 노래', 0, 75, 'Sons Of The Pioneers - Topic'),
    pokarekare: clip('cRw631i7CaA', '뉴질랜드의 노래', 0, 75, 'Hayley Westenra - Topic')
  };
  function listenAgain(source, title, seconds) {
    return Object.assign({}, source, { title: title, by: '', end: source.start + seconds });
  }
  V.mysA = listenAgain(V.didgeridoo, '소리 1', 15);
  V.mysB = listenAgain(V.samba, '소리 2', 15);
  V.mysC = listenAgain(V.shamisen, '소리 3', 15);
  V.recallA = listenAgain(V.shamisen, '소리 1', 10);
  V.recallB = listenAgain(V.samba, '소리 2', 10);
  V.recallC = listenAgain(V.didgeridoo, '소리 3', 10);

  function scene(name, alt, wide) {
    return { file: name + '.webp', alt: alt, w: wide ? 1600 : 1200, h: 900 };
  }
  var ART = {
    'world-map': scene('world-map', '펼친 세계 지도 위에 열 곳의 악기 그림이 놓여 있어요.', true),
    'world-asia': scene('world-asia', '네모난 몸통의 줄 악기와 물방울 모양 줄 악기 옆에 작은 징이 나란히 놓여 있어요.'),
    'world-americas': scene('world-americas', '둥근 몸통의 줄 악기와 나팔, 크기가 다른 북들이 한자리에 있어요.'),
    'world-faraway': scene('world-faraway', '긴 나무 대롱 옆에 주름진 상자와 활이 딸린 작은 악기가 놓여 있어요.'),
    'world-plan': scene('world-plan', '모둠 친구들이 지도를 펼쳐 놓고 들르고 싶은 곳을 손으로 짚어요.'),
    'world-sing': scene('world-sing', '모둠 친구들이 서로를 바라보며 둘러서서 노래해요.', true)
  };

  var continents = ['아시아', '아메리카', '유럽', '아프리카', '오세아니아'];
  var WARMUP = {
    mysA: { prompt: '소리 1', opts: continents },
    mysB: { prompt: '소리 2', opts: continents },
    mysC: { prompt: '소리 3', opts: continents },
    asia: { prompt: '줄을 뜯는 두 악기, 어느 쪽 소리가 더 단단하고 짧게 끊길까?', opts: ['소리 1', '소리 2'] },
    americas: { prompt: '이 음악을 들으면 몸이 어떻게 움직이고 싶을까?', opts: ['천천히 흔들기', '발 구르며 뛰기', '가만히 듣기'] },
    faraway: { prompt: '긴 나무 대롱 하나로 어떤 소리가 날까?', opts: ['높고 맑은 소리', '낮게 계속 울리는 소리', '짧게 톡톡 끊기는 소리'] },
    jambo: { prompt: '이 노래는 어떤 때 부를 것 같나요?', opts: ['만나서 인사할 때', '잠들기 전', '슬플 때'] },
    molihua: { prompt: '이 노래의 느낌은?', opts: ['잔잔하고 부드러워요', '힘차고 씩씩해요', '빠르고 신나요'] },
    range: { prompt: '들으면서 박을 세어 봐요. 어떻게 흔들리나요?', opts: ['하나-둘, 하나-둘', '하나-둘-셋, 하나-둘-셋'] },
    pokarekare: { prompt: '이 노래는 무엇을 노래할까?', opts: ['누군가를 그리워하는 마음', '축제의 즐거움', '일하는 힘'] }
  };
  var HOW = ['줄을 튕겨요', '활로 줄을 문질러요', '입으로 불어요', '두드려요'];
  var LANG = ['스와힐리어', '중국어', '영어', '마오리어'];
  var HOW_GROUP = '어떻게 소리를 낼까요?', LANG_GROUP = '어떤 말로 부를까요?';
  var Q1 = '소리만 듣고 어느 나라 음악인지 알아챌 수 있을까? 무엇이 단서가 될까?';
  var Q2 = '처음 듣는 나라의 노래를 어떻게 하면 그 나라 노래답게, 그리고 우리답게 부를 수 있을까?';
  var reveal = '<button type="button" class="mini cls reveal-shows" id="btnReveal" aria-expanded="false" aria-controls="showIdentities" disabled>정체 공개</button>';

  function graded(id, type, prompt, opts, ans, group) {
    return { id: id, type: type, prompt: prompt, opts: opts, ans: ans, accept: [ans], group: group };
  }
  function writing(id, label, prompt, ph) {
    return { id: id, type: 'text', label: label, prompt: prompt, ph: ph };
  }
  function songThought(id, name, example) {
    return writing('t-' + id, name + ' 생각 한 줄', '이 노래를 부를 때 <b>살리고 싶은 특징</b> 하나를 써요.', example);
  }
  function songLesson(key, card, singing, more) {
    return '{warmup:' + key + '}{vid:' + key + '}<dl class="terms terms-one">' + card + '</dl>' +
      (more || '') + '<div class="talk"><b>노래 활동</b>교과서 25쪽 악보를 보며 불러요. ' + singing + '</div>';
  }
  var CHAPTERS = [
    {
      id: 'start', title: '여행 준비', time: '5분', task: '소리 세 개를 듣고 어느 대륙에서 왔을지 짐작해요.',
      lead: '어디서 온 소리일까요? 귀를 기울이며 여행을 시작해요.',
      lesson: `
        <div class="goals"><b>학습 목표</b><ol><li>여러 나라의 음악과 문화를 조사하여 발표할 수 있다.</li><li>여러 나라 민요의 특징을 살려 개성 있게 노래할 수 있다.</li></ol></div>
        <aside class="bigq"><b>오늘의 질문 1</b><p>${Q1}</p></aside>
        {teacher:plan}
        <section class="activity"><h2>어디서 온 소리일까?</h2>
          <p>눈을 감고 15초씩 들어 봐요. 세 소리가 어느 대륙에서 왔을지 하나씩 골라요.</p>
          <div class="listen-grid opening-videos">{vid:mysA}{vid:mysB}{vid:mysC}</div>
          <div id="showGuesses">{warmup:mysA}{warmup:mysB}{warmup:mysC}</div>
          ${reveal}
          <div id="showIdentities" hidden><ul class="identities"><li><b>소리 1</b> 오세아니아(호주)</li><li><b>소리 2</b> 아메리카(브라질)</li><li><b>소리 3</b> 아시아(일본)</li></ul>
            {art:world-map}<p>오늘은 지도 위 열 곳의 정거장을 차례로 들러요.</p></div>
        </section>
        <div class="talk"><b>짝과 30초</b>어떤 소리로 알아챘는지 한 가지씩 이야기해요.</div>`,
      qs: []
    },
    {
      id: 'asia', title: '아시아 정거장', time: '11분', task: '줄과 징의 소리를 비교하고 입으로 흉내 내요.',
      lead: '소리가 시작되는 순간과 사라지는 순간에 귀를 기울여요.',
      lesson: `
        <div id="showGuesses">{warmup:asia}</div>
        <div class="listen-grid">{vid:shamisen}{vid:pipa}</div>
        ${reveal}
        <div id="showIdentities" hidden><dl class="terms terms-two">
          {term:샤미센|일본|가죽을 씌운 네모난 나무 몸통 위에 세 줄이 걸려 있어요. 은행잎처럼 생긴 큰 채인 바치로 튕기면 소리가 단단하게 울리고 뚝 끊겨요. 가부키와 민요의 반주에서도 들을 수 있어요.}
          {term:비파|중국|물방울처럼 생긴 몸통에 줄 네 개가 걸려 있어요. 손톱으로 줄을 튕겨 소리를 내요. 손가락을 빠르게 굴리며 소리를 이어 가는 연주법을 윤지라고 해요.}
        </dl><details class="more"><summary>더 알아보기 · 우리나라의 비파</summary><p>우리나라에도 향비파와 당비파가 있었어요.</p></details></div>
        {vid:kulintang}<dl class="terms terms-one">{term:쿨린탕|필리핀 남부 민다나오 등|틀 위에 작은 징을 눕히고 음높이 순서로 늘어놓아요. 보통 여덟 개 안팎의 징을 두 손에 든 나무 채로 쳐요. 북과 큰 징도 함께 어울려요.}</dl>
        <div class="talk"><b>입으로 소리 내기</b>다 같이 샤미센은 “팅”, 비파는 “또롱”, 쿨린탕은 “동동” 하고 흉내 내요.</div>
        <div class="talk"><b>짝과 30초</b>세 악기 가운데 가장 마음에 든 소리는 무엇인가요? 그 까닭을 짝에게 말해요.</div>{art:world-asia}`,
      qs: [
        graded('w1-1', 'pick', '쿨린탕', HOW, '두드려요', HOW_GROUP),
        graded('w1-2', 'pick', '비파', HOW, '줄을 튕겨요'),
        graded('w1-3', 'radio', '네모난 몸통에 줄이 <b>세 개</b>, 큰 채로 줄을 튕기는 일본 악기는?', ['비파', '샤미센', '쿨린탕'], '샤미센'),
        writing('t-asia', '아시아 정거장 생각 한 줄', '샤미센·비파·쿨린탕 가운데 하나를 골라 <b>소리가 어떻게 들렸는지</b> 한 문장으로 써 봐요.', '예) 쿨린탕은 작은 종들이 차례로 울려서 물방울이 떨어지는 것 같았어요.')
      ]
    },
    {
      id: 'americas', title: '아메리카 정거장', time: '11분', task: '세 음악을 듣고 삼바 리듬을 발과 손으로 쳐요.',
      lead: '몸이 먼저 움직이고 싶어지는 순간을 찾아요.',
      lesson: `
        {warmup:americas}{vid:banjo}<dl class="terms terms-one">{term:밴조|미국|둥근 북처럼 막을 씌운 몸통에 긴 목이 달려 있어요. 손가락으로 줄을 튕기면 경쾌하게 울려요. 아프리카에서 건너온 사람들의 악기에서 비롯되었고, 컨트리와 블루그래스 음악에서 들을 수 있어요.}</dl>
        {vid:mariachi}<dl class="terms terms-one">{term:마리아치|멕시코|마리아치는 함께 노래하고 연주하는 악단이에요. 바이올린과 트럼펫에 비우엘라와 큰 저음 기타인 기타론이 어우러져요. 단원들은 장식 달린 옷과 챙 넓은 솜브레로를 갖춰 입어요.}</dl>
        <details class="more"><summary>더 알아보기 · 마리아치</summary><p>2011년 유네스코 인류무형문화유산에 올랐어요.</p></details>
        {vid:samba}<dl class="terms terms-one">{term:삼바|브라질|리우데자네이루 카니발에서 만나는 음악과 춤이에요. 큰 북 수르두가 중심 박을 받치는 사이로 탐보림과 판데이루가 빠르게 엇갈려요. 이렇게 리듬을 겹치는 삼바에는 아프리카 리듬의 뿌리가 있어요.}</dl>
        <section class="activity"><h2>발과 손으로 삼바 리듬 치기</h2>
          <table class="rhythm"><caption>진한 칸에서 움직여요. 숫자 사이의 &amp;는 반 박 뒤예요.</caption>
            <thead><tr><th scope="col">동작</th><th>1</th><th>&amp;</th><th>2</th><th>&amp;</th><th>3</th><th>&amp;</th><th>4</th><th>&amp;</th></tr></thead>
            <tbody><tr><th scope="row">발</th><td class="beat">쿵</td><td></td><td></td><td></td><td class="beat">쿵</td><td></td><td></td><td></td></tr>
            <tr><th scope="row">손뼉</th><td></td><td class="beat">짝</td><td></td><td class="beat">짝</td><td></td><td></td><td></td><td class="beat">짝</td></tr></tbody>
          </table><p>선생님 신호에 맞춰 발부터 구르고 손뼉을 더해요. 이렇게 두 번 반복해요.</p></section>{art:world-americas}`,
      qs: [
        graded('w1-4', 'pick', '밴조', HOW, '줄을 튕겨요', HOW_GROUP),
        graded('w1-5', 'radio', '바이올린·트럼펫·기타가 함께 어우러지는 <b>멕시코</b>의 악단은?', ['마리아치', '삼바', '쿨린탕'], '마리아치'),
        graded('w1-6', 'radio', '브라질 카니발 행렬에서 여러 <b>타악기</b>가 이끄는 흥겨운 음악과 춤은?', ['하카', '삼바', '마리아치'], '삼바'),
        writing('t-americas', '아메리카 정거장 생각 한 줄', '세 음악 가운데 <b>몸이 가장 먼저 반응한</b> 음악과 그 까닭을 써 봐요.', '예) 삼바는 북소리가 빠르게 겹쳐서 발이 저절로 움직였어요.')
      ]
    },
    {
      id: 'faraway', title: '유럽·아프리카·오세아니아 정거장', time: '11분', task: '나무 대롱과 주름상자, 줄 하나가 내는 소리를 들어요.',
      lead: '멀리 떨어진 세 곳의 소리를 한 자리에서 만나요.',
      lesson: `
        {warmup:faraway}{vid:didgeridoo}<dl class="terms terms-one">{term:디저리두|호주|오스트레일리아 북부 원주민이 부는 악기예요. 흰개미가 속을 파먹은 유칼립투스 나무 대롱에 입술을 대고 떨면 낮게 “웅—” 울려요. 코로 숨을 들이쉬면서 소리를 끊지 않는 연주법을 순환 호흡이라고 해요.}</dl>
        <div class="talk"><b>목소리로 울림 느끼기</b>입술을 가볍게 붙이고 “브—” 하고 낮은 소리를 10초 동안 이어 봐요. 숨이 차면 중간에 쉬어요.</div>
        <details class="more"><summary>더 알아보기 · 소리에 담긴 문화</summary><p>디저리두는 원주민 공동체의 의식과 관련된 악기예요. 그 문화를 존중하며 들어요.</p></details>
        {vid:bandoneon}<dl class="terms terms-one">{term:반도네온|독일|네모난 상자의 양쪽 판에 단추가 달려 있어요. 손으로 주름을 펴고 접으면서 바람을 보내고 단추로 음을 골라요. 19세기 독일에서 만들어져 아르헨티나 탱고를 대표하는 악기가 되었어요.}</dl>
        {vid:orutu}<dl class="terms terms-one">{term:오루투|케냐|케냐 루오족이 연주하는 이 악기에는 줄이 하나 있어요. 가죽을 씌운 작은 몸통을 잡고 활을 줄 위로 움직여 소리를 내요. 노래와 춤을 반주할 때 쓰여요.}</dl>
        <details class="more"><summary>더 알아보기 · 뉴질랜드 정거장</summary><dl class="terms terms-one">{term:하카|뉴질랜드 마오리족|발을 구르고 가슴과 허벅지를 치며 함께 외치는 전통 춤이에요. 손님을 맞거나 축하하고 추모하는 중요한 자리에서 해요. 어떤 뜻을 담아 함께 움직이는지 존중하는 마음으로 지켜봐요.}</dl>{vid:haka}</details>
        <div class="talk"><b>짝과 30초</b>열 곳 가운데 가장 가 보고 싶은 정거장을 짝에게 소개해요.</div>{art:world-faraway}`,
      qs: [
        graded('w1-7', 'pick', '오루투', HOW, '활로 줄을 문질러요', HOW_GROUP),
        graded('w1-8', 'pick', '디저리두', HOW, '입으로 불어요'),
        graded('w1-9', 'radio', '<b>주름상자</b>를 늘였다 줄였다 하며 단추를 눌러 연주하는, 독일에서 만들어진 악기는?', ['반도네온', '디저리두', '밴조'], '반도네온'),
        writing('t-faraway', '먼 정거장 생각 한 줄', '디저리두·반도네온·오루투 가운데 <b>우리 악기와 닮은 점</b>이 있는 악기를 하나 골라 써 봐요.', '예) 오루투는 활로 줄을 문질러서 해금과 닮았어요.')
      ]
    },
    {
      id: 'plan', title: '우리 모둠 여행 계획', time: '7분', task: '소리의 단서를 나누고 모둠별 체험 여행을 계획해요.',
      lead: '우리 모둠이 들를 곳과 그곳에서 해 보고 싶은 일을 정해요.',
      lesson: `<aside class="bigq"><b>오늘의 질문 1 다시 보기</b><p>${Q1}</p>
        <small>악기의 재료와 생김새, 소리 내는 방법, 리듬, 노래하는 말, 옷과 춤을 떠올려요. 가장 도움이 된 단서 하나를 짝에게 말해요.</small></aside>
        <div class="talk"><b>모둠 활동</b>모둠별로 ‘세계의 음악과 문화 체험’을 주제로 여행 계획을 세워요. 다음 시간 처음에 이 학습지를 보며 발표해요.</div>`,
      qs: [
        { id: 'p-stops', type: 'multi', max: 3, label: '모둠 여행 정거장', prompt: '우리 모둠이 들를 정거장을 <b>2~3곳</b> 골라요.', opts: ['독일', '일본', '중국', '필리핀', '케냐', '미국', '멕시코', '브라질', '호주', '뉴질랜드'] },
        writing('p-music', '모둠 음악 체험 계획', '정거장마다 <b>어떤 음악을 체험할지</b> 써요. (악기·노래·춤)', '예) 브라질: 삼바 학교에서 수르두 북을 쳐 보기 / 일본: 샤미센 연주 듣기'),
        writing('p-culture', '모둠 문화 체험 계획', '그 나라에서 함께 해 볼 <b>문화 체험</b>을 써요. (음식·옷·축제·인사말)', '예) 멕시코: 죽은 자의 날 축제 구경하기, 타코 먹어 보기'),
        { id: 'p-show', type: 'radio', label: '모둠 발표 방법', prompt: '다음 시간에 어떻게 발표할까요?', opts: ['지도를 따라 여행 일정 말하기', '여행 안내원 역할극', '여행지에서 보내는 엽서 읽기'] },
        writing('t-q1', '1차시 마무리 한 줄', '처음 질문: 소리만 듣고 어느 나라 음악인지 알아챌 때 <b>가장 도움이 된 단서</b>는?', '예) 악기를 어떻게 연주하는지 보면 나라가 떠올랐어요.')
      ], after: '{art:world-plan}'
    },
    {
      id: 'recall', split: true, title: '소리로 떠올리기 · 여행 발표', time: '8분', task: '지난 소리를 떠올리고 2~3모둠이 여행 계획을 발표해요.',
      lead: '지난 시간에 들른 정거장을 소리로 떠올려요.',
      lesson: `<section class="activity"><h2>소리로 떠올리기</h2>
        <div class="listen-grid opening-videos">{vid:recallA|10초만 듣고 멈춤}{vid:recallB|10초만 듣고 멈춤}{vid:recallC|10초만 듣고 멈춤}</div>
        <p>어느 정거장 소리였는지 다 같이 말해요.</p></section>
        <div class="talk"><b>모둠 여행 발표</b>2~3모둠이 지난 시간의 <a href="#plan?sheet">여행 계획 학습지</a>를 보며 모둠당 1분씩 발표해요.</div>
        <aside class="bigq"><b>오늘의 질문 2</b><p>${Q2}</p></aside>`,
      qs: []
    },
    {
      id: 'jambo', title: '잠보 · 케냐', time: '7분', task: '잠보를 듣고 손을 흔들며 인사하듯 불러요.',
      lead: '누구에게 어떤 표정으로 부르고 싶은지 떠올려요.',
      lesson: songLesson('jambo', '{term:잠보|케냐|스와힐리어로 인사를 나누는 노래예요. “잠보”는 “안녕하세요” 하고 건네는 인사말이에요. 빠르기말 Moderato는 보통 빠르게 부르라는 뜻이에요.|밝고 경쾌하게 인사를 주고받아요.}', '한 번 부르면서 “잠보” 부분에서는 서로 손을 흔들어요.'),
      qs: [
        graded('w2-1', 'pick', '잠보', LANG, '스와힐리어', LANG_GROUP),
        graded('w2-2', 'radio', "'잠보'는 무슨 뜻일까요?", ['안녕하세요', '고마워요', '잘 가요'], '안녕하세요'),
        songThought('jambo', '잠보', '예) 잠보는 인사하듯 밝게 주고받으며 부르고 싶어요.')
      ]
    },
    {
      id: 'molihua', title: '모리화 · 중국', time: '7분', task: '모리화의 첫 두 마디를 허밍한 뒤 노래해요.',
      lead: '목소리를 작게 울리며 가락의 굽이를 따라가요.',
      lesson: songLesson('molihua', '{term:모리화|중국 · 茉莉花|하얀 재스민 꽃의 향기와 아름다움을 노래한 중국 민요예요. 5음 음계로 이루어진 가락이 부드럽게 오르내려요. 교과서의 빠르기말은 Moderato(보통 빠르게)예요.|꽃을 바라보듯 부드럽게 가락을 이어요.}', '처음 두 마디를 “음—”으로 허밍한 뒤 악보를 따라 노래해요.', '<details class="more"><summary>더 알아보기 · 오페라 속 가락</summary><p>푸치니의 오페라 「투란도트」에도 이 가락이 나와요.</p></details>'),
      qs: [
        graded('w2-3', 'radio', '모리화(茉莉花)가 노래하는 것은?', ['향기로운 재스민 꽃', '넓은 들판의 집', '그리운 사람'], '향기로운 재스민 꽃'),
        graded('w2-4', 'radio', '모리화의 가락은 주로 <b>몇 개의 음</b>으로 이루어진 음계를 쓸까요?', ['5음 음계', '7음 음계', '12음 모두'], '5음 음계'),
        songThought('molihua', '모리화', '예) 꽃향기가 퍼지듯 오르내리는 가락을 부드럽게 잇고 싶어요.')
      ]
    },
    {
      id: 'range', title: '언덕 위의 집 · 미국', time: '7분', task: '들판을 떠올리며 몸을 흔들어 노래해요.',
      lead: '노래의 흐름에 맞춰 몸을 가볍게 움직여요.',
      lesson: songLesson('range', '{term:언덕 위의 집|미국 · Home on the Range|19세기 미국 서부 개척 시대에 영어로 부르던 노래예요. 들소와 사슴이 뛰노는 넓은 들판의 집을 그려요. 셋씩 묶이는 3박 계통의 가락이 여유롭게 흔들려요. 빠르기말은 Moderato(보통 빠르게)예요.|셋을 세며 흔들리는 박을 느껴요.}', '셋째 박마다 몸을 옆으로 흔들며 불러요.', '<details class="more"><summary>더 알아보기 · 캔자스주</summary><p>미국 캔자스주의 노래이기도 해요.</p></details>'),
      qs: [
        graded('w2-5', 'pick', '언덕 위의 집', LANG, '영어', LANG_GROUP),
        graded('w2-6', 'radio', '언덕 위의 집은 몇 박씩 묶어 흔들리듯 흘러갈까요?', ['2박', '3박', '4박'], '3박'),
        songThought('range', '언덕 위의 집', '예) 들판을 떠올리며 셋씩 흔들리는 흐름을 여유롭게 살리고 싶어요.')
      ]
    },
    {
      id: 'pokarekare', title: '포카레카레 아나 · 뉴질랜드', time: '7분', task: '빠르기말을 살펴보고 그리운 마음을 담아 노래해요.',
      lead: '누군가에게 마음을 전하는 목소리를 들어요.',
      lesson: songLesson('pokarekare', '{term:포카레카레 아나|뉴질랜드 · Pokarekare Ana|뉴질랜드에서 널리 부르는 마오리어 사랑 노래예요. 거센 물결 너머에 있는 사랑하는 사람을 그리워해요. 네 곡 가운데 이 곡의 빠르기말만 Andantino(조금 느리게)예요.|물결 건너편의 사람을 떠올리며 조금 느리게 이어요.}', '앞의 세 곡과 다른 빠르기말 Andantino를 확인하고 그리운 마음을 담아 천천히 불러요.'),
      qs: [
        graded('w2-7', 'pick', '포카레카레 아나', LANG, '마오리어', LANG_GROUP),
        graded('w2-8', 'radio', '포카레카레 아나가 담은 마음은?', ['사랑하는 사람을 그리워하는 마음', '꽃을 자랑하는 마음', '손님을 맞이하는 반가움'], '사랑하는 사람을 그리워하는 마음'),
        songThought('pokarekare', '포카레카레 아나', '예) 보고 싶은 마음이 전해지게 목소리를 길고 느리게 잇고 싶어요.')
      ]
    },
    {
      id: 'sing', title: '우리답게 부르기', time: '9분', task: '부르기 계획을 세우고 연습한 뒤 1~2모둠이 발표해요.',
      lead: '한 곡을 골라 우리 모둠의 목소리로 들려줘요.',
      lesson: `<aside class="bigq"><b>오늘의 질문 2 다시 보기</b><p>${Q2}</p>
        <small>그 나라 말과 노랫말 뜻, 박과 빠르기, 어울리는 반주를 살려 ‘그 나라답게’ 불러요. 빠르기와 셈여림, 몸짓과 반주를 우리 모둠이 정해 ‘우리답게’ 표현해요.</small></aside>
        {art:world-sing}<div class="talk"><b>모둠 활동</b>네 곡 중 한 곡을 골라요. 그 곡에서 살릴 특징과 우리 모둠이 새롭게 표현할 방법을 학습지에 적어요.</div>`,
      qs: [
        { id: 's-song', type: 'radio', label: '모둠이 고른 노래', prompt: '우리 모둠이 부를 노래는?', opts: ['잠보', '모리화', '언덕 위의 집', '포카레카레 아나'] },
        { id: 's-ways', type: 'multi', label: '개성 있게 부르는 방법', prompt: '어떻게 부를지 골라요. 여러 개 고를 수 있어요.', opts: ['빠르기 바꾸기', '셈여림 살리기', '손뼉·발 구르기 반주', '리코더나 작은 타악기 더하기', '몸짓 넣기', '주고받으며 부르기', '원어로 한 소절 부르기'] },
        writing('s-plan', '모둠 노래 계획', '우리 모둠의 부르기 계획을 한두 문장으로 써요.', '예) 모리화를 처음엔 여리게 한 명씩, 마지막엔 다 같이 세게 부르고 트라이앵글을 넣어요.'),
        writing('t-q2', '2차시 마무리 한 줄', '처음 질문: 다른 나라 노래를 <b>그 나라답게, 우리답게</b> 부르려면? 내 생각을 한 문장으로.', '예) 그 나라 말과 박은 살리고, 셈여림과 반주는 우리 모둠이 정해요.')
      ],
      after: '<div class="talk"><b>3분 연습</b>우리 모둠이 정한 방법으로 함께 연습해요.</div><div class="talk"><b>모둠 발표</b>1~2모둠이 노래를 들려줘요.</div><p class="hint">장마다 고른 답과 마무리 한 줄을 확인한 뒤, 마지막 화면에서 제출해요.</p>'
    }
  ];
  CHAPTERS.forEach(function (chapter) {
    chapter.qs.forEach(function (q) {
      if (q.ans !== undefined) q.label = chapter.title + ' ' + q.id + ' (' + q.ans + ')';
    });
  });
  window.WORLD = { V: V, ART: ART, WARMUP: WARMUP, CHAPTERS: CHAPTERS };
})();

/* 사시사철 음악 축제 · 교과서 70~71쪽 */
(function () {
  'use strict';

  function clip(id, title, start, seconds, by, mode) {
    return { id: id, title: title, by: by, start: start, end: start + seconds, mode: mode || 'board' };
  }
  var V = {
    tongyeong: clip('0-95WyGFac8', '통영국제음악제 · 클래식과 현대 음악', 10, 45, '통영국제음악재단 TIMF'),
    seouljazz: clip('vphr2KAc--A', '서울재즈페스티벌 · 도심 공원 야외 무대', 15, 45, 'PRIVATE CURVE'),
    gugakfest: clip('EZZ-UqvqLzg', '국악관현악축제 · 축제(이준호 작곡)', 30, 45, 'KBS국악관현악단'),
    pentaport: clip('hMzZEuVwrZ8', '인천 펜타포트 록 페스티벌 · 야외 록 무대', 10, 45, '이승윤'),
    sori: clip('Es43_IZaeMk', '전주세계소리축제 · 판소리와 월드뮤직', 5, 45, 'Visit Jeonju'),
    jarasum: clip('TuDnGT6UMiI', '자라섬재즈페스티벌 · 가을 강변 재즈', 15, 45, 'Jarasum Jazz Festival'),
    pohang: clip('HjULDXnNcHE', '포항음악제 · 바다 도시의 실내악', 15, 45, '포항국제음악제 MUSIC FESTIVAL POHANG')
  };
  function listenAgain(source, title, seconds) {
    return Object.assign({}, source, { title: title, by: '', end: source.start + seconds });
  }
  V.mysA = listenAgain(V.pentaport, '소리 1', 15);
  V.mysB = listenAgain(V.gugakfest, '소리 2', 15);
  V.mysC = listenAgain(V.jarasum, '소리 3', 15);

  function scene(name, alt, wide) {
    return { file: name + '.webp', alt: alt, w: wide ? 1600 : 1200, h: 900 };
  }
  var ART = {
    'fest-map': scene('fest-map', '봄 바닷가 음악당부터 여름 공원 무대, 가을 강변 잔디밭, 겨울 실내악 홀까지 사계절 길로 이어져 있어요.', true),
    'fest-spring-summer': scene('fest-spring-summer', '왼쪽에는 벚꽃 핀 바닷가 클래식 무대가, 오른쪽에는 여름 공원 록 페스티벌 무대가 펼쳐져 있어요.'),
    'fest-autumn-winter': scene('fest-autumn-winter', '왼쪽에는 단풍 물든 강변 재즈 무대가, 오른쪽에는 눈 내리는 밤 따뜻한 실내악 홀이 그려져 있어요.'),
    'fest-plan': scene('fest-plan', '나무 책상 위에 음표와 지도가 그려진 3단 축제 안내지, 색연필, 입장권이 놓여 있어요.'),
    'fest-value': scene('fest-value', '따뜻한 저녁 조명 아래 마을 광장에 여러 세대가 모여 작은 무대의 음악을 함께 듣고 있어요.', true)
  };

  var FESTIVALS = [
    { name: '통영국제음악제', season: '봄', month: '3월', region: '경남 통영', genre: '클래식 · 현대 음악',
      vibe: '바다가 한눈에 보이는 통영국제음악당에서 세계 연주자들의 섬세한 실내악과 관현악을 들어요.',
      tip: '공연 전 10분 미리 앉아 바다가 비치는 로비 풍경까지 함께 느껴 보기',
      nearby: '동피랑 벽화마을 · 통영 중앙시장' },
    { name: '서울재즈페스티벌', season: '봄', month: '5월', region: '서울 송파(올림픽공원)', genre: '재즈 · 팝 · R&B',
      vibe: '초록 잔디밭 위에 돗자리를 펴고 앉아 여러 야외 무대를 오가며 자유롭게 즐겨요.',
      tip: '해 질 녘 가장 기대되는 무대 시간표를 미리 동그라미 쳐 두기',
      nearby: '올림픽공원 들꽃마루 · 몽촌토성 산책길' },
    { name: '국악관현악축제', season: '여름', month: '7월', region: '서울 등 주요 공연장', genre: '국악 관현악',
      vibe: '가야금·대금·해금·타악기가 큰 편성으로 어우러져 전통과 현대가 만난 웅장한 울림을 들려줘요.',
      tip: '우리 악기 소리가 서양 관현악처럼 겹치고 번지는 순간 찾아 듣기',
      nearby: '공연장 야외 광장 · 주변 전시 공간' },
    { name: '인천 펜타포트 록 페스티벌', season: '여름', month: '8월', region: '인천 송도', genre: '록 · 밴드 음악',
      vibe: '넓은 야외 공원에서 강렬한 전자기타와 드럼 비트에 맞춰 관객이 함께 뛰고 소리치며 열기를 나눠요.',
      tip: '시원한 물과 모자를 챙기고, 4박자 손뼉과 후렴구 떼창 함께하기',
      nearby: '송도 센트럴파크 · 인천 바다 야경' },
    { name: '전주세계소리축제', season: '가을', month: '9월', region: '전북 전주', genre: '판소리 · 월드뮤직',
      vibe: '우리 전통 소리의 뿌리인 판소리를 중심으로 세계 여러 나라의 민속·전통 음악을 한자리에서 만나요.',
      tip: '소리꾼의 표정과 고수의 북 장단이 주고받는 호흡 따라가 보기',
      nearby: '전주 한옥마을 · 한국소리문화의전당' },
    { name: '자라섬재즈페스티벌', season: '가을', month: '10월', region: '경기 가평(자라섬)', genre: '재즈',
      vibe: '북한강 강변 섬의 선선한 가을바람과 함께 즉흥 연주가 빛나는 재즈 선율에 빠져들어요.',
      tip: '얇은 겉옷을 챙겨 밤공기 속에서 색소폰과 콘트라베이스 솔로 듣기',
      nearby: '자라섬 남도 꽃정원 · 남이섬 강변길' },
    { name: '포항음악제', season: '겨울', month: '11월', region: '경북 포항', genre: '클래식 · 실내악',
      vibe: '늦가을에서 초겨울로 넘어가는 계절, 동해 바다 도시의 실내 공연장에서 깊이 있는 실내악을 만나요.',
      tip: '연주자 서너 명이 눈빛으로 신호를 주고받으며 맞추는 순간 살펴보기',
      nearby: '영일대 해수욕장 · 포항 스페이스워크' }
  ];

  var GENRE_CHOICES = ['록·밴드', '국악 관현악', '재즈', '클래식'];
  var WARMUP = {
    mysA: { prompt: '소리 1', opts: GENRE_CHOICES },
    mysB: { prompt: '소리 2', opts: GENRE_CHOICES },
    mysC: { prompt: '소리 3', opts: GENRE_CHOICES },
    ss: { prompt: '봄 바다 클래식 공연장과 여름 야외 록 무대, 관객의 모습은 어떻게 다를까?', opts: ['자리에 앉아 조용히 집중해요', '함께 박수 치고 몸을 움직여요', '장소에 따라 둘 다 달라져요'] },
    aw: { prompt: '가을 강변 재즈 무대와 겨울 실내악 홀 가운데 지금 내 기분과 더 가까운 쪽은?', opts: ['선선한 바람과 자유로운 즉흥 연주', '아늑한 실내의 깊은 울림'] }
  };

  var Q1 = '집에서 음원으로 편하게 들을 수 있는데, 사람들은 왜 멀리까지 찾아가 음악 축제에 모일까?';
  var reveal = '<button type="button" class="mini cls reveal-shows" id="btnReveal" aria-expanded="false" aria-controls="showIdentities" disabled>정체 공개</button>';

  function graded(id, prompt, opts, ans) {
    return { id: id, type: 'radio', prompt: prompt, opts: opts, ans: ans, accept: [ans] };
  }
  function writing(id, label, prompt, ph) {
    return { id: id, type: 'text', label: label, prompt: prompt, ph: ph };
  }
  function seasonTabsHTML() {
    var seasons = ['봄', '여름', '가을', '겨울'];
    var tabs = seasons.map(function (s, idx) {
      return '<button type="button" role="tab" id="tab-' + idx + '" aria-selected="' + (idx === 0 ? 'true' : 'false') +
        '" aria-controls="panel-' + idx + '" tabindex="' + (idx === 0 ? '0' : '-1') + '">' + s + '</button>';
    }).join('');
    var panels = seasons.map(function (s, idx) {
      var list = FESTIVALS.filter(function (f) { return f.season === s; });
      var cards = list.map(function (f) {
        return '<article class="fest-card"><header><span class="fest-badge">' + f.month + ' · ' + f.region + '</span>' +
          '<h3>' + f.name + '</h3><p class="fest-genre">' + f.genre + '</p></header>' +
          '<p>' + f.vibe + '</p><dl class="fest-meta"><div><dt>즐기기 팁</dt><dd>' + f.tip + '</dd></div>' +
          '<div><dt>주변 볼거리</dt><dd>' + f.nearby + '</dd></div></dl></article>';
      }).join('');
      var nextBtn = idx < seasons.length - 1
        ? '<button type="button" class="panel-next" data-next-tab="' + (idx + 1) + '">다음: ' + seasons[idx + 1] + ' →</button>'
        : '<a class="panel-next" href="#explore?sheet">초대장 만들기로 →</a>';
      return '<div role="tabpanel" class="season-panel" id="panel-' + idx + '" aria-labelledby="tab-' + idx + '"' +
        (idx === 0 ? '' : ' hidden') + '><div class="fest-cards">' + cards + '</div><div class="panel-foot">' + nextBtn + '</div></div>';
    }).join('');
    return '<div class="season-explorer"><div class="season-tabs" role="tablist" aria-label="계절별 축제 살펴보기">' +
      tabs + '</div>' + panels + '</div>';
  }

  var CHAPTERS = [
    {
      id: 'start', title: '소리 먼저 열기', time: '6분',
      task: '서로 다른 음악 축제 소리 세 편을 듣고 장르를 짐작해요.',
      lead: '어느 계절, 어떤 무대의 소리일까요? 눈을 감고 세 축제부터 만나요.',
      lesson: `
        <div class="goals"><b>학습 목표</b><ol><li>다양한 장르의 음악을 들으며 서로 다른 감성과 가치를 인식하고 존중할 수 있다.</li><li>생활 속 음악 축제를 탐색하고 참여하여 연주 문화의 다양성과 사회적 가치를 말할 수 있다.</li></ol></div>
        <aside class="bigq"><b>오늘의 질문</b><p>${Q1}</p></aside>
        {teacher:plan}
        <section class="activity"><h2>어느 축제의 소리일까?</h2>
          <p>15초씩 듣고 어떤 장르의 무대일지 하나씩 골라요. 세 소리를 다 고르면 정체를 열어 볼 수 있어요.</p>
          <div class="listen-grid opening-videos">{vid:mysA}{vid:mysB}{vid:mysC}</div>
          <div id="showGuesses">{warmup:mysA}{warmup:mysB}{warmup:mysC}</div>
          ${reveal}
          <div id="showIdentities" hidden><ul class="identities"><li><b>소리 1</b> 인천 펜타포트 록 페스티벌 · 8월 여름 야외 록 무대</li><li><b>소리 2</b> 국악관현악축제 · 7월 여름 국악 관현악 무대</li><li><b>소리 3</b> 자라섬재즈페스티벌 · 10월 가을 강변 재즈 무대</li></ul>
            {art:fest-map}<p>우리나라는 봄·여름·가을·겨울 사시사철, 바다와 공원과 강변에서 저마다 다른 음악 축제가 열려요.</p></div>
        </section>
        <div class="talk"><b>짝과 30초</b>세 소리 가운데 가장 마음이 끌렸던 소리와 그 까닭을 짝에게 한 마디로 말해요.</div>`,
      qs: []
    },
    {
      id: 'spring-summer', title: '봄·여름의 무대', time: '11분',
      task: '봄과 여름 축제의 소리를 듣고 분위기와 호응을 비교해요.',
      lead: '바닷가 클래식 홀에서 시작해 도심 공원과 뜨거운 여름 야외 무대로 옮겨 가요.',
      lesson: `
        {warmup:ss}
        <div class="listen-grid">{vid:tongyeong}{vid:seouljazz}</div>
        <dl class="terms terms-two">
          {term:통영국제음악제|3월 · 경남 통영 · 클래식|봄 바다가 보이는 음악당에서 세계의 오케스트라와 실내악 연주를 만나요. 현대 음악부터 정통 클래식까지 섬세하고 깊은 울림이 중심이 돼요.}
          {term:서울재즈페스티벌|5월 · 서울 올림픽공원 · 재즈·팝|초록 잔디밭 위에 앉아 따뜻한 봄 햇살 속에서 재즈와 대중음악을 즐겨요. 실내와 야외 여러 무대를 자유롭게 오가는 분위기가 특징이에요.}
        </dl>
        <div class="listen-grid">{vid:gugakfest}{vid:pentaport}</div>
        <dl class="terms terms-two">
          {term:국악관현악축제|7월 · 주요 공연장 · 국악 관현악|가야금·해금·대금·타악기 등 우리 전통 악기가 대규모로 모여 현대 감각의 관현악을 연주해요. 전통 장단과 풍성한 화음이 어우러져요.}
          {term:인천 펜타포트 록 페스티벌|8월 · 인천 송도 · 록·밴드|한여름 넓은 야외에서 강렬한 기타와 드럼 사운드를 온몸으로 느끼는 록 축제예요. 연주자와 관객이 함께 뛰고 합창하며 에너지를 나눠요.}
        </dl>
        <details class="more"><summary>더 알아보기 · 같은 날이라도 다른 예절</summary><p>조용한 실내악 홀에서는 숨을 고르며 세밀한 소리에 집중하고, 야외 록 무대에서는 안전을 지키며 힘찬 박수와 환호로 화답해요. 음악의 성격에 따라 감상하는 방식도 달라져요.</p></details>
        <div class="talk"><b>몸으로 느끼기</b>선생님 신호에 맞춰 5초 동안 조용히 호흡을 고른 뒤, 곧바로 4박자 손뼉을 힘차게 치며 두 무대의 에너지 차이를 느껴 봐요.</div>
        {art:fest-spring-summer}`,
      qs: [
        graded('f1', '3월 경남 통영의 바닷가 공연장에서 클래식과 현대 음악 연주를 중심으로 여는 축제는?', ['통영국제음악제', '인천 펜타포트 록 페스티벌', '자라섬재즈페스티벌'], '통영국제음악제'),
        graded('f2', '7월에 열리며, 우리 <b>전통 악기들이 큰 편성으로</b> 어우러져 웅장한 울림을 들려주는 축제는?', ['서울재즈페스티벌', '국악관현악축제', '포항음악제'], '국악관현악축제'),
        graded('f3', '8월 인천 송도 야외 공원에서 강렬한 <b>밴드 사운드와 관객의 떼창</b>이 어우러지는 축제는?', ['인천 펜타포트 록 페스티벌', '통영국제음악제', '전주세계소리축제'], '인천 펜타포트 록 페스티벌'),
        writing('t-ss', '봄·여름 무대 생각 한 줄', '네 축제 가운데 <b>직접 가 보고 싶은 무대 하나</b>와 보고 싶은 장면을 써요.', '예) 서울재즈페스티벌 잔디밭에 앉아 해 질 녘 야외 밴드 공연을 보고 싶어요.')
      ]
    },
    {
      id: 'autumn-winter', title: '가을·겨울의 무대', time: '10분',
      task: '가을과 겨울 축제의 소리를 듣고 계절과 음악의 어울림을 찾아요.',
      lead: '단풍이 드는 한옥과 강변을 지나, 초겨울 따뜻한 실내악 홀까지 걸어가요.',
      lesson: `
        {warmup:aw}
        <div class="listen-grid">{vid:sori}{vid:jarasum}</div>
        <dl class="terms terms-two">
          {term:전주세계소리축제|9월 · 전북 전주 · 판소리·월드뮤직|우리 전통 소리인 판소리를 중심으로 세계 여러 나라의 민속 음악과 만나는 축제예요. 전통과 현대가 만나 새로운 소리를 만들어 내요.}
          {term:자라섬재즈페스티벌|10월 · 경기 가평 · 재즈|북한강 위 작은 섬의 맑은 가을 하늘 아래에서 열리는 대표 재즈 축제예요. 연주자들이 즉흥적으로 주고받는 솔로와 선율이 자연과 어우러져요.}
        </dl>
        {vid:pohang}
        <dl class="terms terms-one">
          {term:포항음악제|11월 · 경북 포항 · 실내악·클래식|바다 도시 포항에서 늦가을과 초겨울에 열리는 클래식 음악제예요. 몇 명의 연주자가 가까이 호흡을 맞추는 실내악의 아늑하고 집중된 매력을 느낄 수 있어요.}
        </dl>
        <details class="more"><summary>더 알아보기 · 계절과 공간이 주는 느낌</summary><p>같은 음악이라도 봄바람이 부는 공원인지, 가을 강변인지, 조용한 겨울 실내 홀인지에 따라 전혀 다른 기억으로 남아요.</p></details>
        <div class="talk"><b>짝과 30초</b>가을·겨울 세 축제 가운데 계절 분위기와 가장 잘 어울린다고 느낀 곳은 어디인가요? 짝에게 말해요.</div>
        {art:fest-autumn-winter}`,
      qs: [
        graded('f4', '9월 전북 전주에서 <b>판소리</b>를 중심으로 세계 여러 나라의 전통 음악을 함께 만나는 축제는?', ['전주세계소리축제', '인천 펜타포트 록 페스티벌', '서울재즈페스티벌'], '전주세계소리축제'),
        graded('f5', '10월 경기 가평의 섬에서 선선한 가을바람과 함께 <b>즉흥 연주가 빛나는 재즈</b>를 듣는 축제는?', ['국악관현악축제', '자라섬재즈페스티벌', '포항음악제'], '자라섬재즈페스티벌'),
        graded('f6', '우리나라 사시사철 음악 축제에 대한 설명으로 알맞은 것은?', ['봄과 여름에만 야외 공연이 열린다', '모두 클래식 음악 한 가지 장르만 연주한다', '계절과 지역에 따라 다양한 장르가 저마다 다른 방식으로 열린다'], '계절과 지역에 따라 다양한 장르가 저마다 다른 방식으로 열린다'),
        writing('t-aw', '가을·겨울 무대 생각 한 줄', '가을·겨울 축제 가운데 <b>계절과 가장 잘 어울린 소리</b>와 그 까닭을 한 문장으로 써요.', '예) 포항음악제의 현악 소리가 늦가을의 차분한 공기와 잘 어울렸어요.')
      ]
    },
    {
      id: 'explore', title: '골라 탐험 · 축제 초대장', time: '8분',
      task: '계절별 축제를 한눈에 둘러보고 나만의 축제 초대장을 만들어요.',
      lead: '내가 가고 싶은 축제를 하나 골라 친구에게 건넬 짧은 초대장을 완성해요.',
      lesson: `
        <p>계절 탭을 눌러 일곱 곳의 정보를 살펴봐요. 가장 마음이 가는 축제 한 곳을 골라 아래 학습지에서 초대장을 꾸며 봐요.</p>
        ${seasonTabsHTML()}
        {art:fest-plan}`,
      qs: [
        { id: 'p-fest', type: 'radio', label: '내가 고른 축제', prompt: '내가 가고 싶은 축제는? (1곳 고르기)',
          opts: FESTIVALS.map(function (f) { return f.name; }) },
        { id: 'p-who', type: 'radio', label: '함께 갈 사람', prompt: '누구와 함께 가고 싶나요?',
          opts: ['친구들과', '가족과', '혼자 여유롭게', '반 친구들과'] },
        { id: 'p-vibe', type: 'multi', max: 3, label: '기대되는 순간', prompt: '이 축제에서 <b>가장 기대되는 순간</b>을 최대 3개 골라요.',
          opts: ['좋아하는 음악을 라이브로 듣기', '야외 잔디·바다 풍경 즐기기', '주변 명소와 지역 음식 맛보기', '악기 연주와 소리 가까이 보기', '관객과 박수 치며 함께 즐기기', '새로운 장르 음악 처음 만나기'] },
        writing('p-slogan', '초대장 홍보 한 줄', '친구에게 건넬 <b>초대장 제목(한 줄 문구)</b>을 지어 봐요.', '예) 선선한 강바람 맞으며 가을 재즈 한 곡 어때?'),
        writing('p-plan', '선택 까닭과 해 볼 일', '이 축제를 고른 까닭과 그곳에서 꼭 해 보고 싶은 일을 써요.', '예) 자라섬 잔디밭에 앉아 색소폰 연주를 듣고 주변 꽃정원도 걸어 보고 싶어요.')
      ],
      after: `
        <div id="invitePreview" aria-live="polite"></div>
        <div class="talk"><b>짝과 30초</b>완성된 초대장 미리보기를 짝에게 보여 주고, 왜 이 축제를 골랐는지 30초 동안 소개해요.</div>`
    },
    {
      id: 'value', title: '축제가 바꾸는 것들', time: '10분',
      task: '음악 축제의 사회적 가치를 정리하고 오늘의 질문에 답해요.',
      lead: '음악 축제가 끝나고 나면 도시와 사람들에게는 무엇이 남을까요?',
      lesson: `
        <dl class="terms">
          {term:지역 홍보|도시의 얼굴이 넓어져요|지역의 자연과 특산물, 문화 명소가 축제와 함께 널리 알려져 많은 사람이 그 고장을 찾게 돼요.}
          {term:예술 문화 확산|낯선 음악과 가까워져요|평소 접하기 어려웠던 클래식·재즈·국악·월드뮤직을 가까이 경험하며 문화 생활의 폭이 넓어져요.}
          {term:공동체 의식 높이기|함께 어울리며 하나가 돼요|나이도 취향도 다른 이웃과 방문객이 같은 음악에 박수를 보내며 서로 존중하고 연결돼요.}
        </dl>
        {art:fest-value}
        <div class="talk"><b>짝과 30초</b>위 세 가지 말고도 음악 축제가 지역과 사람에게 주는 좋은 점이 또 무엇일지 하나씩 이야기해요.</div>
        <aside class="bigq"><b>오늘의 질문 다시 보기</b><p>${Q1}</p>
          <small>음원은 소리를 똑같이 들려주지만, 축제는 그 계절과 공간의 공기, 연주자의 숨결, 곁에 선 사람들과 함께 호흡하는 살아 있는 경험까지 선물해요.</small>
        </aside>`,
      qs: [
        graded('f7', '음악 축제가 지역과 사회에 주는 좋은 점(사회적 가치)으로 알맞지 <b>않은</b> 것은?', ['지역의 문화와 명소를 널리 알린다', '다양한 예술 문화를 가까이 접하게 돕는다', '지역 주민만 들어오게 막아 다른 사람을 배제한다'], '지역 주민만 들어오게 막아 다른 사람을 배제한다'),
        graded('f8', '서로 다른 장르의 음악 축제를 감상할 때 가장 알맞은 태도는?', ['내가 좋아하는 장르만 옳다고 생각한다', '장르마다 다른 감성과 가치를 인정하고 존중하며 듣는다', '소리가 큰 음악만 좋은 음악이라고 여긴다'], '장르마다 다른 감성과 가치를 인정하고 존중하며 듣는다'),
        writing('t-value', '내가 찾은 축제의 가치', '지역 홍보·예술 문화 확산·공동체 의식 외에 <b>음악 축제가 주는 좋은 점 한 가지</b>를 더 써 봐요.', '예) 지역 상권과 음악인들에게 새로운 무대와 일자리가 생겨요.'),
        writing('t-q1', '오늘의 질문 마무리 한 줄', '집에서도 음원으로 들을 수 있는데 <b>사람들이 음악 축제에 모이는 까닭</b>을 내 말로 한 문장 써요.', '예) 그 계절 그 장소에서만 느낄 수 있는 생생한 소리와 함께하는 즐거움 때문이에요.')
      ],
      after: '<p class="hint">다섯 장의 고르기 8문항과 초대장·생각 한 줄을 확인한 뒤, 마지막 화면에서 제출해요.</p>'
    }
  ];

  CHAPTERS.forEach(function (chapter) {
    chapter.qs.forEach(function (q) {
      if (q.ans !== undefined) q.label = chapter.title + ' ' + q.id + ' (' + q.ans + ')';
    });
  });

  window.FESTIVAL = { V: V, ART: ART, WARMUP: WARMUP, FESTIVALS: FESTIVALS, CHAPTERS: CHAPTERS };
})();

/* 음악극 탐험대 개선판 — 수업 내용, 영상 구간, 문항.
 * 채점용 id와 허용 답은 stage-class/index.html의 학습지 순서를 따라요.
 * 영상은 원본 수업 자료의 YouTube 영상과 T021에서 정한 구간을 사용해요.
 */
(function () {
  'use strict';

  var V = {
    showA: { id: '3P1CnWI62Ik', title: '공연 A', by: '', start: 0, end: 40, mode: 'board' },
    showB: { id: 'Ds8ryWd5aFw', title: '공연 B', by: '', start: 0, end: 40, mode: 'board' },
    showC: { id: 'ewOAsUWQJvo', title: '공연 C', by: '', start: 0, end: 40, mode: 'board' },
    lesmis: { id: 'iK5b5DNNmdA', title: '레 미제라블 · 장발장과 자베르', by: '류박사 · 한국어 자막', start: 0, end: 120, mode: 'board' },
    queen: { id: 'YuBeBjqKSGQ', title: '마술피리 · 밤의 여왕', by: 'Royal Ballet and Opera', start: 0, end: 90, mode: 'board' },
    recitative: { id: '7J_pXgs-OYQ', title: '사랑의 묘약 · 청년과 약장수', by: '한국어 자막', start: 2435, end: 2535, mode: 'board' },
    pansori: { id: '5PzTVJ_dA2o', title: '흥보가 · 박 타는 대목', by: '국립국악원', start: 0, end: 60, mode: 'board' },
    peking: { id: 'tZwJbLXzIrI', title: '중국의 음악극', by: 'KBS 실험실', start: 136, end: 251, mode: 'board' },
    kabuki: { id: '0yBs870C6Eo', title: '일본의 음악극', by: '뮤직후', start: 0, end: 85, mode: 'board' },
    doremi: { id: 'drnBMAEA3AM', title: '사운드 오브 뮤직 · 도레미 송', by: 'Rodgers & Hammerstein', start: 0, end: 60, mode: 'board' },
    lion: { id: '7T57kzGQGto', title: '라이온 킹 · 360도 무대', by: 'Disney On Broadway', start: 0, end: 60, mode: 'board' },
    odyssey: { id: 'zz2ZH13NOi8', title: '오디세이 예고편', by: '유니버설 픽쳐스', start: 0, end: 0, mode: 'board' }
  };

  var ART = {
    start: { file: 'stage-start.webp', w: 1600, h: 900, alt: '한옥 마당과 유럽식 극장, 현대 공연 무대가 한 줄의 빛으로 이어져 있어요.' },
    musical: { file: 'stage-musical.webp', w: 1200, h: 900, alt: '조명 아래에서 외투를 입은 배우와 제복을 입은 배우가 마주 보고 노래해요.' },
    opera: { file: 'stage-opera.webp', w: 1600, h: 900, alt: '발코니가 둘러싼 극장에서 연주자들이 무대 앞에 앉아 있고, 조명 아래 한 사람이 노래해요.' },
    voices: { file: 'stage-voices.webp', w: 1200, h: 900, alt: '다섯 사람이 높이가 다른 단 위에 서서 노래해요.',
      caption: '높은 목소리부터 낮은 목소리 순서로, 여성은 소프라노·알토, 남성은 테너·바리톤·베이스예요.' },
    compare: { file: 'stage-compare.webp', w: 1200, h: 900, alt: '왼쪽 배우는 머리에 마이크를 끼고 노래하고, 오른쪽 가수는 연주자들 앞에서 마이크 없이 노래해요.' },
    pansori: { file: 'stage-pansori.webp', w: 1600, h: 900, alt: '돗자리 위에 부채를 든 사람이 서 있고, 곁에 북을 치는 사람이 앉아 있어요.',
      caption: '곁에서 북을 치며 장단을 맞추는 사람을 고수라고 해요. 부채를 펼치거나 손짓으로 상황을 보여 주는 몸짓은 발림이에요.' },
    peking: { file: 'stage-peking.webp', w: 1200, h: 900, alt: '얼굴을 색으로 분장한 배우가 채찍을 들고 말 타는 몸짓을 해요.' },
    kabuki: { file: 'stage-kabuki.webp', w: 1200, h: 900, alt: '얼굴에 붉은 선을 그린 배우가 객석 사이 통로에서 팔을 펼친 채 멈춰 서 있어요.' }
  };

  var SHOW_CHOICES = ['판소리', '오페라', '뮤지컬'];
  // 짐작은 이 장 화면에서만 골라요. 학습지 답과 분리해요.
  var WARMUP = {
    showA: { prompt: '공연 A', opts: SHOW_CHOICES },
    showB: { prompt: '공연 B', opts: SHOW_CHOICES },
    showC: { prompt: '공연 C', opts: SHOW_CHOICES },
    musical: { prompt: '말 없이 싸움 장면이 될까?', opts: ['될 것 같아요', '어려울 것 같아요'] },
    pansori: { prompt: '소리꾼 혼자 몇 사람을 맡을까?', opts: ['한 사람', '두 사람', '세 사람 이상'] }
  };

  var QUESTION_1 = '대사가 있으면 뮤지컬, 대사 없이 노래만 하면 오페라일까?';
  var QUESTION_2 = '무대 장치가 거의 없는데, 관객은 바다나 말 타는 장면을 어떻게 알아챌까?';

  function graded(id, prompt, opts, accepted, type) {
    var accept = accepted.split('|');
    return { id: id, type: type || 'radio', prompt: prompt, opts: opts, ans: accept[0], accept: accept };
  }

  var CHAPTERS = [
    {
      id: 'start', title: '음악극의 탄생', time: '8분',
      lead: '서로 다른 공연 세 편에서 같은 점을 찾아봐요.',
      lesson: `
        <aside class="bigq"><b>오늘의 질문 1</b><p>${QUESTION_1}</p></aside>
        {teacher:plan}
        <div class="listen-grid opening-videos">
          {vid:showA}{vid:showB}{vid:showC}
        </div>
        <section class="activity">
          <h2>어떤 공연일까?</h2>
          <p>세 공연의 앞 40초씩 보고, 어떤 장르일지 짐작해 봐요.</p>
          <div id="showGuesses">{warmup:showA}{warmup:showB}{warmup:showC}</div>
          <button type="button" class="mini cls reveal-shows" id="btnReveal" aria-expanded="false" aria-controls="showIdentities" disabled>정체 공개</button>
          <div id="showIdentities" hidden>
            <ul class="identities">
              <li><b>공연 A</b> 한국 · 판소리</li>
              <li><b>공연 B</b> 스페인 발렌시아 시장 · 오페라</li>
              <li><b>공연 C</b> 네덜란드 · 뮤지컬 (동물로 변신한 배우들의 무대)</li>
            </ul>
            {art:start}
          </div>
        </section>
        <p class="talk"><b>짝과 30초</b> 셋 다 있던 것은 무엇인지 짝에게 한 가지씩 말해요.</p>
        {activity:p1-1}
        <div class="define"><p>방금 본 세 무대처럼, 배우들이 노래하고 악기가 연주되는 가운데 인물들의 일이 펼쳐지는 공연을 <b>음악극</b>이라고 불러요. 아래 빈칸은 짝과 고른 것을 떠올리며 채워요.</p></div>`,
      qs: [
        { id: 'p1-1', label: '세 영상에 모두 있던 것', type: 'multi', activity: true,
          prompt: '셋 다 있던 것을 골라요. 여러 개 고를 수 있어요.',
          opts: ['노래', '악기 연주', '춤·몸짓', '의상·분장', '등장인물과 상황(이야기)', '관객'] },
        graded('p1-5', '음악극은 ⟦　⟧과(와) …', ['음악', '미술', '체육'], '음악|노래'),
        graded('p1-6', '… ⟦　⟧이(가) 하나로 어우러진 공연이다.', ['그림', '극', '건축'], '극|이야기|연극|연기')
      ]
    },
    {
      id: 'musical', title: '뮤지컬', time: '10분',
      lead: '두 사람이 무대에서 맞서는 장면을 들어요.',
      lesson: `
        {warmup:musical}
        {vid:lesmis|두 사람이 서로에게 무슨 말을 하는지 들어요.}
        {art:musical}
        <h3>방금 들은 장면에 이름 붙이기</h3>
        <dl class="terms terms-two">
          {term:넘버|한 곡씩 이름을 붙여 볼까요?|「레 미제라블」의 이 대립 장면처럼 공연 속에서 하나의 곡으로 들을 수 있는 부분이에요.}
          {term:송스루|공연 전체가 노래처럼 흘러가요.|장발장과 자베르가 서로 따지는 순간에도 반주와 노래가 이어졌죠. 「레 미제라블」은 이런 식으로 대화를 노래에 담아요.}
        </dl>
        <details class="more"><summary>더 알아보기</summary>
          <div class="listen-grid">{vid:doremi}{vid:lion}</div>
        </details>`,
      qs: [
        graded('p2-5', '뮤지컬을 이루는 개별 노래나 음악 장면 → ⟦　⟧', ['넘버', '앙상블', '서곡'], '넘버'),
        graded('p2-7', '말하는 대사를 거의 쓰지 않고 대화와 사건도 대부분 음악으로 이어 가는 형식 → ⟦　⟧', ['앙상블', '넘버', '송스루'], '송스루|sungthrough|성스루')
      ]
    },
    {
      id: 'opera', title: '오페라', time: '14분',
      lead: '목소리를 어떻게 써서 인물의 마음과 이야기를 전하는지 들어요.',
      lesson: `
        {vid:queen|여왕의 목소리가 가장 높아지는 순간을 찾아요.}
        <p class="talk"><b>짝과 30초</b> 말처럼 들렸나요, 노래처럼 들렸나요? 그렇게 느낀 까닭도 말해요.</p>
        <div class="activity">
          {vid:recitative|청년과 약장수가 주고받는 소리에서 말과 닮은 점을 찾아요.}
        </div>
        {art:opera}
        <h3>방금 들은 장면에 이름 붙이기</h3>
        <dl class="terms terms-two">
          {term:아리아|여왕에게 귀를 기울여요.|밤의 여왕이 홀로 노래하며 치솟는 음과 빠른 소리로 분노를 드러내요.}
          {term:레치타티보|약장수는 청년을 어떻게 속였을까요?|청년 네모리노가 사랑의 묘약을 찾고 약장수 둘카마라가 둘러댈 때 말하듯 소리가 빠르게 오가요. 그 소리에는 높낮이가 있고 건반 반주도 들려요.}
        </dl>
        <details class="more"><summary>목소리 높낮이 활동 (선택)</summary>
          <p>편한 높이에서 ‘아’를 조금 높게, 조금 낮게 내 봐요. 그림 설명을 읽고 높은 목소리부터 차례로 말해요.</p>
          {art:voices}
        </details>
        <details class="more"><summary>더 알아보기</summary>
          <p>오페라는 1600년 무렵 이탈리아에서 시작됐어요. 옛 그리스의 이야기를 무대에서 다시 들려주려는 시도에서 출발했어요.</p>
          {link:odyssey}
        </details>`,
      qs: [
        graded('p3-9', '한 인물이 자신의 감정이나 생각을 선율을 갖추어 표현하는 독창곡 → ⟦　⟧', ['아리아', '레치타티보', '서곡'], '아리아'),
        graded('p3-10', '말의 억양과 리듬을 살려 대화하듯 부르는 노래. 사건을 진행할 때 자주 쓰인다 → ⟦　⟧', ['서곡', '아리아', '레치타티보'], '레치타티보'),
        graded('p3-18', '「마술피리」의 밤의 여왕은 ⟦　⟧가 맡는 배역이다.', ['소프라노', '알토', '베이스'], '소프라노', 'pick')
      ]
    },
    {
      id: 'compare', title: '뮤지컬 vs 오페라', time: '13분',
      lead: '각 문장이 한쪽에 어울리는지, 두 무대에 다 어울리는지 골라요.',
      after: `
        <p class="talk"><b>짝과 30초</b> 방금 고른 문장에서 두 무대의 가장 큰 차이 한 가지를 찾아 짝에게 말해요.</p>
        <aside class="bigq"><b>오늘의 질문 1 다시 보기</b><p>${QUESTION_1}</p>
          <small>「레 미제라블」은 말하는 대사가 거의 없이 노래로 이어지는 뮤지컬(송스루)이에요. 「마술피리」는 노래 사이에 말하는 대사가 있는 오페라(징슈필)예요.</small>
          <small>대사가 있고 없고로는 나눌 수 없어요. 그럼 무엇이 다를까요? 방금 고른 문장과 이어서 생각해 봐요.</small>
        </aside>
        {activity:t1}
        <p class="hint">1차시는 여기까지예요. 다음 시간에는 지난 시간에 들은 소리로 다시 시작해요.</p>`,
      qs: [
        graded('p7-1', '보통 마이크로 목소리를 확성한다.', ['뮤지컬', '오페라', '둘 다'], '뮤지컬'),
        graded('p7-2', '성악 발성으로 마이크 없이 객석에 소리를 전달하는 전통이 있다.', ['뮤지컬', '오페라', '둘 다'], '오페라'),
        graded('p7-5', '음악과 노래로 이야기를 전하는 음악극이다.', ['뮤지컬', '오페라', '둘 다'], '둘 다'),
        { id: 't1', label: '1차시 마무리 한 줄', type: 'text', activity: true,
          prompt: '1차시 마무리 한 줄', ph: '두 무대를 듣고 알아차린 점을 한 문장으로 써요.' }
      ]
    },
    {
      id: 'pansori', title: '판소리', time: '18분', split: true,
      lead: '지난 시간의 두 장면을 먼저 다시 들어요.',
      lesson: `
        <h2 class="body-title">소리로 떠올리기</h2>
        <div class="listen-grid">
          {vid:queen|10초만 듣고 멈춤|10}
          {vid:lesmis|10초만 듣고 멈춤|10}
        </div>
        <aside class="bigq"><b>오늘의 질문 2</b><p>${QUESTION_2}</p></aside>
        {warmup:pansori}
        {vid:pansori|목소리와 몸짓이 달라지는 순간을 살펴봐요.}
        <p class="talk"><b>손가락으로 세기</b> 한 사람이 여러 인물을 오가는 장면이에요. 다른 인물이 나올 때마다 손가락을 하나씩 펴요.</p>
        {art:pansori}
        <h3>방금 들은 장면에 이름 붙이기</h3>
        <dl class="terms terms-two">
          {term:소리꾼|한 사람이 장면을 이끌어요.|목소리와 표정을 바꿔 가며 인물들 사이를 오가고, 때로는 이야기를 들려주는 사람이 돼요.}
          {term:창|북소리에 맞춰 소리가 뻗어 나가요.|박을 타는 장면에서 길게 뽑는 소리와 북이 어울리는 순간을 떠올려 봐요.}
          {term:아니리|잠깐 이야기를 들려줘요.|주인공이 이제 뭘 할지, 누가 무슨 말을 했는지 들려주는 구간이에요.}
          {term:추임새|듣는 사람도 무대에 힘을 보태요.|박자를 느끼다가 소리가 한숨 쉬는 자리에 “좋다!” 하고 짧게 화답해요.}
        </dl>
        <p class="talk"><b>다 같이</b> 선생님이 손짓하면, 소리가 한숨 쉬는 곳에서 “얼씨구!”를 한 번 넣어 봐요.</p>`,
      qs: [
        graded('p6-2', '⟦　⟧ 한 명이 해설자가 되기도 하고 여러 인물을 연기하는 1인 음악극이다.', ['고수', '소리꾼', '청중'], '소리꾼'),
        graded('p6-4', '장단에 선율을 얹어 부르는 노래 부분 → ⟦　⟧', ['창', '아니리', '발림'], '창|소리|창(소리)'),
        graded('p6-5', '노래 사이에 말로 상황을 설명하거나 대화를 이어 가는 부분 → ⟦　⟧', ['발림', '창', '아니리'], '아니리'),
        graded('p6-8', '고수나 청중이 보내는 격려와 공감의 소리 → ⟦　⟧ (예: “얼씨구”, “좋다”)', ['추임새', '아니리', '장단'], '추임새')
      ]
    },
    {
      id: 'explore', title: '골라 탐험: 경극과 가부키', time: '13분',
      lead: '배우가 관객에게 어떤 단서를 건네는지 찾아요.',
      lesson: `
        <div class="listen-grid">
          {vid:peking|2:16~4:11 · 배우의 움직임을 따라가요.}
          {vid:kabuki|0:00~1:25 · 얼굴과 옷차림을 살펴봐요.}
        </div>
        <section class="activity">
          <h2>읽어 볼 무대 고르기</h2>
          <p class="play-mode">태블릿 · 각자 (소리 없음)</p>
          {activity:x1}
          <section class="explore-panel" data-explore="경극" hidden>
            {art:peking}
            <dl class="terms">
              {term:창·념·작·타|노래하고, 말하고, 움직여요.|창은 노래, 념은 대사, 작은 연기, 타는 무술과 곡예예요.}
              {term:양식화된 동작|채찍 하나면 말이 나타나요.|채찍을 들고 몸을 흔들면 말을 타는 모습, 노를 젓는 몸짓이면 배가 떠가는 모습으로 읽을 수 있어요.}
              {term:검보|얼굴의 색깔도 단서예요.|얼굴에 그린 색과 무늬를 보면 배역이나 인물의 성격을 짐작할 수 있어요.}
            </dl>
          </section>
          <section class="explore-panel" data-explore="가부키" hidden>
            {art:kabuki}
            <dl class="terms">
              {term:미에|중요한 순간에 딱 멈춰요.|배우가 힘 있는 자세로 멈춰 서면 어떤 순간에 눈길을 줘야 하는지 알아차릴 수 있어요.}
              {term:하나미치|배우가 객석 사이를 지나가요.|객석을 가로지르는 통로 역시 무대예요. 배우가 그 길로 나타나거나 나가요.}
              {term:구마도리|얼굴의 굵은 선을 봐요.|분장 선의 색과 모양은 인물의 성격이나 힘을 강조해요.}
            </dl>
          </section>
          <div id="exploreFollowup" hidden>
            {activity:x2}
            <p class="talk"><b>짝과 30초</b> 고른 무대에서 관객이 알아챌 수 있는 단서를 하나씩 알려 줘요.</p>
          </div>
        </section>`,
      qs: [
        { id: 'x1', label: '골라 탐험 고른 장르', type: 'radio', activity: true,
          prompt: '어떤 무대를 읽어 볼까요?', opts: ['경극', '가부키'] },
        { id: 'x2', label: '골라 탐험 단서', type: 'radio', activity: true,
          prompt: '관객이 알아챈 단서는 무엇이었나요?', opts: ['몸동작', '분장 색', '노래와 대사', '객석 통로 무대'] }
      ]
    },
    {
      id: 'terms', title: '용어 연결하기', time: '14분',
      lead: '두 시간 동안 들었던 장면에 배운 이름을 붙여요.',
      after: `
        <aside class="bigq"><b>오늘의 질문 2 다시 보기</b><p>${QUESTION_2}</p>
          <small>판소리에서는 목소리, 아니리, 발림이 장면을 떠올리게 해요. 경극은 채찍으로 말을 타는 모습을, 가부키는 미에나 하나미치로 중요한 순간과 움직임을 보여 줘요.</small>
          <small>판소리에서 하나, 내가 고른 무대에서 하나를 골라 어떤 단서였는지 짝에게 말해요.</small>
        </aside>
        <p class="hint">장마다 고른 답과 마무리 한 줄을 확인한 뒤, 마지막 화면에서 제출해요.</p>`,
      qs: [
        graded('p8-1', '한 인물의 마음을 독창의 선율로 길게 드러내는 장면', ['아리아', '레치타티보', '아니리'], '아리아'),
        graded('p8-2', '음높이와 반주를 갖추고 말의 억양처럼 대화를 부르는 장면', ['창', '아니리', '레치타티보'], '레치타티보'),
        graded('p8-3', '말하는 대사를 거의 쓰지 않고 사건과 대화를 음악으로 이어 가는 뮤지컬', ['앙상블', '송스루', '넘버'], '송스루')
      ]
    }
  ];

  CHAPTERS.forEach(function (c) {
    c.qs.forEach(function (q) {
      if (q.ans !== undefined) q.label = c.title + ' ' + q.id + ' (' + q.ans + ')';
    });
  });

  window.STAGE = { V: V, ART: ART, WARMUP: WARMUP, CHAPTERS: CHAPTERS };
})();

/* 한국 대중음악사 3차시. 원작 영상 요약과 세 편의 대본을 바탕으로 구성. */
(function () {
  'use strict';

  function clip(id, title, start, seconds, by, mode = 'board') {
    return { id, title: '〈' + title + '〉', start, end: start + seconds, by, mode };
  }

  const V = {
    main: 'uX69Ct58-c0',
    mokpo: clip('sg-Cfp4Xo2M', '목포의 눈물', 18, 30, '이난영 · 1935년 육성 복원'),
    geumsun: clip('vBkAnIKc07M', '굳세어라 금순아', 10, 30, '현인 · KBS 쇼특급'),
    galaxy: clip('oi8U2Q9EDEM', '푸른 하늘 은하수', 5, 35, '신중현(히키 신) · 1958년 음반', 'solo'),
    morningdew: clip('PLZRL2gqMes', '아침이슬', 20, 35, '양희은 · KBS 콘서트7080'),
    miin: clip('u507Ng30fDY', '미인', 35, 35, '신중현과 후배들 · KBS 콘서트7080'),
    window: clip('lpGgwK2fNkg', '창 밖의 여자', 15, 35, '조용필 · KBS 라이브'),
    youth: clip('fi9Dny-5fV4', '청춘', 15, 35, '산울림 · 1984년 방송 라이브'),
    encounter: clip('o2W6gzW4SHM', '어쩌다 마주친 그대', 20, 35, '송골매 · KBS 콘서트'),
    myworld: clip('TA81ePzpccs', '그것만이 내 세상', 35, 35, '전인권 밴드 · KBS 열린음악회'),
    radio: clip('vJqznmk2r14', '크게 라디오를 켜고', 20, 35, '시나위 · MBC 피크닉 라이브'),
    heeya: clip('AjZlgsZatew', '희야', 25, 35, '이승철 · KBS 라이브'),
    jaeha: clip('u6aVp-UwoBQ', '사랑하기 때문에', 15, 35, '유재하 원곡 · 클래식 편성 연주'),
    nanalayo: clip('8J3m-ao43Bs', '난 알아요', 18, 40, '서태지와 아이들 · 1992년 KBS 토요대행진'),
    hayeoga: clip('L-AxO7EPU8c', '하여가', 208, 35, '서태지와 아이들 · 공식 뮤직비디오'),
    classroom: clip('MvwpBTfXS7E', '교실 이데아', 30, 35, '서태지 · 공식 라이브 무대'),
    comeback: clip('q3xy4p2JTfU', 'Come back home', 20, 35, '서태지와 아이들 · 공식 뮤직비디오'),
    letter: clip('MfP3Wy14nwQ', '이등병의 편지', 25, 35, '김광석 · 1995년 학전 공연'),
    loved: clip('KO8nXzCMoOE', '사랑했지만', 15, 35, '김광석 · 1991년 SBS 인기가요'),
    couple: clip('WwKisnm7et4', '어느 60대 노부부의 이야기', 30, 35, '김광석 · 1995년 슈퍼 콘서트'),
    brown: clip('LZlIqfMn4cc', '벌써 일년', 58, 35, '브라운 아이즈 · 공식 뮤직비디오'),
    timeless: clip('rFuFmyVLT0k', 'Timeless', 22, 35, 'SG워너비 · KBS 윤도현의 러브레터'),
    tellme: clip('t7X8qhESIfs', 'Tell Me', 42, 12, '원더걸스 · 2007년 MBC 음악중심'),
    rdd: clip('roughtzsCDI', 'Ring Ding Dong', 0, 12, '샤이니 · 공식 뮤직비디오'),
    sorry: clip('x6QA3m58DQw', 'Sorry Sorry', 48, 12, '슈퍼주니어 · 공식 뮤직비디오'),
    gee: clip('U7mPqycQ0tQ', 'Gee', 48, 12, '소녀시대 · 공식 뮤직비디오'),
    cherry: clip('tXV7dfvSefo', '벚꽃엔딩', 15, 12, '버스커버스커 · 공식 뮤직비디오'),
    gangnam: clip('9bZkp7q19f0', '강남스타일', 65, 12, '싸이 · 공식 뮤직비디오'),
    lies: clip('2Cv3phvP8Ro', '거짓말', 55, 35, '빅뱅 · 공식 뮤직비디오'),
    last: clip('PQ3gphHww1Q', '마지막 인사', 65, 35, '빅뱅 · 공식 뮤직비디오'),
    haru: clip('MzCbEdtNbJ0', '하루 하루', 55, 35, '빅뱅 · 공식 뮤직비디오')
  };

  function excerpt(source, seconds, start = source.start) {
    return { ...source, start, end: start + seconds, mode: 'board' };
  }

  Object.assign(V, {
    hayeogaListen: excerpt(V.hayeoga, 15, 212),
    classroomListen: excerpt(V.classroom, 15),
    timelessListen: excerpt(V.timeless, 10),
    liesListen: excerpt(V.lies, 10)
  });

  const ART = {
    open: { file: 'kpop-open.webp', w: 1600, h: 900, alt: '여러 시대의 음악을 상징하는 물건과 무대를 한 장면에 모은 그림.' },
    room: { file: 'kpop-room.webp', w: 1200, h: 900, alt: '음악감상실에서 젊은이들이 함께 음악을 듣고 연주하는 모습.' },
    stage: { file: 'kpop-stage.webp', w: 1200, h: 900, alt: '여러 악기와 목소리가 어우러지는 공연 무대.' },
    crisis: { file: 'kpop-crisis.webp', w: 1200, h: 900, alt: '음반과 휴대용 재생기를 통해 듣는 방법이 달라지는 모습을 그린 그림.' },
    hook: { file: 'kpop-hook.webp', w: 1200, h: 900, alt: '가수들이 무대 위에서 노래와 춤을 선보이는 모습.' },
    global: { file: 'kpop-global.webp', w: 1600, h: 900, alt: '서로 다른 곳에 사는 사람들이 화면으로 같은 무대를 만나는 모습.' }
  };

  const SESSIONS = [
    '100년을 거꾸로 가는 줄자',
    '한 팀이 판을 바꾸고, 빙하기가 온다',
    '빙하기를 넘은 소리들, 그리고 세계로'
  ];

  const RULER = [
    ['20s', '1920년대', 'start'], ['50s', '1950년대', 'start'],
    ['60s', '1960년대', 'folk70'], ['70s', '1970년대', 'folk70'],
    ['80s', '1980년대', 'era80'], ['90s', '1990년대', 'seotaiji'],
    ['00초', '2000년대 초', 'crisis'], ['00중', '2000년대 중반', 'vocal00'],
    ['07~', '2007년 이후', 'hook07'], ['10s', '2010년대', 'audition'],
    ['12~', '2012년 이후', 'global']
  ];

  const CAPSULE = {
    c1: {
      chapter: 'start',
      question: '100년 전 노래와 지금 노래, 가장 많이 달라진 건?',
      opts: ['노래를 듣는 기계', '가수가 되는 길', '노래가 퍼지는 넓이'],
      recallTitle: '1차시 타임캡슐 열기',
      recallPrompt: '처음 생각을 다시 보고, 오늘 들은 곡 하나를 들어 짝에게 이유를 말해 봐요.'
    },
    c2: {
      chapter: 'seotaiji',
      question: '음악판을 바꾸는 건 누구일까?',
      opts: ['한 명의 가수', '노래를 듣는 사람들', '새로운 기술'],
      recallTitle: '2차시 타임캡슐 열기',
      recallPrompt: '오늘 배운 변화 중 처음 생각과 이어지는 장면을 하나 찾아봐요.'
    },
    c3: {
      chapter: 'vocal00',
      question: '음반이 안 팔리는 시대, 가수들은 무엇으로 살아남았을까?',
      opts: ['노래 실력', '귀에 남는 짧은 반복', '방송 오디션', '해외 무대'],
      recallTitle: '3차시 타임캡슐 열기',
      recallPrompt: '오늘 가장 인상 깊었던 소리나 무대를 떠올리며 두 번의 첫 생각을 다시 봐요.',
      alsoRecall: 'c1'
    }
  };

  const BALANCE = {
    b70s: {
      prompt: '학교 축제에 딱 한 팀만 부를 수 있다면?',
      choices: [
        ['통기타 두 사람', '노랫말과 목소리가 또렷한 포크 무대'],
        ['전기 기타 밴드', '신나는 기타 리듬의 록 무대']
      ],
      talk: '축제에서 그 소리를 듣고 싶은 이유를 짝에게 말해 봐요.'
    },
    'b-mp3': {
      prompt: '좋아하는 가수의 새 앨범이 나왔다. 가수 입장까지 떠올려 고른다면?',
      choices: [
        ['음반을 사서 듣기', '내가 산 음반으로 노래 듣기'],
        ['공짜 파일로 듣기', '공유받은 파일을 휴대용 기기에 담아 듣기']
      ],
      talk: '듣는 사람과 가수에게 어떤 점이 달랐을지 짝과 이야기해요.'
    },
    b2010s: {
      prompt: '가수가 되고 싶은 친구에게 한 길을 추천한다면?',
      choices: [
        ['방송 오디션', '무대 화제성과 개성으로 바로 평가받기'],
        ['기획사 연습생', '체계적 트레이닝과 팀 호흡으로 데뷔 준비하기']
      ],
      talk: '친구의 어떤 강점 때문에 그 길을 추천했는지 이야기해요.'
    }
  };

  const JUKEBOX = {
    bands80: {
      title: '80년대 밴드 주크박스',
      tracks: [
        ['youth', '산울림', '산울림의 서정적인 멜로디와 밴드 반주를 들어요.'],
        ['encounter', '송골매', '디스코의 박자 위에 펑크 록이 어우러져요.'],
        ['myworld', '들국화', '들국화 1집에 담긴 곡으로 전인권의 목소리를 들어요.'],
        ['radio', '시나위', '헤비메탈의 힘 있는 기타 소리와 목소리를 들어요.'],
        ['heeya', '부활', '이승철의 목소리와 록 반주가 함께 들리는 록 발라드예요.']
      ]
    },
    seotaiji4: {
      title: '서태지와 아이들, 앨범마다 달라진 소리',
      tracks: [
        ['nanalayo', '1집', '빠른 랩과 춤을 한 무대에서 선보였어요.'],
        ['hayeoga', '2집', '랩 사이로 태평소가 들려요.'],
        ['classroom', '3집', '록의 거센 소리가 곡의 바탕을 이뤄요.'],
        ['comeback', '4집', '랩으로 기성세대를 비판하는 목소리를 전했어요.']
      ],
      cues: [
        { text: '말하듯 빠르게 이어 가는 랩이 들려요.', ok: true },
        { text: '첼로와 피아노만 반주에 들려요.', ok: false },
        { text: '여러 사람이 노래에 맞춰 춤을 춰요.', ok: true },
        { text: '한 사람이 제자리에 서서 끝까지 노래해요.', ok: false }
      ]
    },
    kwangseok: {
      title: '김광석 주크박스',
      tracks: [
        ['letter', '', '통기타와 목소리가 이끄는 노래를 들어요.'],
        ['loved', '', '울림 있는 목소리가 노랫말을 어떻게 전하는지 들어요.'],
        ['couple', '', '두 사람의 이야기를 들려주는 듯한 표현에 귀 기울여요.']
      ]
    },
    bigbang3: {
      title: '빅뱅 주크박스',
      tracks: [
        ['lies', '', '랩과 전자음이 함께 들어오는 대목을 찾아봐요.'],
        ['last', '', '댄스 박자 위로 이어지는 목소리를 들어요.'],
        ['haru', '', '랩에서 노래로 넘어갈 때 달라지는 느낌을 들어요.']
      ]
    }
  };

  function pin(song, era, detail) {
    return { song, era, detail };
  }

  const BOARD = {
    p1: {
      title: '1차시 줄자 정리판',
      pins: [
        pin('mokpo', '1920~30년대', '음반으로 퍼진 유행가를 다시 들어요.'),
        pin('morningdew', '1970년대', '양희은이 부른 포크 노래예요.'),
        pin('window', '1980년대 초', '조용필 1집에서 신시사이저와 전기 기타를 들을 수 있어요.'),
        pin('jaeha', '1980년대 후반', '유재하가 클래식 악기를 발라드에 담았어요.')
      ]
    },
    final: {
      title: '최종 100년 줄자 정리판',
      pins: [
        pin('mokpo', '1920~30년대', '음반으로 퍼진 유행가를 다시 들어요.'),
        pin('miin', '1970년대', '신중현과 엽전들의 전기 기타 리듬을 들어요.'),
        pin('window', '1980년대', '조용필은 신시사이저와 블루스 록 기타 솔로를 한 곡에 담았어요.'),
        pin('nanalayo', '1990년대', '랩과 춤이 10대의 귀를 사로잡았어요.'),
        pin('timeless', '2000년대 초·중반', 'SG워너비가 중간 빠르기의 R&B에 힘 있는 목소리를 실었어요.'),
        pin('gangnam', '2012년 이후', '싸이의 노래와 춤은 유튜브와 SNS를 타고 세계로 퍼졌어요.')
      ]
    }
  };

  const INTRO_QUIZ = {
    tellme: {
      opts: ['sorry', 'tellme', 'gee'],
      fact: '원더걸스는 짧게 반복되는 후렴에 따라 하기 쉬운 포인트 안무를 더했다.'
    },
    rdd: {
      opts: ['rdd', 'gee', 'tellme'],
      fact: '영상에서는 샤이니의 이 노래를 짧은 후렴이 반복되는 후크송의 예로 들려줬다.'
    },
    sorry: {
      opts: ['gee', 'rdd', 'sorry'],
      fact: '영상에서는 슈퍼주니어의 반복되는 후렴을 후크송의 대표적인 예로 들려줬다.'
    },
    gee: {
      opts: ['tellme', 'gee', 'sorry'],
      fact: '소녀시대는 2009년 이 곡으로 후크송 열풍에 합류했다.'
    },
    cherry: {
      opts: ['letter', 'cherry', 'morningdew'],
      fact: "봄마다 차트에 다시 돌아와 영상에서는 '벚꽃좀비'라고 불렀다."
    },
    gangnam: {
      opts: ['gangnam', 'lies', 'tellme'],
      fact: '게시 100일 만에 유튜브 최초 5억 뷰를 넘겼고, 33개국 이상 공식 차트 1위에 올랐다.'
    }
  };

  function choice(id, label, prompt, opts, ans, listen) {
    return { id, label, type: 'radio', prompt, opts, ans, listen };
  }

  function reflect(id, prompt, vocab) {
    return { id, type: 'text', prompt, vocab };
  }

  const CHAPTERS = [
    {
      id: 'start', title: '1920s~50s · 첫 노래와 미8군 무대', era: '1920~50년대', minutes: 11,
      tvStartSec: 0, tvEndSec: 238,
      tvPoint: '노래가 사람들에게 닿는 길과 가수가 무대에 서는 길을 살펴보세요.',
      lead: 'BTS 앞에 지나간 흑백 얼굴들 — 100년 전 첫 노래까지 거꾸로 간다.',
      lesson: `
        {capsule:c1}
        <h2>음반에서 무대로</h2>
        <div class="feature">
          {art:open}
          <div class="story">
            <p>일제강점기에는 목소리를 담은 음반과 축음기로 노래가 퍼졌어요. 윤심덕의 〈사의 찬미〉와 이난영의 〈목포의 눈물〉이 알려졌고, 트로트의 시작인 유행가와 전통 민요를 새롭게 부른 신민요가 사랑받았어요.</p>
            <p>1950년대에는 6·25 전쟁을 겪는 사람들에게 현인의 〈굳세어라 금순아〉가 널리 불렸어요. 오디션을 거치는 미8군 쇼는 김시스터즈·신중현·패티 김이 활동한 무대이자 연예기획사의 출발점이 됐어요.</p>
          </div>
        </div>
        <div class="listen-grid">
          {vid:mokpo}
          {vid:geumsun}
          {vid:galaxy}
        </div>`,
      qs: [
        choice('k1-1', '일제강점기 노래를 퍼뜨린 기계', '일제강점기에 노래를 퍼뜨린 기계와 매체는 무엇인가요?',
          ['텔레비전', '축음기·음반', '스마트폰'], '축음기·음반'),
        choice('k1-2', '미8군 무대', '1950년대 한국 음악인들은 어떻게 미군 부대 무대에 섰나요?',
          ['오디션을 보고 무대에 섰다', '노래가 금지됐다', '음반 100만 장'], '오디션을 보고 무대에 섰다')
      ]
    },
    {
      id: 'folk70', title: '1960s~70s · 쎄시봉, 포크와 록', era: '1960~70년대', minutes: 11,
      tvStartSec: 238, tvEndSec: 466,
      tvPoint: '음악감상실에서 출발한 소리와 전기 기타로 달라진 소리를 비교해 보세요.',
      lesson: `
        <h2>두 가지 기타 소리</h2>
        <div class="listen-grid">
          {vid:morningdew}
          {vid:miin}
        </div>
        <div class="feature">
          {art:room}
          <div class="story">
            <p>트로트가 전성기를 누린 1960년대에는 이미자와 패티 김이 큰 사랑을 받았어요. 음악감상실 쎄시봉에서는 송창식·윤형주·조영남이 서양 음악을 듣고 익혀 무대에서 불렀어요.</p>
            <p>1970년대에는 김민기·양희은·한대수의 한국적 포크와 신중현과 엽전들의 록이 퍼졌어요. 유신정권의 대마초 파동으로 활동이 막히고 일부 노래가 금지곡이 되었지만, 남진과 나훈아가 트로트의 인기를 이었고 산울림이 새로운 록을 들려주었어요.</p>
          </div>
        </div>
        {balance:b70s}`,
      qs: [
        choice('k1-3', '1970년대 금지곡', '1970년대 일부 노래에 어떤 일이 일어났나요?',
          ['해외 1위', '방송 오디션', '금지곡이 됐다'], '금지곡이 됐다'),
        choice('k1-4', '포크와 록의 악기', '〈아침이슬〉과 〈미인〉을 이끄는 악기를 순서대로 골라요.',
          ['가야금', '통기타 / 전기 기타', '오케스트라'], '통기타 / 전기 기타')
      ]
    },
    {
      id: 'era80', title: '1980s · 가왕, 스쿨밴드, 발라드의 탄생', era: '1980년대', minutes: 17,
      tvStartSec: 466, tvEndSec: 702,
      tvPoint: '전자 악기와 기타가 묵직한 무대, 클래식 악기가 보태진 발라드를 들어 보세요.',
      lesson: `
        {art:stage}
        <article class="legend-card">
          <div class="story">
            <h2>조용필</h2>
            <p>1980년 1집 〈창 밖의 여자〉는 한국에서 처음으로 100만 장 팔린 음반이에요. 조용필은 신시사이저로 만든 소리와 블루스 록 전기 기타의 독주를 넣었어요. 록과 재즈에서 판소리와 오페라까지 다양한 음악을 받아들였어요.</p>
          </div>
          {vid:window}
        </article>
        <section class="chapter-block">
          <h2>대학 밴드에서 헤비메탈과 록 발라드까지</h2>
          <p>대학생이 중심인 스쿨밴드가 활약했고, 헤비메탈과 록 발라드처럼 다른 색깔의 밴드 음악도 나왔어요.</p>
          {jukebox:bands80}
        </section>
        <article class="legend-card">
          <div class="story">
            <h2>유재하</h2>
            <p>유재하는 1987년 1집 〈사랑하기 때문에〉의 작사·작곡·편곡을 직접 했어요. 첼로·바이올린·피아노 같은 클래식 악기를 노래에 어울리게 배치했어요. 이 소리는 한국 발라드의 개성으로 자리 잡았어요.</p>
          </div>
          {vid:jaeha}
        </article>`,
      qs: [
        choice('k1-5', '1980년대 소리 듣기', '이 노래에서 크게 들리는 소리는 무엇인가요?',
          ['신시사이저·전기 기타', '가야금', '합창단'], '신시사이저·전기 기타', excerpt(V.window, 10)),
        choice('k1-6', '조용필 1집의 기록', '조용필 〈창 밖의 여자〉가 처음 세운 기록은 무엇인가요?',
          ['33개국 1위', 'TV 없이 1위', '음반 100만 장'], '음반 100만 장'),
        choice('k1-7', '발라드 반주 듣기', '이 노래를 반주하는 악기는 무엇인가요?',
          ['전자 드럼', '첼로·바이올린·피아노', '장구·꽹과리'], '첼로·바이올린·피아노', excerpt(V.jaeha, 10)),
        reflect('t1', '조용필이나 유재하의 곡에서 기억에 남는 소리 하나를 골라 어떤 분위기를 만드는지 한 문장으로 적어요.',
          ['신시사이저', '전기 기타', '목소리', '가사', '분위기', '새롭다'])
      ]
    },
    {
      id: 'wrap1', title: '1차시 정리 · 1920s~80s 줄자 잇기', era: '줄자 잇기', minutes: 6,
      lesson: `
        {board:p1}
        {capsuleRecall:c1}`,
      qs: []
    },
    {
      id: 'seotaiji', split: true, title: '1990s 전반 · 판을 바꾼 서태지와 아이들', era: '1990년대 전반', minutes: 13,
      tvStartSec: 702, tvEndSec: 834,
      tvPoint: '10대가 반긴 첫 무대와 앨범마다 새롭게 섞인 소리를 찾아보세요.',
      lesson: `
        {recap:mokpo,miin,window}
        <section class="opening-listen">
          <h2>이 노래 안에 국악 소리가 숨어 있다. 어디서 나올까?</h2>
          {openListen:hayeogaListen|15}
        </section>
        {capsule:c2}
        <article class="legend-card">
          <div class="story">
            <h2>서태지와 아이들</h2>
            <p>1992년 〈난 알아요〉의 랩과 춤은 10대가 중심이 된 힙합·댄스 시대를 열었어요. 앨범마다 국악이나 록을 섞고 랩으로 기성세대를 비판하며 음악의 색을 바꿨어요. 1996년에는 은퇴를 발표했어요.</p>
          </div>
          {jukebox:seotaiji4}
        </article>`,
      qs: [
        choice('k2-1', '서태지와 아이들의 변화', '서태지와 아이들이 앨범을 낼 때마다 바꾼 것은 무엇인가요?',
          ['멤버 수', '나라', '장르'], '장르'),
        choice('k2-2', '서태지와 아이들 소리 듣기 1', '이 노래에 섞인 소리는 무엇인가요?',
          ['국악', '오케스트라', '레게'], '국악', V.hayeogaListen),
        choice('k2-3', '서태지와 아이들 소리 듣기 2', '이 노래의 바탕이 되는 장르는 무엇인가요?',
          ['트로트', '발라드', '록'], '록', V.classroomListen)
      ]
    },
    {
      id: 'era90', title: '1990s 후반 · 1세대 아이돌, 포크와 홍대 인디', era: '1990년대 후반', minutes: 12,
      tvStartSec: 834, tvEndSec: 1053,
      tvPoint: '춤추는 팀과 통기타 가수, 작은 무대의 밴드가 같은 시대에 어떻게 활약했는지 살펴보세요.',
      lesson: `
        <h2>한 시대, 여러 무대</h2>
        <div class="story">
          <p>듀스는 뉴 잭 스윙과 힙합을 들여와 한국 힙합 댄스의 뿌리가 됐어요. 최초의 한류 아이돌 H.O.T.와 젝스키스·핑클·S.E.S가 1세대 아이돌을 이루었고, 연습생 훈련과 멤버별 역할, 단체 안무 같은 규칙이 생겼어요.</p>
          <p>홍대 앞 작은 공연장에서는 언니네 이발관·델리 스파이스·크라잉넛이 자기 음악을 스스로 만들고 알리는 인디 문화를 열었어요. 델리 스파이스의 소리는 TV 원작 구간에서 들어요.</p>
        </div>
        <details class="more">
          <summary>다른 소리를 만든 가수와 팀</summary>
          <p>신해철은 여러 장르를 섞었고, 김건모의 레게를 담은 3집은 300만 장이 팔렸어요. 패닉과 015B가 각자 다른 소리를 들려줬고, 토이는 여러 보컬과 함께 곡을 만들었어요.</p>
        </details>
        <section class="chapter-block">
          <h2>김광석이 다시 부른 포크</h2>
          <p>김광석은 예전 포크곡들을 다시 불러 1990년대 사람들에게 전했어요.</p>
          {jukebox:kwangseok}
          <p class="talk"><b>짝 이야기 30초</b> 한 곡을 골라, 목소리와 통기타가 어떤 이야기를 들려주는지 짝에게 말해 봐요.</p>
        </section>`,
      qs: [
        choice('k2-4', 'H.O.T.가 연 흐름', 'H.O.T.가 처음 연 흐름은 무엇인가요?',
          ['금지곡', '한류', '방송 오디션'], '한류'),
        choice('k2-5', '홍대 밴드', '작은 무대에서 자기 음악을 스스로 만들고 알린 밴드들을 무엇이라고 부르나요?',
          ['인디', '아이돌', '트로트'], '인디'),
        reflect('t2', '서태지와 아이들이나 김광석의 곡을 골라, 그 소리가 기억에 남은 까닭을 한 문장으로 적어요.',
          ['랩', '국악', '록', '통기타', '이야기', '위로'])
      ]
    },
    {
      id: 'crisis', title: '1997~2000s 초 · IMF와 MP3, 음반 시장의 빙하기', era: '1997~2000년대 초', minutes: 12,
      tvStartSec: 1053, tvEndSec: 1338, tvOnly: true,
      tvPoint: '외환위기 뒤 무대에 선 가수들이 어떻게 바뀌고, 사람들은 음악을 어떻게 구했는지 살펴보세요.',
      lesson: `
        <h2>음반이 팔리지 않는 ‘빙하기’</h2>
        <div class="feature">
          {art:crisis}
          <div class="story">
            <p>1997년 IMF 외환위기로 10대가 쓸 수 있는 돈이 줄면서 솔로 가수가 강세를 보였어요. 조성모·임창정·엄정화·이정현·싸이·비·이효리·김종국이 활약했어요.</p>
            <p>휴대용 MP3와 개인끼리 파일을 나누는 ‘소리바다’ 같은 P2P 서비스가 퍼지자 음반이 안 팔리고 매장도 크게 줄었어요. 아이돌 무대에서는 god와 신화가 1.5세대로 활약했어요.</p>
          </div>
        </div>
        {balance:b-mp3}`,
      qs: [
        choice('k2-6', 'MP3와 음반 시장', 'MP3와 파일 공유가 퍼지면서 무슨 일이 생겼나요?',
          ['더 팔렸다', '음반이 안 팔렸다', '노래가 금지됐다'], '음반이 안 팔렸다'),
        choice('k2-7', '음반 시장 빙하기의 무대', '음반 시장이 빙하기를 맞을 무렵 어떤 가수의 활약이 늘었나요?',
          ['솔로 가수', '밴드', '합창단'], '솔로 가수')
      ]
    },
    {
      id: 'wrap2', title: '2차시 정리 · 빙하기 앞에서 멈춘 시계', era: '빙하기 앞에서', minutes: 8,
      lesson: `
        {capsuleRecall:c2}
        <aside class="next-preview">
          <p class="eyebrow">다음 시간</p>
          <h2>음반이 안 팔리는 빙하기를 누가, 어떻게 넘었을까?</h2>
        </aside>`,
      qs: []
    },
    {
      id: 'vocal00', split: true, title: '2000s 초·중 · 2세대 연습생과 보컬의 시대', era: '2000년대 초·중반', minutes: 12,
      tvStartSec: 1338, tvEndSec: 1562,
      tvPoint: '연습생이 준비하는 무대와 목소리가 앞에 나서는 노래를 살펴보세요.',
      lesson: `
        {recap:nanalayo,hayeogaListen,letter}
        <section class="opening-listen">
          <h2>TV에 한 번도 안 나온 노래가 1위를 했다. 어떻게?</h2>
          {openListen:brown|10}
        </section>
        {capsule:c3}
        <h2>연습생과 노래방의 목소리</h2>
        <div class="story">
          <p>2세대에는 가수 지망생을 뽑아 춤·노래·외국어를 가르치는 연습생 제도가 본격적으로 쓰였어요. 보아·동방신기·슈퍼주니어는 아시아 무대까지 바라봤어요.</p>
          <p>브라운 아이즈의 〈벌써 일년〉은 TV에 출연하지 않고 1위에 올랐어요. 브라운 아이즈와 SG워너비가 들려준 미디엄 템포 R&B는 중간 빠르기의 박자에 힘 있게 부르는 ‘소몰이 창법’을 담았어요.</p>
        </div>
        <div class="listen-grid">
          {vid:brown}
          {vid:timeless}
        </div>
        <p class="listen-note">휘성부터 거미까지, 여러 가수의 목소리는 TV 원작 구간에서 이어서 들어요.</p>`,
      qs: [
        choice('k3-1', '벌써 일년의 1위', '브라운 아이즈의 〈벌써 일년〉이 특별한 까닭은 무엇인가요?',
          ['해외 1위', '금지곡', 'TV에 나오지 않고 1위'], 'TV에 나오지 않고 1위'),
        choice('k3-2', '2000년대 R&B 소리 듣기', '이 시대 노래에서 가장 앞에 나서는 것은 무엇인가요?',
          ['춤', '목소리(노래 실력)', '전자음 반복'], '목소리(노래 실력)', V.timelessListen)
      ]
    },
    {
      id: 'hook07', title: '2007~2010s 초 · 후크송, 걸그룹 3강과 빅뱅', era: '2007년~2010년대 초', minutes: 15,
      tvStartSec: 1562, tvEndSec: 1720,
      tvPoint: '금세 따라 부르게 되는 대목과 힙합에 어우러지는 소리를 찾아보세요.',
      lesson: `
        {art:hook}
        {introQuiz:tellme,rdd,sorry,gee}
        <article class="legend-card">
          <div class="story">
            <h2>빅뱅</h2>
            <p>빅뱅은 힙합에 전자음이 어우러진 일렉트로니카 댄스를 결합했어요. 〈거짓말〉을 비롯한 곡들에서 이런 ‘K-POP 사운드’를 들려줬어요. 그 소리는 BTS와 블랙핑크 같은 뒤이은 팀에 영향을 줬어요.</p>
          </div>
          {jukebox:bigbang3}
        </article>
        <section class="chapter-block story">
          <h2>후크송과 음원 시대</h2>
          <p>귀에 박히는 짧은 반복(후크)과 따라 하기 쉬운 동작이 함께 유행했고, 원더걸스·카라·소녀시대가 걸그룹 3강을 이뤘어요. 멜론 같은 음원 스트리밍이 안정되고 음악 저작권 개념이 자리 잡았어요. 걸그룹이 활약하는 가운데 여자 솔로 가수 아이유도 자기 목소리로 여러 장르를 들려줬어요.</p>
        </section>`,
      qs: [
        choice('k3-3', '후크송의 공통점', '원더걸스·소녀시대 노래의 공통점은 무엇인가요?',
          ['국악', '긴 기타 독주', '귀에 박히는 짧은 반복'], '귀에 박히는 짧은 반복'),
        choice('k3-4', '빅뱅 소리 듣기', '이 노래를 이루는 두 소리는 무엇인가요?',
          ['힙합 + 일렉트로니카', '판소리 + 국악', '포크 + 통기타'], '힙합 + 일렉트로니카', V.liesListen),
        choice('k3-5', '빅뱅이 영향을 준 팀', '빅뱅의 ‘K-POP 사운드’는 어떤 팀에 영향을 줬나요?',
          ['BTS·블랙핑크', '산울림', '들국화'], 'BTS·블랙핑크')
      ]
    },
    {
      id: 'audition', title: '2010s · 오디션과 서바이벌의 열풍', era: '2010년대', minutes: 7,
      tvStartSec: 1720, tvEndSec: 1887,
      tvPoint: '새 가수를 뽑는 무대와 기존 가수가 명곡을 다시 부르는 무대를 구별해 보세요.',
      lesson: `
        {introQuiz:cherry}
        <h2>방송에서 열린 또 다른 무대</h2>
        <div class="story">
          <p>아이돌 무대가 많아지자 사람들은 개성 있는 가수와 새로운 음악을 찾았어요. 〈슈퍼스타K〉는 서인국·존 박·허각·로이킴·버스커버스커 같은 가수를 알렸어요. 〈나는 가수다〉와 〈불후의 명곡〉에서는 기존 가수들이 다른 가수의 명곡을 새롭게 불렀어요.</p>
        </div>
        <details class="more">
          <summary>어떤 오디션 무대가 더 있었을까?</summary>
          <p>〈복면가왕〉은 목소리, 〈쇼미더머니〉는 힙합, 〈미스트롯〉과 〈미스터트롯〉은 트로트에 주목했어요. 〈팬텀싱어〉는 성악과 뮤지컬, 〈탑밴드〉는 아마추어 밴드가 나설 무대였어요. 투표로 아이돌을 뽑는 〈프로듀스〉는 투표 조작 논란을 겪었어요.</p>
        </details>
        {balance:b2010s}`,
      qs: [
        choice('k3-6', '방송 오디션이 연 길', '〈슈퍼스타K〉 같은 프로그램이 바꾼 것은 무엇인가요?',
          ['노래 금지', '음반 100만 장', '누구나 오디션으로 가수가 된다'], '누구나 오디션으로 가수가 된다')
      ]
    },
    {
      id: 'global', title: '2012~지금 · 유튜브와 세계로 간 K-POP', era: '2012년 이후', minutes: 6,
      tvStartSec: 1887, tvEndSec: 2048,
      tvPoint: '한 곡의 영상이 나라를 건너 퍼지면서 아이돌의 무대가 어떻게 달라졌는지 살펴보세요.',
      lesson: `
        {introQuiz:gangnam}
        <h2>화면을 타고 세계로</h2>
        <div class="feature">
          {art:global}
          <div class="story">
            <p>2012년 싸이의 〈강남스타일〉은 유튜브와 SNS를 통해 세계로 퍼졌어요. 게시 100일 만에 5억 뷰를 넘었고 33개국 이상에서 공식 차트 1위에 올랐어요.</p>
            <p>3세대 아이돌은 세계 무대를 바라보며 활동했어요. 방탄소년단(BTS)은 UN 본부 무대에 섰고 ‘제2의 비틀즈’라는 찬사를 받았어요.</p>
          </div>
        </div>`,
      qs: [
        choice('k3-7', '강남스타일의 세계 기록', '〈강남스타일〉이 세운 기록은 무엇인가요?',
          ['첫 100만 장', '33개국 1위', 'TV 없이 1위'], '33개국 1위')
      ]
    },
    {
      id: 'wrap3', title: '100년 정리 · 한눈에 보는 한국 대중음악', era: '100년 정리', minutes: 5,
      lesson: `
        {board:final}
        {capsuleRecall:c3}`,
      qs: [
        reflect('t3', '첫 시간과 오늘의 생각을 다시 보고, 100년 동안 노래를 만나는 방법이 달라진 예를 한 문장으로 적어요.',
          ['기계', '무대', '오디션', '후크', '세계', '듣는 방법'])
      ]
    }
  ];

  window.KPOP_DATA = { V, ART, SESSIONS, RULER, CAPSULE, BALANCE, JUKEBOX, BOARD, INTRO_QUIZ, CHAPTERS };
})();

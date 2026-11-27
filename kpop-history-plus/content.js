/* 한국 대중음악사 3차시 개선판. 원작 영상 요약과 세 편의 대본을 바탕으로 구성. */
(function () {
  'use strict';

  function clip(id, title, start, seconds, by, mode = 'board') {
    return { id, title: '〈' + title + '〉', start, end: start + seconds, by, mode };
  }

  const V = {
    main: 'uX69Ct58-c0',
    mokpo: clip('sg-Cfp4Xo2M', '목포의 눈물', 10, 45, '이난영 · 1935년 육성 복원'),
    geumsun: clip('vBkAnIKc07M', '굳세어라 금순아', 7, 45, '현인 · KBS 쇼특급'),
    galaxy: clip('oi8U2Q9EDEM', '푸른 하늘 은하수', 5, 45, '신중현(히키 신) · 1958년 음반', 'solo'),
    wae: clip('4wh5rtI4Op4', '왜 불러', 1, 45, '송창식 · KBS 콘서트7080'),
    miin: clip('u507Ng30fDY', '미인', 12, 45, '신중현과 후배들 · KBS 콘서트7080'),
    danbal: clip('lY-59TL8kxg', '단발머리', 53, 45, '조용필 · 2025년 KBS 라이브'),
    youth: clip('fi9Dny-5fV4', '청춘', 27, 45, '산울림 · 1984년 방송 라이브'),
    encounter: clip('o2W6gzW4SHM', '어쩌다 마주친 그대', 15, 45, '송골매 · KBS 콘서트'),
    myworld: clip('TA81ePzpccs', '그것만이 내 세상', 44, 45, '전인권 밴드 · KBS 열린음악회'),
    radio: clip('vJqznmk2r14', '크게 라디오를 켜고', 28, 45, '시나위 · MBC 피크닉 라이브'),
    heeya: clip('AjZlgsZatew', '희야', 0, 45, '이승철 · KBS 라이브'),
    jaeha: clip('6O8oM-vPRtY', '사랑하기 때문에', 32, 45, '유재하 · 1집 원곡 음원'),
    nanalayo: clip('8J3m-ao43Bs', '난 알아요', 37, 45, '서태지와 아이들 · 1992년 KBS 토요대행진'),
    hayeoga: clip('L-AxO7EPU8c', '하여가', 208, 45, '서태지와 아이들 · 공식 뮤직비디오'),
    classroom: clip('MvwpBTfXS7E', '교실 이데아', 58, 45, '서태지 · 공식 라이브 무대'),
    comeback: clip('q3xy4p2JTfU', 'Come back home', 31, 45, '서태지와 아이들 · 공식 뮤직비디오'),
    letter: clip('MfP3Wy14nwQ', '이등병의 편지', 32, 45, '김광석 · 1995년 학전 공연'),
    loved: clip('KO8nXzCMoOE', '사랑했지만', 10, 45, '김광석 · 1991년 SBS 인기가요'),
    gobaek: clip('J_MDnzJ03Uc', '고백', 0, 45, '델리 스파이스 · 2003년 MBC 음악캠프'),
    brown: clip('LZlIqfMn4cc', '벌써 일년', 84, 45, '브라운 아이즈 · 공식 뮤직비디오'),
    timeless: clip('rFuFmyVLT0k', 'Timeless', 15, 45, 'SG워너비 · KBS 윤도현의 러브레터'),
    tellme: clip('t7X8qhESIfs', 'Tell Me', 42, 12, '원더걸스 · 2007년 MBC 음악중심'),
    rdd: clip('roughtzsCDI', 'Ring Ding Dong', 0, 12, '샤이니 · 공식 뮤직비디오'),
    sorry: clip('x6QA3m58DQw', 'Sorry Sorry', 48, 12, '슈퍼주니어 · 공식 뮤직비디오'),
    gee: clip('U7mPqycQ0tQ', 'Gee', 48, 12, '소녀시대 · 공식 뮤직비디오'),
    cherry: clip('tXV7dfvSefo', '벚꽃엔딩', 15, 12, '버스커버스커 · 공식 뮤직비디오'),
    gangnam: clip('9bZkp7q19f0', '강남스타일', 65, 12, '싸이 · 공식 뮤직비디오'),
    lies: clip('2Cv3phvP8Ro', '거짓말', 37, 45, '빅뱅 · 공식 뮤직비디오'),
    sorryLong: clip('x6QA3m58DQw', 'Sorry Sorry', 30, 45, '슈퍼주니어 · 공식 뮤직비디오'),
    gangnamLong: clip('9bZkp7q19f0', '강남스타일', 5, 45, '싸이 · 공식 뮤직비디오'),
    hongdae: { id: 'kHbUptPiOR8', title: '홍대 앞, 인디 음악이 태어나다', start: 30, end: 218,
      by: 'SBS 〈전설의 무대 아카이브K〉 5회 홍대 앞 인디뮤직 편 · 2021년', mode: 'board' }
  };

  function excerpt(source, seconds, start = source.start) {
    return { ...source, start, end: start + seconds, mode: 'board' };
  }

  Object.assign(V, {
    waeListen: excerpt(V.wae, 10, 4),
    danbalListen: excerpt(V.danbal, 10, 40),
    jaehaListen: excerpt(V.jaeha, 10, 1),
    nanalayoListen: excerpt(V.nanalayo, 10, 40),
    // 뮤직비디오 208~253초에는 태평소가 없어 15초 듣기만 공식 앨범 음원의 태평소 구간으로 (T037)
    hayeogaListen: { ...V.hayeoga, id: 'QNQI5J2gHl4', by: '서태지와 아이들 · 2집 앨범 음원', start: 94, end: 109, mode: 'board' },
    classroomListen: excerpt(V.classroom, 15, 30),
    letterListen: excerpt(V.letter, 10, 35),
    brownListen: excerpt(V.brown, 10, 86),
    timelessListen: excerpt(V.timeless, 10, 22),
    liesListen: excerpt(V.lies, 10, 55),
    gangnamListen: excerpt(V.gangnam, 10)
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
      recallPrompt: '오늘 가장 인상 깊었던 소리나 무대를 떠올리며 세 차시의 첫 생각을 다시 봐요.',
      alsoRecall: ['c1', 'c2']
    }
  };

  const GUESS = {
    years: {
      clip: 'mokpo',
      seconds: 10,
      prompt: 'TV 맨 앞에 나온 요즘 K-POP과 이 노래는 몇 년쯤 차이 날까요?',
      opts: ['약 10년', '약 50년', '약 90년'],
      ans: '약 90년',
      reveal: '이 노래는 1935년에 녹음한 〈목포의 눈물〉이에요. TV 맨 앞의 BTS 노래와 약 90년 차이예요.'
    },
    stores: {
      prompt: '2000년에 2만 개였던 음반 매장은 MP3와 파일 공유가 퍼진 뒤 몇 개로 줄었을까요?',
      opts: ['1만 개', '5천 개', '500개'],
      ans: '500개',
      reveal: '500개까지 줄었어요. 한 해 가장 많이 판 가수도 30만 장을 채우지 못했어요.'
    },
    hongdae: {
      steps: '1 고르기 → 2 영상 보기 → 3 공개',
      prompt: '1995년 무렵 인디 밴드들은 왜 여의도나 대학로가 아닌 홍대 앞으로 모였을까요?',
      opts: ['방송국과 큰 기획사가 몰려 있어서', '눈치 보지 않고 자유롭게 음악 할 수 있어서', '크고 화려한 야외 공연장이 많아서'],
      ans: '눈치 보지 않고 자유롭게 음악 할 수 있어서',
      reveal: '방송가와 대학로 무대에는 설 자리가 없었어요. 미대가 있던 홍대 앞에서는 독특한 차림도 눈치를 덜 보며 자유롭게 음악 할 수 있었어요.'
    }
  };

  const CUES = {
    era80: {
      type: 'detective',
      title: '두 노래에서 실제로 들은 것 2개만 골라 검증해요 (함정 2개)',
      items: [
        { text: '〈단발머리〉는 통통 튀는 경쾌한 박자에 맞춰 노래한다', ok: true },
        { text: '〈사랑하기 때문에〉는 느린 박자 위로 차분한 목소리가 노랫말을 이끈다', ok: true },
        { text: '말하듯 빠르게 쏟아지는 랩이 나온다', ok: false },
        { text: '가수의 노랫소리 없이 끝까지 악기 연주만 들린다', ok: false }
      ]
    },
    sorry: {
      type: 'counter',
      title: '영상이 나오는 동안 “Sorry”가 들릴 때마다 탭해요',
      btnLabel: '+1 “Sorry” 들렸다',
      unit: '번',
      compare: '짝과 숫자를 맞대 보고, 왜 자꾸 귀에 남는지 한마디로 말해요.'
    }
  };

  const BALANCE = {
    b70s: {
      prompt: '수학여행 마지막 밤, 모닥불 앞 무대에 딱 한 팀만 올릴 수 있다면?',
      choices: [
        ['통기타 포크 두 사람', '맑은 통기타 줄 소리 위로 노랫말이 또렷하게 들리는 무대'],
        ['전기 기타 록 밴드', '첫 마디부터 전기 기타와 드럼이 몰아치는 무대']
      ],
      talk: '그 소리가 모닥불 앞 분위기를 어떻게 바꿀지 짝을 30초 동안 설득해 봐요.'
    },
    'b-mp3': {
      prompt: '2000년, 외환위기 뒤라 용돈이 빠듯하다. 좋아하는 가수의 새 노래를 들을 방법을 하나만 고른다면?',
      choices: [
        ['음반 한 장 사기', '가사집을 넘기며 앨범 한 장을 처음부터 끝까지 듣기'],
        ['MP3 플레이어에 담기', '파일로 수십 곡을 골라 담아 어디서나 듣기']
      ],
      talk: '모두가 한쪽으로 몰리면 음반 매장과 가수에게 무슨 일이 생길지 짝과 이야기해요.'
    },
    b2010s: {
      prompt: '내일 가수가 될 기회가 딱 한 번 온다면, 어느 길로 갈까?',
      choices: [
        ['생방송 오디션에 바로 나가기', '목소리와 개성 하나로 전국 시청자 앞에서 단번에 평가받기'],
        ['기획사 연습생으로 준비하기', '노래·춤·외국어를 몇 년 동안 배우고 팀과 호흡을 맞춰 데뷔하기']
      ],
      talk: '친구의 어떤 강점에 어느 길이 어울릴지 추천 이유를 말해요.'
    }
  };

  const JUKEBOX = {
    phono20: {
      skin: 'phonograph',
      eraLabel: '1920~50년대 · 축음기',
      title: '축음기로 듣는 옛 노래',
      tracks: [
        ['mokpo', '이난영', '일제강점기 음반에 담긴 이난영의 목소리를 복원한 소리예요.'],
        ['geumsun', '현인', '1950년대에 널리 불린 노래예요.'],
        ['galaxy', '신중현', '미8군 쇼 무대에서 활동한 신중현이 1958년에 낸 음반이에요.']
      ]
    },
    deck70: {
      skin: 'turntable',
      eraLabel: '1960~70년대 · 전축',
      title: '전축으로 듣는 포크와 록',
      tracks: [
        ['wae', '송창식', '쎄시봉 출신 송창식이 직접 연주하며 불러요.'],
        ['miin', '신중현과 후배들', '되풀이되는 가락을 입으로 따라 해 봐요.']
      ]
    },
    tape80a: {
      skin: 'cassette',
      side: 'A',
      eraLabel: '1980년대 · 카세트테이프',
      title: '카세트테이프 A면 · 조용필과 유재하',
      tracks: [
        ['danbal', '조용필', '조용필 1집에 실린 노래예요.'],
        ['jaeha', '유재하', '유재하가 작사·작곡·편곡을 직접 한 1집의 노래예요.']
      ]
    },
    bands80: {
      skin: 'cassette',
      side: 'B',
      toSheet: true,
      eraLabel: '1980년대 · 카세트테이프',
      title: '카세트테이프 B면 · 80년대 밴드',
      vote: true,
      tracks: [
        ['youth', '산울림', '산울림의 서정적인 멜로디와 밴드 반주를 들어요.'],
        ['encounter', '송골매', '디스코의 박자 위에 펑크 록이 어우러져요.'],
        ['myworld', '들국화', '들국화 1집에 담긴 곡으로 전인권의 목소리를 들어요.'],
        ['radio', '시나위', '헤비메탈의 힘 있는 기타 소리와 목소리를 들어요.'],
        ['heeya', '부활', '이승철의 목소리와 록 반주가 함께 들리는 록 발라드예요.']
      ]
    },
    seotaiji4: {
      skin: 'cd',
      toSheet: true,
      eraLabel: '1990년대 · CD',
      title: '서태지와 아이들, 앨범마다 달라진 소리',
      tracks: [
        ['nanalayo', '1집', '빠른 랩과 춤을 한 무대에서 선보였어요.'],
        ['hayeoga', '2집', '2집 노래예요. 랩과 록에 무엇을 섞었는지는 학습지 소리 A에서 들어 봐요.'],
        ['classroom', '3집', '3집 노래예요. 곡의 바탕에 깔린 소리를 들어 봐요.'],
        ['comeback', '4집', '랩으로 기성세대를 비판하는 목소리를 전했어요.']
      ],
      cues: [
        { text: '말하듯 빠르게 이어 가는 랩이 들려요.', ok: true },
        { text: '첼로와 피아노만 반주에 들려요.', ok: false },
        { text: '여러 사람이 노래에 맞춰 춤을 춰요.', ok: true },
        { text: '한 사람이 제자리에 서서 끝까지 노래해요.', ok: false }
      ]
    },
    cd90: {
      skin: 'cd',
      eraLabel: '1990년대 · CD',
      title: '1990년대 CD · 홍대 밴드와 김광석',
      tracks: [
        ['gobaek', '델리 스파이스', '홍대 앞 작은 공연장에서 활약한 밴드의 노래예요.'],
        ['letter', '김광석', '김광석의 공연 실황이에요. 노래를 이끄는 소리를 들어 봐요.'],
        ['loved', '김광석', '노랫말을 어떻게 전하는지 들어 봐요.']
      ]
    },
    mp300: {
      skin: 'mp3',
      eraLabel: '2000년대 · MP3',
      title: 'MP3 플레이어 · 2000년대 R&B',
      tracks: [
        ['brown', '브라운 아이즈', '방송 무대 없이 1위에 오른 노래예요. 무엇이 사람들을 끌었을지 들어 봐요.'],
        ['timeless', 'SG워너비', '윤도현의 러브레터 무대 실황이에요.']
      ]
    },
    stream07: {
      skin: 'streaming',
      eraLabel: '2007년~ · 음원 스트리밍',
      title: '음원 스트리밍 · 후크송과 K-POP 사운드',
      tracks: [
        ['sorryLong', '슈퍼주니어', '되풀이되는 말을 세어 보며 들어요.'],
        ['lies', '빅뱅', '어떤 소리들이 어우러지는지 들어 봐요.']
      ]
    },
    tube12: {
      skin: 'youtube',
      toSheet: true,
      eraLabel: '2012년~ · 유튜브',
      title: '유튜브 재생목록 · 세계로 퍼진 노래',
      tracks: [
        ['gangnamLong', '싸이', '유튜브와 SNS를 타고 세계로 퍼진 노래예요.']
      ]
    }
  };

  function pin(song, label, detail, hint) {
    return { song, label, detail, hint };
  }

  const BOARD = {
    p1: {
      title: '1차시 줄자 정리판 · 듣고 시대 고르기',
      order: ['danbalListen', 'mokpo', 'jaehaListen', 'waeListen'],
      pins: [
        pin('mokpo', '1930년대 · 음반 유행가', '음반으로 퍼진 유행가를 다시 들어요.', '아주 오래된 음반에 담긴 옛 목소리인지 들어 봐요.'),
        pin('waeListen', '1970년대 · 통기타 포크', '쎄시봉 출신 송창식이 통기타를 치며 부른 노래예요.', '통기타 줄 소리와 노랫말이 앞에 나서는지 들어 봐요.'),
        pin('danbalListen', '1980년대 초 · 신시사이저와 록 기타', '조용필 1집에서 신시사이저와 전기 기타를 들을 수 있어요.', '전자음과 전기 기타가 함께 들리는지 들어 봐요.'),
        pin('jaehaListen', '1980년대 후반 · 클래식 악기 발라드', '유재하가 클래식 악기를 발라드에 담았어요.', '첼로·바이올린 같은 악기가 반주하는지 들어 봐요.')
      ]
    },
    p2: {
      title: '2차시 줄자 정리판 · 듣고 무대 고르기',
      order: ['letter', 'hayeogaListen', 'gobaek', 'nanalayoListen'],
      pins: [
        pin('nanalayoListen', '서태지와 아이들 1집 · 랩과 춤', '빠른 랩과 춤으로 10대의 귀를 사로잡았어요.', '말하듯 빠른 랩이 들리는지 들어 봐요.'),
        pin('hayeogaListen', '서태지와 아이들 2집 · 랩 사이 국악기', '랩 사이로 태평소가 들려요.', '날카롭게 우는 관악기 소리가 끼어드는지 들어 봐요.'),
        pin('letter', '김광석 · 통기타 포크', '통기타와 목소리가 이끄는 노래예요.', '통기타와 목소리만 또렷한지 들어 봐요.'),
        pin('gobaek', '홍대 인디 · 밴드 록', '홍대 앞 작은 무대에서 출발한 델리 스파이스의 밴드 소리예요.', '기타·베이스·드럼 밴드가 함께 연주하는지 들어 봐요.')
      ]
    },
    final: {
      title: '최종 100년 줄자 정리판 · 듣고 시대 고르기',
      order: ['nanalayoListen', 'mokpo', 'gangnam', 'danbalListen', 'timelessListen', 'miin'],
      pins: [
        pin('mokpo', '1930년대 · 음반 유행가', '음반으로 퍼진 유행가를 다시 들어요.', '아주 오래된 음반에 담긴 옛 목소리인지 들어 봐요.'),
        pin('miin', '1970년대 · 전기 기타 록', '신중현과 엽전들의 전기 기타 리듬을 들어요.', '똑같은 기타 가락이 힘차게 되풀이되는지 들어 봐요.'),
        pin('danbalListen', '1980년대 · 신시사이저', '조용필은 1집에서 신시사이저와 록 기타 소리를 들려줬어요.', '전자음과 힘 있는 독주 악기가 함께 들리는지 들어 봐요.'),
        pin('nanalayoListen', '1990년대 · 랩과 춤', '랩과 춤이 10대의 귀를 사로잡았어요.', '말하듯 빠르게 쏟아지는 리듬이 들리는지 들어 봐요.'),
        pin('timelessListen', '2000년대 · R&B 목소리', 'SG워너비가 중간 빠르기의 R&B에 힘 있는 목소리를 실었어요.', '중간 빠르기 박자 위로 힘 있는 목소리가 앞에 나서는지 들어 봐요.'),
        pin('gangnam', '2010년대 · 세계로 퍼진 댄스', '싸이의 노래와 춤은 유튜브와 SNS를 타고 세계로 퍼졌어요.', '신나는 전자 박자와 짧게 되풀이되는 후렴인지 들어 봐요.')
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
      opts: ['letter', 'cherry', 'wae'],
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

  function reflect(id, prompt, vocab, ctx) {
    return { id, type: 'text', prompt, vocab, ctx };
  }

  const CHAPTERS = [
    {
      id: 'start', title: '1920s~50s · 첫 노래와 미8군 무대', era: '1920~50년대', minutes: 11,
      tvStartSec: 0, tvEndSec: 238,
      tvPoint: '맨 앞에 나오는 요즘 K-POP 소리를 잘 기억해 두세요. 곧 100년 전 노래와 견줘 봐요.',
      lead: 'BTS 앞에 지나간 흑백 얼굴들 — 100년 전 첫 노래까지 거꾸로 간다.',
      piece: '노래를 음반에 담아 퍼뜨리고, 오디션을 거쳐 무대에 서는 길',
      lesson: `
        {guess:years}
        {capsule:c1}
        {jukebox:phono20}
        <h2>음반에서 무대로</h2>
        <div class="feature">
          {art:open}
          <div class="story">
            <p>1926년 윤심덕의 〈사의 찬미〉는 우리나라 첫 대중가요로 꼽혀요. 일제강점기에는 목소리를 담은 음반과 축음기로 노래가 퍼졌어요. 트로트의 시작인 유행가와 전통 민요를 새롭게 부른 신민요가 사랑받았어요.</p>
            <p>1950년대에는 현인의 〈굳세어라 금순아〉가 널리 불렸어요. 오디션을 거치는 미8군 쇼는 연예기획사의 출발점이 됐어요.</p>
          </div>
        </div>
        <details class="more">
          <summary>더 알아보기</summary>
          <p>1930년대에는 이난영의 〈목포의 눈물〉이 널리 알려졌어요. 미8군 쇼는 김시스터즈·신중현·패티 김이 활동한 무대였어요.</p>
        </details>`,
      note: [
        ['k1-1', '노래를 퍼뜨린 기계·매체'],
        ['k1-2', '미군 부대 무대에 서는 길'],
        ['k1-8', '우리나라 첫 대중가요']
      ],
      qs: [
        choice('k1-1', '일제강점기 노래를 퍼뜨린 기계', '일제강점기에 노래를 퍼뜨린 기계와 매체는 무엇인가요?',
          ['TV 방송', '축음기·음반', 'MP3 파일'], '축음기·음반'),
        choice('k1-2', '미8군 무대', '1950년대 한국 음악인들은 어떻게 미군 부대 무대에 섰나요?',
          ['오디션을 보고 무대에 섰다', '노래가 금지됐다', '음반 100만 장'], '오디션을 보고 무대에 섰다'),
        choice('k1-8', '첫 대중가요', '우리나라 첫 대중가요로 꼽히는 노래는 무엇인가요?',
          ['〈목포의 눈물〉', '〈사의 찬미〉', '〈굳세어라 금순아〉'], '〈사의 찬미〉')
      ]
    },
    {
      id: 'folk70', title: '1960s~70s · 쎄시봉, 포크와 록', era: '1960~70년대', minutes: 11,
      tvStartSec: 238, tvEndSec: 466,
      tvPoint: '통기타 소리가 전기 기타 소리로 바뀌는 순간을 찾아보세요.',
      piece: '통기타 포크와 전기 기타 록',
      lesson: `
        <h2>두 가지 기타 소리</h2>
        {jukebox:deck70}
        <p class="talk"><b>몸으로 30초</b> 〈미인〉의 기타 가락이 되풀이될 때 입으로 따라 하고, 마지막 박에 다 같이 손뼉 한 번!</p>
        <div class="feature">
          {art:room}
          <div class="story">
            <p>1960년대 음악감상실 쎄시봉에서는 서양 음악을 듣고 익혀 무대에서 불렀어요.</p>
            <p>1970년대에는 한국적 포크와 록이 퍼졌어요. 유신정권의 대마초 파동으로 활동이 막히고 일부 노래가 금지곡이 되기도 했어요.</p>
          </div>
        </div>
        <details class="more">
          <summary>더 알아보기</summary>
          <p>트로트가 전성기를 누린 1960년대에는 이미자와 패티 김이 큰 사랑을 받았고, 쎄시봉에서는 송창식·윤형주·조영남이 불렀어요. 1970년대에는 김민기·양희은·한대수의 포크와 신중현과 엽전들의 록이 퍼졌고, 남진과 나훈아가 트로트의 인기를 이었으며 산울림이 새로운 록을 들려주었어요.</p>
        </details>
        {balance:b70s}`,
      note: [
        ['k1-3', '1970년대 일부 노래에 생긴 일'],
        ['k1-4', '두 노래를 이끈 악기']
      ],
      qs: [
        choice('k1-3', '1970년대 금지곡', '1970년대 일부 노래에 어떤 일이 일어났나요?',
          ['해외 1위', '방송 오디션', '금지곡이 됐다'], '금지곡이 됐다'),
        choice('k1-4', '포크와 록의 악기', '〈왜 불러〉와 〈미인〉을 이끄는 악기를 순서대로 골라요.',
          ['신시사이저 / 첼로', '통기타 / 전기 기타', '태평소 / 랩'], '통기타 / 전기 기타')
      ]
    },
    {
      id: 'era80', title: '1980s · 가왕, 스쿨밴드, 발라드의 탄생', era: '1980년대', minutes: 17,
      tvStartSec: 466, tvEndSec: 702,
      tvPoint: '70년대 통기타 포크에 없던 새 악기 소리 두 가지를 찾아보세요.',
      piece: '신시사이저·록 기타, 그리고 클래식 악기를 담은 발라드',
      lesson: `
        {jukebox:tape80a}
        {cue:era80}
        <div class="feature">
          {art:stage}
          <div class="story">
            <h2>조용필과 유재하</h2>
            <p>조용필은 1980년 1집(〈창 밖의 여자〉·〈단발머리〉)에 신시사이저 소리와 블루스 록 전기 기타 독주를 넣었어요. 록과 재즈에서 판소리와 오페라까지 다양한 음악을 받아들였어요.</p>
            <p>유재하는 1987년 1집 〈사랑하기 때문에〉의 작사·작곡·편곡을 직접 했어요. 첼로·바이올린·피아노 같은 클래식 악기를 배치해 한국 발라드의 개성을 만들었어요.</p>
          </div>
        </div>
        <section class="chapter-block">
          <h2>대학 밴드에서 헤비메탈과 록 발라드까지</h2>
          <p>대학생이 중심인 스쿨밴드가 활약했고, 헤비메탈과 록 발라드처럼 다른 색깔의 밴드 음악도 나왔어요.</p>
          {jukebox:bands80}
        </section>`,
      note: [
        ['k1-5', '소리 A · 크게 들리는 소리'],
        ['k1-7', '소리 B · 반주 악기']
      ],
      pairs: [['k1-5', 'k1-7']],
      qs: [
        choice('k1-5', '1980년대 소리 듣기', '이 노래에서 크게 들리는 소리는 무엇인가요?',
          ['신시사이저·전기 기타', '통기타 독주', '빠른 랩·전자 비트'], '신시사이저·전기 기타', V.danbalListen),
        choice('k1-7', '발라드 반주 듣기', '이 노래를 반주하는 악기는 무엇인가요?',
          ['거친 헤비메탈 기타·드럼', '첼로·바이올린·피아노', '빠른 랩·댄스 전자음'], '첼로·바이올린·피아노', V.jaehaListen),
        reflect('t1', '조용필·유재하의 곡이나 B면에서 고른 밴드 곡에서 기억에 남는 소리 하나를 골라 어떤 분위기를 만드는지 한 문장으로 적어요.',
          ['반짝이는', '묵직한', '부드러운', '쓸쓸한', '웅장한', '새롭다'],
          { songs: ['danbal', 'jaeha'], vote: 'bands80' })
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
      id: 'seotaiji', split: true, title: '1990s 전반 · 판을 바꾼 서태지와 아이들', era: '1990년대 전반', minutes: 12,
      tvStartSec: 702, tvEndSec: 834,
      tvPoint: '10대가 반긴 첫 무대와 앨범마다 새롭게 섞인 소리를 찾아보세요.',
      piece: '랩과 춤, 앨범마다 장르를 섞는 실험',
      lesson: `
        {recap:mokpo,miin,danbal}
        {capsule:c2}
        <article class="legend-card">
          <div class="story">
            <h2>서태지와 아이들</h2>
            <p>1992년 〈난 알아요〉의 랩과 춤은 10대가 중심이 된 힙합·댄스 시대를 열었어요. 앨범마다 다른 장르를 섞고 랩으로 기성세대를 비판하며 음악의 색을 바꿨어요.</p>
          </div>
          {jukebox:seotaiji4}
        </article>`,
      note: [
        ['k2-1', '앨범마다 바꾼 것'],
        ['k2-2', '소리 A · 섞인 소리'],
        ['k2-3', '소리 B · 바탕 장르']
      ],
      pairs: [['k2-2', 'k2-3']],
      qs: [
        choice('k2-1', '서태지와 아이들의 변화', '서태지와 아이들이 앨범을 낼 때마다 바꾼 것은 무엇인가요?',
          ['멤버 수', '나라', '장르'], '장르'),
        choice('k2-2', '서태지와 아이들 소리 듣기 1', '이 노래에 섞인 소리는 무엇인가요?',
          ['국악', '클래식 현악기', '레게'], '국악', V.hayeogaListen),
        choice('k2-3', '서태지와 아이들 소리 듣기 2', '이 노래의 바탕이 되는 장르는 무엇인가요?',
          ['통기타 포크', '클래식 발라드', '록'], '록', V.classroomListen)
      ]
    },
    {
      id: 'era90', title: '1990s 후반 · 1세대 아이돌, 포크와 홍대 인디', era: '1990년대 후반', minutes: 17,
      tvStartSec: 834, tvEndSec: 1053,
      tvPoint: '춤추는 팀과 통기타 가수, 작은 무대의 밴드가 같은 시대에 어떻게 활약했는지 살펴보세요.',
      piece: '팀으로 연습하고 역할을 나누는 아이돌, 스스로 만들고 알리는 인디',
      lesson: `
        <h2>한 시대, 여러 무대</h2>
        <div class="story">
          <p>1세대 아이돌은 연습생 훈련과 멤버별 역할, 단체 안무 같은 규칙을 만들었어요.</p>
          <p>홍대 앞 작은 공연장에서는 자기 음악을 스스로 만들고 알리는 인디 문화를 열었어요.</p>
          <p>김광석은 예전 포크곡들을 다시 불러 1990년대 사람들에게 전했어요.</p>
        </div>
        <h2>홍대 앞, 인디 음악이 태어나다</h2>
        {guess:hongdae}
        {vid:hongdae}
        {jukebox:cd90}
        <p class="talk"><b>짝 이야기 30초</b> 내가 90년대 중학생이라면 오늘 저녁 어디로 갈까요? 아이돌 공연장, 홍대 작은 공연장, 김광석 소극장 가운데 하나를 골라 까닭을 말해요.</p>
        <details class="more">
          <summary>더 알아보기</summary>
          <p>듀스는 뉴 잭 스윙과 힙합을 들여와 한국 힙합 댄스의 뿌리가 됐어요. 최초의 한류 아이돌 H.O.T.와 젝스키스·핑클·S.E.S가 1세대 아이돌을 이루었고, 홍대에서는 언니네 이발관·델리 스파이스·크라잉넛이 활약했어요.</p>
          <p>신해철은 여러 장르를 섞었고, 김건모의 레게를 담은 3집은 300만 장이 팔렸어요. 패닉과 015B가 각자 다른 소리를 들려줬고, 토이는 여러 보컬과 함께 곡을 만들었어요.</p>
        </details>`,
      note: [
        ['k2-5', '스스로 만들고 알린 밴드'],
        ['k2-9', '영상 · 너바나를 보고 든 생각'],
        ['k2-8', '10초 소리 · 노래를 이끄는 것']
      ],
      qs: [
        choice('k2-5', '홍대 밴드', '작은 무대에서 자기 음악을 스스로 만들고 알린 밴드들을 무엇이라고 부르나요?',
          ['인디', '아이돌', '트로트'], '인디'),
        choice('k2-9', '홍대 인디 영상', '크라잉넛 멤버들은 너바나의 공연 영상을 보고 어떤 생각을 했나요?',
          ['방송에 나가려면 춤부터 배워야겠다', '저런 무대는 우리도 할 수 있겠다', '큰 기획사의 연습생이 되어야겠다'],
          '저런 무대는 우리도 할 수 있겠다'),
        choice('k2-8', '1990년대 포크 소리 듣기', '이 노래를 10초 들어 보세요. 노래를 이끄는 소리는 무엇인가요?',
          ['빠른 랩과 전자 비트', '통기타와 목소리', '헤비메탈 전기 기타'], '통기타와 목소리', V.letterListen),
        reflect('t2', '서태지와 아이들이나 김광석의 곡을 골라, 그 소리가 기억에 남은 까닭을 한 문장으로 적어요.',
          ['또렷한', '따뜻한', '거친', '신나는', '쓸쓸한', '위로'],
          { songs: ['nanalayo', 'hayeoga', 'classroom', 'comeback', 'letter', 'loved'] })
      ]
    },
    {
      id: 'crisis', title: '1997~2000s 초 · IMF와 MP3, 음반 시장의 빙하기', era: '1997~2000년대 초', minutes: 12,
      tvStartSec: 1053, tvEndSec: 1338, tvOnly: true,
      tvPoint: '외환위기 뒤 무대에 선 가수들이 어떻게 바뀌고, 사람들은 음악을 어떻게 구했는지 살펴보세요.',
      piece: '음반에서 파일로, 듣는 방법이 바뀌다',
      lesson: `
        {guess:stores}
        <h2>음반이 팔리지 않는 ‘빙하기’</h2>
        <div class="feature">
          {art:crisis}
          <div class="story">
            <p>1997년 IMF 외환위기로 10대가 쓸 수 있는 돈이 줄면서 솔로 가수가 강세를 보였어요.</p>
            <p>휴대용 MP3와 개인끼리 파일을 나누는 P2P 서비스가 퍼지자 음반이 안 팔리고 매장도 크게 줄었어요.</p>
          </div>
        </div>
        <details class="more">
          <summary>더 알아보기</summary>
          <p>솔로 무대에서는 조성모·임창정·엄정화·이정현·싸이·비·이효리·김종국이 활약했고, 파일 공유는 ‘소리바다’ 같은 P2P 서비스로 퍼졌어요. 아이돌 무대에서는 god와 신화가 1.5세대로 활약했어요.</p>
        </details>
        {balance:b-mp3}`,
      note: [
        ['k2-6', 'MP3·파일 공유 확산', 'arrow'],
        ['k2-7', '빙하기 무렵 활약이 늘어난 가수']
      ],
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
        {board:p2}
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
      piece: '연습생 제도, 그리고 힘 있게 부르는 목소리',
      lesson: `
        {recap:nanalayo,hayeogaListen,letter}
        {capsule:c3}
        <h2>TV에 한 번도 안 나온 노래가 1위를 했다. 어떻게?</h2>
        {jukebox:mp300}
        <h2>연습생과 노래방의 목소리</h2>
        <div class="story">
          <p>2세대에는 가수 지망생을 뽑아 춤·노래·외국어를 가르치는 연습생 제도가 본격적으로 쓰였어요. 보아·동방신기·슈퍼주니어는 아시아 무대까지 바라봤어요.</p>
          <p>브라운 아이즈의 〈벌써 일년〉은 TV에 출연하지 않고 1위에 올랐어요. 브라운 아이즈와 SG워너비는 힘 있게 부르는 ‘소몰이 창법’을 담았어요.</p>
        </div>
        <details class="more">
          <summary>더 알아보기</summary>
          <p>두 팀은 중간 빠르기의 박자에 맞춘 미디엄 템포 R&B를 들려줬어요. 휘성부터 거미까지, 여러 가수의 목소리는 TV 원작 구간에서 이어서 들어요.</p>
        </details>`,
      note: [
        ['k3-8', '소리 A · 빠르기'],
        ['k3-2', '소리 B · 가장 앞에 나서는 것']
      ],
      pairs: [['k3-8', 'k3-2']],
      qs: [
        choice('k3-8', '2000년대 R&B 빠르기 듣기', '이 노래를 10초 들어 보세요. 빠르기는 어떤가요?',
          ['아주 빠른 댄스 빠르기', '중간 빠르기', '아주 느린 빠르기'], '중간 빠르기', V.brownListen),
        choice('k3-2', '2000년대 R&B 소리 듣기', '이 시대 노래에서 가장 앞에 나서는 것은 무엇인가요?',
          ['빠른 랩 주고받기', '목소리(노래 실력)', '짧은 전자음 후크 반복'], '목소리(노래 실력)', V.timelessListen)
      ]
    },
    {
      id: 'hook07', title: '2007~2010s 초 · 후크송, 걸그룹 3강과 빅뱅', era: '2007년~2010년대 초', minutes: 12,
      tvStartSec: 1562, tvEndSec: 1720,
      tvPoint: '금세 따라 부르게 되는 대목과 힙합에 어우러지는 소리를 찾아보세요.',
      piece: '짧게 되풀이되는 후크, 힙합과 일렉트로니카',
      lesson: `
        {introQuiz:tellme,rdd,sorry,gee}
        {jukebox:stream07}
        {cue:sorry}
        <p class="talk"><b>몸으로 30초</b> 후렴을 한 번 더 틀고, 앉은 자리에서 〈Sorry Sorry〉의 손 비비는 동작처럼 쉬운 손동작 하나를 다 같이 따라 해요.</p>
        <article class="legend-card">
          <div class="story">
            <h2>빅뱅</h2>
            <p>빅뱅은 힙합에 전자음이 어우러진 일렉트로니카 댄스를 결합했어요. 〈거짓말〉을 비롯한 곡들에서 이런 ‘K-POP 사운드’를 들려줬고, BTS와 블랙핑크 같은 뒤이은 팀에 영향을 줬어요.</p>
          </div>
        </article>
        <div class="feature">
          {art:hook}
          <div class="story">
            <h2>후크송과 음원 시대</h2>
            <p>귀에 박히는 짧은 반복(후크)과 따라 하기 쉬운 동작이 함께 유행했고, 원더걸스·카라·소녀시대가 걸그룹 3강을 이뤘어요. 멜론 같은 음원 스트리밍이 안정되고 음악 저작권 개념이 자리 잡았어요.</p>
          </div>
        </div>
        <details class="more">
          <summary>더 알아보기</summary>
          <p>걸그룹이 활약하는 가운데 여자 솔로 가수 아이유도 자기 목소리로 여러 장르를 들려줬어요.</p>
        </details>`,
      note: [
        ['k3-3', '후크송의 공통점'],
        ['k3-4', '10초 소리 · 이루는 두 소리'],
        ['k3-5', '빅뱅의 K-POP 사운드', 'arrow']
      ],
      qs: [
        choice('k3-3', '후크송의 공통점', '원더걸스·소녀시대 노래의 공통점은 무엇인가요?',
          ['국악', '긴 기타 독주', '귀에 박히는 짧은 반복'], '귀에 박히는 짧은 반복'),
        choice('k3-4', '빅뱅 소리 듣기', '이 노래를 이루는 두 소리는 무엇인가요?',
          ['힙합 + 일렉트로니카', '통기타 + 잔잔한 포크', '클래식 현악 + 느린 발라드'], '힙합 + 일렉트로니카', V.liesListen),
        choice('k3-5', '빅뱅이 영향을 준 팀', '빅뱅의 ‘K-POP 사운드’는 어떤 팀에 영향을 줬나요?',
          ['BTS·블랙핑크', '산울림', '들국화'], 'BTS·블랙핑크')
      ]
    },
    {
      id: 'audition', title: '2010s · 오디션과 서바이벌의 열풍', era: '2010년대', minutes: 8,
      tvStartSec: 1720, tvEndSec: 1887,
      tvPoint: '새 가수를 뽑는 무대와 기존 가수가 명곡을 다시 부르는 무대를 구별해 보세요.',
      piece: '오디션으로 찾는 새 목소리',
      lesson: `
        {introQuiz:cherry}
        <h2>방송에서 열린 또 다른 무대</h2>
        <div class="story">
          <p>아이돌 무대가 많아지자 사람들은 개성 있는 가수와 새로운 음악을 찾았어요. 〈슈퍼스타K〉는 새 가수를 알렸고, 〈나는 가수다〉와 〈불후의 명곡〉에서는 기존 가수들이 다른 가수의 명곡을 새롭게 불렀어요.</p>
        </div>
        <details class="more">
          <summary>어떤 오디션 무대가 더 있었을까?</summary>
          <p>〈슈퍼스타K〉는 서인국·존 박·허각·로이킴·버스커버스커 같은 가수를 알렸어요. 〈복면가왕〉은 목소리, 〈쇼미더머니〉는 힙합, 〈미스트롯〉과 〈미스터트롯〉은 트로트에 주목했어요. 〈팬텀싱어〉는 성악과 뮤지컬, 〈탑밴드〉는 아마추어 밴드가 나설 무대였어요. 투표로 아이돌을 뽑는 〈프로듀스〉는 투표 조작 논란을 겪었어요.</p>
        </details>
        {balance:b2010s}`,
      qs: [
        choice('k3-6', '방송 오디션이 연 길', '〈슈퍼스타K〉 같은 프로그램이 바꾼 것은 무엇인가요?',
          ['노래 금지', '음반 100만 장', '누구나 오디션으로 가수가 된다'], '누구나 오디션으로 가수가 된다')
      ]
    },
    {
      id: 'global', title: '2012~지금 · 유튜브와 세계로 간 K-POP', era: '2012년 이후', minutes: 7,
      tvStartSec: 1887, tvEndSec: 2048,
      tvPoint: '한 곡의 영상이 나라를 건너 퍼지면서 아이돌의 무대가 어떻게 달라졌는지 살펴보세요.',
      piece: '유튜브와 SNS를 타고 세계로 퍼지는 노래',
      lesson: `
        {introQuiz:gangnam}
        <h2>화면을 타고 세계로</h2>
        <div class="feature">
          {art:global}
          <div class="story">
            <p>2012년 싸이의 〈강남스타일〉은 유튜브와 SNS를 통해 세계로 퍼졌어요. 게시 100일 만에 5억 뷰를 넘었고 33개국 이상에서 공식 차트 1위에 올랐어요.</p>
            <p>3세대 아이돌은 세계 무대를 바라보며 활동했어요. 방탄소년단(BTS)은 UN 본부 무대에 섰고 ‘제2의 비틀즈’라는 찬사를 받았어요.</p>
          </div>
        </div>
        {jukebox:tube12}`,
      qs: [
        choice('k3-9', '세계로 퍼진 노래 듣기', '이 노래를 10초 들어 보세요. 세계 사람들이 금세 따라 부르고 춤춘 까닭에 가장 가까운 것은?',
          ['신나는 댄스 리듬과 짧게 되풀이되는 후렴', '조용한 클래식 악기 반주', '통기타 한 대로 부르는 느린 노래'], '신나는 댄스 리듬과 짧게 되풀이되는 후렴', V.gangnamListen)
      ]
    },
    {
      id: 'wrap3', title: '100년 정리 · 한눈에 보는 한국 대중음악', era: '100년 정리', minutes: 6,
      lesson: `
        {board:final}
        {capsuleRecall:c3}
        {pieces}
        <p class="talk"><b>짝 이야기 30초</b> 요즘 즐겨 듣는 노래 하나를 떠올려 보세요. 위 소리 조각 가운데 무엇이 들어 있는지 짝에게 말해요.</p>`,
      qs: [
        reflect('t3', '첫 시간과 오늘의 생각을 다시 보고, 100년 동안 노래를 만나는 방법이 달라진 예를 한 문장으로 적어요.',
          ['기계', '무대', '오디션', '후크', '세계', '듣는 방법'],
          { capsules: ['c1', 'c2', 'c3'], words: { label: '재생 기계', list: ['축음기', '전축', '카세트테이프', 'CD', 'MP3', '음원 스트리밍', '유튜브'] } })
      ]
    }
  ];

  window.KPOP_DATA = { V, ART, SESSIONS, RULER, CAPSULE, GUESS, CUES, BALANCE, JUKEBOX, BOARD, INTRO_QUIZ, CHAPTERS };
})();

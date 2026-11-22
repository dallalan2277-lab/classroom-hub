/* 방구석 세계 음악 여행 · 교과서 24~25쪽 */
(function () {
  'use strict';

  function clip(id, title, start, seconds, by, mode, extra) {
    return Object.assign({ id: id, title: title, by: by, start: start, end: start + seconds, mode: mode || 'board' }, extra || {});
  }
  var V = {
    shamisen: clip('m-9bVMKlfJM', '악기 1', 65, 35, '', 'board'),
    pipa: clip('6fMEaj7kkDA', '악기 2', 45, 35, '', 'board'),
    kulintang: clip('Czh1oqx0Bpw', '필리핀의 작은 징 합주', 12, 30, 'Harold Andre'),
    banjo: clip('fnMhUPewk6c', '미국의 줄 악기', 3, 30, 'WillowOsborne'),
    mariachi: clip('zPIeuoaOrTY', '멕시코의 악단', 120, 40, 'Mariachi San Francisco Live'),
    samba: clip('DdSQNrkXm9U', '브라질의 축제 음악', 150, 30, 'Grande Rio Carnival 4K'),
    didgeridoo: clip('cizByru14jc', '호주의 나무 대롱', 30, 35, 'Live Concert Performance'),
    bandoneon: clip('ayIBq77HvLA', '독일에서 온 주름상자', 35, 35, 'LAYERS CLASSIC x 고상지 Live'),
    orutu: clip('CRTHaSTBVoE', '케냐의 줄 하나 악기', 0, 30, 'Eric O Meli', 'solo'),
    haka: clip('etTpaLR6avI', '마오리의 전통 춤', 0, 40, 'NZ Defence Force', 'solo'),
    jambo: clip('mOw3FG3HmAU', '케냐의 노래', 15, 65, 'IFLC Tanzania · Sydney Opera House Live'),
    molihua: clip('LUnCaLHftLA', '중국의 노래', 0, 65, 'Taicang Youth Choir Live'),
    range: clip('hyg0CQrqE98', '미국의 노래', 8, 65, 'Kansas Tourism · Logan Mize Live'),
    pokarekare: clip('4DsfVXh-H3w', '뉴질랜드의 노래', 10, 65, 'Hayley Westenra Live')
  };
  // 블라인드 소리 전용 원본(해설·박수 없이 악기 음색만 또렷한 구간)
  var SOLO_DIDG = clip('BvbSNhdvs8c', '소리', 0, 30, '');
  function listenAgain(source, title, seconds, extra) {
    return Object.assign({}, source, { title: title, by: '', end: source.start + seconds, blind: false, audioOnly: false }, extra || {});
  }
  function quizClip(source, title, seconds) {
    return listenAgain(source, title, seconds, { mode: 'board', audioOnly: true });
  }
  V.mysA = listenAgain(SOLO_DIDG, '소리 1', 15, {
    blind: true,
    audioSrc: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Didgeridoo_sound.ogg/Didgeridoo_sound.ogg.mp3',
    audioStart: 0,
    credit: {
      title: 'Didgeridoo sound',
      author: 'Cassa342',
      license: 'CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:Didgeridoo_sound.ogg'
    }
  });
  V.mysB = listenAgain(V.samba, '소리 2', 15, {
    blind: true,
    audioSrc: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d5/53704_reinsamba_samba-batucada1.wav/53704_reinsamba_samba-batucada1.wav.mp3',
    audioStart: 2,
    credit: {
      title: 'samba-batucada1',
      author: 'reinsamba (Freesound)',
      license: 'CC BY 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:53704_reinsamba_samba-batucada1.wav'
    }
  });
  V.mysC = listenAgain(V.shamisen, '소리 3', 15, {
    blind: true,
    audioSrc: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/31/Shamisenwithvocals_2006.ogg/Shamisenwithvocals_2006.ogg.mp3',
    audioStart: 53,
    credit: {
      title: 'Shamisenwithvocals 2006',
      author: 'Nesnad',
      license: 'CC BY 3.0',
      page: 'https://commons.wikimedia.org/wiki/File:Shamisenwithvocals_2006.ogg'
    }
  });
  V.recallA = listenAgain(V.shamisen, '소리 1', 10, { audioOnly: true });
  V.recallB = listenAgain(V.samba, '소리 2', 10, { audioOnly: true });
  V.recallC = listenAgain(SOLO_DIDG, '소리 3', 10, { audioOnly: true });

  // 소리 직결 채점 문항 클립 (오디오 전용 · 제목 가림)
  V.quizAsia = quizClip(V.shamisen, '문제 3번 소리', 10);
  V.quizAmericas = quizClip(V.samba, '문제 3번 소리', 12);
  V.quizFaraway = quizClip(V.bandoneon, '문제 3번 소리', 10);
  V.quizMolihua = quizClip(V.molihua, '문제 2번 소리', 12);
  V.quizRange = quizClip(V.range, '문제 2번 소리', 15);

  // 세계 음악 지도 매칭 플레이용 10초 오디오 전용 클립
  V.mapDidg = quizClip(SOLO_DIDG, '지도 미션 소리', 10);
  V.mapPipa = quizClip(V.pipa, '지도 미션 소리', 10);
  V.mapKulintang = quizClip(V.kulintang, '지도 미션 소리', 10);
  V.mapBanjo = quizClip(V.banjo, '지도 미션 소리', 10);
  V.mapMariachi = quizClip(V.mariachi, '지도 미션 소리', 10);
  V.mapOrutu = quizClip(V.orutu, '지도 미션 소리', 10);
  V.mapJambo = quizClip(V.jambo, '지도 미션 소리', 12);
  V.mapPokarekare = quizClip(V.pokarekare, '지도 미션 소리', 12);

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
    asia: { prompt: '줄을 뜯는 두 악기 영상을 보고, 어느 쪽 소리가 더 단단하고 짧게 끊기는지 골라요.', opts: ['악기 1', '악기 2'] },
    faraway: { prompt: '긴 나무 대롱 하나로 어떤 소리가 날까?', opts: ['높고 맑은 소리', '낮게 계속 울리는 소리', '짧게 톡톡 끊기는 소리'] },
    jambo: { prompt: '이 노래는 어떤 때 부를 것 같나요?', opts: ['만나서 인사할 때', '잠들기 전', '슬플 때'] }
  };
  var HOW = ['줄을 튕겨요', '활로 줄을 문질러요', '입으로 불어요', '두드려요'];
  var LANG = ['스와힐리어', '중국어', '영어', '마오리어'];
  var HOW_GROUP = '어떻게 소리를 낼까요?', LANG_GROUP = '어떤 말로 부를까요?';
  var Q1 = '소리만 듣고 어느 나라 음악인지 알아챌 수 있을까? 무엇이 단서가 될까?';
  var Q2 = '세계 여러 나라의 노래는 왜 저마다 다른 색깔로 들릴까? 그 나라다움은 어디에서 나올까?';

  var CAPSULE = {
    q1: {
      id: 'cap-q1',
      eyebrow: '오늘의 질문 1 · 타임캡슐',
      question: Q1,
      prompt: '여행을 떠나기 전, 가장 큰 단서가 될 것 같은 쪽을 미리 골라 놓아요.',
      opts: ['악기 음색과 연주법', '박자와 리듬의 흐름', '노래하는 말과 억양', '아직 잘 모르겠다'],
      recallTitle: '오늘의 질문 1 · 타임캡슐 열어 보기',
      recallPrompt: '1장에서 골랐던 첫 생각과 비교해 봐요. 세계 소리 지도를 직접 채워 본 지금, 가장 도움이 된 단서는 무엇인가요?'
    },
    q2: {
      id: 'cap-q2',
      eyebrow: '오늘의 질문 2 · 타임캡슐',
      question: Q2,
      prompt: '네 나라의 노래를 듣기 전, 그 나라만의 색깔을 만드는 가장 큰 요소를 골라 놓아요.',
      opts: ['노래하는 언어와 억양', '박자의 흔들림과 빠르기', '음계와 가락의 분위기', '아직 잘 모르겠다'],
      recallTitle: '오늘의 질문 2 · 타임캡슐 열어 보기',
      recallPrompt: '2차시 시작 전에 골랐던 첫 생각과 비교해 봐요. 1·2차시 10개국 음악을 세계 지도 한 장에 다 모아 본 지금, 내 생각을 한 문장으로 정리해 봐요.',
      alsoRecall: 'q1'
    }
  };
  var CUES = {
    mariachi: {
      type: 'detective',
      title: '소리 탐정 · 이 영상에서 실제로 들리는 단서 2개만 골라 검증해요 (함정 2개 숨어 있음)',
      items: [
        { text: '화려한 트럼펫 가락이 치고 나온다', ok: true },
        { text: '전자 기타와 드럼 세트가 록처럼 연주한다', ok: false },
        { text: '바이올린과 큰 기타가 함께 반주한다', ok: true },
        { text: '반주 없이 혼자서 조용히 노래한다', ok: false }
      ]
    },
    jambo: {
      type: 'counter',
      title: '귀로 세기 미션 · 영상에서 “잠보(Jambo)!”가 들릴 때마다 탭해요',
      btnLabel: '+1 “잠보!” 들렸다',
      unit: '번',
      compare: '영상이 끝나면 기록을 확정하고 짝과 화면을 맞대어 누가 더 정확히 셌는지 10초 비교해요!'
    },
    molihua: {
      type: 'detective',
      title: '소리 탐정 · 이 영상에서 실제로 들리는 단서 2개만 골라 검증해요 (함정 2개 숨어 있음)',
      items: [
        { text: '화려한 트럼펫과 큰 북이 행진하듯 울린다', ok: false },
        { text: '여러 목소리가 부드럽게 화음을 쌓는다', ok: true },
        { text: '낮고 굵은 나무 대롱 소리가 계속 깔린다', ok: false },
        { text: '서두르지 않고 잔잔하게 가락이 흐른다', ok: true }
      ]
    },
    range: {
      type: 'detective',
      title: '소리 탐정 · 이 영상에서 실제로 들리는 단서 2개만 골라 검증해요 (함정 2개 숨어 있음)',
      items: [
        { text: '어쿠스틱 기타 반주와 함께 여유롭게 노래한다', ok: true },
        { text: '수십 명이 춤추며 빠른 북소리를 친다', ok: false },
        { text: '하나-둘-셋, 셋씩 흔들리는 박자로 흐른다', ok: true },
        { text: '말을 빠르게 랩처럼 쏟아 낸다', ok: false }
      ]
    },
    pokarekare: {
      type: 'detective',
      title: '소리 탐정 · 이 영상에서 실제로 들리는 단서 2개만 골라 검증해요 (함정 2개 숨어 있음)',
      items: [
        { text: '빠른 2박자 행진곡처럼 발을 구르며 부른다', ok: false },
        { text: '앞의 세 곡보다 조금 느리게(Andantino) 흐른다', ok: true },
        { text: '여러 타악기가 엇갈리며 시끄럽게 몰아친다', ok: false },
        { text: '여성 솔로 목소리가 길고 서정적으로 이어진다', ok: true }
      ]
    }
  };
  var BALANCE = {
    americas: {
      id: 'bal-americas',
      prompt: '우리 학교 급식실에 딱 하루 깜짝 공연이 온다면? (밥 먹는 내내 내 옆에서 연주함)',
      a: { label: '식판 바로 옆에서 트럼펫 불어 대는 멕시코 마리아치 악단', sub: '화려한 금관과 노래를 1열 직관 · 전교생 시선 집중' },
      b: { label: '급식실 복도를 뚫고 들어오는 브라질 삼바 북 30인조 퍼레이드', sub: '식판과 국그릇이 덜덜 떨리는 심장 쿵쾅 타악기 진동' },
      talk: '밥이 코로 들어가도 보고 싶은 쪽을 짝에게 보여 주고, 왜 그쪽인지 30초 동안 설득해 봐요!'
    },
    pokarekare: {
      id: 'bal-pokarekare',
      prompt: '폭풍우 치는 바다 건너편에 내 최애(또는 찐친·짝사랑)가 있다! 오늘 못 보면 영영 못 만난다면?',
      a: { label: '목숨 걸고 풍덩! 거센 물결 헤엄쳐 직접 얼굴 보러 간다', sub: '포카레카레 아나 마오리 원곡 전설 스타일 · 직진파' },
      b: { label: '일단 살아야지! 해변에서 목 터지게 노래 불러 목소리만 보낸다', sub: '그리움은 크지만 안전이 제일 · 감성파' },
      talk: '짝이 바다에 뛰어들겠다는데 말릴지, 구명조끼 챙겨 줄지 30초 안에 합의해 봐요!'
    }
  };

  /* ---------- 인터랙티브 세계 음악 지도 매칭 플레이 ---------- */
  var MAP_PINS = [
    { id: 'us', name: '미국', region: '아메리카', x: 20.5, y: 37.5 },
    { id: 'mx', name: '멕시코', region: '아메리카', x: 21.0, y: 52.0 },
    { id: 'br', name: '브라질', region: '아메리카', x: 33.5, y: 70.0 },
    { id: 'de', name: '독일', region: '유럽', x: 51.0, y: 28.0 },
    { id: 'ke', name: '케냐', region: '아프리카', x: 57.5, y: 58.5 },
    { id: 'cn', name: '중국', region: '아시아', x: 71.5, y: 40.5 },
    { id: 'jp', name: '일본', region: '아시아', x: 86.5, y: 37.0 },
    { id: 'ph', name: '필리핀', region: '아시아', x: 81.0, y: 55.0 },
    { id: 'au', name: '호주', region: '오세아니아', x: 80.0, y: 75.5 },
    { id: 'nz', name: '뉴질랜드', region: '오세아니아', x: 91.5, y: 88.5 }
  ];
  var MAPGAME = {
    p1: {
      id: 'map-p1',
      eyebrow: '1차시 정리 플레이',
      title: '세계 소리 지도 매칭 (9곳)',
      intro: '10초 소리와 음색 단서를 보고 지도에서 나라 핀을 찍은 뒤, 악기 이름을 매칭해 지도를 완성해요.',
      pins: ['us', 'mx', 'br', 'de', 'ke', 'cn', 'jp', 'ph', 'au'],
      rounds: [
        { pin: 'jp', answer: '샤미센', tag: '1차시 악기', listen: 'quizAsia', clue: '큰 채(바치)로 세 줄을 튕겨 단단하게 울리다 뚝 끊기는 음색', opts: ['샤미센', '비파', '밴조'] },
        { pin: 'br', answer: '삼바', tag: '1차시 음악', listen: 'quizAmericas', clue: '큰 북(수르두)과 여러 타악기가 빠르게 엇갈리며 몰아치는 카니발 리듬', opts: ['삼바', '마리아치', '쿨린탕'] },
        { pin: 'au', answer: '디저리두', tag: '1차시 악기', listen: 'mapDidg', clue: '긴 나무 대롱에 입술을 대고 숨을 잇는 낮고 굵은 울림', opts: ['디저리두', '오루투', '반도네온'] },
        { pin: 'cn', answer: '비파', tag: '1차시 악기', listen: 'mapPipa', clue: '물방울 모양 몸통에 네 줄, 손가락을 빠르게 굴려(윤지) 이어 가는 음색', opts: ['비파', '샤미센', '오루투'] },
        { pin: 'de', answer: '반도네온', tag: '1차시 악기', listen: 'quizFaraway', clue: '주름상자에 바람을 보내 양쪽 단추를 눌러 애절하고 깊이 울리는 음색', opts: ['반도네온', '밴조', '디저리두'] },
        { pin: 'mx', answer: '마리아치', tag: '1차시 음악', listen: 'mapMariachi', clue: '화려한 트럼펫과 바이올린, 기타론이 어우러져 노래하는 거리 악단', opts: ['마리아치', '삼바', '쿨린탕'] },
        { pin: 'ph', answer: '쿨린탕', tag: '1차시 악기', listen: 'mapKulintang', clue: '음높이 순서로 늘어놓은 작은 징들을 나무 채로 두드려 맑게 퍼지는 합주', opts: ['쿨린탕', '삼바', '비파'] },
        { pin: 'us', answer: '밴조', tag: '1차시 악기', listen: 'mapBanjo', clue: '둥근 북 모양 몸통에 긴 목, 손가락으로 줄을 튕겨 경쾌하게 튀는 음색', opts: ['밴조', '샤미센', '마리아치'] },
        { pin: 'ke', answer: '오루투', tag: '1차시 악기', listen: 'mapOrutu', clue: '가죽 몸통에 줄 하나, 활로 문질러 부드럽게 떨며 춤을 반주하는 음색', opts: ['오루투', '디저리두', '비파'] }
      ]
    },
    final: {
      id: 'map-final',
      eyebrow: '1·2차시 총괄 플레이',
      title: '총괄 세계 음악 지도 챌린지 (10개국)',
      intro: '1차시 악기·음악과 2차시 세계의 노래 4곡을 모두 합쳐 10개국 세계 음악 지도를 완성해 봐요.',
      pins: ['us', 'mx', 'br', 'de', 'ke', 'cn', 'jp', 'ph', 'au', 'nz'],
      rounds: [
        { pin: 'ke', answer: '잠보', tag: '2차시 노래', listen: 'mapJambo', clue: '스와힐리어로 “안녕하세요” 인사를 밝고 경쾌하게 주고받는 노래', opts: ['잠보', '모리화', '삼바'] },
        { pin: 'jp', answer: '샤미센', tag: '1차시 악기', listen: 'quizAsia', clue: '네모난 몸통에 세 줄, 큰 채로 튕겨 단단하게 울리다 뚝 끊기는 음색', opts: ['샤미센', '비파', '밴조'] },
        { pin: 'cn', answer: '모리화', tag: '2차시 노래', listen: 'quizMolihua', clue: '하얀 재스민 꽃을 5음 음계의 부드러운 가락으로 노래한 민요', opts: ['모리화', '잠보', '포카레카레 아나'] },
        { pin: 'br', answer: '삼바', tag: '1차시 음악', listen: 'quizAmericas', clue: '카니발 행렬에서 큰 북과 타악기 리듬이 빠르게 겹치며 들썩이는 음악', opts: ['삼바', '마리아치', '하카'] },
        { pin: 'us', answer: '언덕 위의 집', tag: '2차시 노래', listen: 'quizRange', clue: '넓은 들판을 떠올리며 셋씩(3박) 여유롭게 흔들리는 영어 노래', opts: ['언덕 위의 집', '잠보', '모리화'] },
        { pin: 'de', answer: '반도네온', tag: '1차시 악기', listen: 'quizFaraway', clue: '독일에서 만들어져 탱고를 대표하게 된 주름상자 단추 악기', opts: ['반도네온', '디저리두', '오루투'] },
        { pin: 'nz', answer: '포카레카레 아나', tag: '2차시 노래', listen: 'mapPokarekare', clue: '마오리어로 그리운 마음을 담아 조금 느리게(Andantino) 부르는 사랑 노래', opts: ['포카레카레 아나', '언덕 위의 집', '잠보'] },
        { pin: 'mx', answer: '마리아치', tag: '1차시 음악', listen: 'mapMariachi', clue: '트럼펫·바이올린·기타론이 어우러지는 화려한 멕시코 악단', opts: ['마리아치', '삼바', '밴조'] },
        { pin: 'ph', answer: '쿨린탕', tag: '1차시 악기', listen: 'mapKulintang', clue: '틀 위에 늘어놓은 작은 징들을 나무 채로 쳐 맑게 퍼지는 합주', opts: ['쿨린탕', '비파', '샤미센'] },
        { pin: 'au', answer: '디저리두', tag: '1차시 악기', listen: 'mapDidg', clue: '유칼립투스 나무 대롱에 입술을 대고 낮고 굵게 이어 부는 울림', opts: ['디저리두', '오루투', '반도네온'] }
      ]
    }
  };

  var reveal = '<button type="button" class="mini cls reveal-shows" id="btnReveal" aria-expanded="false" aria-controls="showIdentities" disabled>정체 공개</button>';
  var revealAsia = '<button type="button" class="mini cls reveal-shows" id="btnReveal" data-label-open="악기 이름 공개" data-label-close="악기 이름 숨기기" aria-expanded="false" aria-controls="showIdentities" disabled>악기 이름 공개</button>';

  function graded(id, type, prompt, opts, ans, group, listen) {
    var q = { id: id, type: type, prompt: prompt, opts: opts, ans: ans, accept: [ans], group: group };
    if (listen) q.listen = listen;
    return q;
  }
  function writing(id, label, prompt, ph, vocab) {
    var q = { id: id, type: 'text', label: label, prompt: prompt, ph: ph };
    if (vocab) q.vocab = vocab;
    return q;
  }
  function songThought(id, name, vocab) {
    return writing('t-' + id, name + ' 생각 한 줄', '이 노래를 들으며 <b>가장 인상 깊었던 특징</b> 하나를 써요.', '위의 표현 칩을 눌러 문장에 넣거나 내 말로 자유롭게 써 봐요.', vocab);
  }
  function songLesson(key, card, feel, opts) {
    opts = opts || {};
    return (opts.warmup ? '{warmup:' + key + '}' : '') +
      '{vid:' + key + '}{cue:' + key + '}<dl class="terms terms-one">' + card + '</dl>' +
      (opts.more || '') + (opts.balance ? '{balance:' + opts.balance + '}' : '') +
      '<div class="talk"><b>함께 느껴 보기</b>' + feel + '</div>';
  }
  var CHAPTERS = [
    {
      id: 'start', title: '여행 준비', time: '5분', task: '소리 세 개를 듣고 어느 대륙에서 왔을지 짐작해요.',
      lead: '어디서 온 소리일까요? 귀를 기울이며 여행을 시작해요.',
      lesson: `
        <div class="goals"><b>학습 목표</b><ol><li>세계 여러 나라의 악기·음악·노래를 듣고 음색과 특징을 구별할 수 있다.</li><li>각 지역의 음악과 문화를 세계 지도 위에 연결하며 다양성을 존중할 수 있다.</li></ol></div>
        {capsule:q1}
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
        ${revealAsia}
        <div id="showIdentities" hidden>
          <ul class="identities"><li><b>악기 1</b> 샤미센 · 일본</li><li><b>악기 2</b> 비파 · 중국</li></ul>
          <dl class="terms terms-two">
          {term:샤미센|일본|가죽을 씌운 네모난 나무 몸통 위에 세 줄이 걸려 있어요. 은행잎처럼 생긴 큰 채인 바치로 튕기면 소리가 단단하게 울리고 뚝 끊겨요. 가부키와 민요의 반주에서도 들을 수 있어요.}
          {term:비파|중국|물방울처럼 생긴 몸통에 줄 네 개가 걸려 있어요. 손톱으로 줄을 튕겨 소리를 내요. 손가락을 빠르게 굴리며 소리를 이어 가는 연주법을 윤지라고 해요.}
        </dl><details class="more"><summary>더 알아보기 · 우리나라의 비파</summary><p>우리나라에도 향비파와 당비파가 있었어요.</p></details></div>
        {vid:kulintang}<dl class="terms terms-one">{term:쿨린탕|필리핀 남부 민다나오 등|틀 위에 작은 징을 눕히고 음높이 순서로 늘어놓아요. 보통 여덟 개 안팎의 징을 두 손에 든 나무 채로 쳐요. 북과 큰 징도 함께 어울려요.}</dl>
        <div class="talk"><b>입으로 소리 내기</b>다 같이 샤미센은 “팅”, 비파는 “또롱”, 쿨린탕은 “동동” 하고 흉내 내요.</div>
        <div class="talk"><b>짝과 30초</b>세 악기 가운데 가장 마음에 든 소리는 무엇인가요? 그 까닭을 짝에게 말해요.</div>{art:world-asia}`,
      qs: [
        graded('w1-1', 'pick', '쿨린탕', HOW, '두드려요', HOW_GROUP),
        graded('w1-2', 'pick', '비파', HOW, '줄을 튕겨요'),
        graded('w1-3', 'radio', '10초 소리를 듣고, 지금 들리는 <b>악기</b>를 골라요.', ['비파', '샤미센', '쿨린탕'], '샤미센', null, 'quizAsia'),
        writing('t-asia', '아시아 정거장 생각 한 줄', '샤미센·비파·쿨린탕 가운데 하나를 골라 <b>소리가 어떻게 들렸는지</b> 한 문장으로 써 봐요.', '위의 표현 칩을 눌러 문장에 넣거나 내 말로 자유롭게 써 봐요.', ['단단하고 뚝 끊기는', '물방울처럼 맑게 구르는', '손가락으로 굴려 이어지는', '금속이 맑게 퍼지는', '리듬이 경쾌하게 튀는', '짧고 힘 있게 울리는'])
      ]
    },
    {
      id: 'americas', title: '아메리카 정거장', time: '11분', task: '세 음악을 듣고 삼바 리듬을 발과 손으로 쳐요.',
      lead: '몸이 먼저 움직이고 싶어지는 순간을 찾아요.',
      lesson: `
        {vid:banjo}<dl class="terms terms-one">{term:밴조|미국|둥근 북처럼 막을 씌운 몸통에 긴 목이 달려 있어요. 손가락으로 줄을 튕기면 경쾌하게 울려요. 아프리카에서 건너온 사람들의 악기에서 비롯되었고, 컨트리와 블루그래스 음악에서 들을 수 있어요.}</dl>
        {vid:mariachi}{cue:mariachi}<dl class="terms terms-one">{term:마리아치|멕시코|마리아치는 함께 노래하고 연주하는 악단이에요. 바이올린과 트럼펫에 비우엘라와 큰 저음 기타인 기타론이 어우러져요. 단원들은 장식 달린 옷과 챙 넓은 솜브레로를 갖춰 입어요.}</dl>
        <details class="more"><summary>더 알아보기 · 마리아치</summary><p>2011년 유네스코 인류무형문화유산에 올랐어요.</p></details>
        {vid:samba}<dl class="terms terms-one">{term:삼바|브라질|리우데자네이루 카니발에서 만나는 음악과 춤이에요. 큰 북 수르두가 중심 박을 받치는 사이로 탐보림과 판데이루가 빠르게 엇갈려요. 이렇게 리듬을 겹치는 삼바에는 아프리카 리듬의 뿌리가 있어요.}</dl>
        {balance:americas}
        <section class="activity"><h2>발과 손으로 삼바 리듬 치기</h2>
          <table class="rhythm"><caption>진한 칸에서 움직여요. 숫자 사이의 &amp;는 반 박 뒤예요.</caption>
            <thead><tr><th scope="col">동작</th><th>1</th><th>&amp;</th><th>2</th><th>&amp;</th><th>3</th><th>&amp;</th><th>4</th><th>&amp;</th></tr></thead>
            <tbody><tr><th scope="row">발</th><td class="beat">쿵</td><td></td><td></td><td></td><td class="beat">쿵</td><td></td><td></td><td></td></tr>
            <tr><th scope="row">손뼉</th><td></td><td class="beat">짝</td><td></td><td class="beat">짝</td><td></td><td></td><td></td><td class="beat">짝</td></tr></tbody>
          </table><p>선생님 신호에 맞춰 발부터 구르고 손뼉을 더해요. 이렇게 두 번 반복해요.</p></section>{art:world-americas}`,
      qs: [
        graded('w1-4', 'pick', '밴조', HOW, '줄을 튕겨요', HOW_GROUP),
        graded('w1-5', 'radio', '바이올린·트럼펫·기타가 함께 어우러지는 <b>멕시코</b>의 악단은?', ['마리아치', '삼바', '쿨린탕'], '마리아치'),
        graded('w1-6', 'radio', '12초 소리를 듣고, 지금 들리는 <b>음악</b>을 골라요.', ['하카', '삼바', '마리아치'], '삼바', null, 'quizAmericas'),
        writing('t-americas', '아메리카 정거장 생각 한 줄', '세 음악 가운데 <b>몸이 가장 먼저 반응한</b> 음악과 그 까닭을 써 봐요.', '위의 표현 칩을 눌러 문장에 넣거나 내 말로 자유롭게 써 봐요.', ['경쾌하게 통통 튀는', '북소리가 겹쳐 들썩이는', '트럼펫이 화려하게 울리는', '리듬이 빠르게 엇갈리는', '어깨가 저절로 흔들리는', '축제처럼 신나고 활기찬'])
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
        graded('w1-9', 'radio', '10초 소리를 듣고, 지금 들리는 <b>악기</b>를 골라요.', ['반도네온', '디저리두', '밴조'], '반도네온', null, 'quizFaraway'),
        writing('t-faraway', '먼 정거장 생각 한 줄', '디저리두·반도네온·오루투 가운데 <b>우리 악기와 닮은 점</b>이 있는 악기를 하나 골라 써 봐요.', '위의 표현 칩을 눌러 문장에 넣거나 내 말로 자유롭게 써 봐요.', ['낮고 굵게 계속 울리는', '숨이 끊어지지 않고 이어지는', '애절하고 깊이 파고드는', '활로 문질러 부드럽게 떨리는', '바람이 스며들듯 울리는', '우리 악기 해금과 닮은'])
      ]
    },
    {
      id: 'plan', title: '세계 소리 지도 매칭', time: '7분', task: '1차시에서 들은 9곳의 악기와 음색을 세계 지도 위에 매칭해요.',
      lead: '방금 들은 소리와 음색을 세계 지도 위의 제자리에 꽂아 봐요.',
      lesson: `{capsuleRecall:q1}
        {mapGame:p1}`,
      qs: [
        writing('t-q1', '1차시 마무리 한 줄', '처음 질문: 소리만 듣고 어느 나라 음악인지 알아챌 때 <b>가장 도움이 된 단서</b>는?', '위의 표현 칩을 눌러 문장에 넣거나 내 말로 자유롭게 써 봐요.', ['악기 음색과 재료', '줄·활·입·북의 연주법', '반복되는 박자와 리듬', '노래하는 말과 억양', '무대 복장과 춤 동작', '악기들이 어우러지는 방식'])
      ]
    },
    {
      id: 'recall', split: true, title: '소리로 떠올리기 · 2차시 열기', time: '6분', task: '지난 소리를 귀로 떠올리고 2차시 질문을 골라요.',
      lead: '지난 시간에 채운 소리 지도를 귀로 다시 떠올려요.',
      lesson: `<section class="activity"><h2>소리로 떠올리기</h2>
        <div class="listen-grid opening-videos">{vid:recallA|10초만 듣고 멈춤}{vid:recallB|10초만 듣고 멈춤}{vid:recallC|10초만 듣고 멈춤}</div>
        <p>어느 나라 정거장의 소리였는지 다 같이 말해 봐요.</p></section>
        <div class="talk"><b>짝과 30초</b>지난 시간 소리 지도에서 가장 기억에 남은 나라와 음색을 짝에게 한 가지씩 말해요.</div>
        {capsule:q2}`,
      qs: []
    },
    {
      id: 'jambo', title: '잠보 · 케냐', time: '7분', task: '잠보 라이브를 보며 인사말과 리듬을 느껴요.',
      lead: '반갑게 손을 흔들며 건네는 인사의 리듬을 만나요.',
      lesson: songLesson('jambo', '{term:잠보|케냐|스와힐리어로 인사를 나누는 노래예요. “잠보”는 “안녕하세요” 하고 건네는 인사말이에요. 빠르기말 Moderato는 보통 빠르게 부르라는 뜻이에요.|밝고 경쾌하게 인사를 주고받아요.}', '영상을 보며 “잠보” 인사말이 나올 때 짝과 가볍게 손을 흔들며 따라 흥얼거려 봐요.', { warmup: true }),
      qs: [
        graded('w2-1', 'pick', '잠보', LANG, '스와힐리어', LANG_GROUP),
        graded('w2-2', 'radio', "'잠보'는 무슨 뜻일까요?", ['안녕하세요', '고마워요', '잘 가요'], '안녕하세요'),
        songThought('jambo', '잠보', ['밝고 경쾌하게 주고받으며', '손을 흔들며 반갑게 인사하듯', '리듬을 타며 신나게', '보통 빠르기(Moderato)를 살려', '또렷하고 힘찬 목소리로', '서로 눈을 맞추며'])
      ]
    },
    {
      id: 'molihua', title: '모리화 · 중국', time: '7분', task: '모리화 라이브를 보며 5음 가락의 흐름을 따라가요.',
      lead: '꽃향기가 퍼지듯 부드럽게 굽이치는 가락을 들어요.',
      lesson: songLesson('molihua', '{term:모리화|중국 · 茉莉花|하얀 재스민 꽃의 향기와 아름다움을 노래한 중국 민요예요. 5음 음계로 이루어진 가락이 부드럽게 오르내려요. 교과서의 빠르기말은 Moderato(보통 빠르게)예요.|꽃을 바라보듯 부드럽게 가락을 이어요.}', '처음 두 마디 가락만 “음—” 하고 가볍게 허밍하며 5음 음계의 매끄러운 흐름을 느껴 봐요.', { more: '<details class="more"><summary>더 알아보기 · 오페라 속 가락</summary><p>푸치니의 오페라 「투란도트」에도 이 가락이 나와요.</p></details>' }),
      qs: [
        graded('w2-3', 'radio', '모리화(茉莉花)가 노래하는 것은?', ['향기로운 재스민 꽃', '넓은 들판의 집', '그리운 사람'], '향기로운 재스민 꽃'),
        graded('w2-4', 'radio', '12초 가락을 다시 듣고, 이 노래가 주로 <b>몇 개의 음</b>으로 이루어진 음계인지 골라요.', ['5음 음계', '7음 음계', '12음 모두'], '5음 음계', null, 'quizMolihua'),
        songThought('molihua', '모리화', ['부드럽게 오르내리며 이어지는', '꽃향기가 은은하게 퍼지듯', '맑고 고운 목소리로', '숨을 길게 이어 잔잔하게', '5음 가락의 굽이를 살려', '서두르지 않고 차분하게'])
      ]
    },
    {
      id: 'range', title: '언덕 위의 집 · 미국', time: '7분', task: '들판을 떠올리며 3박자 흐름을 몸으로 느껴요.',
      lead: '노래의 흐름에 맞춰 어깨를 가볍게 흔들어 봐요.',
      lesson: songLesson('range', '{term:언덕 위의 집|미국 · Home on the Range|19세기 미국 서부 개척 시대에 영어로 부르던 노래예요. 들소와 사슴이 뛰노는 넓은 들판의 집을 그려요. 셋씩 묶이는 3박 계통의 가락이 여유롭게 흔들려요. 빠르기말은 Moderato(보통 빠르게)예요.|셋을 세며 흔들리는 박을 느껴요.}', '영상을 들으며 “하나-둘-셋”에 맞춰 손이나 어깨를 옆으로 살며시 흔들어 봐요.', { more: '<details class="more"><summary>더 알아보기 · 캔자스주</summary><p>미국 캔자스주의 노래이기도 해요.</p></details>' }),
      qs: [
        graded('w2-5', 'pick', '언덕 위의 집', LANG, '영어', LANG_GROUP),
        graded('w2-6', 'radio', '15초 소리를 들으며 손으로 박을 세어 보고, <b>몇 박</b>씩 묶여 흐르는지 골라요.', ['2박', '3박', '4박'], '3박', null, 'quizRange'),
        songThought('range', '언덕 위의 집', ['셋씩 흔들리며 여유롭게', '넓은 들판을 바라보듯 시원하게', '따뜻하고 포근한 목소리로', '첫 박에 힘을 실어 부드럽게', '어깨를 살며시 흔들며', '편안하게 숨을 내쉬며'])
      ]
    },
    {
      id: 'pokarekare', title: '포카레카레 아나 · 뉴질랜드', time: '7분', task: '빠르기말을 비교하며 그리운 감정을 감상해요.',
      lead: '물결 건너편에 마음을 전하는 목소리를 들어요.',
      lesson: songLesson('pokarekare', '{term:포카레카레 아나|뉴질랜드 · Pokarekare Ana|뉴질랜드에서 널리 부르는 마오리어 사랑 노래예요. 거센 물결 너머에 있는 사랑하는 사람을 그리워해요. 네 곡 가운데 이 곡의 빠르기말만 Andantino(조금 느리게)예요.|물결 건너편의 사람을 떠올리며 조금 느리게 이어요.}', '앞의 세 곡(Moderato)과 다른 빠르기말 Andantino를 비교하며, 선율이 길게 이어지는 구간을 찾아 들어요.', { balance: 'pokarekare' }),
      qs: [
        graded('w2-7', 'pick', '포카레카레 아나', LANG, '마오리어', LANG_GROUP),
        graded('w2-8', 'radio', '포카레카레 아나가 담은 마음은?', ['사랑하는 사람을 그리워하는 마음', '꽃을 자랑하는 마음', '손님을 맞이하는 반가움'], '사랑하는 사람을 그리워하는 마음'),
        songThought('pokarekare', '포카레카레 아나', ['조금 느리게(Andantino) 마음을 담아', '물결처럼 길고 부드럽게 이어서', '그리움을 담아 여리게 시작해', '후렴에서 따뜻하게 소리를 키워', '끝음을 서두르지 않고 잔잔하게', '가사의 뜻을 떠올리며 차분하게'])
      ]
    },
    {
      id: 'sing', title: '총괄 세계 음악 지도 챌린지', time: '11분', task: '1·2차시 10개국의 악기·노래·음색을 지도 한 장에 모두 매칭해요.',
      lead: '두 차시 동안 여행한 10개국의 음악을 세계 지도 한 장에 완성해 봐요.',
      lesson: `{capsuleRecall:q2}
        {mapGame:final}`,
      qs: [
        { id: 's-fav', type: 'radio', label: '가장 기억에 남는 정거장', prompt: '1·2차시 10개국 가운데 <b>가장 기억에 남는 음악</b>은 어느 곳인가요?', opts: ['샤미센(일본)', '비파·모리화(중국)', '쿨린탕(필리핀)', '밴조·언덕 위의 집(미국)', '마리아치(멕시코)', '삼바(브라질)', '디저리두(호주)', '반도네온(독일)', '오루투·잠보(케냐)', '하카·포카레카레 아나(뉴질랜드)'] },
        writing('t-q2', '2차시 마무리 한 줄', '처음 질문: 세계 여러 나라의 음악이 <b>저마다 다른 색깔</b>로 들리는 가장 큰 까닭은 무엇일까요? 한 문장으로 정리해 봐요.', '위의 표현 칩을 눌러 문장에 넣거나 내 말로 자유롭게 써 봐요.', ['그 나라만의 악기 재료와 음색', '노래하는 언어와 억양의 차이', '박자의 흔들림과 빠르기', '5음 음계 등 가락의 분위기', '춤·축제·인사 같은 생활 문화', '연주법과 반주 방식의 개성'])
      ],
      after: '<p class="hint">총괄 세계 음악 지도 매칭과 마무리 한 줄을 확인한 뒤, 마지막 화면에서 제출해요.</p>'
    }
  ];
  CHAPTERS.forEach(function (chapter) {
    chapter.qs.forEach(function (q) {
      if (q.ans !== undefined) q.label = chapter.title + ' ' + q.id + ' (' + q.ans + ')';
    });
  });
  window.WORLD = { V: V, ART: ART, WARMUP: WARMUP, CAPSULE: CAPSULE, CUES: CUES, BALANCE: BALANCE, MAP_PINS: MAP_PINS, MAPGAME: MAPGAME, CHAPTERS: CHAPTERS };
})();

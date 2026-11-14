/* 판소리와 창극 — 수업 내용·영상·학습지 문항
 * 화면 그리기는 app.js. 이 파일만 고치면 문구·문항·영상을 바꿀 수 있어요.
 * 문항 종류: blank(쓰기) · pick(고르기 목록) · radio(하나 고르기) · multi(모두 고르기) · text(서술, 채점 안 함)
 * 장마다 영상은 '꼭 듣기'(수업 화면)와 '더 들어보기'(접힌 칸)로 나눠요. 토론 결정(T003·T004): 꼭 듣기 5편, 자동 채점 8문항 + 서술 3문항.
 * label 은 선생님 시트에 들어가는 문항 이름이라 서로 달라야 해요.
 */
(function () {
  'use strict';

  // 영상: id 는 유튜브 주소 v= 뒤의 글자. start/end(초)를 넣으면 그 구간만 재생해요.
  var V = {
    sarang:   { id: 'SXvEm0IJ1fc', title: "판소리 춘향가 중 '사랑가'", by: '국악방송 TV · 교과서국악' },
    heungbo:  { id: '_DfWWJKxV8Q', title: "흥보가 중 '돈과 쌀을 털어내는 대목'", by: '유성실 (소리 유성실, 고수 김형석)' },
    sugung:   { id: '75go7rl8T5I', title: "수궁가 중 '좌우나졸'(토끼 잡아들이는 대목)", by: 'KBS전주 · 국악한마당 (소리 왕기석)' },
    simcheong:{ id: 'mvUMu_Kk7Bg', title: "심청가 중 '범피중류'", by: '국악방송 TV · 국악무대 (소리 김율희)' },
    jeokbyeok:{ id: 'bvru9n1OJjk', title: "적벽가 중 '조자룡 활 쏘는 대목'", by: '국립국악원 · 일일국악' },
    changgeuk:{ id: 'G4-NWpdbqY4', title: "창극 '춘향' 공연 실황", by: '국립극장 · 국립창극단 (2020)' },
    cgSarang: { id: 'eevQQ_JUomI', title: "창극 '춘향' 중 '사랑가'(국악 관현악과 함께)", by: '강원특별자치도립예술단 (소리 이소연·이광복)' },
    seodo:    { id: 'k-g9Y28jziU', title: "서도밴드 '사랑가'", by: 'sEODo BAND' },
    toris:    { id: '99k8pqb7Grw', title: "토리스 '시리렁 실근'", by: '국악아카펠라 토리스' },
    leenalchi:{ id: 'FrCkLMxnlMI', title: "이날치 '좌우나졸'", by: 'LEENALCHI' },
    jeonju:   { id: 'Q5BMr0HYFec', title: "전주판소리합창단 '인당수'", by: '국립국악원 · Gugak in 人' },
    scape:    { id: 'sNakb7plGJc', title: "이아람·정재일·김준수 '조자룡 활 쏘는 대목'", by: '판소리스케이프' }
  };

  var JANGDAN = ['진양조', '중중모리', '자진모리', '휘모리'];

  // 2차시로 나눌 때는 split: true 인 장 뒤에서 끊어요(첫 화면 교사 안내에 나와요).
  var CHAPTERS = [
    {
      id: 'c1', nav: '판소리와 소리판', title: '판소리와 소리판', time: '8분',
      lead: '소리꾼 한 사람이 긴 이야기를 끌고 가요. 하지만 무대를 혼자 만드는 것은 아니에요.',
      lesson:
        '<div class="define"><b>판소리</b><p><mark>한 명의 소리꾼</mark>이 <mark>고수의 북 장단</mark>에 맞추어 소리(노래)·아니리(대사)·발림(몸동작)으로 이야기를 표현하는 우리나라의 전통 극음악이에요.</p>' +
        '<p class="sub">조선 후기부터 오늘날까지 그 시대의 이야기를 담아 왔어요. 원래 <b>열두 마당</b>이었지만 지금은 <b>다섯 마당</b>이 전해져요.</p></div>' +
        '<h3>소리꾼이 쓰는 세 가지</h3><p class="hint">카드를 누르면 뜻이 나와요. 먼저 무슨 뜻일지 짐작해 봐요.</p>' +
        '<div class="flips three">' +
          '{flip:소리|노래|장단에 맞추어 노래로 이야기를 들려줘요.}' +
          '{flip:아니리|대사(말)|노래하지 않고 말로 이야기를 풀어 가요.}' +
          '{flip:발림|몸동작|부채를 들고 몸짓으로 장면을 보여 줘요.}' +
        '</div>' +
        '<h3>소리판의 세 사람</h3>' +
        '{stage:pansori}' +
        '<div class="flips three">' +
          '{flip:소리꾼|소리로 이야기 전달|고수의 북 장단에 맞추어 소리로 이야기를 전달해요.}' +
          '{flip:고수|북 장단 + 추임새|소리에 맞추어 북 장단을 치며 추임새로 흥을 돋워요.}' +
          '{flip:청중|추임새로 함께|소리에 어울리는 추임새를 알맞게 넣으며 관람해요.}' +
        '</div>' +
        '<div class="try"><b>함께 해 봐요 · 추임새</b><p>추임새는 소리 사이사이에 넣는 짧은 응원의 말이에요. 선생님이 손을 들면 다 같이 외쳐 봐요.</p>' +
        '<div class="chu"><span>얼씨구!</span><span>좋다!</span><span>잘한다!</span><span>그렇지!</span></div></div>',
      qs: [
        { id: 'c1a', label: '1-1 말로 전하는 방식', type: 'radio', prompt: '소리꾼이 <b>노래가 아닌 말로</b> 이야기를 전하는 것을 무엇이라고 할까요?', opts: ['소리', '아니리', '발림', '추임새'], ans: '아니리' },
        { id: 'c1b', label: '1-2 북 장단을 치는 사람', type: 'radio', prompt: '소리에 맞추어 북 장단을 치는 사람은 누구일까요?', opts: ['소리꾼', '고수', '청중', '도창'], ans: '고수' },
        { id: 'c1c', label: '1-3 추임새를 넣는 사람', type: 'multi', prompt: '추임새를 넣는 사람을 <b>모두</b> 골라요.', opts: ['소리꾼', '고수', '청중'], ans: ['고수', '청중'] }
      ]
    },
    {
      id: 'c2', nav: '다섯 마당과 장단', title: '판소리 다섯 마당과 장단', time: '9분', split: true,
      lead: '장면의 분위기가 달라지면 장단도 달라져요. 어떤 장면에 어떤 장단이 어울릴까요?',
      lesson:
        '<ol class="steps"><li><b>장면 읽기</b> 느릴까, 빠를까? 먼저 짐작해서 눌러 봐요.</li><li><b>짧게 듣기</b> 손으로 박을 짚으며 북소리를 들어요.</li><li><b>장단 확인</b> "장단은?"을 눌러 이름을 확인해요.</li></ol>' +
        '<div class="madang">' +
          '{madang:심청가|범피중류|진양조|심청이 탄 배가 넓은 바다 한가운데로 떠가는 장면|simcheong|c-sim}' +
          '{madang:춘향가|사랑가|중중모리|몽룡과 춘향이 서로 사랑을 노래하는 장면|sarang|c-chun}' +
        '</div>' +
        '<p class="talk">💬 <b>짝과 이야기해 봐요</b> 어떤 소리가 장면의 어떤 느낌과 어울렸나요? (북소리, 소리꾼의 목소리, 빠르기…)</p>' +
        '<details class="more"><summary>더 들어보기 · 나머지 세 마당</summary><div class="madang">' +
          '{madang:흥보가|돈과 쌀을 털어내는 대목|휘모리|박에서 나온 궤에서 돈과 쌀을 정신없이 쏟아 내는 장면|heungbo|c-heung}' +
          '{madang:수궁가|좌우나졸|자진모리|용궁의 군사들이 토끼를 우르르 잡아들이는 장면|sugung|c-su}' +
          '{madang:적벽가|조자룡 활 쏘는 대목|자진모리|조자룡이 뒤쫓는 배를 향해 활을 쏘는 긴박한 장면|jeokbyeok|c-jeok}' +
        '</div></details>' +
        '<p class="hint">장단 이름은 그 <b>대목</b>의 장단이에요. 한 마당 전체가 한 장단으로 되어 있다는 뜻은 아니에요.</p>',
      qs: [
        { id: 'c2a', label: '2-1 범피중류의 장단', type: 'pick', group: '들은 대목의 장단을 골라요', prompt: '심청가 · 범피중류', opts: JANGDAN, ans: '진양조' },
        { id: 'c2b', label: '2-2 사랑가의 장단', type: 'pick', prompt: '춘향가 · 사랑가', opts: JANGDAN, ans: '중중모리' },
        { id: 'c2c', label: '2-3 장면과 장단(서술)', type: 'text', prompt: '들은 대목 가운데 하나를 골라, <b>어떤 소리가 그 장면의 느낌과 어울렸는지</b> 한두 문장으로 써 봐요.', ph: '예) ○○ 대목은 북소리가 …해서 …하는 장면과 어울렸어요.' }
      ]
    },
    {
      id: 'c3', nav: '사랑가 두 무대', title: '사랑가, 두 무대 비교', time: '10분',
      lead: "앞에서 들은 '사랑가'를 이번에는 창극으로도 들어 봐요. 무엇이 같고 무엇이 다를까요?",
      lesson:
        '<p class="hint">설명을 듣기 전에 먼저 봐요. 영상을 1분쯤씩 보면서 <b>누가 부르는지 · 무엇으로 반주하는지 · 무대에 무엇이 보이는지</b> 찾아요.</p>' +
        '<div class="versus">' +
          '<div><h3 class="tag t-pan">판소리 춘향가</h3>{vid:sarang}</div>' +
          '<div><h3 class="tag t-chang">창극 춘향</h3>{vid:cgSarang}</div>' +
        '</div>' +
        '<p class="talk">💬 <b>찾은 것을 말해 봐요</b> 선생님과 함께 칠판에 두 무대의 다른 점을 모아요.</p>',
      qs: [
        { id: 'c3a', label: '3-1 배역을 나누어 부른 쪽', type: 'radio', prompt: '두 영상 가운데 <b>몽룡과 춘향을 서로 다른 사람이</b> 부른 쪽은?', opts: ['판소리 사랑가', '창극 사랑가', '둘 다', '둘 다 아님'], ans: '창극 사랑가' },
        { id: 'c3b', label: '3-2 북 하나로 반주한 쪽', type: 'radio', prompt: '두 영상 가운데 <b>북 하나로</b> 반주한 쪽은?', opts: ['판소리 사랑가', '창극 사랑가', '둘 다', '둘 다 아님'], ans: '판소리 사랑가' },
        { id: 'c3c', label: '3-3 두 사랑가의 차이(서술)', type: 'text', prompt: '두 사랑가를 듣고 <b>무엇이 다르게 느껴졌는지</b> 써 봐요. 어느 쪽이 더 마음에 들었는지, 왜 그런지도 좋아요.', ph: '예) 판소리는 …해서 …하게 들렸고, 창극은 …' }
      ]
    },
    {
      id: 'c4', nav: '창극이란?', title: '창극이란?', time: '6분',
      lead: '방금 찾은 다른 점을 정리해요. 창극은 판소리에서 태어난 또 하나의 음악극이에요.',
      lesson:
        '<div class="define"><b>창극</b><p><mark>여러 명의 소리꾼</mark>이 <mark>배역을 나누어</mark> 노래 부르는 우리나라의 음악극이에요. 판소리에서 생겨났어요.</p>' +
        '<p class="sub">판소리와 달리 무대 배경과 의상·분장·연기를 갖추고, 국악 관현악으로 반주해요. 대사를 많이 쓰고, 줄거리를 풀어 주는 해설자 <b>도창</b>을 두기도 해요.</p></div>' +
        '{stage:changgeuk}' +
        '<div class="flips three">' +
          '{flip:배우|배역을 나누어 연기|여러 소리꾼이 저마다 한 인물을 맡아 노래하고 연기해요.}' +
          '{flip:도창|해설|줄거리가 잘 이어지도록 해설을 맡아요. 늘 있는 것은 아니고, 두기도 해요.}' +
          '{flip:반주|국악 관현악|여러 국악기가 함께 반주해요.}' +
        '</div>' +
        '<table class="cmp"><caption>한눈에 비교</caption><thead><tr><th></th><th>판소리</th><th>창극</th></tr></thead><tbody>' +
          '<tr><th>부르는 사람</th><td>소리꾼 한 명이 여러 인물을</td><td>여러 소리꾼이 배역을 나누어</td></tr>' +
          '<tr><th>반주</th><td>고수의 북</td><td>국악 관현악</td></tr>' +
          '<tr><th>무대</th><td>돗자리와 부채</td><td>무대 배경·의상·분장·연기</td></tr>' +
          '<tr><th>해설</th><td>소리꾼이 아니리로</td><td>도창을 두기도 해요</td></tr>' +
        '</tbody></table>' +
        '<p class="talk">💬 <b>생각해 봐요</b> 판소리에는 왜 도창이 따로 없을까요? 판소리에서 이야기를 말로 풀어 주던 것은 무엇이었나요?</p>' +
        '<details class="more"><summary>더 보기 · 창극 무대 실황</summary>{vid:changgeuk|무대 배경·의상·사람 수를 눈여겨봐요.}</details>',
      qs: [
        { id: 'c4a', label: '4-1 도창의 역할', type: 'radio', prompt: '창극에서 <b>도창</b>이 하는 일은 무엇일까요?', opts: ['북 장단을 쳐요', '줄거리를 풀어 주는 해설을 해요', '추임새로 흥을 돋워요', '관현악을 지휘해요'], ans: '줄거리를 풀어 주는 해설을 해요' }
      ]
    },
    {
      id: 'c5', nav: '오늘의 판소리', title: '오늘의 판소리', time: '8분',
      lead: '판소리는 박물관 속 음악이 아니에요. 지금도 새로운 모습으로 바뀌고 있어요.',
      lesson:
        '<p class="hint">판소리 대목이 요즘 음악가의 손에서 어떻게 달라졌는지 1분쯤씩 들어 봐요. 서도밴드는 앞에서 들은 <b>사랑가</b>, 이날치는 수궁가의 <b>좌우나졸</b>이에요(옛 소리는 2장 \'더 들어보기\'에 있어요).</p>' +
        '<div class="today">' +
          '{now:seodo|춘향가 · 사랑가}' +
          '{now:leenalchi|수궁가 · 좌우나졸}' +
        '</div>' +
        '<p class="talk">💬 <b>이야기해 봐요</b> 옛 판소리와 무엇이 달라졌나요? 그래도 그대로 남아 있는 것은 무엇인가요?</p>' +
        '<details class="more"><summary>더 들어보기 · 다른 팀들</summary><div class="today">' +
          '{now:toris|흥보가 · 박 타는 소리}' +
          '{now:jeonju|심청가 · 인당수}' +
          '{now:scape|적벽가 · 조자룡 활 쏘는 대목}' +
        '</div></details>',
      qs: [
        { id: 'c5a', label: '5-1 같은 점·달라진 점과 그 의미(서술)', type: 'text', prompt: '두 팀 가운데 하나를 골라, 옛 판소리와 <b>같은 점과 달라진 점</b>을 하나씩 쓰고, 이렇게 새로운 모습으로 이어지는 것에 <b>어떤 뜻이 있는지</b> 내 생각을 써 봐요.', ph: '예) 서도밴드는 …은 그대로인데 …이 달라졌어요. 이렇게 바뀌면 …' }
      ]
    }
  ];

  window.PANSORI = { V: V, CHAPTERS: CHAPTERS };
})();

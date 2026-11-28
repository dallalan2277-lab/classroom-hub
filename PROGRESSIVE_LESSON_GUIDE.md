# 수업 화면·학습지 기술 규격서 (PROGRESSIVE_LESSON_GUIDE)

> **역할**: 이 문서는 코드를 짜거나 위젯·그림을 구현할 때 필요한 절만 펼쳐 보는 **기술 규격서('어떻게 구현하나')**다.
> 수업 설계 원칙·단원별 레시피·학생 길 찾기 10원칙('무엇·왜')은 [.claude/skills/lesson-page-plus/SKILL.md](.claude/skills/lesson-page-plus/SKILL.md)를 먼저 읽고 따른다. 실제 시행착오 사건 경위와 미개척 단원 아이디어는 [LESSON_CASES.md](LESSON_CASES.md)에, 저장소 전체 설정은 [CLAUDE.md](CLAUDE.md)에 있다.

---

## 1. 공용 뼈대와 학생 길 찾기 기술 규격 (`kpop-history-plus/` T040 반영판 기준)

### ① 기준 구현과 스크립트 로드 순서
- 공용 UI·반응형·길 찾기 코드의 **기준 구현은 `kpop-history-plus/`(`index.html`, `style.css`, `app.js`)**다. 장·위젯 구성(`content.js`)만 단원 유형에 맞는 참고 폴더를 따른다.
- 로그인(학년·반·번호 덮개 창 `.cr-veil`), 자리 비움 감지, 시트 제출은 공용 `../classroom.js`에 맡기며, **`classroom.js`는 반드시 `content.js`·`app.js`보다 먼저 불러온다**(교사 모드 `?교사`/`?teacher`에서 `localStorage` 키에 `teacher:`를 붙이고 이탈 감지·전송을 끄기 때문).

### ② 목차(`#side`)·접기(`#btnCollapse`)·장 번호 배지·한 줄 길잡이
- **왼쪽 목차(`#side`)**: 1차시 단일 묶음 또는 `split: true`를 경계로 `1차시`·`2차시`·`3차시` 묶음을 나누고, 학습지가 있는 장 아래에 `학습지 n/m` 바로가기(`#장id?sheet`)를 둔다.
- **데스크톱 목차 접기**: `.side-head`에 `접기` 버튼(`#btnCollapse`)을 두고 접은 상태를 `localStorage`(`<ws>-side`)에 저장한다. 접으면 왼쪽 위 `목차` 버튼(`#burger`)으로 다시 연다.
- **장 번호 배지 동기화**: 장 머리 `h1` 앞(`3장` 배지), 왼쪽 위 목차 버튼(`#burger` `3장 · 목차`), 아래 바 `#prev`·`#next` 장 이름 앞(`n장`), 수업 모드 상단에 장 번호를 큼직하게 표시한다.
- **장 머리 한 줄 길잡이**: `h1` 아래(또는 `#headChip` `이 장 학습지 n/m ↓` 자리)에 학습지가 있는 장은 `이 장: 위에서 보고 듣기 → 아래 학습지 N문항`을, 학습지가 없는 정리 장(`qs: []`)은 `이 장은 학습지 없이 [위젯 이름]만 해요`를 표시한다. 첫 진입용 별도 안내 팝업은 띄우지 않는다.

### ③ 아래 고정 바(`.pager`)와 '지금 할 일' 버튼(`#pgDo`) 상태 전환
- `.pager` 가운데에 `#pgDo` 버튼(아래 얇은 진행 막대 `#pgBar`)을 두고 `IntersectionObserver`로 `#sheet`의 화면 진입 여부를 감지한다. 장 이동·답안 입력·스크롤 때마다 아래 4가지 상태를 계산한다(520px 이하에서는 `학습지 0/3 ↓`처럼 문구를 줄여 넘치지 않게 한다):
  1. **이 장 학습지가 남았고 `#sheet`가 화면에 아직 안 보일 때**: `#pgDo`는 **`↓ 이 장 학습지 n/N`**이며 **화면에서 유일한 꽉 찬 강조색(`--accbtn`) 버튼**이다. 오른쪽 `#next`는 테두리 보조 모양으로 둔다. `#pgDo`를 누르면 `#장id?sheet`로 스크롤한다(수업 모드면 `setSheet(true)` 먼저).
  2. **`#sheet`가 화면에 보이는데 덜 풀었을 때**: `#pgDo`는 `학습지 n/N`(보조 모양)이며, 누르면 첫 미응답 문항으로 스크롤·포커스한다.
  3. **이 장을 다 풀었거나 학습지가 없는 장(`qs: []`)**: `#pgDo`는 조용한 완료 표시(`학습지 N/N 완료` 또는 학습지 없는 장은 숨김)로 낮추고, **오른쪽 `#next`에 `.is-ready`를 붙여 꽉 찬 강조색을 켠다.**
  4. **차시 마지막 장**(다음 페이지가 `split: true` 새 차시이거나 `submit`)에서 다 풀었거나 학습지가 없을 때: `#pgDo`가 **`N차시 제출하기 →`**(꽉 찬 강조색, `#submit?s=N`)가 되고 `#next`는 테두리 보조 버튼으로 둔다.

### ④ 넘어가기 전 인라인 확인 띠
- 이 장 학습지에 안 푼 문항이 남은 채 아래 바 `#next`를 누르면 막지 않고 `.pager` 바로 위에 작은 인라인 띠를 띄운다: `이 장 학습지 N문항이 남았어요` + **`[학습지로 ↓]`(꽉 찬 색)** + **`[그냥 넘어가기 →]`(테두리)**.
- 브라우저 `window.confirm`은 쓰지 않는다. 띠는 바깥 클릭이나 `Esc`로 닫히며, **수업 모드(`body.class-mode`)와 교사 모드(`?teacher`/`?교사`)에서는 묻지 않고 바로 넘어간다.**

### ⑤ 차시별 제출 입구와 `#submit?s=N` 범위 채점
- 각 차시 마지막 장의 본문/학습지 끝(`.lesson-end` 또는 `.sheet-end`)에 **`[N차시 제출하기 →]`**(꽉 찬 색, `#submit?s=N`)와 `[다음 차시 · ○○ →]`(테두리)를 나란히 둔다(마지막 차시 끝 장은 제출 버튼만 둔다).
- `#submit?s=N`(쿼리가 없으면 답이 하나라도 있는 가장 높은 차시, 하나도 없으면 `1`) 화면:
  - 장 목록을 차시별로 묶어 보여 주고, `N`차시 뒤(아직 안 배운 차시)는 '다음 차시'로 흐리게 표시한다.
  - 미응답 확인(인라인 경고 문구 + `그래도 제출하기` 버튼, `window.confirm` 금지)과 제출 버튼(`N차시까지 제출하기` / `다시 제출하기`), 전송할 `score`·`total`·`wrong`은 **1~N차시 채점 문항만** 기준으로 계산한다.
  - `Classroom.submit`의 `answers`에는 전체 답안과 함께 **`'제출 차시': 'N차시까지'`**, **`'차시별 점수': '1차시 5/7 · 2차시 6/8'`**(범위 안 차시만) 두 칸을 더하고, `state.done`에 범위 `s`도 함께 저장한다(예전 `done`에 `s`가 없으면 마지막 차시까지로 간주).
  - 제출한 답과 지금 답을 견주는 서명은 **1~s차시 문항만**으로 만든다(`answerSignature(s)`). 그래야 다음 차시를 풀어도 앞 차시 채점 표시(✓·✗)가 남고 '제출 뒤 답을 바꿨어요' 경고가 잘못 뜨지 않는다. `s`가 없는 예전 기록은 예전 방식(모든 기록)으로 견준다. 채점 표시는 s차시까지 장에만 보인다.

### ⑥ 흰 학습지 판(`.sheet`)·탭·수업 모드(`#btnClass`)·모바일 규격
- **흰 학습지 판**: 밝은 테마에서도 본문 카드(`--bg2`)와 확 구분되도록 `.sheet` 바탕은 **순백색(`--paper: #fff` 또는 밝은 한지) + 맨 위 굵은 머리띠(`이 장 학습지 · N문항`, 강조색 옅은 바탕·큰 글씨)**로 두르고 안쪽 문항 상자(`.q`) 테두리를 맞춘다. **화면이 좁아지지 않게 학습지 머리띠에 `position: sticky`는 쓰지 않는다.** `1024px` 이상 넓은 화면에서도 학습지 카드는 **최대 2열**을 유지한다.
- **탭 패널**: 탭은 **한 줄 유지 + 가로 스크롤**로 처리하고, 각 탭 패널 끝에 다음 탭 이름을 쓴 버튼(`○○ 보기 →`, '다음'이라는 말은 장 넘김에만), 마지막 패널 끝에 `학습지로 ↓`를 둔다.
- **수업 모드 (`#btnClass`)**: 명칭은 **`수업 모드 켜기` / `수업 모드 끄기`**로 통일한다. 켜면 전체 화면, 큰 글씨(`24px` 이상), 목차·학생 이름 칩·채점 결과·교사 메모·학습지를 숨긴다. 본문 끝 `.bridge`는 칠판용 큰 안내판(**`태블릿 아래 '이 장 학습지' N문항을 풀어요`**, 글씨 1.3배 이상)과 선생님용 **`칠판에 학습지 펼치기` 토글(`#btnSheet`, `body.class-sheet`)**로 키운다. 수업 모드를 끄면 `body.class-sheet`도 자동 초기화한다.
- **모바일(`<=820px` & `<=520px`)**:
  - 상단 고정 띠(56px)에 맞춰 `scroll-padding-top: 64px~66px`을 주고, 목차가 열리면(`body.side-open`) `#burger`를 숨겨 제목 겹침을 막는다.
  - 모든 버튼·칩·선택지는 터치하기 쉽게 **높이 40px 이상**으로 만들고, 안내 순서와 화면 순서를 CSS `order`로 뒤바꾸지 않는다.
  - `520px` 이하에서는 상단 QR 버튼의 텍스트 라벨(`.qd-label`)을 숨겨 **QR 아이콘 + `+` 컴팩트 버튼**으로 축약하고, 하단 `.pager`(64~76px)가 본문 끝을 가리지 않게 `#view { padding-bottom: 72px; }`를 확보한다.
  - 핀이 밀집된 지도·줄자 보드는 `.map-board { overflow-x: auto; }` + `.map-stage { min-width: 600px; }` 내부 가로 스크롤 컨테이너로 감싸고 안내 문구(`.map-scroll-hint`)를 띄운다.

### ⑦ 테마 예시 팔레트
단원 분위기에 맞는 **밝은 파스텔 바탕(기본 권장)** 또는 **따뜻한 어두운 무대(공연·판소리 등 선택)**를 쓰고 **강조색은 하나**, 이모지는 쓰지 않는다.
- **청록 여행 (`world-music`)**: 바탕 `#f3f8f8` / `#e6f1f1` / `#d6e8e7`, 강조 `#138a80` / `#0c6b63`, 라이트 `qr-dock`
- **자두 극장 (`stage-plus`)**: 바탕 `#f7f4f9` / `#eee7f3` / `#e1d6ea`, 강조 `#a2386b` / `#7d2650`, 라이트 `qr-dock`
- **축제 크림 (`music-festival`)**: 바탕 `#fbf7ef` / `#f3eadb` / `#e7dbc6`, 강조 `#c85a28` / `#9e4318`, 라이트 `qr-dock`
- **먹색 무대 (`pansori-plus`)**: 바탕 `#14110e` / `#1c1814` / `#26201a`, 강조 `#e8693f` / `#ff855c`, 한지 `#f4efe5`

---

## 2. 위젯 카탈로그 표와 최소 구현 규격

### ① 위젯 카탈로그 (`[수업 확인]` vs `[검증 대기]`)

| 위젯 (`content.js` 키) | 언제 쓰나 | 쓰지 않을 때 | 참고 폴더 | 상태 |
|---|---|---|---|---|
| **영상·소리 카드 & `q.listen`** | 일반·비교·블라인드 감상 및 글자 힌트 0% 10~15초 소리 직결 채점 | 동시 재생 소음이 나는 태블릿 개별 노래·악기 연습 | `world-music`, `gugak-class` | `[수업 확인]` |
| **`CAPSULE`** (`{capsule}`/`{capsuleRecall}`) | 차시 첫 화면 가설·생각 저장 후 끝 장에서 회수(`alsoRecall: 'q1'` 지원) | 짧은 실기·이론 단원의 장문 서술 | `world-music`, `kpop-history-plus` | `[수업 확인]` |
| **`WARMUP` / `GUESS`** | 듣기·영상 보기 전 재료·분위기·배경 짐작(`① 듣기 → ② 고르기 → ③ 확인`) | 이미 정답을 아는 단순 암기 확인 | `gugak-class`, `pansori-plus`, `kpop-history-plus` | `[수업 확인]` |
| **`CUES`** (`{cue:키}`) | 40초+ 핵심 칠판 영상의 **정답·근거 확인이 되는 능동 미션**(`detective` 소리 탐정 O/X 검증, `counter` 반복 신호 `+1` 귀로 세기 등) | 1초 만에 다 눌러도 되는 모호한 감상 칩, 뚜렷한 반복 신호가 없는 곡의 억지 카운터 | `world-music` | `[수업 확인]` |
| **`BALANCE`** (`{balance:키}`) | 음악적 특징·배경이 녹아든 5:5 중학생 상황극 투표(`a`/`b {label, sub}`) + 짝 설득(`talk`) | 정답이 정해진 교과서 질문, 9:1로 쏠리는 원톱 가수 비교 | `world-music`, `kpop-history-plus` | `[수업 확인]` |
| **`STORIES.acts` & 골라 탐험 탭** | 극·이야기 4컷 장면 카드(`acts`), 학생 자율 탐험 탭(비채점) + 초대장 미리보기 | 줄거리가 없는 일반 감상·이론 단원 | `pansori-plus`, `stage-plus`, `music-festival` | `[수업 확인]` |
| **`MAPGAME` / `INTRO_QUIZ`** | 차시 마무리 핀 찾기+10초 소리 매칭(`inspectIdx` 다시 듣기 도감), 칠판 호명 대표곡 퀴즈 | 지리·분류와 무관한 단원의 억지 지도 매칭 | `world-music`, `kpop-history-plus` | `[수업 확인]` |
| **`q.vocab`** (`insertVocab`) | 모든 서술형(`type: 'text'`) 위 음악·감각·실기 어휘 디딤돌 칩(기본 4~6개) | 단답·객관식 문항 | 전 폴더 공용 | `[수업 확인]` |
| **`JUKEBOX`** (시대별 재생 기계) | 시대별 재생 기계 일러스트(`machine-*.webp`) + 45초 대표곡 감상 + 카세트 B면 투표 | 시대 매체 변화와 무관한 일반 감상 단원 | `kpop-history-plus` | `[검증 대기]` |
| **`BOARD`** (단계 띠·멈춤 정리판) | 단계 띠(`지금/열림/맞힘/잠김`) + `'곡 N 듣기 →'` 수동 멈춤 버튼 + 오답 힌트 줄자 정리 | 학생 각자 다른 순서로 푸는 자유 탐색 활동 | `kpop-history-plus` | `[검증 대기]` |
| **`note` · `pairs` · `ctx`** | 문항 연동 '내 정리 노트'(`.note-slot`), 두 소리 견주기 짝 카드(`pairs`), 서술형 위 내 선택 요약(`ctx`) | 문항 수가 적은 실기·창작 단원 | `kpop-history-plus` | `[검증 대기]` |
| **긴 방송 영상 + 짐작 1·대비 채점 1** | 3분 안팎 방송·다큐 클립(민감 자막 절단) + 보기 전 비채점 짐작 1 + 핵심 대비 채점 1 | 45분 시간 예산이 이미 꽉 찬 차시 | `kpop-history-plus` (6장 홍대) | `[검증 대기]` |

### ② 위젯 필수 구현 규칙
- **`content.js` 필드(이미 쓰는 위젯)**:
  - `CAPSULE`: `id`, `eyebrow`, `question`, `prompt`, `opts`, `recallTitle`, `recallPrompt`, 끝 장 회수에서 앞 차시 선택값도 보여 주는 `alsoRecall: 'q1'`.
  - `CUES`: `type: 'detective'`(보기 `items`마다 `ok: true/false`, `[단서 검증하기]` `data-cue-check`) / `type: 'counter'`(`btnLabel`, `unit`, `compare`, `+1` `data-cue-tap`·`-1` `data-cue-minus`·`초기화` `data-cue-reset`·`기록 확정` `data-cue-lock`).
  - `BALANCE`: 상황극 `prompt` + 선택지 `a`·`b`(`{label, sub}`) + 짝 설득 `talk`.
  - `MAPGAME`: 차시 끝 종합 복습(`p1`·`final` 등), `pins`·`rounds`(`pin`·`clue`·`listen`·`opts`·`answer`·`tag`), 진행은 맞힌 round 번호 배열로 저장, 다 맞히면 핀을 눌러 다시 듣는 도감(`inspectIdx`).
- **재생 끊김 막는 부분 갱신(`refreshCue`)**: `CUES`에서 칩 클릭·`[단서 검증하기]`(`data-cue-check`)·카운터(`data-cue-tap`/`minus`/`reset`/`lock`) 조작 시 전체 `route()`를 다시 호출하지 말고 **`refreshCue(key)`로 `[data-cue="키"]` 내부 DOM만 갱신**해 위쪽 재생 중인 유튜브 iframe이 절대 끊기지 않게 한다.
- **다단계 위젯 동선(`MAPGAME`·`BOARD`·`GUESS`)**: 맨 위에 `① 듣기 → ② 고르기/누르기 → ③ 확인` 단계 띠 하나(`.flow-steps`)를 두고 지금 단계만 강조하며 번호는 선생님이 부르는 번호와 맞춘다. **핀이나 칩을 누른 결과와 다음 단계 선택지는 누른 자리 바로 옆에 띄우거나 즉시 그쪽으로 스크롤**해 화면 밖에 생기지 않게 한다. 위젯 안 이동 버튼은 `다음` 대신 `다음 곡`·`다음 소리`·`다음 미션`처럼 대상을 쓴다.
- **서술형 어휘 디딤돌(`q.vocab`)과 정리 노트(`note`)**:
  - `<textarea>` 위 `.vocab-bar` 앞에 `눌러서 글상자에 넣기:` 라벨을 두고, `.vocab-chip`(앞에 `+`)을 누르면 현재 커서 위치(`selectionStart`)에 공백을 맞춰 어휘를 삽입하고 즉시 `storeAnswer(ta)`로 저장한다. 이미 들어간 어휘 칩은 객관식 `✓`와 헷갈리지 않게 옅은 `.is-used`('넣음')로 표시한다.
  - `note`(`.note-slot`)는 제목 아래 `아래 문항을 풀면 빈칸이 채워져요 · 칸을 누르면 그 문항으로 가요`를 적고, 빈칸이 직접 타자 치는 입력창처럼 보이지 않게 점선 상자 대신 옅은 밑줄 모양을 쓴다.

---

## 3. 오디오·유튜브 플레이어 규격

- **`content.js` 헬퍼**:
  ```js
  function clip(id, title, start, seconds, by, mode, extra) {
    return Object.assign({ id: id, title: title, by: by, start: start, end: start + seconds, mode: mode || 'board' }, extra || {});
  }
  function listenAgain(source, title, seconds, extra) {
    return Object.assign({}, source, { title: title, by: '', end: source.start + seconds, blind: false, audioOnly: false }, extra || {});
  }
  function quizClip(source, title, seconds) {
    return listenAgain(source, title, seconds, { mode: 'board', audioOnly: true });
  }
  ```
- **일반·비교 탐구 영상(`!v.audioOnly && !v.blind`)**: `vidHTML`에서 처음부터 `<img class="vid-thumb" src="https://i.ytimg.com/vi/<ID>/hqdefault.jpg">` (`object-fit: cover`)와 `.has-thumb`(중앙 재생 버튼 + 좌측 하단 라벨 배지)를 렌더링한다. 비교 탐구는 영상을 가리지 말고 `title: '악기 1'`, `by: ''`처럼 중립 라벨만 쓰며, 정체와 설명은 카드 밖 별도 공개 공간(`#showIdentities`)에 둔다(카드 글자를 덮어쓰지 않음).
- **순수 블라인드(`blind: true`)와 자유 음원(`<audio>`, `playAudioClip`)**:
  - 공개 전에는 썸네일 없는 가림 카드로 둔다. `audioSrc`(Wikimedia Commons `upload.wikimedia.org` 자유 이용 음원 CC0·PD·CC BY·CC BY-SA), `audioStart`(초, 노래·말소리가 섞이지 않은 구간), `credit`을 넣으면 `new Audio()`로 재생한다(저장소에 음원 파일 업로드 금지; `.ogg`·`.wav`는 Commons `/transcoded/...mp3` 변환본 사용 가능).
  - `audioStart`로 이동(`seek`)이 끝날 때까지 **음소거**해 첫머리 소리가 새지 않게 하고, 자유 음원은 광고가 없으므로 `timeupdate`에서 15초 뒤 멈추는 것은 허용한다. 한 번에 하나만 재생(`currentAudio`)하며 `.playing` 버튼을 다시 누르면 멈춘다. 불러오기 실패(`error`) 시 같은 카드의 보이는 유튜브로 대신 튼다.
  - `#btnReveal` 정체 공개 시 일반 블라인드 카드(`.vid[data-blind="1"]`)에는 `.vid-thumb`(`.has-thumb`)를 동적 삽입해 영상 재생으로 전환하고, `audioSrc` 카드는 썸네일을 끼우지 않고 출처 줄(`.vid-credit`)만 공개한다.
- **유튜브 재생(`openYouTubePlayer`)과 광고 유무별 분기**:
  - 모든 유튜브는 **카드 안에 보이는 플레이어**(iframe `min-height: 200px`, 컨트롤 있음)로 열고 구간 끝은 URL `&start=`·`&end=`에 맡긴다. **1×1px 숨김 iframe(`.audio-only-frame`)과 고정 정지 타이머(`setTimeout` / `audioTimer`)는 절대 쓰지 않는다.**
  - **광고 없는 공공·비수익 유튜브**(국립국악원 등): `320×240` 중앙 클리핑 + 불투명 클릭 통과 덮개(`.vid-masked`/`.audio-stage`, `gugak-exam` 방식)나 자유 음원 `<audio>`로 블라인드 청음을 쓸 수 있다.
  - **광고가 붙는 상업·방송사 유튜브**(K-POP MV, 수익창출 채널): 가림막을 씌우면 광고 스킵이 막히고 열면 제목이 노출되므로 ① 정리판(`BOARD`)은 `곡명 + 핵심 단서 카드` 매칭이나 칠판 호명 후 일반 감상 제공, ② 대표곡 퀴즈(`INTRO_QUIZ`)·청음 회상(`recap`)은 학생 화면에서 유튜브를 빼고 **`1번 곡 ~ N번 곡` 번호표 + `칠판 · 다 같이` 안내 카드**만 두며 재생 버튼과 유튜브 링크는 **`?teacher` 교사 모드 전용**으로 분리한다.

---

## 4. 화면 피드백 & 4단 모양 CSS 규격

1. **누르는 것과 아닌 것의 4단 모양 분리(`style.css`에 주석으로 명시)**:
   - **① 표시**(`.play-mode` `칠판 · 다 같이`, `.flow-steps` 단계 띠, 시간·차시 라벨): 알약 테두리·배경 상자 없이 작은 글자 라벨로 두어 버튼처럼 보이지 않게 한다.
   - **② 고르는 칩**(`.chip`, 학습지 보기): 미선택은 흰 바탕 + 진한 테두리(`--chip-line`), 키보드 초점은 점선 테두리(`:focus-visible`), **고른 칩은 강조색을 꽉 채우고(`--accbtn`) 흰 글자 + 앞에 `✓`(`::before`)**를 붙인다. 짐작·타임캡슐·소리 탐정·밸런스·지도·학습지 보기에 통일 적용하되, 정답(초록)·오답(빨강)·교사 정답 보기(`#7a5600`) 색과 겹치지 않게 한다.
   - **③ 탭**(`.juke-tab` 등 `role="tab"`): 알약 칩 대신 **하단 밑줄 탭 바** 모양을 써서 위쪽 투표·선택 칩과 확실히 구분한다.
   - **④ 누르는 버튼**(`#btnReveal` 공개, `[data-cue-check]` 단서 검증하기, `#pgDo`, `#next`, 제출 등): 둥근 사각형 + 동사·화살표. **누를 차례가 됐을 때만 `.is-ready`로 꽉 찬 강조색(`--accbtn`)**을 켠다. 짐작·단서 카드는 칩과 확정 버튼을 한 카드(`.guess-reveal-card`) 안에 묶고, 학생은 칩을 고르기 전까지 공개·검증 버튼이 꺼져 있으며(`syncRevealUI`, 안내 `#revealHint`) 고르면 `.is-ready`로 켜진다(교사 모드는 언제나 누를 수 있음).
2. **본문 핵심어 3단계 인라인 강조와 세로 카드 선택지**:
   - 핵심 개념·전환점은 `<mark class="kw">`(은은한 밑줄 형광펜 + 굵게), 대표 곡명·작품명은 `<span class="song">`(포인트 색 + 굵게 + `〈 〉`), 음악 용어·장르는 `<span class="term">`(점선 밑줄)을 쓴다(문단당 2~4개 이내).
   - 선택지가 1~2줄 문장형이면 알약 가로 나열 대신 **세로 카드형(`.opts` `display: grid`)**으로 배치한다.
   - 본문·학습지(`.sheet`, `.q`, `.opts`, `.vocab-bar`, `.sheet-end`, `.bridge`)와 주제 전환(`.terms + .vid`)에 넉넉한 여백·구분선을 두고, 저장 상태(`.cap-status`)는 선택 전에는 숨긴다.

---

## 5. 그림 규격과 `art.py`

| 쓰임 | 비율·크기 | 최대 용량 | 비고 |
|---|---|---|---|
| **장면 그림 (작품·이야기 카드)** | 4:3 · `1200×900` | 250KB 이하 | 탭·카드 위 (`art-four-three`) |
| **무대·배치·지도·기계 그림** | 16:9 등 · `1600×900` | 250KB 이하 | 장 첫머리·정체 공개 박스·주크박스 바탕 |
| **장 머리 배경 (`head-<장id>.webp`)** | 8:3 · `1600×600` | 150KB 이하 | **선택 사항** · 오른쪽 1/3만 그림, 왼쪽은 제목 자리 |

1. **형식·화풍·출처**: `.webp`(품질 80 근처, 용량 초과 시 5씩 낮춤)로 저장하고 용도가 드러나는 이름(`madang-*`, `stage-*`, `world-*`, `machine-*`, `head-<장id>`)을 쓴다. **`.png` 원본은 저장소에 커밋하지 않고 저장소 밖에 백업한다.** 한 사람이 그린 것 같은 따뜻한 평면 일러스트(3D·네온·사진풍 합성 금지)로 통일하고, 그림 안에 글자(한글·한자·영문)·실존 인물 얼굴·로고·피/잔혹 묘사를 넣지 않는다. 이미지 생성 도구 또는 PD·CC0·CC BY·CC BY-SA만 허용하며(교과서 그림·사진 절대 금지), `img/CREDITS.md`에 `파일 | 생성/출처 | 라이선스`를 한 줄씩 기록한다.
2. **바탕 그림(`<img>`) 위 HTML 핀·눈금 배치**: 지도·무대·악기·기계 등 바탕 그림은 모두 생성 이미지 `<img>`로 넣고, 그 위에 `%` 좌표로 HTML 핀·칸·눈금·글자를 얹는 컨테이너는 **고정 비율(`aspect-ratio`)과 `object-fit: contain`(또는 비율 일치)**을 유지해 화면 크기가 바뀌어도 핀 좌표가 어긋나지 않게 한다.
3. **`art.py` 사용법 (Pillow 필요)** 및 빈 틀 방지:
   ```bash
   python .claude/skills/lesson-page-plus/scripts/art.py webp <img폴더> <저장소 밖 백업폴더>
   python .claude/skills/lesson-page-plus/scripts/art.py head <img폴더> <원본.webp> <장id> <x0> <y0> <x1> <y1>
   ```
   - 장 머리를 넣을 때는 새로 그리지 말고 기존 장면 그림에서 장마다 다른 부분을 잘라 왼쪽 페이드(어두운 테마 `#14110e` 밝기 `0.5`/채도 `0.8`, 밝은 테마 `--bg`/`--bg2`)로 합성한다.
   - `width`·`height`·`aspect-ratio`와 그림마다 다른 한 문장 `alt`를 지정한다. `.scene-art`는 초기 `hidden`으로 두고 `img.art-img`의 `load` 이벤트 시 펼치며(`error` 시 숨김), 장 머리(`.ch-head.art`)는 `syncHeadArt()`에서 `new Image()` 프리로드 성공 및 `#showIdentities` 공개 조건을 확인한 뒤 `.has-art`를 붙인다.

---

## 6. 필수 Edge Case 7종 & 영상·음원 검증 절차

### ① 놓치기 쉬운 필수 동작 (Edge Cases)
1. **현재 해시와 같은 링크 재클릭**: `#장id?sheet`에서 스크롤을 올렸다가 다시 `학습지로 ↓`나 목차의 현재 장을 누르면 브라우저 `hashchange`가 안 뜨므로, 본문(`view`)·목차(`side`) 클릭 핸들러에서 `href === location.hash`이면 `e.preventDefault(); closeSide(); jump();`를 직접 호출한다.
2. **수업 모드 중 학습지 링크 이동**: 수업 모드에서 학습지가 숨겨진 채(`!sheetOn`) `#장id?sheet` 링크나 `#pgDo`를 누르면 `jump()` 안에서 먼저 `setSheet(true)`로 학습지를 펼친 뒤 스크롤한다.
3. **모바일·수업 모드 목차 닫힘**: 수업 모드나 모바일(`mq.matches`)에서 목차는 본문 위에 겹쳐 열리고, 장 이동·어두운 배경 막(`#scrim`) 클릭·`Esc` 키 입력 시 즉시 `closeSide()`로 닫는다.
4. **접기(`<details>`) 닫을 때 영상 정지**: `더 알아보기`(`<details class="more">`)의 `toggle` 이벤트에서 `!d.open`이면 그 안의 영상을 즉시 멈춘다(`stopVideos()`).
5. **키보드 방향키 라디오 이동 보호**: 방향키(`ArrowUp/Down/Left/Right`)로 라디오 보기를 훑을 때는 `pendingRadio`로만 잡고, `Enter`·`Space`·마우스 클릭 또는 문항 포커스 이탈(`focusout`) 시 `storeAnswer()`로 확정한다.
6. **미응답 `#next` 인라인 확인 띠**: 안 푼 문항이 있을 때 아래 바 `#next`를 누르면 `.pager` 위 인라인 띠를 띄우되, 수업 모드(`body.class-mode`)와 교사 모드에서는 묻지 않고 바로 넘어간다.
7. **`#pgDo`·`#next.is-ready` 즉시 재계산**: 답안 선택·장 이동·`#sheet` 스크롤 진입(`IntersectionObserver`) 때마다 `#pgDo` 문구·강조색과 `#next.is-ready`를 즉시 갱신한다.

### ② 영상·음원·로컬 미리보기 검증 절차
- **유튜브 검증**: 모든 영상 ID에 대해 `oembed` 200 OK 및 `playableInEmbed: true`를 확인하고, 3구간 프레임(`https://i.ytimg.com/vi/<ID>/1.jpg`, `2.jpg`, `3.jpg`) 픽셀 변화와 썸네일을 눈으로 확인해 정지 화면·미동 영상을 걸러낸다. 듣기 클립은 `content.js` 투입 즉시 **'앞 1~3초 확인 표(곡·구간·들리는 소리)'**로 대조한다.
- **자유 음원 검증**: `audioSrc` 주소가 **200 OK**로 열리는지, 라이선스가 `credit`과 맞는지 확인하고, `audioStart`부터 15초를 **직접 들어** 노래·말소리·정체 유출 소리가 없는지 확인한다.
- **금지 코드 검색**: `audio-only-frame`(1px 숨김 iframe), `setTimeout(stopVideos`(고정 정지 타이머)가 0건인지 검색한다.
- **로컬 미리보기**: 정적 서버(`python -m http.server 8769`)와 가짜 허브(`python test/mock_hub.py 8768`, 주소에 `?hub=http://localhost:8768/`)를 띄워 확인하며, 미리보기 창 스크롤 위치 확인은 `behavior: 'instant'`를 쓴다.

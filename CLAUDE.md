# 학습지 허브 — 작업 메모 (Claude용)

중학교 1학년 음악 수업용 학습지들이 **구글 시트 하나**(Apps Script 웹 앱 "학습지 허브")로
시작·자리 비움·복귀·제출을 보내는 구조. 선생님용 설치·사용법은 [설치방법.md](설치방법.md),
이 파일은 다른 컴퓨터에서 작업을 이어 갈 때 필요한 결정·절차·주의점.

> 이 저장소는 **공개**다. 현황판 비밀 키, 시트 ID, 학생 정보, 개인 연락처는 절대 커밋하지 않는다.

## 구성

| 경로 | 내용 |
|---|---|
| `classroom.js` | 모든 학습지 공용. 학번·이름 입력, 이탈 감지, 허브 전송, `Classroom.submit` |
| `hub/Code.gs` | 허브 Apps Script 원본(시트 기록·제출·현황, `?dash=키` 현황판, 지우기·되돌리기) |
| `gugak/` | 국악기 학습지 (ws `gugak-instruments`) |
| `dance/` | 세계의 춤 용어 학습지 1차시 (ws `dance-1`, 확인 코드 유지) |
| `stage/` | 음악극 탐험대 학습지 (ws `music-stage`) |
| `teacher/` | 선생님 알림판 (`#k=키`로 열면 기기에 저장, 오래 이탈한 학생 소리·진동·작은 창) |
| `index.html` | 학습지 모음 첫 화면 |
| `test/` | `hub_harness.js`(가짜 시트로 Code.gs 시험), `mock_hub.py`(로컬 가짜 허브) |

- 공개 주소: https://dallalan2277-lab.github.io/classroom-hub/ (GitHub Pages, main 브랜치 루트, `.nojekyll`)
- 학생용: `/gugak/` · `/dance/` · `/stage/`, 선생님: `/teacher/`
- 허브 웹 앱 주소는 `classroom.js`의 `HUB_URL`에 있다(공개되어도 되는 주소).

## 정해 둔 것 (다시 묻지 말 것)

- **로그인 방식: 덮개 창 유지.** 학습지를 열면 화면 가운데 흰 상자에서 학번·이름을 받는다.
  "학습지 안 칸에 쓰고 시작하기" 방식(인라인)은 2026-11-10에 선생님이 고르지 않았다. 선생님이 먼저 꺼낼 때만 다시 검토.
- 이탈은 **막기가 아니라 감지·기록**. 새로고침은 이탈로 안 셈, 학습지 안 영상(iframe) 클릭도 이탈 아님.
- 학생 정보는 저장소가 아니라 선생님 구글 시트에만 저장.
- 국악기 학습지는 20개 악기 전부 시험 범위.

## 고칠 때 절차

### 학습지·classroom.js (GitHub Pages)
1. 로컬 미리보기: 저장소 폴더를 정적 서버로 띄우고(예: `python -m http.server 8769`),
   가짜 허브 `python test/mock_hub.py 8768`을 함께 띄운 뒤 주소에 `?hub=http://localhost:8768/`를 붙인다
   (`?hub=`는 localhost에서만 먹힌다). 시작→입력→이탈→복귀→제출 흐름을 확인.
2. `node test/hub_harness.js` 통과 확인.
3. 커밋·푸시하면 Pages에 반영. **Pages 캐시가 최대 10분**이라 바로 확인할 땐 `?v=숫자`를 붙인다.

### 허브(Apps Script, `hub/Code.gs`)
- 저장소의 `hub/Code.gs`를 고친 뒤, 선생님 구글 계정의 Apps Script 편집기에 **전체를 붙여 넣고 저장**.
- **배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포.** "새 배포"를 하면 주소가 바뀌어 모든 학습지가 끊긴다.
- 권한 승인 화면은 선생님이 직접 누른다.
- 편집기 작업은 선생님 크롬(Claude in Chrome, 로그인됨)에서 한다. 앱 내장 브라우저는 로그인되어 있지 않다.
- 크롬 Apps Script의 함수 선택 드롭다운은 요소(ref) 클릭이 안 먹고 좌표 클릭해야 한다.
- 편집기에서 `getService().getUrl()`은 `/dev`를 주므로 Code.gs는 `/exec`로 바꿔 쓴다.
  `showDashboardLink`가 주는 주소는 선생님(소유자)만 열리지만 동작은 한다.

### 새 학습지 연결
`<script src="../classroom.js" data-ws="영문-이름" data-title="제목"></script>` 한 줄 + 제출 때 `Classroom.submit({...})`.
학습지 자체의 로그인·이탈·전송 코드는 지우고 classroom.js에 맡긴다. `classroom:switch` 이벤트에서 학습지 기록을 지운다.
자세한 API는 `classroom.js` 맨 위 주석.

## 남은 일 · 알려진 한계

- 30명 동시 접속(start) 부하 실측 안 함.
- 교실 PC에서 PPT 슬라이드쇼 위로 알림판 작은 창(문서 PIP)이 뜨는지 확인 안 함.
- 공개 URL이라 기록 위조가 가능하다(선생님께 설명함).
- 예전 춤 전용 시트·Apps Script는 남아 있음(정리 여부는 선생님 결정).
- 학습지 원본 중 일부는 다른 곳(Claude 아티팩트, ChatGPT 호스팅)에도 예전 판이 남아 있다. 수업용 최신본은 이 저장소.

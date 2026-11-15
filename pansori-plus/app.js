/* 판소리와 창극 (개선판) — 화면 렌더링 · 다섯 마당 탐험 · 소리북 Web Audio 합성기 · 학습지 · 제출
 * 데이터는 content.js (window.PANSORI_PLUS).
 */
(function () {
  'use strict';

  var D = window.PANSORI_PLUS;
  var V = D.V;
  var JANGDAN_PRESETS = D.JANGDAN_PRESETS;
  var STORIES = D.STORIES;
  var STORY_ORDER = ['chun', 'heung', 'su', 'sim', 'jeok'];
  var STORY_CMP_COLS = D.STORY_CMP_COLS;
  var STORY_CMP = D.STORY_CMP;
  var STORY_AXES = D.STORY_AXES;
  var CHAPTERS = D.CHAPTERS;
  var QUIZ = D.QUIZ;

  var TEACHER = false;
  try {
    var q = decodeURIComponent(location.search || '');
    var h0 = decodeURIComponent(location.hash || '');
    TEACHER = q.indexOf('교사') !== -1 || q.indexOf('teacher') !== -1 || h0.indexOf('교사') !== -1;
  } catch (e) {}

  var STORE = 'pansori_plus_v1';
  var SHARE_URL = 'https://dallalan2277-lab.github.io/classroom-hub/pansori-plus/';

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { ans: {}, done: {}, fs: 0, vm: 'embed', hideSide: false, cls: false, madang: 'chun', axis: {} };
  }
  var S = loadState();
  if (!S.ans) S.ans = {};
  if (!S.done) S.done = {};
  if (!S.vm) S.vm = 'embed';
  if (!S.madang || !STORIES[S.madang]) S.madang = 'chun';
  if (!S.axis) S.axis = {};

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  /* ---------- 맞춤형 SVG 아트워크 생성기 ---------- */
  function art(id) {
    var svgs = {
      soripan:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gSp" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="#e8b04a" stop-opacity=".35"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#15131f"/>' +
        '<circle cx="140" cy="88" r="82" fill="url(#gSp)"/>' +
        '<ellipse cx="140" cy="158" rx="96" ry="20" fill="#282234" stroke="#e8b04a" stroke-opacity=".45" stroke-width="1.5"/>' +
        '<g class="pulse" stroke="#e8b04a" stroke-opacity=".28" fill="none"><circle cx="140" cy="96" r="54"/><circle cx="140" cy="96" r="74"/></g>' +
        /* 소리꾼 & 부채 */
        '<g class="sway">' +
        '<path d="M98 148 L112 96 L132 148 Z" fill="#e0455b" opacity=".88"/>' +
        '<circle cx="115" cy="82" r="12" fill="#f6f1e9"/>' +
        '<path d="M104 74 Q115 64 126 74" stroke="#100f17" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<path d="M124 102 L156 72 A32 32 0 0 1 164 112 Z" fill="#f4bd3a" stroke="#fff" stroke-width="1.2"/>' +
        '<line x1="124" y1="102" x2="158" y2="82" stroke="#100f17" stroke-width="1"/>' +
        '<line x1="124" y1="102" x2="162" y2="96" stroke="#100f17" stroke-width="1"/>' +
        '</g>' +
        /* 고수 & 소리북 */
        '<g>' +
        '<circle cx="192" cy="106" r="9" fill="#f6f1e9" opacity=".9"/>' +
        '<path d="M178 148 L186 118 L202 118 L208 148 Z" fill="#3fb0c4" opacity=".82"/>' +
        '<ellipse cx="168" cy="136" rx="13" ry="15" fill="#d99b3c" stroke="#f6f1e9" stroke-width="1.5"/>' +
        '<line x1="176" y1="118" x2="162" y2="128" stroke="#f6f1e9" stroke-width="2.5" stroke-linecap="round"/>' +
        '</g>' +
        '<text x="20" y="34" fill="#e8b04a" font-size="11" font-weight="700" opacity=".85">소리 · 아니리 · 발림 · 추임새</text>' +
        '</svg>',

      chun:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gCh" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#e0455b" stop-opacity=".4"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#18121c"/>' +
        '<circle cx="140" cy="86" r="85" fill="url(#gCh)"/>' +
        '<circle cx="218" cy="48" r="22" fill="#f4bd3a" opacity=".25"/>' +
        /* 광한루 처마 실루엣 */
        '<path d="M36 62 Q140 38 244 62 L232 70 Q140 50 48 70 Z" fill="#e0455b" opacity=".55"/>' +
        '<g class="sway">' +
        /* 그네 줄과 두 인물 */
        '<line x1="112" y1="64" x2="102" y2="136" stroke="#f4bd3a" stroke-width="1.6" stroke-dasharray="3 2"/>' +
        '<circle cx="116" cy="98" r="10" fill="#f6f1e9"/>' +
        '<path d="M102 146 L112 110 L128 146 Z" fill="#e0455b"/>' +
        '<circle cx="158" cy="96" r="10" fill="#f6f1e9"/>' +
        '<path d="M144 146 L154 108 L170 146 Z" fill="#3fb0c4"/>' +
        '<path d="M126 112 Q140 94 152 112" stroke="#f4bd3a" stroke-width="2.5" fill="none"/>' +
        '</g>' +
        '<g class="float" fill="#ff9aa8" opacity=".75"><circle cx="72" cy="88" r="4"/><circle cx="204" cy="92" r="3.5"/><circle cx="140" cy="46" r="3"/></g>' +
        '<text x="20" y="182" fill="#ff9aa8" font-size="11" font-weight="700">春香歌 · 사랑가 (중중모리)</text>' +
        '</svg>',

      heung:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gHh" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#f4bd3a" stop-opacity=".42"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#191612"/>' +
        '<circle cx="140" cy="100" r="85" fill="url(#gHh)"/>' +
        /* 커다란 박 두 쪽과 쏟아지는 금은보화·쌀 */
        '<g class="sway">' +
        '<path d="M68 126 A46 44 0 0 1 132 86 L122 142 Z" fill="#f4bd3a" opacity=".85"/>' +
        '<path d="M212 126 A46 44 0 0 0 148 86 L158 142 Z" fill="#f4bd3a" opacity=".85"/>' +
        '</g>' +
        '<g class="float">' +
        '<circle cx="140" cy="72" r="9" fill="#ffd966" stroke="#fff" stroke-width="1.5"/>' +
        '<circle cx="122" cy="56" r="7" fill="#ffd966"/>' +
        '<circle cx="160" cy="58" r="8" fill="#ffd966"/>' +
        '<circle cx="140" cy="44" r="6" fill="#fff"/>' +
        '<circle cx="106" cy="74" r="5" fill="#fff" opacity=".85"/>' +
        '<circle cx="176" cy="76" r="5" fill="#fff" opacity=".85"/>' +
        '</g>' +
        /* 제비 */
        '<path d="M52 54 Q74 42 86 58 Q74 56 64 66 Q58 58 52 54 Z" fill="#86b6ff"/>' +
        '<text x="20" y="182" fill="#f4bd3a" font-size="11" font-weight="700">興甫歌 · 돈과 쌀 대목 (휘모리)</text>' +
        '</svg>',

      su:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gSu" cx="50%" cy="48%" r="60%"><stop offset="0%" stop-color="#3fb0c4" stop-opacity=".42"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#101920"/>' +
        '<circle cx="140" cy="96" r="86" fill="url(#gSu)"/>' +
        /* 바다 물결 */
        '<path d="M16 144 Q58 128 100 144 T184 144 T264 144" stroke="#3fb0c4" stroke-width="3" fill="none" opacity=".7"/>' +
        '<path d="M16 158 Q58 142 100 158 T184 158 T264 158" stroke="#86b6ff" stroke-width="2" fill="none" opacity=".45"/>' +
        /* 자라(별주부)와 토끼 */
        '<g class="float">' +
        '<ellipse cx="142" cy="122" rx="42" ry="20" fill="#2b7a88" stroke="#3fb0c4" stroke-width="2"/>' +
        '<circle cx="192" cy="116" r="9" fill="#3fb0c4"/>' +
        /* 토끼 귀와 몸 */
        '<ellipse cx="132" cy="72" rx="5" ry="16" transform="rotate(-12 132 72)" fill="#f6f1e9"/>' +
        '<ellipse cx="146" cy="72" rx="5" ry="16" transform="rotate(10 146 72)" fill="#f6f1e9"/>' +
        '<circle cx="138" cy="94" r="14" fill="#f6f1e9"/>' +
        '<circle cx="143" cy="91" r="2.2" fill="#e0455b"/>' +
        '</g>' +
        '<text x="20" y="182" fill="#7ce0f2" font-size="11" font-weight="700">水宮歌 · 좌우나졸 (자진모리)</text>' +
        '</svg>',

      sim:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gSm" cx="50%" cy="42%" r="62%"><stop offset="0%" stop-color="#86b6ff" stop-opacity=".4"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#101522"/>' +
        '<circle cx="140" cy="88" r="88" fill="url(#gSm)"/>' +
        '<circle cx="214" cy="46" r="18" fill="#f6f1e9" opacity=".22"/>' +
        /* 인당수 배와 연꽃 */
        '<g class="sway">' +
        '<path d="M74 124 L206 124 L184 146 L96 146 Z" fill="#86b6ff" opacity=".75"/>' +
        '<line x1="140" y1="50" x2="140" y2="124" stroke="#f6f1e9" stroke-width="2.2"/>' +
        '<path d="M140 54 Q182 76 172 114 L140 114 Z" fill="#f6f1e9" opacity=".86"/>' +
        /* 연꽃 봉오리 */
        '<path d="M140 94 Q152 106 140 120 Q128 106 140 94 Z" fill="#ff9aa8"/>' +
        '</g>' +
        '<path d="M14 148 Q76 132 140 148 T266 148" stroke="#86b6ff" stroke-width="2.5" fill="none"/>' +
        '<text x="20" y="182" fill="#a8cbff" font-size="11" font-weight="700">沈淸歌 · 범피중류 (진양조)</text>' +
        '</svg>',

      jeok:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gJk" cx="50%" cy="45%" r="62%"><stop offset="0%" stop-color="#ff6a3d" stop-opacity=".44"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#1d1212"/>' +
        '<circle cx="140" cy="92" r="86" fill="url(#gJk)"/>' +
        /* 적벽의 불길과 활·화살 */
        '<path d="M22 156 L58 102 L94 142 L138 88 L184 140 L226 96 L262 156 Z" fill="#ff6a3d" opacity=".28"/>' +
        '<g class="sway">' +
        '<path d="M98 44 Q168 96 98 148" stroke="#f4bd3a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<line x1="98" y1="44" x2="72" y2="96" stroke="#f6f1e9" stroke-width="1.6"/>' +
        '<line x1="98" y1="148" x2="72" y2="96" stroke="#f6f1e9" stroke-width="1.6"/>' +
        '<line x1="68" y1="96" x2="212" y2="96" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' +
        '<polygon points="218,96 202,89 206,96 202,103" fill="#ff6a3d"/>' +
        '</g>' +
        '<text x="20" y="182" fill="#ff9b7a" font-size="11" font-weight="700">赤壁歌 · 조자룡 활 쏘는 대목 (자진모리)</text>' +
        '</svg>',

      jangdan:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gJd" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#f4bd3a" stop-opacity=".4"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#17141d"/>' +
        '<circle cx="140" cy="96" r="84" fill="url(#gJd)"/>' +
        '<g class="pulse" stroke="#f4bd3a" fill="none" stroke-opacity=".35"><circle cx="140" cy="98" r="56"/><circle cx="140" cy="98" r="74"/></g>' +
        '<ellipse cx="140" cy="98" rx="38" ry="42" fill="#d99b3c" stroke="#f6f1e9" stroke-width="2.5"/>' +
        '<ellipse cx="140" cy="98" rx="26" ry="30" fill="none" stroke="#100f17" stroke-width="1.5" stroke-opacity=".45"/>' +
        '<line x1="176" y1="54" x2="146" y2="92" stroke="#f6f1e9" stroke-width="5" stroke-linecap="round"/>' +
        '<text x="20" y="182" fill="#f4bd3a" font-size="11" font-weight="700">소리북 장단 실험실 · 합(둥) · 궁(쿵) · 채(딱)</text>' +
        '</svg>',

      chang:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gCg" cx="50%" cy="40%" r="62%"><stop offset="0%" stop-color="#c978ff" stop-opacity=".4"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#171222"/>' +
        '<circle cx="140" cy="88" r="88" fill="url(#gCg)"/>' +
        /* 극장 커튼과 조명 */
        '<path d="M18 24 L58 24 L42 146 L18 146 Z" fill="#c978ff" opacity=".42"/>' +
        '<path d="M262 24 L222 24 L238 146 L262 146 Z" fill="#c978ff" opacity=".42"/>' +
        '<g class="sway">' +
        '<circle cx="114" cy="94" r="10" fill="#f6f1e9"/>' +
        '<path d="M98 142 L108 106 L128 142 Z" fill="#e0455b"/>' +
        '<circle cx="166" cy="94" r="10" fill="#f6f1e9"/>' +
        '<path d="M152 142 L162 106 L182 142 Z" fill="#3fb0c4"/>' +
        '</g>' +
        '<rect x="44" y="146" width="192" height="16" rx="4" fill="#261f38" stroke="#c978ff" stroke-opacity=".5"/>' +
        '<text x="20" y="182" fill="#dbb0ff" font-size="11" font-weight="700">唱劇 · 배역 분담 · 도창 · 국악 관현악</text>' +
        '</svg>',

      today:
        '<svg viewBox="0 0 280 200" aria-hidden="true">' +
        '<defs><radialGradient id="gTd" cx="50%" cy="46%" r="62%"><stop offset="0%" stop-color="#3ccf8e" stop-opacity=".4"/><stop offset="100%" stop-color="#100f17" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="280" height="200" fill="#101c19"/>' +
        '<circle cx="140" cy="94" r="86" fill="url(#gTd)"/>' +
        '<g class="pulse" stroke="#3ccf8e" stroke-width="2" fill="none" opacity=".55">' +
        '<path d="M28 102 Q52 62 76 102 T124 102 T172 102 T220 102 T256 102"/>' +
        '</g>' +
        '<g class="sway">' +
        '<path d="M112 126 L164 68 A48 48 0 0 1 182 128 Z" fill="#f4bd3a" opacity=".9"/>' +
        '<circle cx="112" cy="84" r="12" fill="#3ccf8e"/>' +
        '<line x1="112" y1="96" x2="112" y2="148" stroke="#f6f1e9" stroke-width="3"/>' +
        '</g>' +
        '<text x="20" y="182" fill="#7bf0ba" font-size="11" font-weight="700">오늘의 판소리 · 조선팝 · 밴드 · 아카펠라 · 합창</text>' +
        '</svg>'
    };
    return svgs[id] || svgs.soripan;
  }

  /* ---------- 소리북 & 추임새 Web Audio 합성기 ---------- */
  var AE = {
    ctx: null,
    timer: null,
    playingId: null,
    stepIdx: 0,
    bpm: 90,
    onStep: null,

    ensure: function () {
      if (!this.ctx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.ctx = new Ctx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        try { this.ctx.resume(); } catch (e) {}
      }
      return this.ctx;
    },

    hit: function (token, accent) {
      var ctx = this.ensure();
      if (!ctx) return;
      var now = ctx.currentTime;
      var gainScale = accent === 2 ? 1.0 : (accent === 1 ? 0.76 : 0.54);

      if (token === 'hap' || token === 'kung') {
        // 소리북 가죽 통 울림 (둥 / 쿵)
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'triangle';
        var startF = token === 'hap' ? 138 : 112;
        var endF = token === 'hap' ? 48 : 44;
        osc.frequency.setValueAtTime(startF, now);
        osc.frequency.exponentialRampToValueAtTime(endF, now + 0.24);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.55 * gainScale, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        if (token === 'hap') {
          this.woodRim(now, 0.45 * gainScale);
        }
      } else if (token === 'ttak') {
        // 소리북 나무 테 채소리 (딱!)
        this.woodRim(now, 0.65 * gainScale);
      } else if (token === 'Roll') {
        // 더러러 (잔가락 북채 굴리기)
        this.woodRim(now, 0.42);
        this.woodRim(now + 0.055, 0.36);
        this.woodRim(now + 0.11, 0.48);
      } else if (token === 'chu') {
        // 추임새 포인트 화음 알림음
        var o2 = ctx.createOscillator();
        var g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(523.25, now);
        o2.frequency.exponentialRampToValueAtTime(659.25, now + 0.14);
        g2.gain.setValueAtTime(0.18, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.start(now);
        o2.stop(now + 0.24);
      } else if (token === 'soft') {
        var o3 = ctx.createOscillator();
        var g3 = ctx.createGain();
        o3.type = 'sine';
        o3.frequency.setValueAtTime(82, now);
        g3.gain.setValueAtTime(0.08, now);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        o3.connect(g3);
        g3.connect(ctx.destination);
        o3.start(now);
        o3.stop(now + 0.08);
      }
    },

    woodRim: function (t, amp) {
      var ctx = this.ctx;
      if (!ctx) return;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1420, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.045);
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    },

    playChuimsae: function (kind) {
      var ctx = this.ensure();
      if (!ctx) return;
      var now = ctx.currentTime;
      // 북 소리와 함께 추임새 억양을 닮은 밝은 가락 재생
      this.hit('hap', 2);
      var notes = {
        eolssigu: [392, 523.25, 659.25],
        jota: [587.33, 440],
        jalhanda: [440, 523.25, 587.33],
        geureochi: [523.25, 392, 523.25]
      }[kind] || [440, 554.37];
      notes.forEach(function (f, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, now + i * 0.09);
        g.gain.setValueAtTime(0.22, now + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.16);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.09);
        o.stop(now + i * 0.09 + 0.18);
      });
    },

    start: function (preset, bpm, onStep) {
      this.stop();
      this.ensure();
      this.playingId = preset.id;
      this.bpm = bpm || preset.bpm;
      this.stepIdx = 0;
      this.onStep = onStep || null;
      var self = this;

      function tick() {
        if (!self.playingId) return;
        var idx = self.stepIdx % preset.steps.length;
        var st = preset.steps[idx];
        (st.s || []).forEach(function (tok) { self.hit(tok, st.a); });
        if (self.onStep) self.onStep(idx, st);
        self.stepIdx = (idx + 1) % preset.steps.length;
        var ms = Math.max(140, Math.round((60 / self.bpm) * 1000 * 0.55));
        self.timer = setTimeout(tick, ms);
      }
      tick();
    },

    stop: function () {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.playingId = null;
      if (this.onStep) {
        try { this.onStep(-1, null); } catch (e) {}
      }
      this.onStep = null;
    }
  };

  /* ---------- 라우팅 구조 ---------- */
  var PAGES = [
    { id: 'start', grp: '시작', nav: '수업 안내 · 시작', title: '판소리와 창극 · 수업 안내' },
    CHAPTERS[0], // c1
    CHAPTERS[1], // story
    CHAPTERS[2], // c2
    CHAPTERS[3], // c3
    CHAPTERS[4], // c4
    CHAPTERS[5], // c5
    { id: 'quiz', grp: '정리', nav: '마무리 퀴즈', title: '소리·이야기 마무리 퀴즈' },
    { id: 'submit', grp: '제출', nav: '학습지 제출', title: '학습지 확인 및 제출' }
  ];

  var curPage = 'start';

  function applyPrefs() {
    var sizes = [15, 16, 18, 20];
    var idx = Math.max(0, Math.min(sizes.length - 1, (S.fs || 0) + 1));
    document.documentElement.style.setProperty('--fs', sizes[idx] + 'px');
    document.body.classList.toggle('hide-side', !!S.hideSide);

    var vmBtns = document.querySelectorAll('[data-vm]');
    for (var i = 0; i < vmBtns.length; i++) {
      vmBtns[i].setAttribute('aria-pressed', vmBtns[i].getAttribute('data-vm') === S.vm ? 'true' : 'false');
    }
    var clsBtn = document.getElementById('classBtn');
    if (clsBtn) {
      clsBtn.setAttribute('aria-pressed', S.cls ? 'true' : 'false');
      clsBtn.textContent = S.cls ? '교실 모드 켜짐 ✓' : '교실 모드 켜기';
    }
    var hideBtn = document.getElementById('hideSide');
    if (hideBtn) {
      hideBtn.textContent = S.hideSide ? '메뉴 보이기' : '메뉴 숨기기';
    }
  }

  function isChapDone(ch) {
    if (!ch || !ch.qs) return false;
    return ch.qs.every(function (q) {
      var v = S.ans[q.id];
      if (q.type === 'multi') return Array.isArray(v) && v.length > 0;
      return v != null && String(v).trim() !== '';
    });
  }

  function renderNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var html = '';
    html += '<div class="nav-group">시작하기</div>';
    PAGES.forEach(function (p) {
      if (p.id === 'c1') html += '<div class="nav-group">1차시 · 소리판과 다섯 마당</div>';
      if (p.id === 'c3') html += '<div class="nav-group">2차시 · 창극과 오늘의 판소리</div>';
      if (p.id === 'quiz') html += '<div class="nav-group">마무리 · 제출</div>';
      var done = p.qs ? isChapDone(p) : !!S.done[p.id];
      var cur = p.id === curPage ? ' aria-current="page"' : '';
      var cls = done ? ' class="done"' : '';
      var badge = p.grp && p.grp.length <= 2 ? p.grp : '·';
      html += '<a href="#' + p.id + '"' + cur + cls + '>' +
        '<span class="step-dot">' + (done ? '✓' : esc(badge)) + '</span>' +
        '<span>' + esc(p.nav) + '</span>' +
        (p.time ? '<small style="margin-left:auto;color:var(--muted);font-size:.72rem">' + esc(p.time) + '</small>' : '') +
        '</a>';
    });
    nav.innerHTML = html;
  }

  function renderPager() {
    var idx = PAGES.findIndex(function (p) { return p.id === curPage; });
    if (idx < 0) idx = 0;
    var prev = document.getElementById('prev');
    var next = document.getElementById('next');
    var where = document.getElementById('where');
    if (prev) {
      if (idx > 0) {
        prev.disabled = false;
        prev.textContent = '← ' + PAGES[idx - 1].nav;
        prev.onclick = function () { location.hash = '#' + PAGES[idx - 1].id; };
      } else {
        prev.disabled = true;
        prev.textContent = '첫 화면';
        prev.onclick = null;
      }
    }
    if (next) {
      if (idx < PAGES.length - 1) {
        next.disabled = false;
        next.textContent = PAGES[idx + 1].nav + ' →';
        next.onclick = function () { location.hash = '#' + PAGES[idx + 1].id; };
      } else {
        next.disabled = true;
        next.textContent = '마지막 화면';
        next.onclick = null;
      }
    }
    if (where) {
      where.textContent = (idx + 1) + ' / ' + PAGES.length + ' · ' + PAGES[idx].nav;
    }
  }

  /* ---------- 유튜브 영상 카드 (유튜브 창 / 페이지 안 재생 겸용) ---------- */
  function vidBox(v, opts) {
    if (!v) return '';
    opts = opts || {};
    var embed = S.vm === 'embed';
    var url = 'https://www.youtube.com/watch?v=' + v.id;
    var html = '<div class="vid-box" data-vid="' + esc(v.id) + '">';
    if (embed) {
      html += '<div class="vid-frame"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(v.id) + '?rel=0" title="' + esc(v.title) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    } else {
      html += '<div class="vid-frame"><div class="art">' + art(v.art || 'soripan') + '</div>' +
        '<div class="vid-overlay"><a class="play-big" href="' + esc(url) + '" target="_blank" rel="noopener">▶ 유튜브에서 영상 열기</a>' +
        '<button type="button" class="btn sm ghost load-inline" data-vid-inline="' + esc(v.id) + '" data-vid-title="' + esc(v.title) + '">이 화면 안에서 바로 재생</button></div></div>';
    }
    html += '<div class="vid-meta"><div><b>' + esc(v.title) + '</b><span>' + esc(v.by) + (v.q ? ' · ' + esc(v.q) : '') + '</span></div>' +
      '<div class="vid-actions"><a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener">유튜브 새 창 ↗</a></div></div>';
    if (v.note && !opts.hideNote) {
      html += '<div style="padding:0 14px 12px;color:var(--ink2);font-size:.86rem">' + esc(v.note) + '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ---------- 공통 히어로 + 팩트 바 + 서브 내비 ---------- */
  function renderHero(ch, subLinks) {
    var html = '<section class="d-hero" style="--accent:' + esc(ch.color || '#e8b04a') + '">';
    html += '<div>';
    html += '<div class="kicker"><span>CHAPTER ' + esc(ch.grp) + ' · ' + esc(ch.time || '') + '</span><span class="orig">' + esc(ch.orig || '') + '</span></div>';
    html += '<h1>' + esc(ch.title) + '</h1>';
    html += '<p class="tagline">' + esc(ch.tagline) + '</p>';
    html += '</div>';
    html += '<div class="art">' + art(ch.art || 'soripan') + '</div>';
    html += '</section>';

    if (ch.facts && ch.facts.length) {
      html += '<div class="facts">';
      ch.facts.forEach(function (f) {
        html += '<div><small>' + esc(f[0]) + '</small><b>' + esc(f[1]) + '</b></div>';
      });
      html += '</div>';
    }

    if (subLinks && subLinks.length) {
      html += '<nav class="subnav" aria-label="이 단원 바로가기">';
      subLinks.forEach(function (lk) {
        html += '<a href="#' + esc(lk[0]) + '" data-scroll="' + esc(lk[0]) + '">' + esc(lk[1]) + '</a>';
      });
      html += '<button type="button" class="sub-act" data-toggle-all-rv="1">' + (TEACHER ? '모든 답 접기/펼치기' : '모든 답 펼치기') + '</button>';
      html += '</nav>';
    }
    return html;
  }

  function renderHookAndCore(ch) {
    var openAttr = TEACHER ? ' open' : '';
    var html = '<div id="sec-hook" class="ask" style="--accent:' + esc(ch.color || '#e8b04a') + '">' +
      '<b>먼저 생각해 볼까요?</b>' +
      '<p>' + esc(ch.hook) + '</p>' +
      '<details class="rv"' + openAttr + '><summary>생각 열기 예시 답 보기</summary><div class="ans">' + esc(ch.hookAns) + '</div></details>' +
      '</div>';

    if (ch.core) {
      html += '<div class="core3" style="--accent:' + esc(ch.color || '#e8b04a') + '">' +
        '<div><small>소리로 듣기</small><p>' + esc(ch.core.listen) + '</p></div>' +
        '<div><small>무대와 표현</small><p>' + esc(ch.core.move) + '</p></div>' +
        '<div><small>감상 포인트</small><p>' + esc(ch.core.use) + '</p></div>' +
        '</div>';
    }
    return html;
  }

  /* ---------- 학습지 렌더링 (자동 저장 + 즉시 정답 확인 가능) ---------- */
  function renderSheet(ch) {
    if (!ch || !ch.qs || !ch.qs.length) return '';
    var doneCount = ch.qs.filter(function (q) {
      var v = S.ans[q.id];
      return q.type === 'multi' ? (Array.isArray(v) && v.length > 0) : (v != null && String(v).trim() !== '');
    }).length;

    var html = '<section id="sec-sheet" class="sheet" style="--accent:' + esc(ch.color || '#e8b04a') + '">';
    html += '<div class="sheet-head"><div><span class="pill" style="margin-bottom:6px">' + esc(ch.grp) + '장 학습지</span>' +
      '<h2>' + esc(ch.title) + ' · 확인 학습지</h2></div>' +
      '<span class="pill">' + doneCount + ' / ' + ch.qs.length + ' 작성 완료 · 자동 저장</span></div>';

    ch.qs.forEach(function (q) {
      var val = S.ans[q.id];
      html += '<div class="q-item" data-qid="' + esc(q.id) + '">';
      if (q.group) {
        html += '<div style="font-size:.76rem;color:var(--gold);font-weight:700;margin-bottom:4px">' + esc(q.group) + '</div>';
      }
      html += '<div class="q-label"><span>' + esc(q.label) + '</span>' +
        (q.type === 'text' ? '<small>서술형 · 자유롭게 작성</small>' : '<small>선택형 · 자동 채점</small>') + '</div>';
      html += '<div class="q-prompt">' + q.prompt + '</div>';

      if (q.type === 'radio' || q.type === 'pick') {
        html += '<div class="q-opts">';
        q.opts.forEach(function (opt) {
          var sel = val === opt ? ' sel' : '';
          html += '<button type="button" class="q-opt' + sel + '" data-q-radio="' + esc(q.id) + '" data-val="' + esc(opt) + '">' + esc(opt) + '</button>';
        });
        html += '</div>';
      } else if (q.type === 'multi') {
        var arr = Array.isArray(val) ? val : [];
        html += '<div class="q-opts">';
        q.opts.forEach(function (opt) {
          var sel = arr.indexOf(opt) !== -1 ? ' sel' : '';
          html += '<button type="button" class="q-opt' + sel + '" data-q-multi="' + esc(q.id) + '" data-val="' + esc(opt) + '">' + esc(opt) + '</button>';
        });
        html += '</div>';
      } else if (q.type === 'text') {
        html += '<textarea rows="3" data-q-text="' + esc(q.id) + '" placeholder="' + esc(q.ph || '내 생각을 한두 문장으로 적어 보세요.') + '">' + esc(val || '') + '</textarea>';
      }

      if (q.ans && TEACHER) {
        var ansStr = Array.isArray(q.ans) ? q.ans.join(', ') : q.ans;
        html += '<details class="rv" open style="margin-top:10px"><summary>교사용 정답 · 해설</summary><div class="ans"><b>정답: ' + esc(ansStr) + '</b>' + (q.exp ? '<br>' + esc(q.exp) : '') + '</div></details>';
      } else if (q.ans && val != null && String(val) !== '') {
        var isOk = false;
        if (q.type === 'multi' && Array.isArray(val)) {
          isOk = val.length === q.ans.length && q.ans.every(function (x) { return val.indexOf(x) !== -1; });
        } else {
          isOk = val === q.ans;
        }
        html += '<details class="rv" style="margin-top:10px"><summary>내 답 확인하기</summary><div class="ans">' +
          (isOk ? '<b style="color:var(--ok)">✓ 정답이에요!</b> ' : '<b style="color:var(--gold)">다시 한번 확인해 볼까요?</b> ') +
          (q.exp ? esc(q.exp) : '') + '</div></details>';
      }
      html += '</div>';
    });

    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px">' +
      '<span style="font-size:.82rem;color:var(--muted)">작성한 내용은 이 기기에 자동 저장돼요. 모든 단원을 마친 뒤 [학습지 제출]에서 선생님께 보내세요.</span>' +
      '<a class="btn sm" href="#submit">학습지 제출 화면으로 →</a></div>';
    html += '</section>';
    return html;
  }

  /* ==========================================================================
   * 0. 시작 화면 (#start)
   * ========================================================================== */
  function pageStart() {
    var doneChaps = CHAPTERS.filter(isChapDone).length;
    var html = '<section class="home-hero">' +
      '<div>' +
      '<div class="kicker">중학교 음악 · 우리 음악극 감상과 비평 (개선판)</div>' +
      '<h1>판소리와 창극,<br><span class="hl">다섯 마당의 깊은 이야기</span>와<br>살아 숨 쉬는 소리북 장단</h1>' +
      '<p class="sub">부채 하나로 세상 만물을 그려 내는 <b>소리판</b>부터, 조선 서민들의 눈물과 웃음이 담긴 <b>다섯 마당 이야기</b>, 직접 치며 듣는 <b>소리북 장단 실험실</b>, 그리고 <b>창극과 오늘의 판소리</b>까지 한 흐름으로 만나 봐요.</p>' +
      '<div class="tags">' +
      '<span class="pill">2차시 (45분 × 2)</span>' +
      '<span class="pill">다섯 마당 심층 탐구</span>' +
      '<span class="pill">소리북 Web Audio 실험실</span>' +
      '<span class="pill">자동 저장 학습지 (15문항)</span>' +
      '</div>' +
      '<div class="cta-row">' +
      '<a class="btn primary" href="#c1">1차시 수업 시작하기 →</a>' +
      '<a class="btn" href="#story">다섯 마당 이야기 바로가기</a>' +
      '<a class="btn ghost" href="#c2">소리북 장단 실험실</a>' +
      '</div>' +
      '</div>' +
      '<div class="mosaic" aria-hidden="true">' +
      '<div class="m-tile" title="소리판">' + art('soripan') + '<span>소리판</span></div>' +
      '<div class="m-tile" title="춘향가">' + art('chun') + '<span>춘향가</span></div>' +
      '<div class="m-tile" title="흥보가">' + art('heung') + '<span>흥보가</span></div>' +
      '<div class="m-tile" title="수궁가">' + art('su') + '<span>수궁가</span></div>' +
      '<div class="m-tile" title="심청가">' + art('sim') + '<span>심청가</span></div>' +
      '<div class="m-tile" title="적벽가">' + art('jeok') + '<span>적벽가</span></div>' +
      '</div>' +
      '</section>';

    if (TEACHER) {
      html += '<section class="sec" style="border:1px solid rgba(232,176,74,.45);background:rgba(232,176,74,.07);border-radius:var(--r2);padding:18px 20px">' +
        '<div class="sec-head" style="margin-bottom:8px"><h2>선생님 모드 안내 (?교사)</h2><span class="pill">교사용 화면</span></div>' +
        '<p class="lead" style="margin-bottom:10px">선생님 화면에서는 학생 로그인 창과 자리 비움 감지가 작동하지 않으며, 모든 생각 질문과 학습지 예시 답안이 기본으로 펼쳐져 있어요.</p>' +
        '<div class="g3">' +
        '<div class="card"><h3>02 다섯 마당 심층 탐구</h3><p>마당별 <b>4단계 이야기 흐름(★눈대목 위치)</b>, <b>겉 주제 vs 속 주제</b>, <b>대표 눈대목 영상·소리북 장단</b>, <b>생각 스펙트럼</b>을 한 화면에서 수업할 수 있어요.</p></div>' +
        '<div class="card"><h3>03 소리북 장단 실험실</h3><p>진양조·중모리·중중모리·자진모리·휘모리 5가지 장단을 Web Audio 소리북 합성기로 즉시 들려주고 빠르기를 조절할 수 있어요.</p></div>' +
        '<div class="card"><h3>교실 모드 & 답안 제어</h3><p>왼쪽 메뉴의 <b>[교실 모드 켜기]</b>를 누르면 큰 글씨·메뉴 숨김·전체 화면이 한 번에 켜지고, 각 단원 상단의 <b>[모든 답 펼치기]</b>로 답안을 일괄 제어해요.</p></div>' +
        '</div>' +
        '</section>';
    }

    html += '<section class="sec">' +
      '<div class="sec-head"><h2>이번 수업에서 무엇을 배우나요?</h2><span class="pill">학습 목표 3가지</span></div>' +
      '<div class="g3">' +
      '<div class="card"><span class="badge" style="color:var(--gold);font-size:.76rem;font-weight:700">목표 1 · 소리판과 3요소</span><h3>판소리 소리판의 원리 이해하기</h3><p>소리꾼의 <b>소리·아니리·발림</b>과 고수의 <b>북장단</b>, 청중의 <b>추임새</b>가 어떻게 어우러져 무대를 만드는지 설명할 수 있어요.</p></div>' +
      '<div class="card"><span class="badge" style="color:#ff9aa8;font-size:.76rem;font-weight:700">목표 2 · 다섯 마당과 장단</span><h3>다섯 마당의 이야기와 장단 비교하기</h3><p>춘향가·흥보가·수궁가·심청가·적벽가의 <b>줄거리와 주제(겉 주제·속 주제)</b>를 이해하고, 장면의 감정에 맞는 <b>장단(진양조~휘모리)</b>을 구별할 수 있어요.</p></div>' +
      '<div class="card"><span class="badge" style="color:#7bf0ba;font-size:.76rem;font-weight:700">목표 3 · 창극과 오늘의 판소리</span><h3>전통의 계승과 현대적 변용 비평하기</h3><p>판소리와 <b>창극</b>의 차이를 비교하고, 밴드·아카펠라·합창으로 재탄생한 <b>오늘의 판소리</b>가 지닌 가치를 내 말로 표현할 수 있어요.</p></div>' +
      '</div>' +
      '</section>';

    html += '<section class="sec">' +
      '<div class="sec-head"><h2>수업 흐름 한눈에 보기 (2차시)</h2><span class="pill">완료 단원 ' + doneChaps + ' / ' + CHAPTERS.length + '</span></div>' +
      '<div class="timeline">' +
      '<div class="tl-phase"><b>1차시 (45분)</b> · 판소리 소리판의 원리와 다섯 마당 이야기 · 대목과 소리북 장단</div>';

    CHAPTERS.forEach(function (ch, i) {
      if (i === 3) {
        html += '<div class="tl-phase" style="margin-top:6px"><b>2차시 (45분)</b> · 사랑가 두 무대 비교 · 창극의 특징 · 오늘의 판소리와 학습지 제출</div>';
      }
      var done = isChapDone(ch);
      html += '<a class="tl-item" href="#' + esc(ch.id) + '" style="text-decoration:none;color:inherit">' +
        '<span class="tl-num" style="border-color:' + esc(ch.color) + ';color:' + esc(ch.color) + '">' + (done ? '✓' : esc(ch.grp)) + '</span>' +
        '<div><b>' + esc(ch.title) + '</b><p>' + esc(ch.tagline) + '</p></div>' +
        '<span class="tl-time">' + esc(ch.time) + ' · 문항 ' + ch.qs.length + '개</span>' +
        '</a>';
    });
    html += '</div></section>';

    html += '<section class="sec">' +
      '<div class="sec-head"><h2>학생 접속 QR 코드 & 주소 공유</h2><span class="pill">모바일 · 태블릿 · PC 겸용</span></div>' +
      '<div class="qr-box">' +
      '<div class="qr-canvas" id="qrMount" title="클릭하면 크게 볼 수 있어요"></div>' +
      '<div style="flex:1;min-width:240px">' +
      '<h3 style="margin:0 0 6px;font-family:var(--serif)">카메라로 스캔하거나 주소를 복사해 접속하세요</h3>' +
      '<p style="margin:0 0 10px;color:var(--ink2);font-size:.9rem"><code style="color:var(--gold)">' + esc(SHARE_URL) + '</code></p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn sm" id="copyUrlBtn">주소 복사하기</button>' +
      '<button type="button" class="btn sm ghost" id="bigQrBtn">QR 코드 크게 띄우기</button>' +
      '</div></div></div></section>';

    html += '<details class="more"><summary>수록 영상 출처 목록 보기 (총 12편)</summary><div class="more-body"><ul>';
    Object.keys(V).forEach(function (k) {
      var v = V[k];
      html += '<li><b>' + esc(v.title) + '</b> — ' + esc(v.by) + ' (<a href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener">YouTube ↗</a>)</li>';
    });
    html += '</ul></div></details>';

    return html;
  }

  /* ==========================================================================
   * 1. 판소리와 소리판 (#c1)
   * ========================================================================== */
  function pageC1() {
    var ch = CHAPTERS[0];
    var html = renderHero(ch, [
      ['sec-hook', '생각 열기'],
      ['sec-elem', '소리꾼의 3요소'],
      ['sec-three', '소리판의 세 주체'],
      ['sec-chu', '추임새 · 소리북 체험'],
      ['sec-more', '더 알아보기'],
      ['sec-sheet', '학습지 (3문항)']
    ]);

    html += renderHookAndCore(ch);

    html += '<section id="sec-elem" class="sec">' +
      '<div class="sec-head"><h2>소리꾼이 이야기를 펼치는 3요소</h2><span class="pill">카드를 눌러 뒷면의 예시를 확인해 보세요</span></div>' +
      '<p class="lead">판소리는 한 명의 소리꾼이 <b>노래(소리)</b>와 <b>말(아니리)</b>, <b>몸동작(발림)</b> 세 가지를 번갈아 쓰면서 긴 이야기를 입체적으로 끌고 가요.</p>' +
      '<div class="g3">' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>요소 1 · 노래</small><b>소리 (창 · 唱)</b><p>장단에 맞추어 부르는 노래예요. 인물의 깊은 감정이나 풍경을 음악적으로 끌어올려요.</p><span class="hint">눌러서 예시 보기 ↻</span></div>' +
      '<div class="back"><small>소리(창)의 예시</small><b>“이리 오너라 업고 놀자!”</b><p>춘향가 〈사랑가〉나 심청가 〈범피중류〉처럼 고수의 북장단 위에서 목을 굴리고 떨며(시김새) 부르는 모든 노래 대목이 바로 소리예요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>요소 2 · 말/대사</small><b>아니리</b><p>장단 없이 일상적인 말투로 이야기 줄거리를 설명하거나 인물들의 대화를 주고받는 부분이에요.</p><span class="hint">눌러서 예시 보기 ↻</span></div>' +
      '<div class="back"><small>아니리의 역할</small><b>숨도 돌리고, 줄거리도 빠르게!</b><p>계속 노래만 부르면 소리꾼도 지치고 이야기도 느려져요. 아니리로 시간·장소 변화를 재치 있게 설명하며 관객의 웃음을 자아내요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>요소 3 · 몸짓</small><b>발림 (너름새)</b><p>부채나 손수건, 몸짓으로 인물의 행동이나 장면을 눈앞에 보이듯 그려 내는 연극적 동작이에요.</p><span class="hint">눌러서 예시 보기 ↻</span></div>' +
      '<div class="back"><small>부채 한 자루의 변신</small><b>칼 · 활 · 편지 · 바위 · 파도까지!</b><p>접으면 칼이나 활시위(적벽가)가 되고, 활짝 펴면 넓은 바다(심청가)나 지붕, 연인의 부끄러운 얼굴을 가리는 소품이 돼요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '</div></section>';

    html += '<section id="sec-three" class="sec">' +
      '<div class="sec-head"><h2>소리판을 함께 완성하는 세 주체</h2><span class="pill">소리꾼 · 고수 · 청중</span></div>' +
      '<p class="lead">판소리는 소리꾼 혼자 만드는 독창회가 아니에요. 북을 치는 <b>고수</b>와 객석의 <b>청중</b>이 추임새로 호흡을 맞추어야 비로소 소리판이 완성돼요.</p>' +
      '<div class="g3">' +
      '<div class="card"><span class="pill" style="margin-bottom:8px">주체 1</span><h3>소리꾼 (창자)</h3><p>부채 한 자루를 들고 홀로 서서 해설자와 남녀노소 수십 명의 등장인물을 오가며 소리와 아니리, 발림을 펼치는 주인공이에요.</p></div>' +
      '<div class="card"><span class="pill" style="margin-bottom:8px">주체 2</span><h3>고수 (鼓手)</h3><p>소리북으로 장단을 짚어 소리의 빠르기와 호흡을 이끌고, 빈자리마다 추임새로 소리꾼의 기운을 북돋아 줘요. <b>“일고수 이명창”</b>이라는 말이 있을 만큼 중요해요.</p></div>' +
      '<div class="card"><span class="pill" style="margin-bottom:8px">주체 3</span><h3>청중 (귀명창)</h3><p>조용히 앉아 듣기만 하는 관객이 아니라, 소리를 깊이 이해하고 제자리에 <b>추임새</b>를 넣어 소리판을 함께 만들어 가는 동반자예요.</p></div>' +
      '</div></section>';

    html += '<section id="sec-chu" class="sec">' +
      '<div class="sec-head"><h2>직접 눌러 보는 추임새 & 소리북 패드</h2><span class="pill">소리가 나요 · 클릭해 보세요</span></div>' +
      '<div class="chu-box">' +
      '<p style="margin:0;color:var(--ink2);font-size:.92rem">소리꾼이 긴 한 프레이즈를 마치고 숨을 고르는 틈에 고수와 청중이 넣어 주는 <b>추임새</b>와 <b>소리북</b> 소리를 직접 눌러 체험해 보세요.</p>' +
      '<div class="chu-pad">' +
      '<button type="button" class="chu-btn" data-chu="eolssigu">“얼씨구!” <small>흥이 차오를 때</small></button>' +
      '<button type="button" class="chu-btn" data-chu="jota">“좋다!” <small>멋진 대목 끝에서</small></button>' +
      '<button type="button" class="chu-btn" data-chu="jalhanda">“잘한다!” <small>기교가 빛날 때</small></button>' +
      '<button type="button" class="chu-btn" data-chu="geureochi">“그렇지!” <small>말에 공감할 때</small></button>' +
      '<button type="button" class="chu-btn" data-drum="hap">소리북 합(둥) <small>깊은 가죽 울림</small></button>' +
      '<button type="button" class="chu-btn" data-drum="ttak">소리북 채(딱!) <small>나무 테 강세</small></button>' +
      '</div>' +
      '<div id="chuFeedback" style="margin-top:12px;font-size:.88rem;color:var(--gold);min-height:1.4em">버튼을 누르면 소리북 울림과 함께 각 추임새가 쓰이는 순간을 알려 드려요.</div>' +
      '</div></section>';

    html += '<section id="sec-more" class="sec">' +
      '<div class="sec-head"><h2>더 알아보기</h2><span class="pill">배경지식 넓히기</span></div>' +
      '<details class="more"><summary>원래 판소리는 열두 마당이었다고? (12마당 → 5마당)</summary><div class="more-body">' +
      '조선 후기에는 춘향가·심청가·흥보가·수궁가·적벽가 외에도 배비장타령, 변강쇠타령, 장끼타령, 옹고집타령, 무숙이타령, 강릉매화타령, 가짜신선타령까지 <b>열두 마당</b>이 불렸어요. 그 가운데 음악적 완성도와 문학성이 가장 뛰어난 <b>다섯 마당</b>이 오늘날까지 온전한 소리로 전승되었고, 2003년 유네스코 인류무형문화유산으로 등재되었어요.' +
      '</div></details>' +
      '<details class="more"><summary>왜 “일고수 이명창(一鼓手 二名唱)”이라고 부를까요?</summary><div class="more-body">' +
      '“첫째는 고수요, 둘째가 명창이다”라는 뜻이에요. 아무리 노래를 잘하는 명창이라도 고수가 북장단으로 호흡을 잘 밀고 당겨 주지 못하면 좋은 소리가 나올 수 없기 때문에, 고수의 역할을 그만큼 높이 평가한 말이에요.' +
      '</div></details>' +
      '</section>';

    html += renderSheet(ch);
    return html;
  }

  /* ==========================================================================
   * 2. 판소리 다섯 마당 이야기 (#story — 핵심 개선 단원)
   * ========================================================================== */
  function renderMadangShowcase(key) {
    var s = STORIES[key] || STORIES.chun;
    var v = V[s.vid];
    var preset = JANGDAN_PRESETS.find(function (p) { return p.id === s.jangdanKey; }) || JANGDAN_PRESETS[0];
    var openAttr = TEACHER ? ' open' : '';
    var idx = STORY_ORDER.indexOf(s.id);
    var prevKey = STORY_ORDER[(idx + STORY_ORDER.length - 1) % STORY_ORDER.length];
    var nextKey = STORY_ORDER[(idx + 1) % STORY_ORDER.length];

    var html = '<div class="story-showcase" style="--accent:' + esc(s.color) + '">';

    // 1. 상단 배너 (일러스트 + 한 줄 요약 + 근원 설화/정서/장단 태그)
    html += '<div class="story-banner">' +
      '<div>' +
      '<span class="hanja">' + esc(s.hanja) + ' · 다섯 마당 ' + (idx + 1) + '번째 작품</span>' +
      '<h3>' + esc(s.name) + '</h3>' +
      '<p class="one">' + esc(s.one) + '</p>' +
      '<div class="meta-pills">' +
      '<span class="pill"><b>등장인물</b> ' + esc(s.who) + '</span>' +
      '<span class="pill"><b>바탕 설화</b> ' + esc(s.source) + '</span>' +
      '<span class="pill"><b>주요 장단</b> ' + esc(s.jangdan) + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="art">' + art(s.id) + '</div>' +
      '</div>';

    // 2. 핵심 요약 팩트 바
    html += '<div class="facts" style="margin-bottom:16px">';
    s.facts.forEach(function (f) {
      html += '<div><small>' + esc(f[0]) + '</small><b>' + esc(f[1]) + '</b></div>';
    });
    html += '</div>';

    // 3. 마당별 생각 열기 질문
    html += '<div class="ask" style="--accent:' + esc(s.color) + '">' +
      '<b>' + esc(s.name) + ' · 먼저 생각해 볼까요?</b>' +
      '<p>' + esc(s.hook) + '</p>' +
      '<details class="rv"' + openAttr + '><summary>예시 답 보기</summary><div class="ans">' + esc(s.hookAns) + '</div></details>' +
      '</div>';

    // 4. 이 마당의 핵심 3가지
    html += '<div class="core3" style="--accent:' + esc(s.color) + '">' +
      '<div><small>이야기 흐름</small><p>' + esc(s.core.story) + '</p></div>' +
      '<div><small>소리와 장단</small><p>' + esc(s.core.music) + '</p></div>' +
      '<div><small>주제의 두 얼굴</small><p>' + esc(s.core.theme) + '</p></div>' +
      '</div>';

    // 5. 4단계 이야기 흐름 타임라인 (★눈대목 위치 표시) + 전체 줄거리
    html += '<div class="card" style="margin:14px 0">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
      '<h3 style="margin:0">' + esc(s.name) + ' 줄거리와 ★눈대목의 위치</h3>' +
      '<span class="pill">발단 → 전개 → 절정 → 결말</span></div>' +
      '<p style="margin:0 0 12px;color:var(--ink2);font-size:.92rem;line-height:1.72">' + esc(s.story) + '</p>' +
      '<div class="hist">';
    s.arc.forEach(function (step) {
      var isHighlight = step[0].indexOf('★') !== -1;
      html += '<div class="h-step" style="' + (isHighlight ? 'border-color:' + esc(s.color) + ';background:rgba(255,255,255,.04)' : '') + '">' +
        '<b style="' + (isHighlight ? 'color:' + esc(s.color) : '') + '">' + esc(step[0]) + '</b>' +
        '<p>' + esc(step[1]) + '</p></div>';
    });
    html += '</div></div>';

    // 6. 겉 주제 vs 속 주제 (이원적 주제 구조)
    html += '<div class="theme-dual">' +
      '<div class="t-card surface"><small>겉 주제 · 양반과 서민 모두가 공감한 교훈</small><p>' + esc(s.themeSurface) + '</p></div>' +
      '<div class="t-card inner"><small>속 주제 · 서민들이 진짜 하고 싶었던 말</small><p>' + esc(s.themeInner) + '</p></div>' +
      '</div>';

    // 7. 사설(가사) 맛보기 & 발림 포인트
    if (s.lyrics) {
      html += '<div class="lyrics-box">' +
        '<blockquote>' + esc(s.lyrics.quote) + '</blockquote>' +
        '<small>발림·소리 포인트 — ' + esc(s.lyrics.note) + '</small>' +
        '</div>';
    }

    // 8. 대표 눈대목 영상 감상 + 소리북 장단 바로 듣기 + 관찰/생각 질문
    html += '<div class="watch" style="--accent:' + esc(s.color) + ';margin-top:16px">' +
      '<div class="watch-head">' +
      '<div><span class="pill" style="margin-bottom:6px">대표 눈대목 감상</span>' +
      '<h3>' + esc(s.name) + ' 중 〈' + esc(s.sceneTitle) + '〉</h3></div>' +
      '<button type="button" class="btn sm primary" data-story-beat="' + esc(preset.id) + '">' +
      (AE.playingId === preset.id ? '■ 소리북 멈추기' : '▶ ' + esc(preset.name) + ' 소리북 장단 듣기') +
      '</button>' +
      '</div>' +
      '<p style="margin:0 0 12px;color:var(--ink2);font-size:.9rem">' + esc(s.sceneDesc) + '</p>' +
      vidBox(v) +
      '<div class="g2" style="margin-top:12px">' +
      '<div class="card"><h3>보며 찾기 (관찰 포인트 3가지)</h3><ol class="watch-qs">';
    s.watch.forEach(function (wq, wi) {
      html += '<li>' + esc(wq) +
        (s.watchAns && s.watchAns[wi] ? '<details class="rv"' + openAttr + '><summary>관찰 힌트 보기</summary><div class="ans">' + esc(s.watchAns[wi]) + '</div></details>' : '') +
        '</li>';
    });
    html += '</ol></div>' +
      '<div class="card"><h3>더 깊이 생각해 보기</h3><ol class="watch-qs">';
    s.think.forEach(function (tq, ti) {
      html += '<li>' + esc(tq) +
        (s.thinkAns && s.thinkAns[ti] ? '<details class="rv"' + openAttr + '><summary>생각 나눔 예시 보기</summary><div class="ans">' + esc(s.thinkAns[ti]) + '</div></details>' : '') +
        '</li>';
    });
    html += '</ol>' +
      '<div class="care" style="margin-top:10px"><b>감상 길잡이 ·</b> ' + esc(s.care) + '</div>' +
      '</div></div></div>';

    // 9. 마당 간 이동 버튼
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">' +
      '<button type="button" class="btn sm" data-select-madang="' + esc(prevKey) + '">← ' + esc(STORIES[prevKey].name) + ' 보기</button>' +
      '<span style="font-size:.82rem;color:var(--muted)">위의 탭이나 화살표 버튼을 눌러 다섯 마당을 차례대로 탐험해 보세요.</span>' +
      '<button type="button" class="btn sm" data-select-madang="' + esc(nextKey) + '">' + esc(STORIES[nextKey].name) + ' 보기 →</button>' +
      '</div>';

    html += '</div>';
    return html;
  }

  function renderStoryCompareTable() {
    var html = '<div class="ct-wrap"><table class="ct" id="storyCmpTable"><thead><tr><th>마당</th>';
    STORY_CMP_COLS.forEach(function (col, ci) {
      html += '<th data-col="' + (ci + 1) + '" title="누르면 이 기준 열을 강조해요">' + esc(col[0]) + '</th>';
    });
    html += '</tr></thead><tbody>';
    STORY_ORDER.forEach(function (k) {
      var s = STORIES[k];
      var row = STORY_CMP[k];
      html += '<tr>' +
        '<td><button type="button" class="btn sm ghost" data-select-madang="' + esc(k) + '" style="border-color:' + esc(s.color) + ';color:' + esc(s.color) + '">' + esc(s.name) + ' ↗</button></td>';
      STORY_CMP_COLS.forEach(function (col, ci) {
        html += '<td data-col="' + (ci + 1) + '">' + esc(row[col[1]]) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderStoryAxes() {
    var html = '<div id="storyAxesWrap">';
    STORY_AXES.forEach(function (ax) {
      html += '<div class="axis" data-axis="' + esc(ax.k) + '">' +
        '<div class="ax-ends"><span>← ' + esc(ax.l) + '</span><span>' + esc(ax.r) + ' →</span></div>' +
        '<div class="track">';
      STORY_ORDER.forEach(function (k) {
        var s = STORIES[k];
        var pos = (S.axis[ax.k] && S.axis[ax.k][k] != null) ? S.axis[ax.k][k] : ax.v[k];
        html += '<div class="chip" data-axis-chip="' + esc(ax.k) + '" data-madang="' + esc(k) + '" style="left:' + pos + '%;border-color:' + esc(s.color) + '">' +
          '<span class="dot" style="background:' + esc(s.color) + '"></span>' + esc(s.name) + '</div>';
      });
      html += '</div></div>';
    });
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px">' +
      '<small style="color:var(--muted)">칩을 좌우로 드래그해 내 생각대로 다섯 마당의 위치를 옮겨 보고 친구들과 비교해 보세요.</small>' +
      '<button type="button" class="btn sm ghost" id="resetAxesBtn">기본 배치로 되돌리기</button></div>';
    html += '</div>';
    return html;
  }

  function pageStory() {
    var ch = CHAPTERS[1];
    var curM = S.madang || 'chun';
    var html = renderHero(ch, [
      ['sec-hook', '생각 열기'],
      ['sec-madang', '다섯 마당 심층 탐험'],
      ['sec-how-tell', '판소리의 서사 원리'],
      ['sec-cmp', '한눈에 비교표'],
      ['sec-spectrum', '생각 스펙트럼'],
      ['sec-sheet', '학습지 (4문항)']
    ]);

    html += renderHookAndCore(ch);

    // 다섯 마당 탭 + 쇼케이스
    html += '<section id="sec-madang" class="sec">' +
      '<div class="sec-head"><div><h2>다섯 마당 심층 탐험</h2><p class="lead" style="margin-bottom:0">마당 탭을 눌러 각 작품의 <b>4단계 줄거리와 ★눈대목</b>, <b>겉 주제·속 주제</b>, <b>눈대목 영상과 소리북 장단</b>을 한자리에서 감상해 보세요.</p></div>' +
      '<span class="pill">5마당 전승</span></div>' +
      '<div class="madang-tabs" role="tablist" aria-label="판소리 다섯 마당 선택">';

    STORY_ORDER.forEach(function (k) {
      var s = STORIES[k];
      var isSel = k === curM;
      html += '<button type="button" class="m-tab" role="tab" aria-selected="' + (isSel ? 'true' : 'false') + '" data-select-madang="' + esc(k) + '" style="--accent:' + esc(s.color) + '">' +
        '<span class="m-dot" style="background:' + esc(s.color) + '"></span>' +
        '<div><b>' + esc(s.name) + ' <small style="font-weight:400;opacity:.75">' + esc(s.hanja) + '</small></b>' +
        '<small>★ ' + esc(s.sceneTitle) + '</small></div>' +
        '</button>';
    });
    html += '</div>';

    html += '<div id="madangMount">' + renderMadangShowcase(curM) + '</div>';

    // 다섯 마당 전체 카드 한눈에 펼쳐 보기 (수업 중 교사가 5개 모두 한 화면에 띄우고 싶을 때 유용)
    html += '<details class="more" style="margin-top:14px"' + (TEACHER ? ' open' : '') + '>' +
      '<summary>다섯 마당 핵심 요약 카드 5개 한눈에 펼쳐 보기</summary>' +
      '<div class="more-body"><div class="g2">';
    STORY_ORDER.forEach(function (k) {
      var s = STORIES[k];
      html += '<div class="card" style="border-left:4px solid ' + esc(s.color) + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
        '<b>' + esc(s.name) + ' (' + esc(s.hanja) + ')</b>' +
        '<button type="button" class="btn sm ghost" data-select-madang="' + esc(k) + '">상세 탐험 열기 ↑</button></div>' +
        '<p style="margin:0 0 8px">' + esc(s.one) + '</p>' +
        '<div style="font-size:.82rem;color:var(--ink2)">' +
        '<div>• <b>겉 주제:</b> ' + esc(s.themeSurface) + '</div>' +
        '<div>• <b>속 주제:</b> ' + esc(s.themeInner) + '</div>' +
        '<div>• <b>대표 눈대목:</b> ' + esc(s.sceneTitle) + '</div>' +
        '</div></div>';
    });
    html += '</div></div></details></section>';

    // 판소리는 어떻게 이야기할까? (3대 서사 원리)
    html += '<section id="sec-how-tell" class="sec">' +
      '<div class="sec-head"><h2>판소리는 어떻게 긴 이야기를 들려줄까요?</h2><span class="pill">판소리 서사의 3가지 비밀 · 카드를 눌러 보세요</span></div>' +
      '<div class="g3">' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>원리 1 · 일인다역</small><b>혼자서 여럿이 되기</b><p>소리꾼 한 사람이 해설자였다가 순식간에 춘향, 몽룡, 토끼, 용왕, 조자룡으로 변신해요.</p><span class="hint">눌러서 자세히 보기 ↻</span></div>' +
      '<div class="back"><small>어떻게 구분할까요?</small><b>시선 · 성음 · 부채 발림</b><p>왼쪽을 보며 호탕하게 말하면 몽룡, 오른쪽을 보며 수줍게 노래하면 춘향이 돼요. 관객은 소리꾼의 시선과 목소리 결을 따라가며 머릿속에 무대를 그려요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>원리 2 · 선택과 집중</small><b>중요한 순간은 멈춰서 길게! (눈대목)</b><p>지루한 과정은 아니리로 훌쩍 건너뛰고, 감정이 폭발하는 하이라이트 장면(눈대목)은 음악으로 길게 펼쳐요.</p><span class="hint">눌러서 자세히 보기 ↻</span></div>' +
      '<div class="back"><small>눈대목의 매력</small><b>한 장면을 수십 분 동안 깊게!</b><p>심청이 배를 타고 떠나는 〈범피중류〉나 흥보가 박에서 쌀을 쏟아 내는 대목처럼 관객이 가장 좋아하는 순간을 다채로운 장단과 가락으로 확대해 들려줘요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>원리 3 · 긴장과 이완</small><b>울다가 웃다가 (비장미와 해학미)</b><p>아무리 슬픈 이야기라도 내내 울기만 하지 않고, 그 사이에 익살스러운 재담과 웃음을 끼워 넣어요.</p><span class="hint">눌러서 자세히 보기 ↻</span></div>' +
      '<div class="back"><small>삶을 닮은 예술</small><b>눈물 뒤에 찾아오는 웃음의 힘</b><p>심청가의 슬픈 이별 뒤에 뺑덕어미의 익살이 나오고, 흥보가의 굶주림이 박 타는 신명으로 뒤집히듯 슬픔과 웃음이 교차해 몇 시간 동안 관객을 사로잡아요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '</div></section>';

    // 다섯 마당 한눈에 비교 매트릭스
    html += '<section id="sec-cmp" class="sec">' +
      '<div class="sec-head"><div><h2>다섯 마당 한눈에 비교하기</h2><p class="lead" style="margin-bottom:0">표의 <b>열 제목(중심 인물, 겉 주제, 속 주제, 대표 눈대목 등)</b>을 누르면 해당 기준을 강조해서 비교할 수 있어요.</p></div>' +
      '<span class="pill">7개 비교 기준</span></div>' +
      renderStoryCompareTable() +
      '</section>';

    // 생각 스펙트럼 (3축 드래그 활동)
    html += '<section id="sec-spectrum" class="sec">' +
      '<div class="sec-head"><div><h2>다섯 마당 생각 스펙트럼</h2><p class="lead" style="margin-bottom:0">다섯 마당을 세 가지 기준선 위에 놓아 보며 작품의 성격을 입체적으로 비교해 봐요.</p></div>' +
      '<span class="pill">드래그 활동</span></div>' +
      renderStoryAxes() +
      '</section>';

    html += renderSheet(ch);
    return html;
  }

  /* ==========================================================================
   * 3. 다섯 마당의 대목과 소리북 장단 실험실 (#c2)
   * ========================================================================== */
  var curLabIdx = 0;

  function renderRhythmLab() {
    var p = JANGDAN_PRESETS[curLabIdx] || JANGDAN_PRESETS[0];
    var isPlaying = AE.playingId === p.id;
    var bpm = isPlaying ? AE.bpm : p.bpm;
    var openAttr = TEACHER ? ' open' : '';

    var html = '<div class="rpanel" style="--accent:' + esc(p.color) + '">' +
      '<div class="lab-tabs" role="tablist" aria-label="장단 선택">';
    JANGDAN_PRESETS.forEach(function (pr, idx) {
      var active = idx === curLabIdx ? ' active' : '';
      html += '<button type="button" class="lab-tab' + active + '" data-lab-idx="' + idx + '" style="--accent:' + esc(pr.color) + '">' +
        '<b>' + esc(pr.name) + '</b> <small style="opacity:.75">' + esc(pr.meter) + '</small></button>';
    });
    html += '</div>';

    html += '<div class="lab-stage">' +
      '<div class="rhead">' +
      '<div><span class="pill" style="margin-bottom:6px">대표 대목 · ' + esc(p.rep) + '</span>' +
      '<h3>' + esc(p.name) + ' 장단 — ' + esc(p.title) + '</h3></div>' +
      '<div class="rctrl">' +
      '<button type="button" class="btn primary" id="labPlayBtn">' + (isPlaying ? '■ 소리북 정지' : '▶ 소리북 장단 재생') + '</button>' +
      '<label style="font-size:.82rem;color:var(--ink2);display:flex;align-items:center;gap:6px">빠르기(BPM) ' +
      '<input type="range" id="labBpm" min="' + p.min + '" max="' + p.max + '" value="' + bpm + '" style="accent-color:' + esc(p.color) + '">' +
      '<b id="labBpmVal">' + bpm + '</b></label>' +
      '</div></div>';

    html += '<div class="steps" id="labSteps">';
    p.steps.forEach(function (st, si) {
      var cls = st.a === 2 ? ' accent' : (st.a === -1 ? ' ghost' : '');
      html += '<div class="st' + cls + '" data-step-hit="' + si + '" title="누르면 이 박의 북소리를 들어요">' +
        '<span class="b">' + esc(st.lab) + '</span>' +
        '<span class="mv">' + esc(st.mv || '·') + '</span></div>';
    });
    html += '</div>';

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">' +
      '<small style="color:var(--muted);align-self:center;margin-right:4px">소리북 직접 쳐 보기:</small>' +
      '<button type="button" class="btn sm" data-drum="hap">합 (둥 · 첫박 강세)</button>' +
      '<button type="button" class="btn sm" data-drum="kung">궁 (쿵 · 가죽 울림)</button>' +
      '<button type="button" class="btn sm" data-drum="ttak">채 (딱 · 나무 테)</button>' +
      '<button type="button" class="btn sm" data-drum="Roll">더러러 (잔가락)</button>' +
      '</div>';

    html += '<div class="g2" style="margin-top:12px">' +
      '<div class="card"><h3>장단 특징과 느낌</h3><p>' + esc(p.how) + '</p></div>' +
      '<div class="card"><h3>손장단 · 입장단으로 따라 하기</h3><p>' + esc(p.body) + '</p></div>' +
      '</div>';

    html += '<div class="ask" style="margin-top:12px;--accent:' + esc(p.color) + '">' +
      '<b>장단 생각 질문</b><p>' + esc(p.ask) + '</p>' +
      '<details class="rv"' + openAttr + '><summary>예시 답 보기</summary><div class="ans">' + esc(p.ans) + '</div></details>' +
      '</div>';

    html += '</div></div>';
    return html;
  }

  function pageC2() {
    var ch = CHAPTERS[2];
    var openAttr = TEACHER ? ' open' : '';
    var html = renderHero(ch, [
      ['sec-hook', '생각 열기'],
      ['sec-lab', '소리북 장단 실험실'],
      ['sec-tempo', '빠르기 한눈에 보기'],
      ['sec-scenes', '다섯 대목 집중 감상'],
      ['sec-sheet', '학습지 (3문항)']
    ]);

    html += renderHookAndCore(ch);

    html += '<section id="sec-lab" class="sec">' +
      '<div class="sec-head"><div><h2>소리북 장단 실험실</h2><p class="lead" style="margin-bottom:0">장단 탭을 고르고 <b>[▶ 소리북 장단 재생]</b>을 눌러 박자 칸이 움직이는 모양과 북소리의 강세를 직접 확인해 보세요.</p></div>' +
      '<span class="pill">Web Audio 소리북 합성기</span></div>' +
      '<div id="labMount">' + renderRhythmLab() + '</div>' +
      '</section>';

    html += '<section id="sec-tempo" class="sec">' +
      '<div class="sec-head"><h2>판소리 장단 빠르기 한눈에 비교하기</h2><span class="pill">느림 → 빠름</span></div>' +
      '<div class="tempo-bar">' +
      '<div class="t-node" style="border-top:3px solid #86b6ff"><small>가장 느림 · 6박</small><b>진양조</b><span>심청가 〈범피중류〉<br>깊은 호흡과 슬픔·서정</span></div>' +
      '<div class="t-node" style="border-top:3px solid #b8a9ff"><small>보통 빠르기 · 12박</small><b>중모리</b><span>춘향가 〈쑥대머리〉<br>담담하게 사연을 풀어냄</span></div>' +
      '<div class="t-node" style="border-top:3px solid #e0455b"><small>춤추듯 흥겨움 · 12/8</small><b>중중모리</b><span>춘향가 〈사랑가〉<br>덩덕쿵 들썩이는 춤사위</span></div>' +
      '<div class="t-node" style="border-top:3px solid #3fb0c4"><small>빠르고 긴박함 · 12/8</small><b>자진모리</b><span>수궁가 〈좌우나졸〉 · 적벽가<br>사건이 숨 가쁘게 몰아침</span></div>' +
      '<div class="t-node" style="border-top:3px solid #f4bd3a"><small>가장 빠름 · 4/4</small><b>휘모리</b><span>흥보가 〈돈과 쌀 대목〉<br>폭풍처럼 휘몰아치는 절정</span></div>' +
      '</div></section>';

    var scenes = [
      { m: 'sim', step1: '심청이 탄 배가 아득한 바다 한가운데로 떠가는 장면이에요. 빠르기가 어떨지 먼저 짐작해 보세요.', j: '진양조', why: '가장 느린 6박 장단으로 망망대해의 넓이와 심청의 애절한 마음을 긴 호흡으로 그려 내요.' },
      { m: 'chun', step1: '몽룡과 춘향이 서로 업고 놀며 사랑을 노래하는 행복한 장면이에요.', j: '중중모리', why: '3소박 4박의 통통 튀고 출렁이는 리듬이 두 사람의 설렘과 춤추는 듯한 흥을 살려 줘요.' },
      { m: 'su', step1: '용궁에 도착한 토끼를 좌우 나졸(군사)들이 벌떼처럼 달려들어 잡아들이는 장면이에요.', j: '자진모리', why: '빠르고 촘촘한 북소리가 사방에서 군사들이 몰려드는 긴박한 속도감을 만들어 줘요.' },
      { m: 'jeok', step1: '조자룡이 추격해 오는 오나라 배를 향해 활을 당겨 돛대 줄을 쏘아 맞히는 장면이에요.', j: '자진모리', why: '팽팽한 활시위의 긴장감과 바람을 가르는 화살의 박진감을 자진모리로 생생하게 묘사해요.' },
      { m: 'heung', step1: '박 속에서 나온 궤짝에서 돈과 쌀을 쏟아 붓고 털어 내도 끝없이 차오르는 장면이에요.', j: '휘모리', why: '판소리에서 가장 빠른 휘모리장단으로 숨 돌릴 틈 없이 쏟아지는 보물과 벅찬 기쁨을 표현해요.' }
    ];

    html += '<section id="sec-scenes" class="sec">' +
      '<div class="sec-head"><div><h2>다섯 마당 대표 눈대목 집중 감상</h2><p class="lead" style="margin-bottom:0">각 장면의 분위기를 생각하며 <b>① 빠르기 짐작하기 → ② 영상 감상하기 → ③ 장단 정답 확인하기</b> 순서로 들어 보세요.</p></div>' +
      '<span class="pill">5개 눈대목</span></div>';

    scenes.forEach(function (sc, idx) {
      var st = STORIES[sc.m];
      var v = V[st.vid];
      html += '<div class="watch" style="--accent:' + esc(st.color) + '">' +
        '<div class="watch-head">' +
        '<div><span class="pill" style="margin-bottom:6px">대목 ' + (idx + 1) + ' · ' + esc(st.name) + '</span>' +
        '<h3>' + esc(v.title) + '</h3></div>' +
        '<a class="btn sm ghost" href="#' + esc(st.id) + '">이 마당 줄거리 다시 보기 ↗</a>' +
        '</div>' +
        '<p style="margin:0 0 10px;color:var(--ink2);font-size:.9rem"><b>1단계 (빠르기 짐작):</b> ' + esc(sc.step1) + '</p>' +
        vidBox(v) +
        '<details class="rv"' + openAttr + ' style="margin-top:10px"><summary>3단계 · 이 대목에 쓰인 장단과 이유 확인하기</summary>' +
        '<div class="ans"><b>쓰인 장단: ' + esc(sc.j) + '장단</b> — ' + esc(sc.why) + '</div></details>' +
        '</div>';
    });
    html += '</section>';

    html += renderSheet(ch);
    return html;
  }

  /* ==========================================================================
   * 4. 사랑가, 두 무대 비교 (#c3)
   * ========================================================================== */
  function pageC3() {
    var ch = CHAPTERS[3];
    var openAttr = TEACHER ? ' open' : '';
    var html = renderHero(ch, [
      ['sec-hook', '생각 열기'],
      ['sec-vs', '두 무대 나란히 감상'],
      ['sec-points', '4가지 비교 포인트'],
      ['sec-sheet', '학습지 (3문항)']
    ]);

    html += renderHookAndCore(ch);

    html += '<section id="sec-vs" class="sec">' +
      '<div class="sec-head"><div><h2>같은 〈사랑가〉, 서로 다른 두 무대</h2><p class="lead" style="margin-bottom:0">판소리 춘향가의 〈사랑가〉와 창극 춘향의 〈사랑가〉를 나란히 감상하며 무엇이 같고 무엇이 달라졌는지 비교해 보세요.</p></div>' +
      '<span class="pill">판소리 vs 창극</span></div>' +
      '<div class="versus">' +
      '<div class="card" style="border-top:3px solid var(--c-chun)">' +
      '<span class="pill" style="margin-bottom:8px">무대 A · 판소리</span>' +
      '<h3>판소리 춘향가 중 〈사랑가〉</h3>' +
      '<p style="margin-bottom:10px">소리꾼 <b>1명</b>이 부채를 들고 몽룡과 춘향 두 인물을 오가며 부르고, 고수가 <b>소리북 1개</b>로 반주해요.</p>' +
      vidBox(V.sarang, { hideNote: true }) +
      '</div>' +
      '<div class="vs-badge" aria-hidden="true">VS</div>' +
      '<div class="card" style="border-top:3px solid var(--c-chang)">' +
      '<span class="pill" style="margin-bottom:8px">무대 B · 창극</span>' +
      '<h3>창극 〈춘향〉 중 〈사랑가〉</h3>' +
      '<p style="margin-bottom:10px">몽룡과 춘향 배역을 맡은 <b>두 배우</b>가 의상을 입고 마주 보며 연기하고, <b>국악 관현악</b>이 풍성하게 반주해요.</p>' +
      vidBox(V.cgSarang, { hideNote: true }) +
      '</div>' +
      '</div></section>';

    html += '<section id="sec-points" class="sec">' +
      '<div class="sec-head"><h2>네 가지 눈으로 두 무대 비교하기</h2><span class="pill">관찰 질문과 답</span></div>' +
      '<div class="g2">' +
      '<div class="card"><h3>① 누가 부르나요? (1인 다역 vs 배역 분담)</h3><p>몽룡과 춘향의 목소리를 누가 내고 있나요?</p>' +
      '<details class="rv"' + openAttr + '><summary>비교 답 보기</summary><div class="ans"><b>판소리</b>는 소리꾼 한 사람이 시선과 목소리 톤을 바꾸며 두 인물을 모두 소화하고, <b>창극</b>은 남녀 두 배우가 각자 몽룡과 춘향 배역을 맡아 실제 연인처럼 대화하며 노래해요.</div></details></div>' +
      '<div class="card"><h3>② 무엇으로 반주하나요? (소리북 vs 국악 관현악)</h3><p>노래 뒤에서 들리는 반주 악기 소리에 귀 기울여 보세요.</p>' +
      '<details class="rv"' + openAttr + '><summary>비교 답 보기</summary><div class="ans"><b>판소리</b>는 고수의 소리북 하나로 리듬과 호흡의 뼈대를 만들고, <b>창극</b>은 가야금·해금·대금·피리·타악기 등이 어우러진 국악 관현악이 화려한 화음과 선율을 더해 줘요.</div></details></div>' +
      '<div class="card"><h3>③ 무대에 무엇이 보이나요? (여백과 상상력 vs 무대 예술)</h3><p>배경과 소품, 조명은 어떻게 다른가요?</p>' +
      '<details class="rv"' + openAttr + '><summary>비교 답 보기</summary><div class="ans"><b>판소리</b>는 돗자리와 부채뿐인 빈 무대를 관객의 상상력으로 채우고, <b>창극</b>은 극장 조명·무대 세트·배역 의상과 분장으로 장면을 눈앞에 직접 구현해요.</div></details></div>' +
      '<div class="card"><h3>④ 그래도 변하지 않은 공통 뿌리는 무엇인가요?</h3><p>두 무대가 서로 달라도 둘 다 “우리 소리”로 느껴지는 까닭은 무엇일까요?</p>' +
      '<details class="rv"' + openAttr + '><summary>비교 답 보기</summary><div class="ans">“이리 오너라 업고 놀자”라는 <b>판소리 사설(가사)</b>, 춤추듯 들썩이는 <b>중중모리장단</b>, 그리고 판소리 특유의 발성과 <b>시김새(창법)</b>를 그대로 뿌리로 삼고 있기 때문이에요.</div></details></div>' +
      '</div></section>';

    html += renderSheet(ch);
    return html;
  }

  /* ==========================================================================
   * 5. 창극이란? · 판소리와 창극 한눈에 비교 (#c4)
   * ========================================================================== */
  function pageC4() {
    var ch = CHAPTERS[4];
    var html = renderHero(ch, [
      ['sec-hook', '생각 열기'],
      ['sec-elem', '창극의 3대 핵심 요소'],
      ['sec-table', '판소리 vs 창극 비교표'],
      ['sec-more', '창극 공연 더 보기'],
      ['sec-sheet', '학습지 (1문항)']
    ]);

    html += renderHookAndCore(ch);

    html += '<section id="sec-elem" class="sec">' +
      '<div class="sec-head"><h2>판소리가 극장 무대로! 창극의 3대 요소</h2><span class="pill">카드를 눌러 확인해 보세요</span></div>' +
      '<p class="lead"><b>창극(唱劇)</b>은 20세기 초 근대 극장이 생기면서, 한 사람이 부르던 판소리를 여러 배우가 배역을 나누어 연극처럼 꾸민 우리나라 고유의 음악극이에요.</p>' +
      '<div class="g3">' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>창극 요소 1</small><b>여러 배우의 배역 분담</b><p>판소리의 1인 소리꾼 대신, 여러 소리꾼(배우)이 각자 한 인물씩 맡아 의상을 입고 연기해요.</p><span class="hint">눌러서 자세히 보기 ↻</span></div>' +
      '<div class="back"><small>연극적 현장감</small><b>눈을 맞추고 주고받는 노래와 연기</b><p>춘향, 몽룡, 월매, 변학도, 방자 등 등장인물들이 실제로 무대 위에서 마주 보고 갈등하거나 사랑하는 장면을 입체적으로 보여 줘요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>창극 요소 2</small><b>도창 (導唱 · 해설자)</b><p>무대 한쪽에 서서 이야기 줄거리나 장면 배경을 판소리 창법으로 풀어 주는 해설자예요.</p><span class="hint">눌러서 자세히 보기 ↻</span></div>' +
      '<div class="back"><small>왜 도창이 필요할까요?</small><b>긴 이야기를 매끄럽게 이어 주는 다리</b><p>판소리에서는 소리꾼이 아니리로 해설까지 다 했지만, 창극에서는 배우들이 대사에 집중할 수 있도록 도창이 장면 전환과 서사 요약을 맡아 주기도 해요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '<div class="flip" tabindex="0" role="button"><div class="front"><small>창극 요소 3</small><b>국악 관현악 반주</b><p>소리북 하나 대신 가야금·거문고·대금·해금·피리·아쟁·타악기 등 국악 관현악이 반주해요.</p><span class="hint">눌러서 자세히 보기 ↻</span></div>' +
      '<div class="back"><small>풍성한 극음악</small><b>장면의 감정과 스케일을 키우는 사운드</b><p>슬픈 장면에서는 해금과 대금의 애절한 선율이, 긴박한 장면에서는 타악기와 관현악의 웅장한 울림이 극적인 몰입감을 높여 줘요.</p><span class="hint">다시 누르면 앞면 ↻</span></div></div>' +
      '</div></section>';

    var cmpRows = [
      ['성격과 역사', '조선 후기부터 전해 내려온 1인 성악 예술', '20세기 초 판소리를 바탕으로 탄생한 극장 음악극'],
      ['부르는 사람', '소리꾼 1명 (일인다역 · 혼자 여러 인물 표현)', '여러 소리꾼(배우)이 배역을 나누어 연기'],
      ['이야기 해설', '소리꾼이 노래(소리)와 말(아니리)로 직접 해설', '무대 한쪽에 해설자인 도창(導唱)을 두기도 함'],
      ['반주 악기', '고수 1명의 소리북', '국악 관현악 (관현악 피트 또는 무대 반주)'],
      ['무대와 소품', '돗자리 한 장, 부채·손수건 (관객의 상상력 중심)', '무대 배경 세트, 조명, 배역별 의상·분장·소품'],
      ['관객과의 호흡', '고수와 청중이 추임새를 넣으며 가까이서 소통', '극장 객석에서 종합 무대 예술로 감상'],
      ['공통 뿌리', '판소리의 사설(이야기) · 장단 · 시김새(창법)', '판소리의 사설(이야기) · 장단 · 시김새(창법)']
    ];

    html += '<section id="sec-table" class="sec">' +
      '<div class="sec-head"><h2>판소리와 창극 한눈에 비교표</h2><span class="pill">열을 클릭하면 강조돼요</span></div>' +
      '<div class="ct-wrap"><table class="ct"><thead><tr><th>비교 기준</th><th data-col="1">판소리 (소리판)</th><th data-col="2">창극 (극장 무대)</th></tr></thead><tbody>';
    cmpRows.forEach(function (r) {
      html += '<tr><td>' + esc(r[0]) + '</td><td data-col="1">' + esc(r[1]) + '</td><td data-col="2">' + esc(r[2]) + '</td></tr>';
    });
    html += '</tbody></table></div></section>';

    html += '<section id="sec-more" class="sec">' +
      '<div class="sec-head"><h2>더 감상하기 · 현대 창극 무대</h2><span class="pill">국립창극단</span></div>' +
      '<div class="watch" style="--accent:var(--c-chang)">' +
      '<div class="watch-head"><div><h3>' + esc(V.changgeuk.title) + '</h3></div><span class="pill">공연 실황</span></div>' +
      vidBox(V.changgeuk) +
      '</div></section>';

    html += renderSheet(ch);
    return html;
  }

  /* ==========================================================================
   * 6. 오늘의 판소리 · 전통에서 미래로 (#c5)
   * ========================================================================== */
  function pageC5() {
    var ch = CHAPTERS[5];
    var html = renderHero(ch, [
      ['sec-hook', '생각 열기'],
      ['sec-today', '오늘의 판소리 무대'],
      ['sec-exit', '생각 정리 문장 틀'],
      ['sec-sheet', '학습지 (1문항)']
    ]);

    html += renderHookAndCore(ch);

    var todayCards = [
      {
        v: V.seodo, tag: '춘향가 〈사랑가〉 × 밴드 사운드 (조선팝)',
        keep: '춘향가 〈사랑가〉의 가사와 판소리 특유의 시김새·장단 호흡',
        change: '건반·일렉트릭 기타·베이스·드럼의 현대 밴드 편곡과 세련된 팝 멜로디 결합'
      },
      {
        v: V.leenalchi, tag: '수궁가 〈좌우나졸〉 × 베이스 2대 · 드럼 (댄스 팝)',
        keep: '수궁가 〈좌우나졸〉의 사설과 자진모리의 촘촘하고 긴박한 리듬감, 판소리 창법',
        change: '소리북 대신 베이스 기타 2대와 드럼 그루브를 쓰고, 여러 소리꾼이 주고받으며 춤과 함께 공연'
      },
      {
        v: V.toris, tag: '흥보가 〈박 타는 대목〉 × 국악 아카펠라',
        keep: '흥보가의 익살스러운 재담과 시리렁 실근 톱질하는 판소리 가락·추임새',
        change: '악기 없이 오직 여러 사람의 목소리 화음과 보컬 퍼커션(아카펠라)으로만 입체적인 소리 구현'
      }
    ];

    html += '<section id="sec-today" class="sec">' +
      '<div class="sec-head"><div><h2>오늘의 판소리 · 다섯 마당의 새로운 변신</h2><p class="lead" style="margin-bottom:0">옛 판소리 대목이 오늘날 밴드, 아카펠라, 합창, 현대 기악과 만나 어떻게 새롭게 태어났는지 감상해 보세요.</p></div>' +
      '<span class="pill">전통과 현대의 만남</span></div>';

    todayCards.forEach(function (tc) {
      html += '<div class="watch" style="--accent:var(--c-today)">' +
        '<div class="watch-head"><div><span class="pill" style="margin-bottom:6px">' + esc(tc.tag) + '</span>' +
        '<h3>' + esc(tc.v.title) + '</h3></div></div>' +
        vidBox(tc.v) +
        '<div class="g2" style="margin-top:10px">' +
        '<div class="card"><small style="color:var(--gold);font-weight:700">그대로 지킨 것 (전통의 뿌리)</small><p>' + esc(tc.keep) + '</p></div>' +
        '<div class="card"><small style="color:var(--c-today);font-weight:700">새롭게 바꾼 것 (현대의 감각)</small><p>' + esc(tc.change) + '</p></div>' +
        '</div></div>';
    });

    html += '<details class="more"><summary>더 감상하기 · 판소리 합창(심청가) & 판소리스케이프(적벽가)</summary>' +
      '<div class="more-body"><div class="g2">' +
      '<div>' + vidBox(V.jeonju) + '</div>' +
      '<div>' + vidBox(V.scape) + '</div>' +
      '</div></div></details></section>';

    html += '<section id="sec-exit" class="sec">' +
      '<div class="exit">' +
      '<h3>오늘의 판소리 · 내 생각 정리하기 (출구 카드)</h3>' +
      '<p style="margin:0 0 8px;color:var(--ink2);font-size:.9rem">아래 문장 틀 가운데 마음에 드는 것을 골라 누르면, 아래 6-1 서술형 답안 칸에 기본 문장이 들어가 쉽게 글을 이어 쓸 수 있어요.</p>' +
      '<ol>' +
      '<li>“내가 고른 <b>(팀/곡 이름)</b>은 옛 판소리의 <b>(가사/시김새/장단)</b>은 그대로 지켰지만, <b>(밴드 악기/아카펠라/합창)</b>으로 새롭게 바꾸었다. 이렇게 이어 가면 <b>(내 생각)</b>해서 뜻깊다.” ' +
      '<button type="button" class="btn sm ghost" data-fill-c5="1">이 문장 틀 넣기</button></li>' +
      '<li>“판소리가 오늘날 <b>(서도밴드/이날치/토리스)</b>처럼 새로운 음악과 만나는 까닭은, 전통을 박물관에 가두지 않고 <b>(오늘날 사람들의 삶과 호흡)</b>하기 위해서라고 생각한다.” ' +
      '<button type="button" class="btn sm ghost" data-fill-c5="2">이 문장 틀 넣기</button></li>' +
      '</ol></div></section>';

    html += renderSheet(ch);
    return html;
  }

  /* ==========================================================================
   * 7. 마무리 퀴즈 (#quiz)
   * ========================================================================== */
  var quizState = { mode: 'core', idx: 0, picked: null, score: 0, finished: false };

  function getQuizPool() {
    return quizState.mode === 'core' ? QUIZ.filter(function (q) { return q.core; }) : QUIZ;
  }

  function pageQuiz() {
    var pool = getQuizPool();
    if (quizState.idx >= pool.length) quizState.idx = 0;
    var q = pool[quizState.idx];

    var html = '<section class="d-hero" style="--accent:var(--gold)">' +
      '<div><div class="kicker"><span>REVIEW QUIZ · 소리 듣고 맞히기 & 핵심 정리</span></div>' +
      '<h1>판소리와 창극 마무리 퀴즈</h1>' +
      '<p class="tagline">소리북 장단을 귀로 듣고 맞히는 문제부터 다섯 마당 이야기, 창극 비교까지 즐겁게 점검해 봐요.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      '<button type="button" class="btn sm ' + (quizState.mode === 'core' ? 'primary' : '') + '" data-qmode="core">수업용 핵심 6문항</button>' +
      '<button type="button" class="btn sm ' + (quizState.mode === 'all' ? 'primary' : '') + '" data-qmode="all">복습용 전체 10문항</button>' +
      '</div></div>' +
      '<div class="art">' + art('jangdan') + '</div></section>';

    html += '<div class="qbar">';
    pool.forEach(function (_, i) {
      var cls = i < quizState.idx ? ' ok' : (i === quizState.idx && !quizState.finished ? ' cur' : '');
      html += '<span class="' + cls + '"></span>';
    });
    html += '</div>';

    if (quizState.finished) {
      html += '<div class="quiz" style="text-align:center;padding:32px 20px">' +
        '<span class="pill">퀴즈 완료!</span>' +
        '<h2 style="font-family:var(--serif);font-size:1.7rem;margin:10px 0">' + pool.length + '문항 중 <span style="color:var(--gold)">' + quizState.score + '문항</span> 정답!</h2>' +
        '<p style="color:var(--ink2);margin-bottom:18px">판소리의 소리판, 다섯 마당 이야기, 소리북 장단, 창극까지 훌륭하게 정리했어요.</p>' +
        '<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">' +
        '<button type="button" class="btn" id="quizRestartBtn">다시 풀어 보기</button>' +
        '<a class="btn primary" href="#submit">학습지 제출 화면으로 이동 →</a>' +
        '</div></div>';
      return html;
    }

    html += '<div class="quiz">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<span class="pill">문항 ' + (quizState.idx + 1) + ' / ' + pool.length + ' · ' + esc(q.t) + '</span>' +
      '<span style="font-size:.82rem;color:var(--muted)">현재 점수: ' + quizState.score + '점</span></div>' +
      '<h2 style="font-family:var(--serif);font-size:1.2rem;margin:8px 0 14px">' + esc(q.q) + '</h2>';

    if (q.audio) {
      html += '<div style="margin-bottom:14px">' +
        '<button type="button" class="btn primary" data-quiz-audio="' + esc(q.audio) + '">' +
        (AE.playingId === q.audio ? '■ 소리북 멈추기' : '▶ 이 문제의 소리북 장단 듣기') +
        '</button></div>';
    }

    html += '<div class="opts">';
    q.o.forEach(function (opt, oi) {
      var cls = 'opt';
      var dis = '';
      if (quizState.picked != null) {
        dis = ' disabled';
        if (oi === q.a) cls += ' right';
        else if (oi === quizState.picked) cls += ' wrong';
      }
      html += '<button type="button" class="' + cls + '"' + dis + ' data-quiz-pick="' + oi + '">' + (oi + 1) + '. ' + esc(opt) + '</button>';
    });
    html += '</div>';

    if (quizState.picked != null) {
      var isRight = quizState.picked === q.a;
      html += '<div class="explain">' +
        '<b style="color:' + (isRight ? 'var(--ok)' : 'var(--bad)') + '">' + (isRight ? '✓ 정답입니다!' : '✗ 아쉽네요! 정답은 ' + (q.a + 1) + '번입니다.') + '</b><br>' +
        esc(q.e) + '</div>' +
        '<div style="margin-top:14px;display:flex;justify-content:flex-end">' +
        '<button type="button" class="btn primary" id="quizNextBtn">' + (quizState.idx + 1 < pool.length ? '다음 문제 →' : '결과 보기 →') + '</button></div>';
    }

    html += '</div>';
    return html;
  }

  /* ==========================================================================
   * 8. 학습지 제출 및 채점 (#submit)
   * ========================================================================== */
  function grade() {
    var total = 0;
    var score = 0;
    var wrong = [];
    var answers = {};
    var textFilled = 0;
    var textTotal = 0;

    CHAPTERS.forEach(function (ch) {
      ch.qs.forEach(function (q) {
        var v = S.ans[q.id];
        answers[q.id] = v == null ? '' : v;
        if (q.type === 'text') {
          textTotal++;
          if (v && String(v).trim().length > 0) textFilled++;
        } else {
          total++;
          var ok = false;
          if (q.type === 'multi' && Array.isArray(q.ans)) {
            ok = Array.isArray(v) && v.length === q.ans.length && q.ans.every(function (x) { return v.indexOf(x) !== -1; });
          } else {
            ok = v === q.ans;
          }
          if (ok) score++;
          else wrong.push(q.label || q.id);
        }
      });
    });

    return { score: score, total: total, wrong: wrong, answers: answers, textFilled: textFilled, textTotal: textTotal };
  }

  function makeCode(r) {
    var student = (window.Classroom && window.Classroom.getStudent && window.Classroom.getStudent()) || { id: '0000', name: '학생' };
    var payload = [
      student.id || '0000',
      student.name || '학생',
      r.score + '/' + r.total,
      r.textFilled + '/' + r.textTotal,
      new Date().toISOString().slice(0, 16).replace('T', ' ')
    ].join('|');
    try {
      return 'PP1-' + btoa(unescape(encodeURIComponent(payload))).replace(/=+$/, '');
    } catch (e) {
      return 'PP1-' + r.score + '-' + r.total;
    }
  }

  function readCode(code) {
    try {
      var clean = String(code || '').trim().replace(/^PP1-/, '');
      var raw = decodeURIComponent(escape(atob(clean)));
      var p = raw.split('|');
      if (p.length < 5) return null;
      return { id: p[0], name: p[1], auto: p[2], text: p[3], time: p[4] };
    } catch (e) {
      return null;
    }
  }

  function pageSubmit() {
    var r = grade();
    var code = makeCode(r);

    var html = '<section class="d-hero" style="--accent:var(--gold)">' +
      '<div><div class="kicker"><span>WORKSHEET SUBMIT · 학습지 확인 및 제출</span></div>' +
      '<h1>학습지 점검 & 선생님께 제출하기</h1>' +
      '<p class="tagline">1장부터 6장까지 작성한 학습지 답안을 한눈에 점검하고, 선생님께 결과를 전송해요.</p></div>' +
      '<div class="art">' + art('soripan') + '</div></section>';

    html += '<div class="stat-grid">' +
      '<div class="stat"><small>선택형 자동 채점</small><b>' + r.score + ' / ' + r.total + '</b></div>' +
      '<div class="stat"><small>서술형 작성 완료</small><b>' + r.textFilled + ' / ' + r.textTotal + '</b></div>' +
      '<div class="stat"><small>완료한 단원</small><b>' + CHAPTERS.filter(isChapDone).length + ' / ' + CHAPTERS.length + '</b></div>' +
      '</div>';

    html += '<section class="sec">' +
      '<div class="sec-head"><h2>단원별 학습지 작성 현황</h2><span class="pill">단원을 누르면 바로 이동해요</span></div>' +
      '<div class="g3">';
    CHAPTERS.forEach(function (ch) {
      var done = isChapDone(ch);
      var cnt = ch.qs.filter(function (q) {
        var v = S.ans[q.id];
        return q.type === 'multi' ? (Array.isArray(v) && v.length > 0) : (v != null && String(v).trim() !== '');
      }).length;
      html += '<a class="card" href="#' + esc(ch.id) + '" style="text-decoration:none;color:inherit;border-left:4px solid ' + (done ? 'var(--ok)' : esc(ch.color)) + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<b>' + esc(ch.grp) + '. ' + esc(ch.nav) + '</b>' +
        '<span class="pill" style="color:' + (done ? 'var(--ok)' : 'var(--gold)') + '">' + cnt + '/' + ch.qs.length + (done ? ' 완료 ✓' : ' 작성 중') + '</span>' +
        '</div>' +
        '<p style="margin-top:6px;font-size:.82rem">' + esc(ch.title) + ' 문항 보러 가기 →</p></a>';
    });
    html += '</div></section>';

    html += '<section class="sec">' +
      '<div class="card" style="padding:22px;border-color:rgba(232,176,74,.45)">' +
      '<h2 style="font-family:var(--serif);margin:0 0 8px">1. 선생님께 바로 보내기 (온라인 제출)</h2>' +
      '<p style="margin:0 0 14px">아래 버튼을 누르면 학번·이름과 함께 작성한 학습지 결과가 선생님 시트로 전송돼요.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<button type="button" class="btn primary" id="hubSubmitBtn">선생님께 결과 전송하기 →</button>' +
      '<button type="button" class="btn" id="printBtn">인쇄 / PDF 저장</button>' +
      '<button type="button" class="btn ghost" id="clearAnsBtn">내 답안 모두 지우기</button>' +
      '</div>' +
      '<div id="submitMsg" style="margin-top:12px;font-size:.9rem;color:var(--gold)"></div>' +
      '</div></section>';

    html += '<section class="sec">' +
      '<div class="sec-head"><h2>2. 오프라인 확인 코드 (비상용)</h2><span class="pill">인터넷 연결이 불안정할 때</span></div>' +
      '<p class="lead">교실 와이파이가 잠시 끊겼을 때는 아래 확인 코드를 복사해 선생님께 보여 드리세요.</p>' +
      '<div class="code-box" id="verifyCodeBox">' + esc(code) + '</div>' +
      '<div style="margin-top:10px"><button type="button" class="btn sm" id="copyCodeBtn">확인 코드 복사하기</button></div>' +
      '</section>';

    if (TEACHER) {
      html += '<section class="sec">' +
        '<div class="card" style="border-color:var(--gold)">' +
        '<h3>교사용 확인 코드 해독기 (?교사 전용)</h3>' +
        '<p>학생이 복사해 온 <code>PP1-...</code> 확인 코드를 붙여넣으면 학번·이름·점수를 바로 확인해요.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
        '<input type="text" id="decodeInput" placeholder="PP1-... 코드 붙여넣기" style="flex:1;min-width:220px;padding:8px 12px;border-radius:8px;border:1px solid var(--line2);background:var(--bg);color:var(--text)">' +
        '<button type="button" class="btn sm primary" id="decodeBtn">코드 해독</button>' +
        '</div>' +
        '<div id="decodeOut" style="margin-top:10px;font-size:.9rem;color:var(--gold)"></div>' +
        '</div></section>';
    }

    return html;
  }

  /* ---------- 화면 그리기 및 이벤트 바인딩 ---------- */
  function render() {
    AE.stop();
    var rawHash = (location.hash || '#start').replace(/^#/, '');
    // 마당 직접 해시 (#chun, #heung, #su, #sim, #jeok) 지원
    if (STORIES[rawHash]) {
      S.madang = rawHash;
      save();
      curPage = 'story';
    } else if (rawHash === 'home') {
      curPage = 'start';
    } else if (rawHash === 'rhythm-lab') {
      curPage = 'c2';
    } else if (rawHash === 'compare') {
      curPage = 'c4';
    } else if (PAGES.some(function (p) { return p.id === rawHash; })) {
      curPage = rawHash;
    } else {
      curPage = 'start';
    }

    applyPrefs();
    renderNav();
    renderPager();

    var view = document.getElementById('view');
    if (!view) return;

    if (curPage === 'start') view.innerHTML = pageStart();
    else if (curPage === 'c1') view.innerHTML = pageC1();
    else if (curPage === 'story') view.innerHTML = pageStory();
    else if (curPage === 'c2') view.innerHTML = pageC2();
    else if (curPage === 'c3') view.innerHTML = pageC3();
    else if (curPage === 'c4') view.innerHTML = pageC4();
    else if (curPage === 'c5') view.innerHTML = pageC5();
    else if (curPage === 'quiz') view.innerHTML = pageQuiz();
    else if (curPage === 'submit') view.innerHTML = pageSubmit();

    bindViewEvents();
    window.scrollTo(0, 0);
  }

  function bindViewEvents() {
    var view = document.getElementById('view');
    if (!view) return;

    // 시작 화면 QR 생성
    var qrMount = document.getElementById('qrMount');
    if (qrMount && window.QRCode) {
      qrMount.innerHTML = '';
      try {
        new window.QRCode(qrMount, { text: SHARE_URL, width: 112, height: 112, colorDark: '#100f17', colorLight: '#ffffff' });
      } catch (e) {}
    }
    var copyUrlBtn = document.getElementById('copyUrlBtn');
    if (copyUrlBtn) {
      copyUrlBtn.onclick = function () {
        if (navigator.clipboard) navigator.clipboard.writeText(SHARE_URL);
        toast('수업 주소를 복사했어요!');
      };
    }
    var bigQrBtn = document.getElementById('bigQrBtn');
    if (bigQrBtn && qrMount) {
      bigQrBtn.onclick = function () {
        qrMount.style.transform = qrMount.style.transform ? '' : 'scale(1.85)';
        qrMount.style.transformOrigin = 'left center';
        qrMount.style.transition = 'transform .2s';
      };
    }

    // 장단 실험실 바인딩 (#c2)
    bindLabEvents();

    // 생각 스펙트럼 드래그 바인딩 (#story)
    bindSpectrumDrag();

    // 퀴즈 버튼 바인딩 (#quiz)
    var quizRestartBtn = document.getElementById('quizRestartBtn');
    if (quizRestartBtn) {
      quizRestartBtn.onclick = function () {
        quizState.idx = 0;
        quizState.picked = null;
        quizState.score = 0;
        quizState.finished = false;
        render();
      };
    }
    var quizNextBtn = document.getElementById('quizNextBtn');
    if (quizNextBtn) {
      quizNextBtn.onclick = function () {
        var pool = getQuizPool();
        if (quizState.idx + 1 < pool.length) {
          quizState.idx++;
          quizState.picked = null;
        } else {
          quizState.finished = true;
          S.done.quiz = true;
          save();
        }
        render();
      };
    }

    // 제출 화면 버튼 바인딩 (#submit)
    var hubSubmitBtn = document.getElementById('hubSubmitBtn');
    if (hubSubmitBtn) {
      hubSubmitBtn.onclick = function () {
        var r = grade();
        var msgEl = document.getElementById('submitMsg');
        if (window.Classroom && typeof window.Classroom.submit === 'function') {
          if (msgEl) msgEl.textContent = '선생님 시트로 전송 중이에요…';
          window.Classroom.submit({
            score: r.score,
            total: r.total,
            wrong: r.wrong,
            answers: r.answers
          }).then(function () {
            S.done.submit = true;
            save();
            renderNav();
            if (msgEl) msgEl.textContent = '✓ 선생님께 제출이 완료되었어요! 수고 많았습니다.';
            toast('선생님께 제출 완료!');
          }).catch(function (err) {
            if (msgEl) msgEl.textContent = '전송 중 오류가 발생했어요. 아래 오프라인 확인 코드를 복사해 주세요. (' + (err && err.message ? err.message : '오류') + ')';
          });
        } else {
          S.done.submit = true;
          save();
          if (msgEl) msgEl.textContent = '✓ 답안이 저장되었어요. 아래 확인 코드를 복사해 선생님께 보여 주세요.';
          toast('확인 코드가 준비되었어요.');
        }
      };
    }
    var printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.onclick = function () { window.print(); };

    var clearAnsBtn = document.getElementById('clearAnsBtn');
    if (clearAnsBtn) {
      clearAnsBtn.onclick = function () {
        if (!confirm('작성한 모든 학습지 답안을 처음 상태로 지울까요?')) return;
        S.ans = {};
        S.done = {};
        save();
        render();
        toast('답안을 모두 지웠어요.');
      };
    }
    var copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
      copyCodeBtn.onclick = function () {
        var box = document.getElementById('verifyCodeBox');
        if (box && navigator.clipboard) navigator.clipboard.writeText(box.textContent || '');
        toast('확인 코드를 복사했어요!');
      };
    }
    var decodeBtn = document.getElementById('decodeBtn');
    if (decodeBtn) {
      decodeBtn.onclick = function () {
        var inp = document.getElementById('decodeInput');
        var out = document.getElementById('decodeOut');
        var d = readCode(inp ? inp.value : '');
        if (!out) return;
        if (!d) out.textContent = '유효하지 않은 코드예요. PP1-로 시작하는 전체 코드를 확인해 주세요.';
        else out.textContent = '학번: ' + d.id + ' · 이름: ' + d.name + ' · 선택형: ' + d.auto + ' · 서술형: ' + d.text + ' · 시각: ' + d.time;
      };
    }
  }

  function bindLabEvents() {
    var mount = document.getElementById('labMount');
    if (!mount) return;
    var p = JANGDAN_PRESETS[curLabIdx] || JANGDAN_PRESETS[0];

    var playBtn = document.getElementById('labPlayBtn');
    if (playBtn) {
      playBtn.onclick = function () {
        if (AE.playingId === p.id) {
          AE.stop();
          playBtn.textContent = '▶ 소리북 장단 재생';
        } else {
          var bpmInput = document.getElementById('labBpm');
          var bpm = bpmInput ? parseInt(bpmInput.value, 10) : p.bpm;
          playBtn.textContent = '■ 소리북 정지';
          AE.start(p, bpm, function (stepIdx) {
            var cells = mount.querySelectorAll('#labSteps .st');
            for (var i = 0; i < cells.length; i++) {
              cells[i].classList.toggle('hit', i === stepIdx);
            }
          });
        }
      };
    }

    var bpmSlider = document.getElementById('labBpm');
    var bpmVal = document.getElementById('labBpmVal');
    if (bpmSlider) {
      bpmSlider.oninput = function () {
        var v = parseInt(bpmSlider.value, 10);
        if (bpmVal) bpmVal.textContent = v;
        AE.bpm = v;
      };
    }
  }

  function bindSpectrumDrag() {
    var wrap = document.getElementById('storyAxesWrap');
    if (!wrap) return;
    var chips = wrap.querySelectorAll('.chip[data-axis-chip]');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        var dragging = false;
        var axKey = chip.getAttribute('data-axis-chip');
        var mKey = chip.getAttribute('data-madang');
        var track = chip.parentElement;

        function moveAt(clientX) {
          if (!track) return;
          var rect = track.getBoundingClientRect();
          var pct = Math.max(6, Math.min(94, Math.round(((clientX - rect.left) / rect.width) * 100)));
          chip.style.left = pct + '%';
          if (!S.axis[axKey]) S.axis[axKey] = {};
          S.axis[axKey][mKey] = pct;
        }

        chip.addEventListener('pointerdown', function (e) {
          dragging = true;
          chip.setPointerCapture(e.pointerId);
          moveAt(e.clientX);
        });
        chip.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          moveAt(e.clientX);
        });
        chip.addEventListener('pointerup', function () {
          if (!dragging) return;
          dragging = false;
          save();
        });
      })(chips[i]);
    }

    var resetBtn = document.getElementById('resetAxesBtn');
    if (resetBtn) {
      resetBtn.onclick = function () {
        S.axis = {};
        save();
        var sec = document.getElementById('sec-spectrum');
        if (sec) {
          var mount = document.getElementById('storyAxesWrap');
          if (mount) mount.outerHTML = renderStoryAxes();
          bindSpectrumDrag();
          toast('생각 스펙트럼을 기본 배치로 되돌렸어요.');
        }
      };
    }
  }

  /* ---------- 전역 위임 클릭/입력 이벤트 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;

    // 1. 플립 카드
    var flip = t.closest('.flip');
    if (flip) {
      flip.classList.toggle('flipped');
      return;
    }

    // 2. 서브 내비 스크롤 이동
    var scrollBtn = t.closest('[data-scroll]');
    if (scrollBtn) {
      e.preventDefault();
      var targetId = scrollBtn.getAttribute('data-scroll');
      var targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // 3. 모든 답 펼치기 / 접기
    var rvToggle = t.closest('[data-toggle-all-rv]');
    if (rvToggle) {
      var details = document.querySelectorAll('#view details.rv');
      var anyClosed = false;
      for (var i = 0; i < details.length; i++) {
        if (!details[i].open) { anyClosed = true; break; }
      }
      for (var j = 0; j < details.length; j++) {
        details[j].open = anyClosed;
      }
      toast(anyClosed ? '이 화면의 모든 예시 답을 펼쳤어요.' : '예시 답을 모두 접었어요.');
      return;
    }

    // 4. 유튜브 인라인 바로 재생 버튼
    var inlineBtn = t.closest('[data-vid-inline]');
    if (inlineBtn) {
      var vidId = inlineBtn.getAttribute('data-vid-inline');
      var vidTitle = inlineBtn.getAttribute('data-vid-title') || '';
      var frame = inlineBtn.closest('.vid-frame');
      if (frame && vidId) {
        frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(vidId) + '?autoplay=1&rel=0" title="' + esc(vidTitle) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
      }
      return;
    }

    // 5. 추임새 & 소리북 단발 버튼
    var chuBtn = t.closest('[data-chu]');
    if (chuBtn) {
      var kind = chuBtn.getAttribute('data-chu');
      AE.playChuimsae(kind);
      var msgs = {
        eolssigu: '“얼씨구!” — 소리꾼이 신명 나는 가락을 시작하거나 분위기를 띄울 때 넣는 추임새예요.',
        jota: '“좋다!” — 소리꾼이 어려운 고음을 뻗어 내거나 한 대목을 멋지게 맺을 때 힘을 실어 주는 추임새예요.',
        jalhanda: '“잘한다!” — 소리꾼의 재치 있는 아니리나 발림, 기교가 빛날 때 칭찬하며 넣는 추임새예요.',
        geureochi: '“그렇지!” — 소리꾼의 말이나 인물의 마음에 깊이 공감하며 맞장구칠 때 넣는 추임새예요.'
      };
      var fb = document.getElementById('chuFeedback');
      if (fb) fb.textContent = msgs[kind] || '';
      return;
    }
    var drumBtn = t.closest('[data-drum]');
    if (drumBtn) {
      var dTok = drumBtn.getAttribute('data-drum');
      AE.hit(dTok, 2);
      var fb2 = document.getElementById('chuFeedback');
      if (fb2) {
        fb2.textContent = dTok === 'hap'
          ? '소리북 합(둥)! — 왼손 손바닥으로 북 가죽을 깊게 치며 오른손 북채를 함께 짚는 첫 박 기둥 소리예요.'
          : '소리북 채(딱!) — 단단한 박달나무 북채로 북통의 나무 테를 경쾌하게 쳐서 정신을 번쩍 들게 하는 소리예요.';
      }
      return;
    }

    // 6. 다섯 마당 탭 선택 (#story)
    var madangBtn = t.closest('[data-select-madang]');
    if (madangBtn) {
      var mKey = madangBtn.getAttribute('data-select-madang');
      if (STORIES[mKey]) {
        AE.stop();
        S.madang = mKey;
        save();
        var mount = document.getElementById('madangMount');
        if (mount) {
          mount.innerHTML = renderMadangShowcase(mKey);
          var tabs = document.querySelectorAll('.madang-tabs .m-tab');
          for (var ti = 0; ti < tabs.length; ti++) {
            var isMatch = tabs[ti].getAttribute('data-select-madang') === mKey;
            tabs[ti].setAttribute('aria-selected', isMatch ? 'true' : 'false');
          }
          var secM = document.getElementById('sec-madang');
          if (secM) secM.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          location.hash = '#' + mKey;
        }
      }
      return;
    }

    // 7. 마당 쇼케이스 내부 소리북 장단 바로 듣기 버튼
    var storyBeatBtn = t.closest('[data-story-beat]');
    if (storyBeatBtn) {
      var pId = storyBeatBtn.getAttribute('data-story-beat');
      var pr = JANGDAN_PRESETS.find(function (x) { return x.id === pId; });
      if (!pr) return;
      if (AE.playingId === pr.id) {
        AE.stop();
        storyBeatBtn.textContent = '▶ ' + pr.name + ' 소리북 장단 듣기';
      } else {
        storyBeatBtn.textContent = '■ 소리북 멈추기';
        AE.start(pr, pr.bpm);
      }
      return;
    }

    // 8. 장단 실험실 탭 전환 & 박자 칸 클릭
    var labTab = t.closest('[data-lab-idx]');
    if (labTab) {
      AE.stop();
      curLabIdx = parseInt(labTab.getAttribute('data-lab-idx'), 10) || 0;
      var lMount = document.getElementById('labMount');
      if (lMount) {
        lMount.innerHTML = renderRhythmLab();
        bindLabEvents();
      }
      return;
    }
    var stepCell = t.closest('[data-step-hit]');
    if (stepCell) {
      var pr2 = JANGDAN_PRESETS[curLabIdx] || JANGDAN_PRESETS[0];
      var sIdx = parseInt(stepCell.getAttribute('data-step-hit'), 10) || 0;
      var stObj = pr2.steps[sIdx];
      if (stObj && stObj.s) {
        stObj.s.forEach(function (tok) { AE.hit(tok, stObj.a); });
      }
      stepCell.classList.add('hit');
      setTimeout(function () { stepCell.classList.remove('hit'); }, 220);
      return;
    }

    // 9. 비교표 열 강조
    var colCell = t.closest('table.ct [data-col]');
    if (colCell) {
      var tbl = colCell.closest('table.ct');
      var colIdx = colCell.getAttribute('data-col');
      if (tbl && colIdx) {
        var allCells = tbl.querySelectorAll('[data-col]');
        for (var ci = 0; ci < allCells.length; ci++) {
          allCells[ci].classList.toggle('hl', allCells[ci].getAttribute('data-col') === colIdx);
        }
      }
      return;
    }

    // 10. 6장 출구 카드 문장 틀 삽입
    var fillBtn = t.closest('[data-fill-c5]');
    if (fillBtn) {
      var fKind = fillBtn.getAttribute('data-fill-c5');
      var tpl = fKind === '1'
        ? '내가 고른 (      )은 옛 판소리의 (      )은 그대로 지켰지만, (      )으로 새롭게 바꾸었다. 이렇게 이어 가면 (      )해서 뜻깊다.'
        : '판소리가 오늘날 (      )처럼 새로운 음악과 만나는 까닭은, 전통을 박물관에 가두지 않고 오늘날 사람들의 삶과 호흡하기 위해서라고 생각한다.';
      var ta = document.querySelector('textarea[data-q-text="c5a"]');
      if (ta) {
        ta.value = tpl;
        S.ans.c5a = tpl;
        save();
        ta.focus();
        ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('6-1 서술형 답안 칸에 문장 틀을 넣었어요!');
      }
      return;
    }

    // 11. 학습지 선택형 (단일 선택 / 복수 선택)
    var qRadio = t.closest('[data-q-radio]');
    if (qRadio) {
      var qid = qRadio.getAttribute('data-q-radio');
      var val = qRadio.getAttribute('data-val');
      S.ans[qid] = val;
      save();
      var chObj = CHAPTERS.find(function (c) { return c.id === curPage; });
      var sheetEl = document.getElementById('sec-sheet');
      if (chObj && sheetEl) {
        sheetEl.outerHTML = renderSheet(chObj);
        renderNav();
      }
      return;
    }
    var qMulti = t.closest('[data-q-multi]');
    if (qMulti) {
      var mqid = qMulti.getAttribute('data-q-multi');
      var mval = qMulti.getAttribute('data-val');
      var curArr = Array.isArray(S.ans[mqid]) ? S.ans[mqid].slice() : [];
      var pIdx = curArr.indexOf(mval);
      if (pIdx === -1) curArr.push(mval);
      else curArr.splice(pIdx, 1);
      S.ans[mqid] = curArr;
      save();
      var chObj2 = CHAPTERS.find(function (c) { return c.id === curPage; });
      var sheetEl2 = document.getElementById('sec-sheet');
      if (chObj2 && sheetEl2) {
        sheetEl2.outerHTML = renderSheet(chObj2);
        renderNav();
      }
      return;
    }

    // 12. 퀴즈 모드 전환 · 오디오 재생 · 보기 선택
    var qModeBtn = t.closest('[data-qmode]');
    if (qModeBtn) {
      AE.stop();
      quizState.mode = qModeBtn.getAttribute('data-qmode');
      quizState.idx = 0;
      quizState.picked = null;
      quizState.score = 0;
      quizState.finished = false;
      render();
      return;
    }
    var qAudioBtn = t.closest('[data-quiz-audio]');
    if (qAudioBtn) {
      var aId = qAudioBtn.getAttribute('data-quiz-audio');
      var aPreset = JANGDAN_PRESETS.find(function (x) { return x.id === aId; });
      if (!aPreset) return;
      if (AE.playingId === aPreset.id) {
        AE.stop();
        qAudioBtn.textContent = '▶ 이 문제의 소리북 장단 듣기';
      } else {
        qAudioBtn.textContent = '■ 소리북 멈추기';
        AE.start(aPreset, aPreset.bpm);
      }
      return;
    }
    var qPickBtn = t.closest('[data-quiz-pick]');
    if (qPickBtn && quizState.picked == null) {
      AE.stop();
      var pickedIdx = parseInt(qPickBtn.getAttribute('data-quiz-pick'), 10);
      var pool = getQuizPool();
      var curQ = pool[quizState.idx];
      quizState.picked = pickedIdx;
      if (curQ && pickedIdx === curQ.a) quizState.score++;
      render();
      return;
    }
  });

  // 서술형 입력 자동 저장
  document.addEventListener('input', function (e) {
    var ta = e.target.closest('textarea[data-q-text]');
    if (ta) {
      var qid = ta.getAttribute('data-q-text');
      S.ans[qid] = ta.value;
      save();
      renderNav();
    }
  });

  // 키보드로 플립 카드 열기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var flip = e.target.closest && e.target.closest('.flip');
      if (flip) {
        e.preventDefault();
        flip.classList.toggle('flipped');
      }
    }
  });

  /* ---------- 사이드바 도구 모음 바인딩 ---------- */
  function bindShellTools() {
    var burger = document.getElementById('burger');
    var side = document.getElementById('side');
    if (burger && side) {
      burger.onclick = function () { side.classList.toggle('open'); };
    }

    var fsBtns = document.querySelectorAll('[data-fs]');
    for (var i = 0; i < fsBtns.length; i++) {
      fsBtns[i].onclick = function () {
        var delta = parseInt(this.getAttribute('data-fs'), 10) || 0;
        S.fs = Math.max(-1, Math.min(2, (S.fs || 0) + delta));
        save();
        applyPrefs();
      };
    }

    var vmBtns = document.querySelectorAll('[data-vm]');
    for (var j = 0; j < vmBtns.length; j++) {
      vmBtns[j].onclick = function () {
        S.vm = this.getAttribute('data-vm') || 'embed';
        save();
        render();
      };
    }

    var classBtn = document.getElementById('classBtn');
    if (classBtn) {
      classBtn.onclick = function () {
        S.cls = !S.cls;
        if (S.cls) {
          S.fs = 2;
          S.hideSide = true;
          if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function () {});
          }
          toast('교실 모드를 켰어요 (큰 글씨 · 메뉴 숨김)');
        } else {
          S.fs = 0;
          S.hideSide = false;
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
          }
          toast('교실 모드를 껐어요');
        }
        save();
        applyPrefs();
      };
    }

    var fsBtn = document.getElementById('fsBtn');
    if (fsBtn) {
      fsBtn.onclick = function () {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(function () {});
        } else if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(function () {});
        }
      };
    }

    var hideSide = document.getElementById('hideSide');
    if (hideSide) {
      hideSide.onclick = function () {
        S.hideSide = !S.hideSide;
        save();
        applyPrefs();
      };
    }
  }

  /* ---------- classroom.js 이벤트 연동 ---------- */
  document.addEventListener('classroom:away', function () {
    AE.stop();
  });
  document.addEventListener('classroom:switch', function () {
    AE.stop();
    S = loadState();
    render();
  });

  window.addEventListener('hashchange', function () {
    var side = document.getElementById('side');
    if (side) side.classList.remove('open');
    render();
  });

  bindShellTools();
  render();
})();

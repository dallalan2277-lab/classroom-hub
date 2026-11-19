(function () {
  'use strict';

  var CR = window.Classroom || null;
  var ITEMS = window.EXAM_ITEMS || [];
  var VIDEO_ID = window.EXAM_VIDEO_ID || '';
  var TEACHER = !!(CR && CR.teacher);
  var MAX_AWAY = 5;
  var LAST_KEY = 'gugak-exam:last';

  var $ = function (id) { return document.getElementById(id); };
  var qGrid = $('qGrid');
  var filledCnt = $('filledCnt');
  var awayCnt = $('awayCnt');
  var awayBar = $('awayBar');
  var teacherBanner = $('teacherBanner');
  var audioBar = $('audioBar');
  var audioLabel = $('audioLabel');
  var audioHost = $('audioHost');
  var stopAudioBtn = $('stopAudioBtn');
  var wordBankWrap = $('wordBankWrap');
  var examSection = $('examSection');
  var submitBtn = $('submitBtn');
  var submitMsg = $('submitMsg');
  var lockedView = $('lockedView');
  var lockedTitle = $('lockedTitle');
  var lockedMsg = $('lockedMsg');
  var lockedWho = $('lockedWho');
  var lockedAt = $('lockedAt');
  var autoRetryBox = $('autoRetryBox');
  var autoRetryMsg = $('autoRetryMsg');
  var autoRetryBtn = $('autoRetryBtn');

  var introModal = $('introModal');
  var introStartBtn = $('introStartBtn');
  var zoomModal = $('zoomModal');
  var zoomImg = $('zoomImg');
  var zoomCaption = $('zoomCaption');
  var zoomCloseBtn = $('zoomCloseBtn');
  var confirmModal = $('confirmModal');
  var confirmText = $('confirmText');
  var confirmCancelBtn = $('confirmCancelBtn');
  var confirmOkBtn = $('confirmOkBtn');

  var student = { num: '00000', name: '교사 모드' };
  var sid = 'teacher';
  var orderedItems = ITEMS.slice();
  var draft = { sid: '', answers: {}, locked: false, auto: false, submittedAt: '', introSeen: false };
  var playingCode = '';
  var audioTimer = null;
  var submitting = false;
  var autoRetryTimer = null;

  function draftKey(num) {
    return 'gugak-exam:draft:' + num;
  }

  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleItems(list, seedStr) {
    var arr = list.slice();
    var rng = mulberry32(hashSeed(seedStr));
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function readSid(num) {
    if (TEACHER) return 'teacher';
    try {
      var raw = localStorage.getItem('classroom:' + (CR ? CR.ws : 'gugak-exam'));
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.sid) return String(parsed.sid);
      }
    } catch (e) {}
    return String(num || 'guest');
  }

  function loadDraft(num) {
    var base = { sid: sid, answers: {}, locked: false, auto: false, submittedAt: '', introSeen: false };
    try {
      var raw = localStorage.getItem(draftKey(num));
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          if (o.answers && typeof o.answers === 'object') base.answers = o.answers;
          base.locked = !!o.locked;
          base.auto = !!o.auto;
          base.submittedAt = typeof o.submittedAt === 'string' ? o.submittedAt : '';
          base.introSeen = !!o.introSeen;
          if (typeof o.sid === 'string') base.sid = o.sid;
        }
      }
    } catch (e) {}
    return base;
  }

  function saveDraft() {
    try {
      localStorage.setItem(LAST_KEY, student.num);
      localStorage.setItem(draftKey(student.num), JSON.stringify(draft));
    } catch (e) {}
  }

  function formatNow() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function filledCount() {
    var n = 0;
    for (var i = 0; i < ITEMS.length; i++) {
      if (String(draft.answers[ITEMS[i].code] || '').trim()) n++;
    }
    return n;
  }

  function updateProgress() {
    filledCnt.textContent = String(filledCount());
  }

  function updateAwayUI(away) {
    var n = Number(away) || 0;
    awayCnt.textContent = String(n);
    awayBar.classList.toggle('danger', n >= 3);
  }

  function stopAudio() {
    if (audioTimer) {
      clearTimeout(audioTimer);
      audioTimer = null;
    }
    audioHost.textContent = '';
    audioBar.hidden = true;
    playingCode = '';
    var cards = qGrid.querySelectorAll('.q-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove('playing');
      var btn = cards[i].querySelector('.listen-btn');
      if (btn) btn.textContent = '소리 듣기';
    }
  }

  function playItem(item, index) {
    if (playingCode === item.code) {
      stopAudio();
      return;
    }
    stopAudio();
    if (!VIDEO_ID || !item.listen || item.listen.length < 2) return;
    var st = Number(item.listen[0]) || 0;
    var en = Number(item.listen[1]) || (st + 15);
    var fr = document.createElement('iframe');
    fr.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(VIDEO_ID) +
      '?autoplay=1&rel=0&playsinline=1&controls=0&modestbranding=1&disablekb=1&fs=0&start=' + st + '&end=' + en;
    fr.title = '소리 재생';
    fr.tabIndex = -1;
    fr.setAttribute('aria-hidden', 'true');
    fr.allow = 'autoplay; encrypted-media';
    audioHost.appendChild(fr);
    audioLabel.textContent = (index + 1) + '번 문항 소리 재생 중';
    audioBar.hidden = false;
    playingCode = item.code;

    var card = qGrid.querySelector('[data-code="' + item.code + '"]');
    if (card) {
      card.classList.add('playing');
      var btn = card.querySelector('.listen-btn');
      if (btn) btn.textContent = '재생 중 · 멈추기';
    }
    audioTimer = setTimeout(stopAudio, Math.max(4, en - st + 20) * 1000); // 느린 와이파이에서 불러오는 시간 여유(끝은 end= 가 멈춤)
  }

  function setInputsDisabled(disabled) {
    var inputs = qGrid.querySelectorAll('input, button');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = disabled;
    submitBtn.disabled = disabled;
  }

  function showLockedView(isAuto, pendingRetry, errMsg) {
    stopAudio();
    introModal.hidden = true;
    confirmModal.hidden = true;
    zoomModal.hidden = true;
    wordBankWrap.hidden = true;
    examSection.hidden = true;
    lockedView.hidden = false;

    lockedWho.textContent = student.num + ' ' + student.name;
    lockedAt.textContent = draft.submittedAt || formatNow();
    if (pendingRetry) {
      lockedTitle.textContent = '자동 제출 진행 중';
      lockedMsg.textContent = '화면 이탈 5회로 지금까지 쓴 답안을 전송하고 있습니다.';
      autoRetryBox.hidden = false;
      autoRetryMsg.textContent = errMsg || '전송을 시도하고 있습니다. 잠시만 기다려 주세요.';
    } else {
      lockedTitle.textContent = '제출 완료';
      lockedMsg.textContent = isAuto
        ? '화면 이탈이 5회에 달해 지금까지 쓴 답으로 자동 제출했습니다.'
        : '수행평가 답안을 선생님께 제출했습니다.';
      autoRetryBox.hidden = true;
    }
  }

  function renderCards() {
    qGrid.textContent = '';
    for (var i = 0; i < orderedItems.length; i++) {
      (function (item, idx) {
        var val = String(draft.answers[item.code] || '');
        var li = document.createElement('li');
        li.className = 'q-card' + (val.trim() ? ' filled' : '');
        li.setAttribute('data-code', item.code);

        var head = document.createElement('div');
        head.className = 'q-head';
        var numSpan = document.createElement('span');
        numSpan.className = 'q-num';
        numSpan.textContent = (idx + 1) + '번';
        var stSpan = document.createElement('span');
        stSpan.className = 'q-state';
        stSpan.textContent = val.trim() ? '작성함' : '미작성';
        head.appendChild(numSpan);
        head.appendChild(stSpan);

        var pBtn = document.createElement('button');
        pBtn.type = 'button';
        pBtn.className = 'photo-btn';
        pBtn.setAttribute('aria-label', (idx + 1) + '번 사진 크게 보기');
        var img = document.createElement('img');
        img.src = item.img;
        img.alt = (idx + 1) + '번 문항 사진';
        img.loading = 'lazy';
        var zHint = document.createElement('span');
        zHint.className = 'photo-zoom-hint';
        zHint.textContent = '크게 보기';
        pBtn.appendChild(img);
        pBtn.appendChild(zHint);
        pBtn.addEventListener('click', function () {
          zoomImg.src = item.img;
          zoomImg.alt = (idx + 1) + '번 문항 확대 사진';
          zoomCaption.textContent = (idx + 1) + '번 문항 사진';
          zoomModal.hidden = false;
          zoomCloseBtn.focus();
        });

        var hintP = document.createElement('p');
        hintP.className = 'q-hint';
        hintP.textContent = item.hint;

        var actDiv = document.createElement('div');
        actDiv.className = 'q-actions';
        var lBtn = document.createElement('button');
        lBtn.type = 'button';
        lBtn.className = 'listen-btn';
        lBtn.textContent = '소리 듣기';
        lBtn.addEventListener('click', function () {
          playItem(item, idx);
        });
        actDiv.appendChild(lBtn);

        var ansWrap = document.createElement('div');
        ansWrap.className = 'answer-wrap';
        var lbl = document.createElement('label');
        var inputId = 'ans-' + item.code;
        lbl.htmlFor = inputId;
        lbl.textContent = '이름 쓰기';
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.id = inputId;
        inp.className = 'answer-input';
        inp.autocomplete = 'off';
        inp.maxLength = 30;
        inp.placeholder = '보기에서 찾아 쓰세요';
        inp.value = val;
        inp.addEventListener('input', function () {
          draft.answers[item.code] = inp.value;
          var hasVal = !!inp.value.trim();
          li.classList.toggle('filled', hasVal);
          stSpan.textContent = hasVal ? '작성함' : '미작성';
          saveDraft();
          updateProgress();
        });
        ansWrap.appendChild(lbl);
        ansWrap.appendChild(inp);

        li.appendChild(head);
        li.appendChild(pBtn);
        li.appendChild(hintP);
        li.appendChild(actDiv);
        li.appendChild(ansWrap);
        qGrid.appendChild(li);
      })(orderedItems[i], i);
    }
    updateProgress();
  }

  function buildAnswers(isAuto) {
    var out = {};
    for (var i = 0; i < ITEMS.length; i++) {
      var code = ITEMS[i].code;
      out['q:' + code] = String(draft.answers[code] || '').trim();
    }
    out._auto = isAuto ? '1' : '0';
    out._order = orderedItems.map(function (x) { return x.code; }).join(',');
    out._ack = draft.ackAt || '';
    return out;
  }

  function submitExam(isAuto) {
    if (submitting || draft.locked) return;
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      autoRetryTimer = null;
    }
    submitting = true;
    stopAudio();
    submitMsg.textContent = '';
    submitMsg.className = 'submit-msg';

    if (isAuto) {
      setInputsDisabled(true);
      showLockedView(true, true, '답안을 전송하고 있습니다…');
    } else {
      submitBtn.disabled = true;
      submitBtn.textContent = '제출 중…';
    }

    var payload = {
      score: 0,
      total: ITEMS.length,
      wrong: [],
      answers: buildAnswers(isAuto)
    };

    var finish = function (res) {
      submitting = false;
      if (TEACHER || (res && res.teacher)) {
        submitBtn.disabled = false;
        submitBtn.textContent = '제출하기';
        submitMsg.className = 'submit-msg info';
        submitMsg.textContent = '교사 모드 — 기록되지 않아요';
        return;
      }
      if (res && res.ok) {
        draft.locked = true;
        draft.auto = !!isAuto;
        draft.submittedAt = formatNow();
        saveDraft();
        showLockedView(!!isAuto, false, '');
        return;
      }
      var errText = (res && res.error) || '전송에 실패했습니다. 잠시 후 다시 시도하세요.';
      if (isAuto) {
        showLockedView(true, true, errText + ' 5초 뒤 자동으로 다시 보냅니다.');
        autoRetryTimer = setTimeout(function () {
          autoRetryTimer = null;
          submitExam(true);
        }, 5000);
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = '제출하기';
        submitMsg.className = 'submit-msg';
        submitMsg.textContent = errText;
      }
    };

    if (!CR || !CR.submit) {
      finish({ ok: true, offline: true });
      return;
    }
    Promise.resolve()
      .then(function () { return CR.submit(payload); })
      .then(finish, function (e) { finish({ ok: false, error: e && e.message }); });
  }

  stopAudioBtn.addEventListener('click', stopAudio);

  submitBtn.addEventListener('click', function () {
    if (submitting || draft.locked) return;
    var left = ITEMS.length - filledCount();
    confirmText.textContent = left > 0
      ? '아직 쓰지 않은 빈칸이 ' + left + '개 남았습니다. 지금 제출할까요?'
      : '20문항을 모두 작성했습니다. 지금 제출할까요?';
    confirmModal.hidden = false;
    confirmCancelBtn.focus();
  });

  confirmCancelBtn.addEventListener('click', function () {
    confirmModal.hidden = true;
    submitBtn.focus();
  });

  confirmOkBtn.addEventListener('click', function () {
    confirmModal.hidden = true;
    submitExam(false);
  });

  autoRetryBtn.addEventListener('click', function () {
    if (!submitting && !draft.locked) submitExam(true);
  });

  introStartBtn.addEventListener('click', function () {
    draft.introSeen = true;
    draft.ackAt = formatNow(); // 시작 경고 창에서 '이해했습니다'를 누른 시각(답안과 함께 전송)
    saveDraft();
    introModal.hidden = true;
  });

  zoomCloseBtn.addEventListener('click', function () {
    zoomModal.hidden = true;
  });
  zoomModal.addEventListener('click', function (e) {
    if (e.target === zoomModal) zoomModal.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!zoomModal.hidden) zoomModal.hidden = true;
    else if (!confirmModal.hidden) confirmModal.hidden = true;
  });

  document.addEventListener('classroom:away', function (e) {
    stopAudio();
    var away = (e && e.detail && typeof e.detail.away === 'number')
      ? e.detail.away
      : (CR ? CR.away : 0);
    updateAwayUI(away);
    if (!TEACHER && !draft.locked && away >= MAX_AWAY) {
      submitExam(true);
    }
  });

  document.addEventListener('classroom:switch', function () {
    stopAudio();
    try {
      var prev = localStorage.getItem(LAST_KEY) || student.num;
      if (prev) localStorage.removeItem(draftKey(prev));
      localStorage.removeItem(LAST_KEY);
    } catch (e) {}
  });

  function startApp(st) {
    student = st || { num: '00000', name: '교사 모드' };
    sid = readSid(student.num);
    draft = loadDraft(student.num);
    draft.sid = sid;
    saveDraft();

    orderedItems = shuffleItems(ITEMS, student.num + ':' + sid);

    if (TEACHER) {
      teacherBanner.hidden = false;
      awayBar.hidden = true;
    }

    var locked = !TEACHER && ((CR && CR.submitted) || draft.locked);
    updateAwayUI(CR ? CR.away : 0);

    if (locked) {
      draft.locked = true;
      showLockedView(!!draft.auto, false, '');
      return;
    }

    renderCards();
    if (!TEACHER && (CR ? CR.away : 0) >= MAX_AWAY) {
      submitExam(true);
      return;
    }
    if (!TEACHER && !draft.introSeen) {
      introModal.hidden = false;
      introStartBtn.focus();
    }
  }

  if (CR && CR.ready && CR.ready.then) {
    CR.ready.then(startApp);
  } else {
    startApp(student);
  }
})();

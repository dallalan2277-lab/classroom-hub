/*
 * 학생 접속용 QR (시험 머리 오른쪽 작은 QR + 누르면 크게).
 * 교사 미리보기(?교사)에서도 학생 주소(…/gugak-exam/)를 보여 줘요.
 */
(function () {
  'use strict';
  var URL_STUDENT = 'https://dallalan2277-lab.github.io/classroom-hub/gugak-exam/';
  var HIDE_KEY = 'gugak-exam:qr-hidden';

  function make(el, size) {
    el.textContent = '';
    if (!window.QRCode) { el.textContent = URL_STUDENT; return; }
    new window.QRCode(el, { text: URL_STUDENT, width: size, height: size,
      colorDark: '#000000', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  }

  function isTeacherMode() {
    if (window.Classroom && window.Classroom.teacher) return true;
    try {
      var q = new URLSearchParams(location.search);
      if (q.has('교사') || q.has('teacher')) return true;
      var h = decodeURIComponent(location.hash || '');
      return /[?&](교사|teacher)(?=$|[&=])/.test(h);
    } catch (e) { return false; }
  }

  function init() {
    var host = document.getElementById('qrHost');
    if (!host) return;
    if (!isTeacherMode()) {
      host.hidden = true;
      return;
    }
    var hidden = false;
    try { hidden = localStorage.getItem(HIDE_KEY) === '1'; } catch (e) {}

    var thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'qr-thumb';
    thumb.setAttribute('aria-label', '학생용 QR 크게 보기');
    var box = document.createElement('span');
    box.className = 'qr-box';
    thumb.appendChild(box);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'qr-toggle';

    host.appendChild(thumb);
    host.appendChild(toggle);
    make(box, 56);

    var pop = document.createElement('div');
    pop.className = 'qr-pop';
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'true');
    pop.setAttribute('aria-label', '학생용 QR');
    pop.innerHTML = '<div class="qr-pop-card"><h2>패드 카메라로 찍어 시험 열기</h2>' +
      '<div class="qr-pop-box"></div><p class="qr-pop-url"></p>' +
      '<button type="button" class="qr-pop-close">작게 보기</button></div>';
    document.body.appendChild(pop);
    pop.querySelector('.qr-pop-url').textContent = URL_STUDENT;
    var big = pop.querySelector('.qr-pop-box');

    function sync() {
      thumb.hidden = hidden;
      toggle.textContent = hidden ? 'QR 보기' : 'QR 숨기기';
      try { localStorage.setItem(HIDE_KEY, hidden ? '1' : '0'); } catch (e) {}
    }
    function open() {
      var s = Math.max(200, Math.min(window.innerWidth - 80, window.innerHeight - 220, 520));
      make(big, s);
      pop.hidden = false;
      pop.querySelector('.qr-pop-close').focus();
    }
    function close() { pop.hidden = true; }

    thumb.addEventListener('click', open);
    toggle.addEventListener('click', function () { hidden = !hidden; sync(); });
    pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
    pop.querySelector('.qr-pop-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) close(); });
    // 시험 중 화면을 떠나면(이탈) 큰 QR 은 닫아 둬요.
    document.addEventListener('classroom:away', close);
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

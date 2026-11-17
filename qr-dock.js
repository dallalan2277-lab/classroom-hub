/*
 * qr-dock.js — 모든 수업 페이지 상단 우측 상시 학생용 QR 배지 + 스크롤 고정 확대 카드
 *
 * 사용법:
 *   <script src="../qr-dock.js" data-url="..." data-title="수업 제목" defer></script>
 *   옵션: data-mode="bar"(기본, 상단 바 생성) | "attach"(기존 .topbar [data-action="class-qr"] 연결)
 *         data-theme="dark"(기본) | "light"
 *         data-pop-top="64" (확대 카드 top 위치 px)
 */
(function () {
  'use strict';

  var script = document.currentScript || document.querySelector('script[src*="qr-dock.js"]');
  var CFG = {
    url: (script && script.getAttribute('data-url')) || '',
    title: (script && script.getAttribute('data-title')) || '',
    mode: (script && script.getAttribute('data-mode')) || 'bar',
    theme: (script && script.getAttribute('data-theme')) || 'dark',
    popTop: parseInt((script && script.getAttribute('data-pop-top')) || '64', 10) || 64
  };

  function cleanUrl(u) {
    if (u) return u;
    try {
      var loc = new URL(location.href);
      loc.searchParams.delete('교사');
      loc.searchParams.delete('teacher');
      loc.hash = '';
      return loc.toString();
    } catch (e) {
      return location.origin + location.pathname;
    }
  }

  var MINI_QR_SVG =
    '<svg viewBox="0 0 25 25" width="22" height="22" aria-hidden="true" shape-rendering="crispEdges">' +
    '<rect width="25" height="25" fill="#fff"/>' +
    '<path fill="#14110e" d="' +
    'M1 1h7v7H1zM2 2v5h5V2zM3 3h3v3H3z' +
    'M17 1h7v7h-7zM18 2v5h5V2zM19 3h3v3h-3z' +
    'M1 17h7v7H1zM2 18v5h5v-5zM3 19h3v3H3z' +
    'M10 2h2v2h-2zM13 1h2v3h-2zM10 5h3v2h-3zM14 6h2v2h-2z' +
    'M2 10h2v2H2zM5 9h2v3H5zM9 9h3v3H9zM13 10h2v2h-2zM16 9h2v2h-2zM20 9h3v2h-3z' +
    'M1 13h3v2H1zM6 13h2v2H6zM10 13h2v3h-2zM14 12h3v2h-3zM19 12h2v3h-2zM22 13h2v2h-2z' +
    'M10 17h2v2h-2zM13 16h3v3h-3zM17 16h2v2h-2zM21 16h3v2h-3z' +
    'M9 20h2v4H9zM12 21h3v2h-3zM16 19h3v3h-3zM20 20h2v4h-2zM23 21h1v3h-1z' +
    '"/></svg>';

  var CSS = '' +
    '.qd-bar{position:sticky;top:0;z-index:24;height:56px;min-height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px;background:var(--qd-bar-bg,rgba(24,19,15,.94));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--qd-line,var(--line,#3a332a));color:var(--qd-text,var(--text,#f4ede2))}' +
    '.qd-left{display:flex;align-items:center;gap:10px;min-width:0;flex:1}' +
    '.qd-left #burger{position:static!important;top:auto!important;left:auto!important;margin:0;flex-shrink:0;padding:5px 12px;border-radius:999px;font-size:.76rem}' +
    '.qd-title{font-family:var(--sans,inherit);font-size:.94rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--qd-text,var(--text,#f4ede2))}' +
    '.qd-badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:8px;font-size:.72rem;font-weight:600;border:1px solid var(--qd-line,var(--line,#3a332a));background:var(--qd-pill-bg,rgba(255,255,255,.04));color:var(--qd-muted,var(--muted,#c2b8a8));white-space:nowrap;max-width:14em;overflow:hidden;text-overflow:ellipsis}' +
    '.qd-badge:empty{display:none}' +
    '.qd-right{display:flex;align-items:center;gap:8px;flex-shrink:0}' +
    '.qd-right .cr-chip{position:static!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;box-shadow:none;white-space:nowrap;max-width:16em;overflow:hidden;text-overflow:ellipsis}' +
    '.qd-btn{display:inline-flex;align-items:center;gap:9px;padding:5px 13px 5px 7px;border-radius:12px;border:1px solid var(--qd-btn-border,rgba(255,255,255,.18));background:var(--qd-btn-bg,var(--bg3,#26211b));color:var(--qd-text,var(--text,#f4ede2));font:inherit;font-size:.82rem;font-weight:700;line-height:1.2;cursor:pointer;transition:border-color .15s,background .15s,transform .1s;white-space:nowrap}' +
    '.qd-btn:hover{border-color:var(--qd-acc,var(--acc2,#f08a63))}' +
    '.qd-btn[aria-expanded="true"]{border-color:var(--qd-acc,var(--acc,#e8693f));box-shadow:0 0 0 1px var(--qd-acc,var(--acc,#e8693f)) inset}' +
    '.qd-thumb{width:28px;height:28px;border-radius:6px;background:#fff;display:inline-flex;align-items:center;justify-content:center;padding:2px;flex-shrink:0;border:1px solid rgba(0,0,0,.08)}' +
    '.qd-plus{font-size:1.15em;line-height:1;font-weight:500;color:var(--qd-muted,var(--muted,#c2b8a8));margin-left:1px}' +
    '.qd-btn[aria-expanded="true"] .qd-plus{color:var(--qd-acc,var(--acc2,#f08a63))}' +
    /* light mode button (stage-class) */
    '.qd-btn.qd-light{background:#fff;border-color:#d8d2e2;color:#292841;box-shadow:0 1px 3px rgba(40,38,63,.06)}' +
    '.qd-btn.qd-light .qd-plus{color:#5a5470}' +
    '.qd-btn.qd-light[aria-expanded="true"]{border-color:var(--chapter,#345d4b);box-shadow:0 0 0 1px var(--chapter,#345d4b) inset}' +
    '.qd-btn.qd-light[aria-expanded="true"] .qd-plus{color:var(--chapter,#345d4b)}' +
    /* floating expanded QR card — non-blocking, pinned across scroll & page changes */
    '.qd-pop{position:fixed;top:var(--qd-pop-top,64px);right:16px;z-index:2147482900;width:max-content;max-width:calc(100vw - 24px);border-radius:18px;padding:14px 16px;background:var(--qd-pop-bg,#1c1814);border:1px solid var(--qd-pop-border,#4a3b30);color:var(--qd-pop-text,#f4ede2);box-shadow:0 22px 55px rgba(0,0,0,.55);animation:qdPop .16s ease-out}' +
    '.qd-pop.qd-light{background:#fff;border-color:#d8d2e2;color:#292841;box-shadow:0 18px 48px rgba(32,29,56,.2)}' +
    '@keyframes qdPop{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '.qd-pop[hidden]{display:none!important}' +
    '.qd-pop-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}' +
    '.qd-pop-title{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700}' +
    '.qd-dot{width:8px;height:8px;border-radius:50%;background:var(--qd-acc,var(--acc2,#f08a63));display:inline-block}' +
    '.qd-pop.qd-light .qd-dot{background:var(--chapter,#345d4b)}' +
    '.qd-pop-acts{display:flex;align-items:center;gap:6px}' +
    '.qd-mini{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;border-radius:8px;padding:4px 9px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;line-height:1.3}' +
    '.qd-mini:hover{border-color:var(--qd-acc,var(--acc2,#f08a63))}' +
    '.qd-pop.qd-light .qd-mini{border-color:#dcd6e4;background:#f6f4fa;color:#3d3852}' +
    '.qd-pop.qd-light .qd-mini:hover{border-color:var(--chapter,#345d4b)}' +
    '.qd-close{padding:4px 10px;font-size:14px;font-weight:700}' +
    '.qd-qr-wrap{background:#fff;border-radius:12px;padding:12px;margin:0 auto;display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,0,0,.08);line-height:0}' +
    '.qd-qr-slot img,.qd-qr-slot canvas{display:block;max-width:100%;height:auto}' +
    '.qd-qr-fail{max-width:220px;line-height:1.5;font-size:13px;color:#333;padding:8px;text-align:center}' +
    '.qd-hint{margin:10px 0 0;font-size:12px;text-align:center;color:var(--qd-muted,#b8a99a)}' +
    '.qd-pop.qd-light .qd-hint{color:#666678}' +
    '.qd-foot{margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:space-between;gap:10px}' +
    '.qd-pop.qd-light .qd-foot{border-top-color:#e6e2ec}' +
    '.qd-url{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--qd-muted,#9f9486);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px}' +
    '.qd-pop.qd-light .qd-url{color:#6b657b}' +
    '.qd-copy{border:0;background:none;padding:2px 4px;font:inherit;font-size:12px;font-weight:700;color:var(--qd-acc,var(--acc2,#f08a63));cursor:pointer;white-space:nowrap}' +
    '.qd-pop.qd-light .qd-copy{color:var(--chapter,#345d4b)}' +
    '@media (max-width:620px){' +
    '  .qd-bar{padding:0 12px;gap:8px}' +
    '  .qd-badge{display:none}' +
    '  .qd-right .cr-chip{max-width:8.5em;padding:4px 9px;font-size:11px}' +
    '  .qd-btn{padding:4px 10px 4px 5px;gap:6px;font-size:12px}' +
    '  .qd-thumb{width:24px;height:24px}' +
    '  .qd-pop{right:12px;padding:12px}' +
    '}' +
    '@media print{.qd-bar,.qd-pop{display:none!important}}';

  var styleInjected = false;
  function injectCSS() {
    if (styleInjected) return;
    styleInjected = true;
    var s = document.createElement('style');
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  var state = {
    open: false,
    large: false,
    url: '',
    btn: null,
    plusEl: null,
    pop: null,
    qrSlot: null,
    sizeBtn: null,
    badgeEl: null,
    renderedSize: 0
  };

  function targetSize() {
    var desired = state.large ? 300 : 220;
    var cap = Math.max(150, Math.min(desired, (window.innerWidth || 800) - 68));
    return cap;
  }

  function renderQR() {
    if (!state.open || !state.qrSlot) return;
    var sz = targetSize();
    if (state.renderedSize === sz && state.qrSlot.firstChild) return;
    state.renderedSize = sz;
    state.qrSlot.innerHTML = '';
    if (typeof window.QRCode === 'undefined') {
      state.qrSlot.innerHTML = '<div class="qd-qr-fail">QR 코드를 불러오지 못했어요.<br>아래 주소를 칠판에 적어 주세요.</div>';
      return;
    }
    try {
      new window.QRCode(state.qrSlot, {
        text: state.url,
        width: sz,
        height: sz,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } catch (e) {
      state.qrSlot.textContent = state.url;
    }
  }

  function syncUI() {
    if (state.btn) {
      state.btn.setAttribute('aria-expanded', String(state.open));
    }
    if (state.plusEl) {
      state.plusEl.textContent = state.open ? '−' : '+';
    }
    if (state.pop) {
      state.pop.hidden = !state.open;
    }
    if (state.sizeBtn) {
      state.sizeBtn.textContent = state.large ? '보통 크기' : '더 크게';
    }
    if (state.open) renderQR();
  }

  function setOpen(next) {
    state.open = !!next;
    syncUI();
  }

  function toggle() {
    setOpen(!state.open);
  }

  function setBadge(text) {
    if (state.badgeEl) state.badgeEl.textContent = text || '';
  }

  function adoptChip(rightBox) {
    if (!rightBox) return;
    var move = function () {
      var chip = document.querySelector('body > .cr-chip');
      if (chip && chip.parentNode !== rightBox) {
        rightBox.insertBefore(chip, rightBox.firstChild);
      }
    };
    move();
    if (typeof MutationObserver !== 'undefined') {
      var obs = new MutationObserver(move);
      obs.observe(document.body, { childList: true });
    }
  }

  function syncBadgeFromNav() {
    var nav = document.getElementById('nav');
    if (!nav || !state.badgeEl) return;
    var active = nav.querySelector('a.on');
    if (!active) return;
    var clone = active.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('i, .dot, .pen'), function (n) { n.remove(); });
    var firstB = clone.querySelector('b');
    if (firstB && /^[▶\d\s]+$/.test(firstB.textContent || '')) firstB.remove();
    var txt = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) setBadge(txt);
  }

  function makeBtnHTML(isLight) {
    return '<span class="qd-thumb" aria-hidden="true">' + MINI_QR_SVG + '</span>' +
      '<span class="qd-label">학생용 QR</span>' +
      '<span class="qd-plus" aria-hidden="true">+</span>';
  }

  function buildPopover(isLight) {
    var pop = document.createElement('section');
    pop.id = 'qdPop';
    pop.className = 'qd-pop' + (isLight ? ' qd-light' : '');
    pop.hidden = true;
    pop.setAttribute('aria-label', '학생용 QR 코드');
    pop.style.setProperty('--qd-pop-top', CFG.popTop + 'px');

    var shortUrl = state.url.replace(/^https?:\/\//, '');
    pop.innerHTML =
      '<div class="qd-pop-head">' +
        '<span class="qd-pop-title"><i class="qd-dot" aria-hidden="true"></i>학생용 QR 코드</span>' +
        '<div class="qd-pop-acts">' +
          '<button type="button" class="qd-mini" id="qdSizeBtn">더 크게</button>' +
          '<button type="button" class="qd-mini qd-close" id="qdCloseBtn" aria-label="QR 접기">−</button>' +
        '</div>' +
      '</div>' +
      '<div class="qd-qr-wrap"><div class="qd-qr-slot" id="qdQrSlot" role="img" aria-label="학생용 주소 QR 코드"></div></div>' +
      '<p class="qd-hint">스크롤하거나 페이지를 넘겨도 고정돼요</p>' +
      '<div class="qd-foot">' +
        '<code class="qd-url" title="' + state.url.replace(/"/g, '&quot;') + '">' + shortUrl.replace(/</g, '&lt;') + '</code>' +
        '<button type="button" class="qd-copy" id="qdCopyBtn">주소 복사</button>' +
      '</div>';

    document.body.appendChild(pop);
    state.pop = pop;
    state.qrSlot = pop.querySelector('#qdQrSlot');
    state.sizeBtn = pop.querySelector('#qdSizeBtn');

    pop.querySelector('#qdCloseBtn').addEventListener('click', function () {
      setOpen(false);
      if (state.btn) state.btn.focus();
    });
    state.sizeBtn.addEventListener('click', function () {
      state.large = !state.large;
      state.renderedSize = 0;
      syncUI();
    });
    var copyBtn = pop.querySelector('#qdCopyBtn');
    copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.textContent = '복사됨 ✓';
        clearTimeout(copyBtn._t);
        copyBtn._t = setTimeout(function () { copyBtn.textContent = '주소 복사'; }, 1800);
      };
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = state.url;
          ta.style.cssText = 'position:fixed;left:-9999px;top:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        } catch (e) {}
        done();
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(state.url).then(done, fallback);
        } else {
          fallback();
        }
      } catch (e) {
        fallback();
      }
    });
  }

  function mountBar() {
    var main = document.querySelector('main');
    if (!main) return;
    var bar = document.createElement('header');
    bar.id = 'qdBar';
    bar.className = 'qd-bar';

    var left = document.createElement('div');
    left.className = 'qd-left';

    var burger = document.getElementById('burger');
    if (burger) left.appendChild(burger);

    var titleEl = document.createElement('b');
    titleEl.className = 'qd-title';
    titleEl.textContent = CFG.title || document.title.split('·')[0].trim();
    left.appendChild(titleEl);

    var badge = document.createElement('span');
    badge.className = 'qd-badge';
    badge.id = 'qdBadge';
    left.appendChild(badge);
    state.badgeEl = badge;

    var right = document.createElement('div');
    right.className = 'qd-right';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'qdBtn';
    btn.className = 'qd-btn' + (CFG.theme === 'light' ? ' qd-light' : '');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'qdPop');
    btn.innerHTML = makeBtnHTML(CFG.theme === 'light');
    right.appendChild(btn);

    bar.appendChild(left);
    bar.appendChild(right);
    main.insertBefore(bar, main.firstChild);

    state.btn = btn;
    state.plusEl = btn.querySelector('.qd-plus');
    btn.addEventListener('click', toggle);

    adoptChip(right);
    syncBadgeFromNav();
    var nav = document.getElementById('nav');
    if (nav && typeof MutationObserver !== 'undefined') {
      new MutationObserver(syncBadgeFromNav).observe(nav, { subtree: true, attributes: true, childList: true });
    }
    window.addEventListener('hashchange', function () { setTimeout(syncBadgeFromNav, 0); });
  }

  function mountAttach() {
    var btn = document.querySelector('[data-action="class-qr"]');
    if (!btn) return;
    btn.className = 'qd-btn' + (CFG.theme === 'light' ? ' qd-light' : '');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'qdPop');
    btn.innerHTML = makeBtnHTML(CFG.theme === 'light');
    state.btn = btn;
    state.plusEl = btn.querySelector('.qd-plus');
  }

  function init() {
    if (document.getElementById('qdPop')) return;
    injectCSS();
    state.url = cleanUrl(CFG.url);
    var isLight = CFG.theme === 'light';
    if (CFG.mode === 'attach') mountAttach();
    else mountBar();
    buildPopover(isLight);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open && !document.body.classList.contains('side-open')) {
        setOpen(false);
        if (state.btn) state.btn.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (state.open) {
        state.renderedSize = 0;
        renderQR();
      }
    });
  }

  window.QrDock = {
    toggle: toggle,
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    setBadge: setBadge
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

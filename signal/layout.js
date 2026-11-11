(() => {
  const sidebar = document.getElementById('lesson-sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  if (!sidebar || !toggle) return;
  const storageKey = 'signal-classroom-menu-collapsed';
  let collapsed = false;
  let start = null;
  let suppressUntil = 0;
  try { collapsed = localStorage.getItem(storageKey) === 'true'; } catch {}

  function render({ focus = false } = {}) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    sidebar.inert = collapsed;
    sidebar.setAttribute('aria-hidden', String(collapsed));
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? '수업 메뉴 펼치기' : '수업 메뉴 접기');
    toggle.title = collapsed ? '수업 메뉴 펼치기' : '수업 메뉴 접기';
    toggle.querySelector('.sidebar-toggle-arrow').textContent = collapsed ? '›' : '‹';
    try { localStorage.setItem(storageKey, String(collapsed)); } catch {}
    if (focus) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => {
    if (Date.now() < suppressUntil) return;
    collapsed = !collapsed;
    render();
  });
  toggle.addEventListener('pointerdown', event => {
    start = { x: event.clientX, y: event.clientY };
    toggle.setPointerCapture?.(event.pointerId);
  });
  toggle.addEventListener('pointerup', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    collapsed = dx < 0;
    suppressUntil = Date.now() + 400;
    render();
  });
  toggle.addEventListener('pointercancel', () => { start = null; });
  let swipe = null;
  sidebar.addEventListener('pointerdown', event => {
    if (event.target instanceof Element && event.target.closest('.lesson-nav')) return;
    if (event.pointerType === 'touch') swipe = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  sidebar.addEventListener('pointerup', event => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      collapsed = true;
      render({ focus: true });
    }
  }, { passive: true });
  render();
})();

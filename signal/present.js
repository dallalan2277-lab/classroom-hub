(() => {
  const body = document.body;
  const presentBtn = document.getElementById('present-toggle');
  const lyricsBtn = document.getElementById('lyrics-present-toggle');
  const footerNow = document.getElementById('footer-now');
  const navButtons = [...document.querySelectorAll('.lesson-nav [data-go]')];
  const KEY = 'signal-present-mode';
  let on = false;
  try { on = localStorage.getItem(KEY) === 'true'; } catch {}

  function render() {
    body.classList.toggle('present', on);
    if (!on) body.classList.remove('present-lyrics');
    presentBtn?.setAttribute('aria-pressed', String(on));
    lyricsBtn?.setAttribute('aria-pressed', String(body.classList.contains('present-lyrics')));
    if (lyricsBtn) lyricsBtn.textContent = body.classList.contains('present-lyrics') ? '가사 전문 접기' : '가사 전문 보기';
    try { localStorage.setItem(KEY, String(on)); } catch {}
  }
  presentBtn?.addEventListener('click', () => { on = !on; render(); });
  lyricsBtn?.addEventListener('click', () => { body.classList.toggle('present-lyrics'); render(); });

  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open]')) return;
    if (event.repeat || event.shiftKey) return;
    // 한글 입력 상태에서도 동작하도록 물리 키(KeyF)로 확인합니다.
    if (event.code === 'KeyF') { on = !on; render(); }
  });

  // 하단에 지금 활동 이름과 예상 시간을 보여 줍니다.
  function syncFooter(index) {
    const btn = navButtons[index];
    if (!btn || !footerNow) return;
    const name = btn.querySelector('.nav-number + span')?.firstChild?.textContent?.trim() || '';
    const time = btn.querySelector('.nav-time')?.textContent || '';
    footerNow.replaceChildren(document.createTextNode(name));
    if (time) { const s = document.createElement('small'); s.textContent = time; footerNow.append(s); }
  }
  window.addEventListener('lesson:slide', e => syncFooter(e.detail?.index ?? 0));
  const shown = document.querySelector('.slide:not([hidden])');
  syncFooter(Number(shown?.dataset.slide || 0));
  render();
})();

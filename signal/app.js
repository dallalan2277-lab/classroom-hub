(() => {
  const slides = Array.from(document.querySelectorAll('.slide[data-slide]'));
  const menu = Array.from(document.querySelectorAll('button[data-go]'));
  const hashes = ['intro', 'story', 'reading', 'form', 'sing', 'check', 'quiz'];
  const oldHashes = { verse1: 2, verse2: 2, memory: 5 };
  if (!slides.length) return;

  let current = 0;
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  function syncNavigation() {
    const reading = current === 2;
    const reader = window.readerState;
    const previousLabel = reading && reader?.index > 0 ? '이전 구간' : '이전 화면';
    const quiz = current === 6 ? window.termQuizState : null;
    const nextLabel = current === 6 ? (quiz?.complete ? '퀴즈 완료' : quiz?.index === quiz?.total - 1 ? '결과 보기' : '다음 문제') : reading ? (reader?.index === reader?.total - 1 ? '구조로 이동' : '다음 구간') : '다음 화면';
    const previous = document.querySelector('.page-controls button[data-prev]');
    const next = document.querySelector('.page-controls button[data-next]');
    if (previous) {
      previous.innerHTML = '<span aria-hidden="true">←</span><span></span>';
      previous.lastElementChild.textContent = previousLabel;
    }
    if (next) {
      next.innerHTML = '<span></span><span aria-hidden="true">→</span>';
      next.firstElementChild.textContent = nextLabel;
      if (current === 6) next.disabled = !quiz?.answered || Boolean(quiz?.complete);
    }
  }
  function advance(direction) {
    if (current === 6 && direction > 0) {
      const quizButton = document.getElementById('term-quiz-next');
      if (quizButton && !quizButton.disabled) quizButton.click();
      return;
    }
    if (current === 2) {
      const readerButton = document.getElementById(direction > 0 ? 'reader-next' : 'reader-prev');
      if (readerButton && !readerButton.disabled) {
        readerButton.click();
        return;
      }
    }
    showSlide(current + direction, { focus: true });
  }

  function showSlide(index, { focus = false, updateHash = true } = {}) {
    if (current === 4 && index !== 4) stopVideo();
    current = Math.max(0, Math.min(slides.length - 1, index));
    document.body.dataset.lessonPage = String(current);
    slides.forEach((slide, i) => {
      slide.hidden = i !== current;
      slide.classList.toggle('active', i === current);
    });
    menu.forEach((button) => {
      const active = Number(button.dataset.go) === current;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const number = String(current + 1).padStart(2, '0');
    const label = slides[current].dataset.label || '';
    setText('page-current', number);
    setText('page-total', String(slides.length).padStart(2, '0'));
    setText('current-section', label);
    setText('page-announcement', `${slides.length}개 화면 중 ${current + 1}번째, ${label}`);
    window.dispatchEvent(new CustomEvent('lesson:slide', { detail: { index: current, label } }));
    const progress = document.getElementById('lesson-progress');
    if (progress) progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    document.querySelectorAll('button[data-prev]').forEach((button) => {
      button.disabled = current === 0;
    });
    document.querySelectorAll('button[data-next]').forEach((button) => {
      button.disabled = current === slides.length - 1;
    });
    if (updateHash && hashes[current] && location.hash !== `#${hashes[current]}`) {
      history.replaceState(null, '', `#${hashes[current]}`);
    }
    if (focus) {
      slides[current].querySelector('.slide-title[tabindex="-1"]')?.focus({ preventScroll: true });
      const activeMenu = menu.find((button) => Number(button.dataset.go) === current);
      if (window.matchMedia('(max-width: 900px)').matches) {
        activeMenu?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    syncNavigation();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled || button.hasAttribute('data-demo')) return;
    if (button.hasAttribute('data-go')) showSlide(Number(button.dataset.go), { focus: true });
    else if (button.hasAttribute('data-next')) advance(1);
    else if (button.hasAttribute('data-prev')) advance(-1);
  });

  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (document.querySelector('dialog[open]')) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (target instanceof Element) {
      const button = target.closest('button');
      const navigationButton = button?.matches('.page-controls button, button[data-next], button[data-prev], .lesson-nav button');
      if (!navigationButton && target.closest('button, [role="group"], fieldset, dialog')) return;
    }
    if (event.key === 'ArrowRight' && (current < slides.length - 1 || current === 6)) {
      event.preventDefault();
      advance(1);
    } else if (event.key === 'ArrowLeft' && current > 0) {
      event.preventDefault();
      advance(-1);
    }
  });

  const videoCover = document.getElementById('karaoke-start');
  const videoPlayer = document.getElementById('karaoke-player');
  let videoFrame = null;
  function stopVideo() {
    videoFrame?.remove();
    videoFrame = null;
    if (videoCover) videoCover.hidden = false;
  }
  videoCover?.addEventListener('click', () => {
    if (videoFrame || !videoPlayer) return;
    videoFrame = document.createElement('iframe');
    videoFrame.src = 'https://www.youtube.com/embed/WPCVPGVmHcA?autoplay=1&playsinline=1&rel=0';
    videoFrame.title = '신호등 - 이무진 | 금영 노래방 공식 반주';
    videoFrame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    videoFrame.allowFullscreen = true;
    videoFrame.referrerPolicy = 'strict-origin-when-cross-origin';
    videoCover.hidden = true;
    videoPlayer.append(videoFrame);
  });
  const readHash = () => {
    const hash = location.hash.slice(1);
    if (hash === 'lesson') return;
    const index = Object.hasOwn(oldHashes, hash) ? oldHashes[hash] : hashes.indexOf(hash);
    showSlide(index < 0 ? 0 : index, { updateHash: false });
    if (hash === 'verse2') document.getElementById('reader-jump-two')?.click();
  };
  window.addEventListener('hashchange', readHash);
  window.addEventListener('reader:state', syncNavigation);
  window.addEventListener('termquiz:state', syncNavigation);
  document.title = '신호등 | 한 소절씩, 이해하며 부르기';
  readHash();
})();

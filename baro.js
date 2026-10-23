/* Presentation only: no telephone or backend connection. */
'use strict';
(() => {
  const root = document.getElementById('baro-sales');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const disclosure = $('.project-disclosure');
  const phone = $('.baro-phone');
  const slideWindow = $('.baro-slide-window');
  // Share the available width across live UI and captures; rotate the outer frame separately.
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width > 0) slideWindow.style.setProperty('--baro-phone-scale', width / 280);
  }).observe(slideWindow);
  const dialog = $('#baro-image-dialog');
  const slides = $$('[data-baro-slide]');
  const slideNames = ['전화 수신', '고객 목록', '일정 관리', '입력 내용 확인'];
  let slideIndex = 0;
  let returnFocus = null, previousOverflow = '', revealTimer, hasPlayed = false;
  function replay(announce = false) {
    clearTimeout(revealTimer);
    phone.classList.toggle('is-arriving', !motion.matches);
    const reveal = () => {
      phone.classList.remove('is-arriving');
      if (announce) $('#baro-call-announcement').textContent = '김민수님의 고객 카드가 표시되었습니다.';
    };
    if (motion.matches) reveal(); else revealTimer = setTimeout(reveal, 750);
  }
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && disclosure.open && !hasPlayed) { hasPlayed = true; replay(); }
  }, {threshold:.35}).observe(phone);
  $('[data-baro-replay]').addEventListener('click', () => replay(true));
  function showSlide(step) {
    slideIndex = (slideIndex + step + slides.length) % slides.length;
    slides.forEach((slide, index) => { slide.hidden = index !== slideIndex; });
    $('#baro-slide-title').textContent = slideNames[slideIndex];
    $('#baro-slide-count').textContent = `${slideIndex + 1} / ${slides.length}`;
    $('#baro-slide-source').textContent = slideIndex === 0 ? '고객 카드 웹 재현 / 샘플 데이터' : '실제 앱 검증 캡처 / 2026.10.21';
    $('[data-baro-replay]').hidden = slideIndex !== 0;
    $('#baro-slide-announcement').textContent = `${slideIndex + 1} / ${slides.length}, ${slideNames[slideIndex]}`;
    if (slideIndex === 0) replay();
  }
  $$('[data-baro-step]').forEach(button => button.addEventListener('click', () => showSlide(Number(button.dataset.baroStep))));
  $('.baro-slide-stage').addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showSlide(event.key === 'ArrowRight' ? 1 : -1);
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { clearTimeout(revealTimer); phone.classList.remove('is-arriving'); }
  });
  function openImage(key, title, trigger) {
    returnFocus = trigger; previousOverflow = document.body.style.overflow;
    $('#baro-dialog-title').textContent = title;
    const img = dialog.querySelector('img');
    img.src = `assets/baro/${key}.webp`; img.alt = title + ' / Android 앱 검증 캡처 / 샘플 데이터';
    dialog.showModal(); document.body.style.overflow = 'hidden';
    dialog.querySelector('button').focus();
  }
  $$('[data-baro-image]').forEach(button => button.addEventListener('click', () => openImage(button.dataset.baroImage, button.getAttribute('aria-label').replace(' 크게 보기', ''), button)));
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    returnFocus?.focus({ preventScroll: true });
  });

})();

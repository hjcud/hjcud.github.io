'use strict';
(() => {
  const root = document.querySelector('.compact-baro-screens');
  if (!root) return;
  const preview = root.querySelector('.compact-call-preview');
  const phone = preview.querySelector('.baro-phone');
  const trigger = preview.querySelector('button');
  const secondary = root.querySelector('.compact-baro-secondary');
  const dialog = document.querySelector('.compact-call-dialog');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, played = false, index = 0, previousOverflow = '';
  new ResizeObserver(([entry]) => {
    preview.style.setProperty('--baro-phone-scale', entry.contentRect.width / 280);
  }).observe(preview);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !played && !motion.matches) {
      played = true;
      phone.classList.add('is-arriving');
      setTimeout(() => phone.classList.remove('is-arriving'), 750);
    }
  }, {threshold: .35}).observe(root);
  trigger.addEventListener('click', () => {
    const copy = phone.cloneNode(true);
    copy.classList.remove('is-arriving');
    dialog.querySelector('.compact-call-dialog-body').replaceChildren(copy);
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialog.querySelector('button').focus();
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    trigger.focus({preventScroll: true});
  });
  const screens = [
    ['customers', '고객 목록', '고객 목록과 검색 화면'],
    ['calendar', '일정 관리', '일정 관리 화면']
  ];
  function showSecondary(next) {
    index = (next + screens.length) % screens.length;
    const [key, title, alt] = screens[index];
    secondary.dataset.gallery = `baro-${key}`;
    secondary.setAttribute('aria-label', `바로영업 ${title} 크게 보기`);
    const img = secondary.querySelector('img');
    img.src = `assets/baro/${key}.webp`;
    img.alt = `바로영업 ${alt}`;
  }
  secondary.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showSecondary(index + (event.key === 'ArrowRight' ? 1 : -1));
  });
  setInterval(() => {
    if (!visible || document.hidden || motion.matches || document.querySelector('dialog[open]') || root.matches(':hover') || root.contains(document.activeElement)) return;
    showSecondary(index + 1);
  }, 5000);
})();

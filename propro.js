'use strict';
(() => {
  const project = document.getElementById('propro');
  if (!project) return;
  const carousel = project.querySelector('#propro-carousel');
  const stage = carousel.querySelector('.screenshot-stage');
  const images = [...carousel.querySelectorAll('.carousel-image')];
  const slides = [['propro-ipa', '발음기호 학습'], ['propro-words', '단어 발음 학습'], ['propro-compare', '유사 발음 비교']];
  const disclosure = project.querySelector('.project-disclosure');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pauseButton = project.querySelector('[data-propro-pause]');
  let index = 0, visible = false, hovered = false, focused = false, paused = reduceMotion.matches;
  function updatePause() {
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? '앱 화면 자동 전환 시작' : '앱 화면 자동 전환 일시정지');
    pauseButton.textContent = paused ? '▷' : 'Ⅱ';
  }
  function show(next, manual = false) {
    index = (next + slides.length) % slides.length;
    images.forEach((image, i) => {
      image.classList.toggle('is-current', i === index);
      image.setAttribute('aria-hidden', String(i !== index));
    });
    const [key, title] = slides[index];
    stage.dataset.gallery = key;
    stage.setAttribute('aria-label', title + ' 화면 크게 보기');
    project.querySelector('#propro-caption').textContent = title;
    project.querySelector('#propro-count').textContent = `${index + 1} / ${slides.length}`;
    if (manual) project.querySelector('#propro-slide-status').textContent = `${title}, ${index + 1} / ${slides.length}`;
  }
  project.querySelector('[data-propro-prev]').addEventListener('click', () => show(index - 1, true));
  project.querySelector('[data-propro-next]').addEventListener('click', () => show(index + 1, true));
  pauseButton.addEventListener('click', () => { paused = !paused; updatePause(); });
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
    }
  });
  carousel.addEventListener('mouseenter', () => hovered = true);
  carousel.addEventListener('mouseleave', () => hovered = false);
  carousel.addEventListener('focusin', () => focused = true);
  carousel.addEventListener('focusout', event => { focused = carousel.contains(event.relatedTarget); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, {threshold:.25}).observe(carousel);
  setInterval(() => {
    if (visible && disclosure.open && !hovered && !focused && !paused && !document.hidden && !document.querySelector('#media-dialog')?.open) show(index + 1);
  }, 5000);
  reduceMotion.addEventListener('change', () => { paused = reduceMotion.matches; updatePause(); });
  updatePause();
})();

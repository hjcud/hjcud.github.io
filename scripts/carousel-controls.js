'use strict';
(() => {
  function addControls(container, eventTarget, label) {
    if (container.querySelector('.carousel-arrow')) return;
    if (!eventTarget.id) eventTarget.id = `${container.id || 'baro-secondary'}-stage`;
    container.classList.add('has-carousel-controls');

    function advance(key) {
      eventTarget.dispatchEvent(new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true
      }));
    }

    for (const [direction, key, caption] of [
      ['previous', 'ArrowLeft', '이전 사진'],
      ['next', 'ArrowRight', '다음 사진']
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `carousel-arrow carousel-arrow-${direction}`;
      button.setAttribute('aria-label', `${label} ${caption}`);
      button.setAttribute('aria-controls', eventTarget.id);
      const chevron = document.createElement('span');
      chevron.setAttribute('aria-hidden', 'true');
      button.append(chevron);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        advance(key);
      });
      button.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        event.stopPropagation();
        advance(event.key);
      });
      container.append(button);
    }
  }

  document.querySelectorAll('.screenshot-carousel').forEach(carousel => {
    const stage = carousel.querySelector('.screenshot-stage');
    if (!stage || carousel.querySelectorAll('.carousel-image').length < 2) return;
    const label = carousel.closest('[data-title]')?.dataset.title || '프로젝트';
    addControls(carousel, stage, label);
  });

  const secondary = document.querySelector('.compact-baro-secondary');
  if (secondary) {
    const shell = document.createElement('div');
    shell.className = 'carousel-control-shell';
    shell.id = 'baro-secondary-carousel';
    secondary.before(shell);
    shell.append(secondary);
    addControls(shell, secondary, '바로영업');
  }
})();

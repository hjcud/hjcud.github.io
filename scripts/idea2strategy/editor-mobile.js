'use strict';
(() => {
  const viewport = document.querySelector('.i2s-editor-viewport');
  const iframe = viewport?.querySelector('iframe');
  if (!iframe) return;

  const mobile = matchMedia('(max-width: 760px)');
  const tabStops = [viewport, iframe].map(element => ({
    element,
    tabindex: element.getAttribute('tabindex')
  }));
  const originalLabel = viewport.getAttribute('aria-label');
  const notice = document.createElement('p');
  notice.className = 'i2s-mobile-notice';
  notice.textContent = '전략 편집 체험은 PC에서 이용할 수 있습니다.';
  viewport.append(notice);

  function restoreAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }

  function updateAvailability() {
    notice.hidden = !mobile.matches;
    tabStops.forEach(({element, tabindex}) => {
      if (mobile.matches) element.setAttribute('tabindex', '-1');
      else restoreAttribute(element, 'tabindex', tabindex);
    });
    if (mobile.matches) viewport.setAttribute('aria-label', '전략 편집 체험 안내');
    else restoreAttribute(viewport, 'aria-label', originalLabel);
  }

  updateAvailability();
  mobile.addEventListener('change', updateAvailability);
})();

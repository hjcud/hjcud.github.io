'use strict';
(() => {
  const grid = document.querySelector('.timeline-grid');
  if (!grid) return;
  const projects = [...grid.querySelectorAll('.period[data-project]')]
    .filter(trigger => document.getElementById('preview-' + trigger.dataset.project) instanceof HTMLTemplateElement)
    .sort((a, b) => parseFloat(a.style.getPropertyValue('--start')) - parseFloat(b.style.getPropertyValue('--start')));
  const triggers = new Map(projects.map(trigger => [trigger.dataset.project, trigger]));
  const panel = document.createElement('dialog');
  panel.id = 'timeline-preview';
  panel.className = 'timeline-preview';
  panel.setAttribute('aria-labelledby', 'timeline-preview-title');
  panel.innerHTML = '<nav class="timeline-preview-navigation" aria-label="프로젝트 미리보기 이동"><button type="button" class="timeline-preview-previous"><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button><h2 id="timeline-preview-title"></h2><button type="button" class="timeline-preview-next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5 7 7-7 7"/></svg><span></span></button><button type="button" class="timeline-preview-close" aria-label="미리보기 닫기"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg></button></nav><div class="timeline-preview-surface"><div class="timeline-preview-content"></div></div><p class="sr-only" role="status" id="timeline-preview-status"></p>';
  const content = panel.querySelector('.timeline-preview-content');
  const surface = panel.querySelector('.timeline-preview-surface');
  const navigation = panel.querySelector('.timeline-preview-navigation');
  const title = panel.querySelector('h2');
  const previous = panel.querySelector('.timeline-preview-previous');
  const next = panel.querySelector('.timeline-preview-next');
  const close = panel.querySelector('.timeline-preview-close');
  const status = panel.querySelector('[role="status"]');
  document.body.append(panel);
  let active = null, returnTarget = null, frame = 0, backdropPointer = false;
  const nameOf = trigger => document.getElementById('preview-' + trigger.dataset.project).dataset.title;
  const relative = offset => projects[(projects.indexOf(active) + offset + projects.length) % projects.length];
  const focus = element => element.focus({preventScroll: true});

  function layout() {
    if (!panel.open) return;
    const view = window.visualViewport;
    const width = view?.width ?? document.documentElement.clientWidth;
    const height = view?.height ?? document.documentElement.clientHeight;
    const room = Math.max(160, height - navigation.offsetHeight - 68);
    panel.style.setProperty('--preview-room', Math.floor(room) + 'px');
    const media = content.querySelector('.timeline-preview-media');
    if (!media) return;
    const phones = media.classList.contains('timeline-preview-phones');
    const copyHeight = width <= 760 ? content.querySelector('.timeline-preview-copy').offsetHeight + 20 : 0;
    const available = room - copyHeight - 24;
    media.style.setProperty('--preview-media-height', Math.round(Math.max(phones ? 380 : 180, Math.min(phones ? 500 : 420, available))) + 'px');
    if (phones) {
      const key = Math.round(width) + ':' + Math.round(height);
      if (media.dataset.scrollKey !== key) {
        media.scrollLeft = Math.max(0, (media.scrollWidth - media.clientWidth) / 2);
        media.dataset.scrollKey = key;
      }
      media.tabIndex = media.scrollWidth > media.clientWidth ? 0 : -1;
    }
  }
  function queueLayout() {
    if (panel.open && !frame) frame = requestAnimationFrame(() => { frame = 0; layout(); });
  }
  function render(trigger) {
    if (active) active.setAttribute('aria-expanded', 'false');
    active = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    const template = document.getElementById('preview-' + trigger.dataset.project);
    content.replaceChildren(template.content.cloneNode(true));
    const image = content.querySelector('.timeline-preview-image');
    if (image) {
      const media = document.createElement('div');
      media.className = 'timeline-preview-media';
      image.replaceWith(media);
      media.append(image);
    }
    const detail = content.querySelector('.timeline-preview-detail');
    if (detail) {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<path d="M5 12h14m-6-6 6 6-6 6"/>';
      detail.append(icon);
    }
    title.textContent = nameOf(trigger);
    panel.dataset.projectId = trigger.dataset.project;
    previous.querySelector('span').textContent = nameOf(relative(-1));
    next.querySelector('span').textContent = nameOf(relative(1));
    previous.setAttribute('aria-label', '이전 프로젝트: ' + nameOf(relative(-1)));
    next.setAttribute('aria-label', '다음 프로젝트: ' + nameOf(relative(1)));
    previous.title = nameOf(relative(-1));
    next.title = nameOf(relative(1));
    status.textContent = nameOf(trigger) + ', ' + (projects.indexOf(trigger) + 1) + '/' + projects.length;
    surface.scrollTop = 0;
    layout();
  }
  function open(trigger, {takeFocus = true} = {}) {
    if (!triggers.has(trigger.dataset.project)) return false;
    if (!panel.open) returnTarget = trigger;
    render(trigger);
    if (!panel.open) {
      document.documentElement.classList.add('timeline-preview-open');
      panel.showModal();
      layout();
      if (takeFocus) focus(close);
    }
    return true;
  }
  function dismiss(restore = true) {
    if (!panel.open) return;
    panel.close();
    cleanup();
    if (restore && returnTarget?.isConnected) focus(returnTarget);
  }
  function cleanup() {
    if (panel.open) return;
    document.documentElement.classList.remove('timeline-preview-open');
    active?.setAttribute('aria-expanded', 'false');
    active = null;
  }
  panel.addEventListener('close', cleanup);
  close.addEventListener('click', () => dismiss());
  previous.addEventListener('click', () => render(relative(-1)));
  next.addEventListener('click', () => render(relative(1)));
  panel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('.timeline-preview-phones')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      render(relative(event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  const outside = event => {
    const rect = panel.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  panel.addEventListener('pointerdown', event => { backdropPointer = event.target === panel && outside(event); });
  panel.addEventListener('click', event => {
    if (backdropPointer && event.target === panel && outside(event)) dismiss();
    backdropPointer = false;
    if (event.target.closest('a[href]')) dismiss(false);
  });
  for (const trigger of projects) {
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', nameOf(trigger) + ' 미리보기');
    trigger.removeAttribute('title');
    trigger.addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      open(trigger);
    });
  }
  content.addEventListener('load', queueLayout, true);
  window.addEventListener('resize', queueLayout, {passive: true});
  window.visualViewport?.addEventListener('resize', queueLayout, {passive: true});
  window.portfolioTimelinePreview = Object.freeze({
    show(id, {focus: takeFocus = true} = {}) {
      const trigger = triggers.get(id);
      return !!trigger && open(trigger, {takeFocus});
    },
    hide() { dismiss(false); }
  });
})();

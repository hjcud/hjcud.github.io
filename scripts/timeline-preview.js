'use strict';
(() => {
  const grid = document.querySelector('.timeline-grid');
  if (!grid) return;
  const scroller = grid.closest('.timeline-scroll');
  const triggers = new Map([...grid.querySelectorAll('.period[data-project]')]
    .map(trigger => [trigger.dataset.project, trigger]));
  const panel = document.createElement('section');
  panel.id = 'timeline-preview';
  panel.className = 'timeline-preview';
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog');
  panel.innerHTML = '<div class="timeline-preview-surface"><div class="timeline-preview-content"></div></div><button type="button" class="timeline-preview-close" aria-label="미리보기 닫기"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3 3 10 10M13 3 3 13"/></svg></button>';
  const content = panel.querySelector('.timeline-preview-content');
  const surface = panel.querySelector('.timeline-preview-surface');
  const close = panel.querySelector('.timeline-preview-close');
  document.body.append(panel); // Outside the horizontally scrolling, clipped timeline.

  let active = null, pointerX = null, explicit = false, restoringFocus = false;
  let closeTimer = 0, frame = 0;
  const cancelClose = () => clearTimeout(closeTimer);
  const focus = element => element.focus({preventScroll: true});
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const previewImages = new Map();

  function preloadImages(trigger, priority = 'low') {
    const template = document.getElementById('preview-' + trigger.dataset.project);
    if (!(template instanceof HTMLTemplateElement)) return;
    for (const source of template.content.querySelectorAll('img[src]')) {
      const src = new URL(source.getAttribute('src'), document.baseURI).href;
      if (previewImages.has(src)) {
        if (priority === 'high') previewImages.get(src).fetchPriority = priority;
        continue;
      }
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = priority;
      previewImages.set(src, image);
      image.src = src;
      image.decode().catch(() => {});
    }
  }

  if ('IntersectionObserver' in window && matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !navigator.connection?.saveData) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      triggers.forEach(trigger => preloadImages(trigger));
      observer.disconnect();
    }, {rootMargin: '400px 0px'});
    observer.observe(grid);
  }

  function dismiss(restore = false) {
    if (!active) return;
    const previous = active;
    cancelClose();
    active = null;
    explicit = false;
    previous.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    if (restore && !previous.closest('[inert]') && previous.getClientRects().length) {
      restoringFocus = true;
      try { focus(previous); } finally { restoringFocus = false; }
    }
  }

  function place() {
    if (!active) return false;
    const viewport = window.visualViewport;
    const x0 = viewport?.offsetLeft ?? 0, y0 = viewport?.offsetTop ?? 0;
    const x1 = x0 + (viewport?.width ?? document.documentElement.clientWidth);
    const y1 = y0 + (viewport?.height ?? document.documentElement.clientHeight);
    const clip = scroller.getBoundingClientRect(), lane = active.closest('.timeline-lane').getBoundingClientRect();
    const header = document.querySelector('.header')?.getBoundingClientRect();
    const top = Math.max(y0, header?.bottom ?? y0);
    // The title and dates extend outside the painted bar and are also clickable.
    const rects = [active, ...active.querySelectorAll(':scope > span, :scope > small')]
      .map(el => el.getBoundingClientRect());
    const left = Math.max(x0, clip.left, Math.min(...rects.map(r => r.left)));
    const right = Math.min(x1, clip.right, Math.max(...rects.map(r => r.right)));
    const start = Math.max(top, clip.top, lane.top, Math.min(...rects.map(r => r.top)));
    const end = Math.min(y1, clip.bottom, lane.bottom, Math.max(...rects.map(r => r.bottom)));
    if (right <= left || end <= start || active.closest('[inert]') ||
        getComputedStyle(active).visibility === 'hidden') {
      dismiss();
      return false;
    }

    const margin = 12, gap = 6;
    const above = Math.max(0, start - gap - top - margin);
    const below = Math.max(0, y1 - margin - end - gap);
    const width = Math.min(x1 - x0 > 760 ? 736 : 380, x1 - x0 - margin * 2);
    panel.style.width = width + 'px';
    const media = content.querySelector('.timeline-preview-phones');
    if (media) {
      const scrollKey = Math.round(width) + ':' + Math.round(y1 - y0);
      if (media.dataset.scrollKey !== scrollKey) {
        media.scrollLeft = Math.max(0, (media.scrollWidth - media.clientWidth) / 2);
        media.dataset.scrollKey = scrollKey;
      }
      media.tabIndex = media.scrollWidth > media.clientWidth ? 0 : -1;
    }
    const naturalHeight = content.getBoundingClientRect().height + 2;
    const down = below >= naturalHeight || below >= above;
    const centered = x1 - x0 <= 760 && naturalHeight > Math.max(above, below);
    panel.dataset.side = centered ? 'centered' : down ? 'below' : 'above';
    const viewportRoom = Math.max(0, y1 - top - margin * 2);
    const room = Math.floor(Math.min(viewportRoom, centered ? viewportRoom : Math.max(naturalHeight, down ? below : above)));
    panel.style.setProperty('--preview-room', room + 'px');
    const height = panel.getBoundingClientRect().height;
    const center = clamp(pointerX ?? (left + right) / 2, left, right);
    panel.style.left = Math.round(clamp(center - width / 2, x0 + margin, x1 - margin - width)) + 'px';
    panel.style.top = Math.round(centered
      ? clamp((start + end - height) / 2, top + margin, y1 - margin - height)
      : clamp(down ? end + gap : start - gap - height, top + margin, y1 - margin - height)) + 'px';
    return true;
  }

  function queuePlace() {
    if (active && !frame) frame = requestAnimationFrame(() => { frame = 0; place(); });
  }

  function open(trigger, {takeFocus = false, persist = false, x = null} = {}) {
    const template = document.getElementById('preview-' + trigger.dataset.project);
    if (!(template instanceof HTMLTemplateElement)) return false;
    cancelClose();
    preloadImages(trigger, 'high');
    if (active !== trigger) {
      if (active) active.setAttribute('aria-expanded', 'false');
      active = trigger;
      explicit = false;
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
      const name = content.querySelector('h3')?.textContent.trim() || trigger.querySelector('span')?.textContent.trim();
      panel.setAttribute('aria-label', (name || '프로젝트') + ' 미리보기');
      panel.dataset.projectId = trigger.dataset.project;
      surface.scrollTop = 0;
    }
    explicit ||= persist;
    pointerX = x;
    trigger.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!place()) return false;
    if (takeFocus) focus(panel);
    return true;
  }

  function leave() {
    cancelClose();
    if (!active || explicit) return;
    closeTimer = setTimeout(() => {
      if (active && !explicit && !active.matches(':hover, :focus') &&
          !panel.matches(':hover, :focus-within')) dismiss();
    }, 260);
  }

  for (const [id, trigger] of triggers) {
    if (!(document.getElementById('preview-' + id) instanceof HTMLTemplateElement)) continue;
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    // Avoid the browser's second, overlapping tooltip. Keep the accessible title/date.
    if (trigger.title) {
      if (!trigger.hasAttribute('aria-label')) trigger.setAttribute('aria-label', trigger.title);
      trigger.removeAttribute('title');
    }
    let contact = false;
    trigger.addEventListener('pointerdown', e => { contact = e.pointerType === 'touch' || e.pointerType === 'pen'; });
    trigger.addEventListener('pointercancel', () => { contact = false; });
    trigger.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse' && !panel.contains(document.activeElement)) {
        open(trigger, {x: e.clientX});
      }
    });
    trigger.addEventListener('pointerleave', leave);
    trigger.addEventListener('focus', () => {
      if (!restoringFocus && !contact) open(trigger);
    });
    trigger.addEventListener('click', e => {
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen' || (e.detail > 0 && contact);
      contact = false;
      if (trigger.matches('a[href]') && (!touch || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
        dismiss();
        return; // Preserve the existing link, modifiers and the main app's anchor navigation.
      }
      e.preventDefault();
      e.stopPropagation(); // The page also delegates hash-link clicks at document level.
      open(trigger, {takeFocus: touch || e.detail === 0, persist: touch || e.detail === 0});
    });
    trigger.addEventListener('keydown', e => {
      if (active !== trigger || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'Tab' || e.key === 'ArrowDown') {
        e.preventDefault();
        focus(content.querySelector('[tabindex="0"], a[href]') || close);
      }
    });
  }

  panel.addEventListener('pointerenter', cancelClose);
  panel.addEventListener('pointerleave', leave);
  panel.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !active) return;
    const first = content.querySelector('[tabindex="0"], a[href]') || close;
    if (e.shiftKey && (e.target === first || e.target === panel)) {
      e.preventDefault();
      dismiss(true);
    } else if (!e.shiftKey && e.target === close) {
      // Continue native Tab order from the source, instead of the end of document.
      dismiss(true);
    }
  });
  close.addEventListener('click', () => dismiss(true));
  panel.addEventListener('click', e => {
    if (e.target.closest('a[href]')) dismiss(); // Let normal link activation proceed.
  });
  document.addEventListener('pointerdown', e => {
    if (active && !active.contains(e.target) && !panel.contains(e.target)) dismiss();
  }, true);
  document.addEventListener('focusin', e => {
    if (active && !panel.contains(e.target) && !active.contains(e.target)) dismiss();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && active) {
      const restore = panel.contains(document.activeElement);
      dismiss(restore);
      e.preventDefault();
    }
  });
  document.addEventListener('scroll', e => {
    if (!panel.contains(e.target)) queuePlace();
  }, {capture: true, passive: true});
  window.addEventListener('resize', queuePlace, {passive: true});
  window.visualViewport?.addEventListener('resize', queuePlace, {passive: true});
  window.visualViewport?.addEventListener('scroll', queuePlace, {passive: true});
  new ResizeObserver(queuePlace).observe(grid);
  content.addEventListener('load', queuePlace, true);

  // main app: reveal/scroll the desired timeline item first, then call
  // show(projectId, {focus: true}). Returns false for unknown, hidden or offscreen
  // triggers. focus defaults to true; the function never scrolls or changes the URL.
  window.portfolioTimelinePreview = Object.freeze({
    show(id, {focus: takeFocus = true} = {}) {
      const trigger = triggers.get(id);
      return !!trigger && open(trigger, {takeFocus, persist: true});
    },
    hide() { dismiss(panel.contains(document.activeElement)); }
  });
})();

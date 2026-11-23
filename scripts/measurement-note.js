document.querySelectorAll('.measurement-note').forEach(note => {
  const summary = note.querySelector('summary');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let pinned = false;
  const reveal = () => {
    note.open = true;
    const trigger = summary.getBoundingClientRect();
    const roomAbove = trigger.top - 90;
    const roomBelow = innerHeight - trigger.bottom - 16;
    note.dataset.placement = note.querySelector('.measurement-note-panel').offsetHeight > roomAbove && roomBelow > roomAbove ? 'below' : 'above';
  };
  const close = () => { pinned = false; note.open = false; };
  note.addEventListener('pointerenter', () => {
    if (finePointer.matches) reveal();
  });
  note.addEventListener('pointerleave', () => {
    if (!pinned && !note.contains(document.activeElement)) note.open = false;
  });
  note.addEventListener('focusin', reveal);
  note.addEventListener('focusout', event => {
    if (!note.contains(event.relatedTarget) && !note.matches(':hover')) close();
  });
  summary.addEventListener('click', event => {
    event.preventDefault();
    pinned = !pinned;
    if (pinned) reveal();
    else note.open = false;
  });
  note.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); event.stopPropagation(); }
  });
  document.addEventListener('click', event => {
    if (!note.contains(event.target)) close();
  });
});

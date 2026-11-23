(() => {
  const design = document.querySelector('#pixel-mat .pm-design');
  const connector = design?.querySelector('.pm-process-connector');
  const comparison = design?.querySelector('.pm-comparison');
  const source = design?.querySelector('.pm-before .pm-sprite-frame > svg');
  const target = design?.querySelector('.pm-listed-step .pm-board-img');
  if (!connector || !comparison || !source || !target) return;
  let frame = 0;
  const draw = () => {
    frame = 0;
    const box = design.getBoundingClientRect();
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!box.width || !from.height || !to.height) return;
    const compact = matchMedia('(max-width: 760px)').matches;
    const tx = to.left - box.left - (compact ? 8 : 12);
    const ty = to.top - box.top + to.height * .5;
    let path;
    let angle;
    if (compact) {
      const sy = comparison.getBoundingClientRect().bottom - box.top;
      const outer = -Math.min(20, Math.max(6, box.left - 10));
      const tail = Math.max(8 - box.left, tx - 20);
      path = `M24 ${sy} C-10 ${sy + 10} ${outer} ${sy + 14} ${outer} ${sy + 54} C${outer} ${ty - 28} ${tail} ${ty} ${tx} ${ty}`;
      angle = 0;
    } else {
      const sx = from.left - box.left - 12;
      const sy = from.top - box.top + from.height * .82;
      const outer = -Math.min(44, Math.max(10, box.left - 28));
      const inner = Math.min(-6, outer + 36);
      const loop = sy + (ty - sy) * .4;
      path = `M${sx} ${sy} C${sx - 50} ${sy - 12} ${outer - 2} ${sy - 10} ${outer} ${loop - 42} C${outer} ${loop + 10} ${inner} ${loop + 30} ${inner} ${loop + 4} C${inner} ${loop - 24} ${outer - 24} ${loop - 12} ${outer - 10} ${loop + 28} C${outer + 2} ${ty - 62} ${tx - 40} ${ty - 3} ${tx} ${ty}`;
      angle = Math.atan2(3, 40);
    }
    const length = compact ? 7 : 14;
    const spread = compact ? 5 : 8;
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const ax = tx - length * ux - spread * uy, ay = ty - length * uy + spread * ux;
    const bx = tx - length * ux + spread * uy, by = ty - length * uy - spread * ux;
    connector.setAttribute('viewBox', `0 0 ${box.width} ${ty + 20}`);
    connector.style.height = `${ty + 20}px`;
    connector.querySelectorAll('.pm-connector-line').forEach(line => { line.setAttribute('d', path); line.setAttribute('pathLength', '1'); });
    const head = connector.querySelector('.pm-connector-head');
    head.setAttribute('d', `M${ax} ${ay} Q${tx - length * .4} ${ty + spread * .6} ${tx} ${ty} Q${tx - length * .4} ${ty - spread * .6} ${bx} ${by}`);
    head.setAttribute('pathLength', '1');
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const observer = new ResizeObserver(schedule);
  [design, comparison, source, target].forEach(element => observer.observe(element));
  target.addEventListener('load', schedule);
  document.fonts.ready.then(schedule);
  const reveal = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      connector.classList.add('is-drawn');
      reveal.disconnect();
    }
  }, { threshold: .5 });
  reveal.observe(source);
  reveal.observe(target);
  schedule();
})();

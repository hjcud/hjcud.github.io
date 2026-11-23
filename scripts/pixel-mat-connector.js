(() => {
  const design = document.querySelector('#pixel-mat .pm-design');
  const connector = design?.querySelector('.pm-process-connector');
  const comparison = design?.querySelector('.pm-comparison');
  const source = design?.querySelector('.pm-before .pm-sprite-frame > svg');
  const target = design?.querySelector('.pm-listed-step .pm-board-img');
  const processTitle = design?.querySelector('#pm-process-title');
  if (!connector || !comparison || !source || !target || !processTitle) return;
  const smoothContinuation = points => {
    let path = '';
    for (let i = 0; i < points.length - 1; i++) {
      const previous = points[Math.max(0, i - 1)];
      const start = points[i];
      const end = points[i + 1];
      const next = points[Math.min(points.length - 1, i + 2)];
      const a = [start[0] + (end[0] - previous[0]) / 6, start[1] + (end[1] - previous[1]) / 6];
      const b = [end[0] - (next[0] - start[0]) / 6, end[1] - (next[1] - start[1]) / 6];
      if (i === 0) { a[0] = start[0]; a[1] = start[1] + 12; }
      path += `C${a[0]} ${a[1]} ${b[0]} ${b[1]} ${end[0]} ${end[1]}`;
    }
    return path;
  };
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
      const sy = comparison.getBoundingClientRect().bottom - box.top + 10;
      const outer = -Math.min(20, Math.max(6, box.left - 10));
      const tail = Math.max(8 - box.left, tx - 20);
      path = `M24 ${sy} C-10 ${sy + 10} ${outer} ${sy + 14} ${outer} ${sy + 54} C${outer} ${ty - 28} ${tail} ${ty} ${tx} ${ty}`;
      angle = 0;
    } else {
      const sx = from.left - box.left - 16;
      const sy = from.top - box.top + from.height * .32;
      const outer = -Math.min(44, Math.max(10, box.left - 28));
      const inner = Math.min(-10, outer + 34);
      const loop = sy + (ty - sy) * .52;
      const guardY = processTitle.getBoundingClientRect().bottom - box.top + 16;
      const curl = [
        [outer, loop - 44], [outer + 3, loop - 8],
        [inner - 10, loop + 17], [inner + 3, loop + 4],
        [inner - 7, loop - 12], [outer + 8, loop - 15],
        [outer - 8, loop + 2], [outer - 5, loop + 35]
      ];
      const exit = curl.at(-1), previous = curl.at(-2);
      path = `M${sx} ${sy} C${sx - 52} ${sy - 8} ${outer} ${sy + 24} ${outer} ${loop - 44}`;
      if (box.left >= 72) {
        path += smoothContinuation(curl)
          + `C${exit[0] + (exit[0] - previous[0]) * .6} ${exit[1] + (exit[1] - previous[1]) * .6} ${outer} ${guardY - 24} ${outer} ${guardY}`;
      } else {
        path += `C${outer} ${loop + 8} ${outer} ${guardY - 32} ${outer} ${guardY}`;
      }
      path += `C${outer} ${guardY + 42} ${tx - 40} ${ty - 3} ${tx} ${ty}`;
      angle = Math.atan2(3, 40);
    }
    const length = compact ? 7 : 14;
    const spread = compact ? 5 : 8;
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const ax = tx - length * ux - spread * uy, ay = ty - length * uy + spread * ux;
    const bx = tx - length * ux + spread * uy, by = ty - length * uy - spread * ux;
    connector.setAttribute('viewBox', `0 0 ${box.width} ${ty + 20}`);
    connector.style.height = `${ty + 20}px`;
    connector.querySelector('.pm-connector-line').setAttribute('d', path);
    const revealPath = connector.querySelector('.pm-connector-reveal');
    revealPath.setAttribute('d', path);
    const mask = connector.querySelector('mask');
    mask.setAttribute('width', box.width + 240);
    mask.setAttribute('height', ty + 40);
    const head = connector.querySelector('.pm-connector-head');
    const acx = tx - length * .4 * ux - spread * .6 * uy, acy = ty - length * .4 * uy + spread * .6 * ux;
    const bcx = tx - length * .4 * ux + spread * .6 * uy, bcy = ty - length * .4 * uy - spread * .6 * ux;
    head.setAttribute('d', `M${ax} ${ay} Q${acx} ${acy} ${tx} ${ty} Q${bcx} ${bcy} ${bx} ${by}`);
    head.setAttribute('pathLength', '1');
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const observer = new ResizeObserver(schedule);
  [design, comparison, source, target, processTitle].forEach(element => observer.observe(element));
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

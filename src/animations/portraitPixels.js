import { requestEffectFrame, cancelEffectFrame } from './effectFrames.js';

const ease = value => value * value * (3 - 2 * value);
const random = (min, max) => min + Math.random() * (max - min);

export function createPortraitPixels(image, canvas, host) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const size = Math.round(image.getBoundingClientRect().width);
  if (!size || !image.naturalWidth) throw new Error('Photo unavailable');
  const weak = window.matchMedia?.('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const columns = weak ? 48 : 72;
  const maxHoles = weak ? 600 : 1200;
  const maxParticles = weak ? 800 : 1600;
  const resolution = Math.min(640, Math.round(size * Math.min(window.devicePixelRatio || 1, weak ? 1 : 1.5)));
  const ratio = resolution / size;
  const cell = size / columns;
  const radius = Math.max(22, Math.min(65, size * .15));
  const surfaces = [];
  const holes = new Map();
  let particles = [];
  let disposed = false;
  let visible = true;
  let mode = 'idle';
  let clock = 0;
  let previous = null;
  let lastPaint = -Infinity;
  let lastEmission = -Infinity;
  let slowFrames = 0;
  let observer;
  let resizeObserver;
  const surface = extent => {
    const element = document.createElement('canvas');
    element.width = element.height = extent;
    surfaces.push(element);
    const context = element.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    return [element, context];
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelEffectFrame(draw);
    observer?.disconnect();
    resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', visibilityChanged);
    host.classList.remove('portrait-broken');
    canvas.hidden = true;
    canvas.width = canvas.height = 0;
    surfaces.forEach(element => { element.width = element.height = 0; });
    particles = [];
    holes.clear();
  };
  const schedule = () => {
    if (!disposed && visible && !document.hidden) requestEffectFrame(draw);
  };
  const visibilityChanged = () => {
    cancelEffectFrame(draw);
    previous = null;
    if (particles.length || mode === 'repair') schedule();
  };
  let draw = () => {};
  try {
    const [photo, photoCtx] = surface(resolution);
    const [remaining, remainingCtx] = surface(resolution);
    const [, sampleCtx] = surface(columns);
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    photoCtx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, resolution, resolution);
    remainingCtx.drawImage(photo, 0, 0);
    sampleCtx.drawImage(photo, 0, 0, columns, columns);
    const colors = sampleCtx.getImageData(0, 0, columns, columns).data;
    canvas.width = canvas.height = resolution;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const paint = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(remaining, 0, 0, size, size);
      for (const p of particles) {
        const progress = (clock - p.born) / p.duration;
        if (progress < 0 || progress >= 1) continue;
        const travel = mode === 'repair' ? 1 - ease(progress) : ease(progress);
        const x = p.x + p.dx * travel;
        const y = p.y + p.dy * travel + (mode === 'repair' ? 0 : progress * progress * 18);
        const side = p.side * (mode === 'repair' ? 1 : 1 - progress * .65);
        ctx.globalAlpha = mode === 'repair' ? Math.min(1, progress * 5) : (1 - progress) ** .6;
        ctx.fillStyle = p.color;
        ctx.fillRect(x - side / 2, y - side / 2, side, side);
      }
      ctx.globalAlpha = 1;
      canvas.hidden = false;
      host.classList.add('portrait-broken');
    };
    const restoreTile = tile => {
      remainingCtx.drawImage(photo, tile.sx, tile.sy, tile.sw, tile.sh, tile.sx, tile.sy, tile.sw, tile.sh);
    };
    draw = now => {
      if (disposed || !visible || document.hidden) { previous = null; return; }
      if (previous !== null) clock += Math.min(64, now - previous);
      previous = now;
      if (now - lastPaint < 1000 / 30) { schedule(); return; }
      lastPaint = now;
      const before = performance.now();
      try {
        particles = particles.filter(p => clock - p.born < p.duration);
        if (mode === 'repair') {
          for (const [key, tile] of holes) {
            if (clock >= tile.restoreAt) { restoreTile(tile); holes.delete(key); }
          }
          if (!holes.size) {
            particles = [];
            mode = 'repaired';
            canvas.hidden = true;
            host.classList.remove('portrait-broken');
            previous = null;
            return;
          }
        }
        paint();
        if (performance.now() - before > 12) {
          if (++slowFrames >= 3) { dispose(); return; }
        } else slowFrames = Math.max(0, slowFrames - 1);
      } catch { dispose(); return; }
      if (particles.length || mode === 'repair') schedule();
      else previous = null;
    };
    const shatter = point => {
      if (disposed || !visible || document.hidden || mode !== 'scatter') return;
      const now = performance.now();
      if (now - lastEmission < 45) return;
      lastEmission = now;
      const bounds = host.getBoundingClientRect();
      const x = (point.clientX - bounds.left) * size / bounds.width;
      const y = (point.clientY - bounds.top) * size / bounds.height;
      for (let row = Math.max(0, Math.floor((y - radius) / cell)); row < Math.min(columns, Math.ceil((y + radius) / cell)); row++) {
        for (let col = Math.max(0, Math.floor((x - radius) / cell)); col < Math.min(columns, Math.ceil((x + radius) / cell)); col++) {
          const tx = (col + .5) * cell;
          const ty = (row + .5) * cell;
          if (Math.hypot(tx - x, ty - y) > radius || Math.hypot(tx - size / 2, ty - size / 2) > size * .465) continue;
          const key = row * columns + col;
          if (holes.has(key) || holes.size >= maxHoles || particles.length + 4 > maxParticles) continue;
          const sx = Math.round(col * resolution / columns);
          const sy = Math.round(row * resolution / columns);
          const sw = Math.round((col + 1) * resolution / columns) - sx;
          const sh = Math.round((row + 1) * resolution / columns) - sy;
          const color = `rgb(${colors[key * 4]} ${colors[key * 4 + 1]} ${colors[key * 4 + 2]})`;
          const angle = Math.atan2(ty - y, tx - x) + random(-.6, .6);
          const force = random(15, 65);
          const tile = { x: tx, y: ty, sx, sy, sw, sh, color, dx: Math.cos(angle) * force, dy: Math.sin(angle) * force };
          holes.set(key, tile);
          remainingCtx.clearRect(sx, sy, sw, sh);
          for (let i = 0; i < 4; i++) {
            particles.push({ x: tx + (i % 2 ? 1 : -1) * cell / 4, y: ty + (i < 2 ? -1 : 1) * cell / 4,
              dx: tile.dx + random(-12, 12), dy: tile.dy + random(-12, 12), color, side: cell * random(.18, .4),
              duration: random(550, 950), born: clock });
          }
        }
      }
      schedule();
    };
    const repair = () => {
      mode = 'repair';
      particles = [];
      for (const tile of holes.values()) {
        const delay = random(0, 230);
        const duration = random(420, 650);
        tile.restoreAt = clock + delay + duration;
        if (particles.length < maxParticles) {
          particles.push({ x: tile.x, y: tile.y, dx: tile.dx, dy: tile.dy, side: cell * .55,
            color: tile.color, born: clock + delay, duration });
        }
      }
      schedule();
    };
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      visibilityChanged();
    }, { threshold: .05 });
    observer.observe(host);
    resizeObserver = new ResizeObserver(() => {
      if (Math.abs(image.getBoundingClientRect().width - size) > 1) dispose();
    });
    resizeObserver.observe(host);
    document.addEventListener('visibilitychange', visibilityChanged);
    return {
      get disposed() { return disposed; },
      enter(point) {
        if (disposed || mode === 'repair') return;
        try {
          if (holes.size) repair();
          else { mode = 'scatter'; lastEmission = -Infinity; shatter(point); }
        } catch { dispose(); }
      },
      move(point) { try { shatter(point); } catch { dispose(); } },
      leave() { if (mode === 'scatter') mode = 'idle'; },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}

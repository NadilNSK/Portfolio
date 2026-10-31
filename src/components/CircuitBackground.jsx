import { useEffect, useRef } from 'react';
import { requestEffectFrame as requestAnimationFrame, cancelEffectFrame as cancelAnimationFrame } from '../animations/effectFrames';

const ACCENT = '#7cf03d';
const MAX_BRANCHES = 28;
const MAX_SPARKS = 12;
const random = (min, max) => min + Math.random() * (max - min);

export default function CircuitBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    let branches = [];
    let sparks = [];
    let frame = 0;
    let lastEmission = -Infinity;
    let lastPointer = null;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let lastPaint = -Infinity;
    let tap;
    let lastScroll = window.scrollY;
    let lastScrollBurst = -Infinity;
    const weak = (navigator.hardwareConcurrency || 4) <= 4;
    const limited = () => weak || coarsePointer.matches;
    const ratioCap = () => limited() ? 1 : 1.5;
    const enabled = () => !preference.matches && !document.hidden;

    // World coordinates anchor old trails to the page as the viewport scrolls.
    const makeBranch = (x, y, direction, born, depth = 0) => {
      if (branches.length >= (coarsePointer.matches ? 10 : weak ? 16 : MAX_BRANCHES)) return;
      const points = [{ x, y, distance: 0 }];
      let distance = 0;
      const segments = Math.floor(random(3, limited() ? 5 : 7));
      for (let i = 0; i < segments; i++) {
        direction += Math.floor(random(-2, 3));
        const angle = direction * Math.PI / 4;
        const length = limited() ? random(14, 32) : random(18, 48);
        x += Math.cos(angle) * length;
        y += Math.sin(angle) * length;
        distance += length;
        points.push({ x, y, distance });
      }
      const forkIndex = Math.floor(random(1, points.length - 1));
      branches.push({ points, distance, born, speed: random(.22, .36), lifetime: limited() ? random(1100, 1700) : random(1600, 2300), detail: Math.floor(random(0, 3)), depth, direction, forkIndex, forked: depth > 0 });
    };

    const pointAt = (branch, distance) => {
      const points = branch.points;
      for (let i = 1; i < points.length; i++) {
        if (distance <= points[i].distance) {
          const a = points[i - 1];
          const b = points[i];
          const ratio = Math.max(0, (distance - a.distance) / (b.distance - a.distance));
          return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
        }
      }
      return points[points.length - 1];
    };
    const stroke = (branch, start, end) => {
      const a = pointAt(branch, start);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      for (const p of branch.points) {
        if (p.distance > start && p.distance < end) ctx.lineTo(p.x, p.y);
      }
      const b = pointAt(branch, end);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      branches = [];
      sparks = [];
      lastPointer = null;
      tap = undefined;
      ctx.clearRect(0, 0, width, height);
    };
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, ratioCap());
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      reset();
    };
    const draw = (now) => {
      frame = 0;
      if (!enabled()) { reset(); return; }
      if (Math.min(window.devicePixelRatio || 1, ratioCap()) !== pixelRatio) { resize(); return; }
      if (now - lastPaint < 1000 / 30) {
        frame = requestAnimationFrame(draw);
        return;
      }
      lastPaint = now;
      ctx.clearRect(0, 0, width, height);
      branches = branches.filter(b => now - b.born < b.lifetime);
      sparks = sparks.filter(s => now - s.born < s.lifetime);
      ctx.save();
      ctx.translate(-window.scrollX, -window.scrollY);
      ctx.strokeStyle = ACCENT;
      ctx.fillStyle = ACCENT;
      ctx.shadowColor = ACCENT;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'round';
      // Snapshot prevents newly forked branches being processed in this frame.
      for (const branch of [...branches]) {
        const age = now - branch.born;
        const grown = Math.min(branch.distance, age * branch.speed);
        const fade = Math.min(1, (branch.lifetime - age) / 850);
        ctx.globalAlpha = .24 * fade;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        stroke(branch, 0, grown);
        const fork = branch.points[branch.forkIndex];
        if (!branch.forked && grown >= fork.distance) {
          branch.forked = true;
          if (!coarsePointer.matches || Math.random() < .35) makeBranch(fork.x, fork.y, branch.direction + (Math.random() < .5 ? -2 : 2), now, 1);
        }
        // Two bright packets travel outward, constrained to the grown trace.
        for (const delay of [0, 340]) {
          const head = (age - delay) * branch.speed;
          if (head > 0 && head <= grown) {
            ctx.globalAlpha = .65 * fade;
            ctx.lineWidth = 1.6;
            ctx.shadowBlur = limited() ? 0 : 2;
            stroke(branch, Math.max(0, head - 20), head);
          }
        }
        const tip = pointAt(branch, grown);
        ctx.globalAlpha = .55 * fade;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        if (grown === branch.distance) {
          ctx.globalAlpha = .4 * fade;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
          if (branch.detail === 0) {
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
            ctx.stroke();
          } else if (branch.detail === 1) {
            ctx.strokeRect(tip.x - 4, tip.y - 5, 8, 10);
            ctx.beginPath();
            for (const offset of [-3, 0, 3]) {
              ctx.moveTo(tip.x - 7, tip.y + offset);
              ctx.lineTo(tip.x - 4, tip.y + offset);
              ctx.moveTo(tip.x + 4, tip.y + offset);
              ctx.lineTo(tip.x + 7, tip.y + offset);
            }
            ctx.stroke();
          }
        }
      }
      for (const spark of sparks) {
        const progress = (now - spark.born) / spark.lifetime;
        ctx.globalAlpha = .45 * (1 - progress);
        ctx.lineWidth = .8;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(spark.points[0].x, spark.points[0].y);
        const count = Math.max(2, Math.ceil(progress * spark.points.length));
        for (const p of spark.points.slice(1, count)) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.restore();
      // Stop the animation loop entirely once the last trail has expired.
      if (branches.length || sparks.length) frame = requestAnimationFrame(draw);
    };
    const emit = (x, y, now, gentle = false) => {
      if (!enabled() || now - lastEmission < (gentle ? 180 : 65)) return;
      lastEmission = now;
      const direction = Math.floor(random(0, 8));
      makeBranch(x, y, direction, now);
      if (!gentle) makeBranch(x, y, direction + 4, now);
      if (sparks.length < (limited() ? 4 : MAX_SPARKS)) {
        const angle = random(0, Math.PI * 2);
        const points = [{ x, y }];
        for (let i = 1; i <= 7; i++) {
          const jitter = random(-8, 8);
          points.push({ x: x + Math.cos(angle) * i * 7 - Math.sin(angle) * jitter, y: y + Math.sin(angle) * i * 7 + Math.cos(angle) * jitter });
        }
        sparks.push({ points, born: now, lifetime: random(180, 330) });
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const move = event => {
      if (tap && tap.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12) tap = undefined;
      if (!enabled() || event.pointerType !== 'mouse') return;
      const x = event.clientX + window.scrollX;
      const y = event.clientY + window.scrollY;
      if (lastPointer && Math.hypot(x - lastPointer.x, y - lastPointer.y) < 7) return;
      lastPointer = { x, y };
      emit(x, y, performance.now(), coarsePointer.matches);
    };
    const down = event => {
      if (!enabled() || !event.isPrimary || !['touch', 'pen'].includes(event.pointerType)) return;
      tap = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), scroll: window.scrollY };
    };
    const up = event => {
      const start = tap;
      tap = undefined;
      if (!start || start.id !== event.pointerId || !enabled()) return;
      const now = performance.now();
      if (now - start.at > 500 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Math.abs(window.scrollY - start.scroll) > 6) return;
      emit(event.clientX + window.scrollX, event.clientY + window.scrollY, now, true);
    };
    const scroll = () => {
      tap = undefined;
      const delta = window.scrollY - lastScroll;
      const now = performance.now();
      if (!enabled() || !coarsePointer.matches || Math.abs(delta) < 50 || now - lastScrollBurst < 550) return;
      lastScroll = window.scrollY;
      lastScrollBurst = now;
      emit(window.scrollX + width * random(.18, .82), window.scrollY + height * (delta > 0 ? .72 : .28), now, true);
    };
    const forgetPointer = () => { lastPointer = null; tap = undefined; };
    resize();
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', forgetPointer, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('blur', forgetPointer);
    document.documentElement.addEventListener('pointerleave', forgetPointer);
    document.addEventListener('visibilitychange', reset);
    preference.addEventListener('change', reset);
    coarsePointer.addEventListener('change', resize);
    return () => {
      reset();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', forgetPointer);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', forgetPointer);
      document.documentElement.removeEventListener('pointerleave', forgetPointer);
      document.removeEventListener('visibilitychange', reset);
      preference.removeEventListener('change', reset);
      coarsePointer.removeEventListener('change', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="circuit-background" aria-hidden="true" />;
}

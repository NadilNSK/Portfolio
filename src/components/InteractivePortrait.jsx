import { useEffect, useRef } from 'react';

export default function InteractivePortrait({ alt }) {
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const touch = window.matchMedia('(any-pointer: coarse)');
    let controller;
    let loading = false;
    let cancelled = false;
    let failed = false;
    let inside = false;
    let point;
    const enabled = () => preference.matches && !touch.matches && !cancelled;
    const enter = async event => {
      if (event.pointerType !== 'mouse' || !enabled() || failed) return;
      inside = true;
      point = { clientX: event.clientX, clientY: event.clientY };
      if (controller?.disposed) controller = undefined;
      if (controller) { controller.enter(point); return; }
      if (loading) return;
      loading = true;
      try {
        const { createPortraitPixels } = await import('../animations/portraitPixels.js');
        if (!enabled()) return;
        await image.decode();
        if (!enabled()) return;
        controller = createPortraitPixels(image, canvas, host);
        // An import completing after leave never starts a stale hover effect.
        if (inside) controller.enter(point);
      } catch {
        failed = true;
        controller?.dispose();
        canvas.hidden = true;
      } finally { loading = false; }
    };
    const move = event => {
      if (event.pointerType !== 'mouse' || !enabled()) return;
      point = { clientX: event.clientX, clientY: event.clientY };
      controller?.move(point);
    };
    const leave = () => { inside = false; controller?.leave(); };
    const changed = () => {
      if (!enabled()) {
        inside = false;
        controller?.dispose();
        controller = undefined;
      }
    };
    host.addEventListener('pointerenter', enter);
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    preference.addEventListener('change', changed);
    touch.addEventListener('change', changed);
    return () => {
      cancelled = true;
      controller?.dispose();
      host.removeEventListener('pointerenter', enter);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      preference.removeEventListener('change', changed);
      touch.removeEventListener('change', changed);
    };
  }, []);

  return (
    <div className="img-box">
      <div className="img-item" ref={hostRef}>
        <img ref={imageRef} src="/profile.png" alt={alt} fetchPriority="high" />
        <canvas ref={canvasRef} className="portrait-pixels" aria-hidden="true" hidden />
      </div>
    </div>
  );
}

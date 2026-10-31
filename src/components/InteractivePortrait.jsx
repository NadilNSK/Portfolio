import { useEffect, useRef } from 'react';

export default function InteractivePortrait({ alt }) {
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let controller;
    let loading;
    let cancelled = false;
    let failed = false;
    let inside = false;
    let hoverSession = 0;
    let point;
    let tap;
    let suppressSyntheticClickUntil = 0;
    const enabled = () => !preference.matches && !cancelled;
    const ensureController = () => {
      if (!enabled() || failed) return Promise.resolve(null);
      if (controller?.disposed) controller = undefined;
      if (controller) return Promise.resolve(controller);
      if (loading) return loading;
      loading = (async () => {
        try {
          const { createPortraitPixels } = await import('../animations/portraitPixels.js');
          if (!enabled()) return null;
          await image.decode();
          if (!enabled()) return null;
          controller = createPortraitPixels(image, canvas, host);
          return controller;
        } catch {
          failed = true;
          controller?.dispose();
          canvas.hidden = true;
          return null;
        } finally { loading = undefined; }
      })();
      return loading;
    };
    const enter = async event => {
      if (event.pointerType !== 'mouse' || !enabled()) return;
      inside = true;
      const session = ++hoverSession;
      point = { clientX: event.clientX, clientY: event.clientY };
      const effect = await ensureController();
      // Loading after leave never activates an obsolete hover session.
      if (effect && enabled() && inside && session === hoverSession) effect.enter(point);
    };
    const move = event => {
      if (tap && event.pointerId === tap.id && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) tap = undefined;
      if (event.pointerType !== 'mouse' || !inside || !enabled()) return;
      point = { clientX: event.clientX, clientY: event.clientY };
      controller?.move(point);
    };
    const leave = () => {
      inside = false;
      hoverSession++;
      tap = undefined;
      controller?.leave();
    };
    const activate = async target => {
      const effect = await ensureController();
      if (!effect || !enabled()) return;
      effect.enter(target);
      // Each completed tap/key activation is its own interaction session.
      effect.leave();
    };
    const down = event => {
      if (!enabled() || !event.isPrimary || !['touch', 'pen'].includes(event.pointerType)) return;
      tap = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), scroll: window.scrollY };
    };
    const up = event => {
      const start = tap;
      tap = undefined;
      if (!start || start.id !== event.pointerId || !enabled()) return;
      if (performance.now() - start.at > 500 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 || Math.abs(window.scrollY - start.scroll) > 6) return;
      suppressSyntheticClickUntil = performance.now() + 350;
      activate({ clientX: event.clientX, clientY: event.clientY });
    };
    const cancelTap = () => { tap = undefined; };
    const key = event => {
      if (!enabled() || event.repeat || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      suppressSyntheticClickUntil = performance.now() + 350;
      const bounds = host.getBoundingClientRect();
      activate({ clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 });
    };
    const click = event => {
      // Assistive technology can activate a role=button using a zero-detail click
      // without pointer/keyboard events. Ordinary pointer clicks already ran above.
      if (!enabled() || event.detail !== 0 || performance.now() < suppressSyntheticClickUntil) return;
      const bounds = host.getBoundingClientRect();
      activate({ clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 });
    };
    const changed = () => {
      host.tabIndex = enabled() ? 0 : -1;
      host.setAttribute('aria-disabled', String(!enabled()));
      host.title = finePointer.matches ? 'Hover to scatter pixels; hover again to restore. Enter or Space also works.' : 'Tap to scatter pixels; tap again to restore.';
      if (!enabled()) {
        inside = false;
        hoverSession++;
        tap = undefined;
        controller?.dispose();
        controller = undefined;
      }
    };
    changed();
    host.addEventListener('pointerenter', enter);
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointerdown', down, { passive: true });
    host.addEventListener('pointerup', up, { passive: true });
    host.addEventListener('pointercancel', cancelTap, { passive: true });
    host.addEventListener('keydown', key);
    host.addEventListener('click', click);
    preference.addEventListener('change', changed);
    finePointer.addEventListener('change', changed);
    return () => {
      cancelled = true;
      hoverSession++;
      tap = undefined;
      controller?.dispose();
      host.removeEventListener('pointerenter', enter);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', cancelTap);
      host.removeEventListener('keydown', key);
      host.removeEventListener('click', click);
      preference.removeEventListener('change', changed);
      finePointer.removeEventListener('change', changed);
    };
  }, []);

  return (
    <div className="img-box">
      <div className="img-item portrait-interactive" ref={hostRef} role="button" tabIndex={0}
        aria-label={`${alt}. Hover or tap to scatter pixels, then hover or tap again to restore.`}>
        <img ref={imageRef} src="/profile.png" alt={alt} fetchPriority="high" />
        <canvas ref={canvasRef} className="portrait-pixels" aria-hidden="true" hidden />
      </div>
    </div>
  );
}

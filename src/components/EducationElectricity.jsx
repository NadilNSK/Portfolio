import { useEffect, useRef, useState } from 'react';
import { buildEducationCircuit, buildCertificateCircuits, advanceCircuitPhase } from '../lib/educationCircuit.js';
import { requestEffectFrame, cancelEffectFrame } from '../animations/effectFrames.js';

export default function EducationElectricity({ timelineRef, count, active = false, direction = 'down', layout = 'timeline' }) {
  const svgRef = useRef(null);
  const phaseRef = useRef(0);
  const wasActive = useRef(false);
  const [geometry, setGeometry] = useState({ width: 56, height: 1, circuits: [] });

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || count < 2) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const bounds = timeline.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const position = target => {
        let top = 0;
        let left = 0;
        let node = target;
        while (node && node !== timeline) { top += node.offsetTop; left += node.offsetLeft; node = node.offsetParent; }
        if (node === timeline) return { left, top, width: target.offsetWidth, height: target.offsetHeight };
        const rect = target.getBoundingClientRect();
        return { left: rect.left - bounds.left, top: rect.top - bounds.top, width: rect.width, height: rect.height };
      };
      const entries = [...timeline.children].map(entry => {
        const target = entry.querySelector('.education-status') || entry.querySelector('.education-card-topline') || entry;
        const anchor = position(target);
        return { ...position(entry), anchorY: anchor.top + anchor.height / 2 };
      });
      const width = layout === 'grid' ? bounds.width : parseFloat(window.getComputedStyle(timeline).paddingLeft) || 56;
      const circuits = layout === 'grid' ? buildCertificateCircuits(entries)
        : entries.slice(0, -1).map((entry, index) => buildEducationCircuit(entry.anchorY, entries[index + 1].anchorY, width));
      const next = { width, height: Math.ceil(bounds.height), circuits };
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(timeline);
    [...timeline.children].forEach(entry => observer?.observe(entry));
    window.addEventListener('resize', measure, { passive: true });
    document.fonts?.ready.then(measure).catch(() => {});
    measure();
    return () => { disposed = true; observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [timelineRef, count, layout]);

  useEffect(() => {
    if (!active) { wasActive.current = false; return; }
    const svg = svgRef.current;
    if (!svg || !geometry.circuits.length) return;
    if (!wasActive.current) phaseRef.current = direction === 'up' ? 99.99 : 0;
    wasActive.current = true;
    const flows = [...svg.querySelectorAll('.education-electric-flow')];
    const details = [...svg.querySelectorAll('[data-circuit-at]')].map(node => ({
      node, at: Number(node.dataset.circuitAt), branch: node.tagName.toLowerCase() === 'path',
    }));
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false;
    let visible = true;
    let previous = null;
    let lastPaint = -Infinity;
    const render = () => {
      for (const flow of flows) {
        const phase = (phaseRef.current + Number(flow.dataset.phase || 0)) % 100;
        flow.style.strokeDashoffset = String(100 - phase);
      }
      for (const { node, at, branch } of details) {
        const distance = Math.abs(phaseRef.current - at);
        const proximity = Math.max(0, 1 - Math.min(distance, 100 - distance) / 18);
        node.style.opacity = String(.2 + proximity * .8);
        if (branch) node.style.strokeDashoffset = String(100 - proximity * 100);
      }
    };
    const draw = now => {
      if (cancelled || !visible || document.hidden || preference.matches) { previous = null; return; }
      if (previous !== null) phaseRef.current = advanceCircuitPhase(phaseRef.current, now - previous, direction);
      previous = now;
      if (now - lastPaint >= 1000 / 30) { lastPaint = now; render(); }
      requestEffectFrame(draw);
    };
    const sync = () => {
      cancelEffectFrame(draw);
      previous = null;
      if (!cancelled && visible && !document.hidden && !preference.matches) requestEffectFrame(draw);
    };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      sync();
    }) : null;
    observer?.observe(svg);
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    render();
    sync();
    return () => {
      cancelled = true;
      cancelEffectFrame(draw);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', sync);
      details.forEach(({ node }) => { node.style.opacity = ''; node.style.strokeDashoffset = ''; });
    };
  }, [active, direction, geometry]);

  return (
    <svg ref={svgRef} className="education-electricity" data-active={active} data-direction={direction}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {geometry.circuits.map((circuit, index) => (
        <g key={index}>
          {circuit.tracks.map((track, lane) => (
            <g key={lane}>
              <path className="education-electric-wire" d={track.d} pathLength="100" />
              <path className="education-electric-flow" d={track.d} pathLength="100" data-phase={track.offset} />
              <path className="education-electric-flow education-electric-echo" d={track.d} pathLength="100" data-phase={track.offset + 48} />
            </g>
          ))}
          {circuit.branches.map((branch, branchIndex) => (
            <g key={branchIndex}>
              <path className="education-electric-branch-wire" d={branch.d} />
              <path className="education-electric-branch" d={branch.d} pathLength="100" data-circuit-at={branch.at} />
            </g>
          ))}
          {circuit.pads.map((pad, padIndex) => (
            <g key={padIndex} className="education-electric-pad" transform={`translate(${pad.x} ${pad.y})`} data-circuit-at={pad.at}>
              <rect x={pad.chip ? -2.5 : -1.2} y={pad.chip ? -2 : -1.2} width={pad.chip ? 5 : 2.4} height={pad.chip ? 4 : 2.4} />
              {pad.chip && <path d="M-4 -1L-2.5 -1M-4 1L-2.5 1M2.5 -1L4 -1M2.5 1L4 1" />}
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

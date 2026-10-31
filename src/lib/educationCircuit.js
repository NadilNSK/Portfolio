const pointPath = points => points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');

export function buildEducationCircuit(startY, endY, width) {
  const empty = { tracks: [], branches: [], pads: [] };
  if (![startY, endY, width].every(Number.isFinite) || width < 16 || endY <= startY) return empty;
  const span = endY - startY;
  const bevel = Math.min(width * .1, span * .05);
  const edge = width - 1;
  const circuit = { tracks: [], branches: [], pads: [] };
  for (let lane = 0; lane < 3; lane++) {
    const x = width * [.2, .45, .7][lane];
    const shift = lane === 1 ? -bevel : bevel;
    const points = [[edge, startY], [x + bevel, startY], [x, startY + bevel],
      [x, startY + span * .22], [x + shift, startY + span * .22 + bevel],
      [x + shift, startY + span * .52], [x, startY + span * .52 + bevel],
      [x, endY - bevel], [x + bevel, endY], [edge, endY]];
    circuit.tracks.push({ points, d: pointPath(points), offset: lane * 19 });
    for (let branch = 0; branch < 2; branch++) {
      const y = startY + span * (branch ? .74 : .36);
      const sourceX = branch ? x : x + shift;
      const sign = (lane + branch) % 2 ? -1 : 1;
      const available = sign < 0 ? sourceX - 4 : width - 4 - sourceX;
      const spur = Math.max(0, Math.min(width * .1, span * .04, available / 2));
      const terminalX = sourceX + sign * spur;
      const terminalY = y + spur;
      const branchPoints = [[sourceX, y], [terminalX, terminalY], [terminalX + sign * spur, terminalY]];
      const at = (terminalY - startY) / span * 100;
      circuit.branches.push({ points: branchPoints, d: pointPath(branchPoints), at });
      circuit.pads.push({ x: terminalX + sign * spur, y: terminalY, at, chip: lane === 1 && branch === 1 });
    }
  }
  return circuit;
}

const mapCircuit = (circuit, transform, start, end) => {
  const mapped = { tracks: [], branches: [], pads: [] };
  for (const track of circuit.tracks) {
    const points = track.points.map(transform);
    if (start) points.unshift(start);
    if (end) points.push(end);
    mapped.tracks.push({ ...track, points, d: pointPath(points) });
  }
  for (const branch of circuit.branches) {
    const points = branch.points.map(transform);
    mapped.branches.push({ ...branch, points, d: pointPath(points) });
  }
  for (const pad of circuit.pads) {
    const [x, y] = transform([pad.x, pad.y]);
    mapped.pads.push({ ...pad, x, y });
  }
  return mapped;
};

// Keep bridges in the grid's empty gutters, including the two-column row wrap.
export function buildCertificateCircuits(entries) {
  const circuits = [];
  for (let index = 0; index < entries.length - 1; index++) {
    const source = entries[index];
    const target = entries[index + 1];
    if (!source || !target || ![source.left, source.top, source.width, source.height, target.left, target.top, target.width, target.height].every(Number.isFinite)
      || source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) continue;
    const sourceRight = source.left + source.width;
    const targetRight = target.left + target.width;
    const bottom = source.top + source.height;
    const startX = source.left + source.width / 2;
    const endX = target.left + target.width / 2;
    if (Math.abs(source.top - target.top) < 2 && (sourceRight < target.left || targetRight < source.left)) {
      const from = sourceRight < target.left ? sourceRight : source.left;
      const to = sourceRight < target.left ? target.left : targetRight;
      if (Math.abs(to - from) < 20) continue;
      const anchor = entry => Number.isFinite(entry.anchorY) ? entry.anchorY : entry.top + 36;
      const anchorY = Math.min(anchor(source), anchor(target));
      const strip = Math.min(32, Math.max(16, anchorY - source.top - 2));
      const sign = to > from ? 1 : -1;
      const circuit = buildEducationCircuit(0, Math.abs(to - from), strip);
      circuits.push(mapCircuit(circuit, ([x, y]) => [from + sign * y, anchorY + x - (strip - 1)]));
    } else if (target.top > bottom) {
      const rowBottom = Math.max(bottom, ...entries.filter(entry => entry && Math.abs(entry.top - source.top) < 2
        && Number.isFinite(entry.height) && entry.height > 0).map(entry => entry.top + entry.height));
      const gap = target.top - rowBottom;
      if (Math.abs(startX - endX) < 2) {
        if (gap < 12) continue;
        const strip = 32;
        const circuit = buildEducationCircuit(bottom, target.top, strip);
        circuits.push(mapCircuit(circuit, ([x, y]) => [startX + x - (strip - 1), y]));
      } else if (gap >= 20) {
        const strip = Math.min(32, gap - 4);
        const railTop = rowBottom + 2;
        const sign = endX > startX ? 1 : -1;
        const circuit = buildEducationCircuit(0, Math.abs(endX - startX), strip);
        circuits.push(mapCircuit(circuit, ([x, y]) => [startX + sign * y, railTop + x], [startX, bottom], [endX, target.top]));
      }
    }
  }
  return circuits;
}

// Pass the pointer's coordinate along the layout axis (Y for lists, X for rows).
// Preserve the last accepted coordinate so slow motion accumulates past jitter.
export function updateCircuitMotion(previous, y, index) {
  const validIndex = Number.isInteger(index) ? index : previous?.index ?? 0;
  if (!previous) return { y, index: validIndex, direction: validIndex > 0 ? 'up' : 'down' };
  if (validIndex !== previous.index) return { y, index: validIndex, direction: validIndex > previous.index ? 'down' : 'up' };
  if (Number.isFinite(y) && !Number.isFinite(previous.y)) return { ...previous, y, index: validIndex };
  if (Number.isFinite(y) && Number.isFinite(previous.y) && Math.abs(y - previous.y) >= 6) {
    return { y, index: validIndex, direction: y > previous.y ? 'down' : 'up' };
  }
  return previous;
}

export function advanceCircuitPhase(phase, deltaMs, direction) {
  const step = Math.min(64, Math.max(0, deltaMs)) / 1600 * 100;
  return ((phase + (direction === 'up' ? -step : step)) % 100 + 100) % 100;
}

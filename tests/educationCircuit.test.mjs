import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEducationCircuit, buildCertificateCircuits, updateCircuitMotion, advanceCircuitPhase } from '../src/lib/educationCircuit.js';

test('circuit tracks use straight/45-degree turns with bounded branches and chip details', () => {
  for (const width of [24, 32, 36, 56]) {
    for (const [start, end] of [[42, 310], [65, 982], [20, 22], [20, 10000]]) {
      const circuit = buildEducationCircuit(start, end, width);
      assert.equal(circuit.tracks.length, 3);
      assert.equal(circuit.branches.length, 6);
      assert.equal(circuit.pads.filter(pad => pad.chip).length, 1);
      for (const track of circuit.tracks) {
        assert.deepEqual(track.points[0], [width - 1, start]);
        assert.deepEqual(track.points.at(-1), [width - 1, end]);
        assert.ok(track.points.length <= 10);
      }
      for (const { points } of [...circuit.tracks, ...circuit.branches]) {
        for (let index = 0; index < points.length; index++) {
          const [x, y] = points[index];
          assert.ok(x >= 0 && x < width);
          assert.ok(y >= start && y <= end);
          if (index) {
            const dx = Math.abs(x - points[index - 1][0]);
            const dy = Math.abs(y - points[index - 1][1]);
            assert.ok(dx < 1e-8 || dy < 1e-8 || Math.abs(dx - dy) < 1e-8, 'each turn follows PCB-style geometry');
          }
        }
      }
      assert.ok(circuit.pads.every(pad => pad.x >= 2 && pad.x <= width - 2 && pad.y >= start && pad.y <= end));
    }
  }
});

test('missing adjacent status rows produce no stray circuit', () => {
  for (const args of [[20, 20, 56], [50, 10, 56], [NaN, 20, 56], [0, Infinity, 56], [0, 20, 2]]) {
    assert.deepEqual(buildEducationCircuit(...args), { tracks: [], branches: [], pads: [] });
  }
});

test('moving between education cards selects both directions and slow motion accumulates', () => {
  let motion = updateCircuitMotion(null, 100, 0);
  assert.equal(motion.direction, 'down');
  motion = updateCircuitMotion(motion, 400, 1);
  assert.equal(motion.direction, 'down');
  motion = updateCircuitMotion(motion, 100, 0);
  assert.equal(motion.direction, 'up');
  const start = motion;
  for (const y of [101, 102, 104, 105]) assert.equal(updateCircuitMotion(start, y, 0), start, 'jitter does not reset anchor');
  motion = updateCircuitMotion(start, 106, 0);
  assert.equal(motion.direction, 'down', 'slow accumulated downward movement flips flow');
  motion = updateCircuitMotion(motion, 99, 0);
  assert.equal(motion.direction, 'up');
  assert.equal(updateCircuitMotion(null, 420, 1).direction, 'up', 'entering second card starts from the bottom');
  assert.equal(updateCircuitMotion(null, 80, 0).direction, 'down', 'entering first card starts at the top');
  const focused = updateCircuitMotion(null, null, 1);
  const mouse = updateCircuitMotion(focused, 100, 1);
  assert.equal(mouse.y, 100, 'mouse movement establishes an anchor after keyboard focus');
  assert.equal(updateCircuitMotion(mouse, 108, 1).direction, 'down');
});

test('pulse reversals preserve current phase without resetting or jumping to the other end', () => {
  const origin = 44;
  const down = advanceCircuitPhase(origin, 16, 'down');
  const back = advanceCircuitPhase(down, 16, 'up');
  assert.ok(down > origin);
  assert.ok(Math.abs(back - origin) < 1e-8);
  assert.equal(advanceCircuitPhase(origin, 0, 'up'), origin);
  assert.ok(advanceCircuitPhase(0, 16, 'up') > 98, 'upward flow wraps from bottom');
  assert.ok(advanceCircuitPhase(99.9, 16, 'down') < 2, 'downward flow wraps from top');
  assert.ok(Math.abs(advanceCircuitPhase(origin, 10000, 'down') - origin) <= 4, 'long frame gaps stay bounded');
});

const card = (left, top, width = 300, height = 300) => ({ left, top, width, height, anchorY: top + 36 });
function segmentInsideCard(a, b, rect) {
  let low = 0;
  let high = 1;
  for (const [axis, minimum, maximum] of [[0, rect.left + 1e-7, rect.left + rect.width - 1e-7], [1, rect.top + 1e-7, rect.top + rect.height - 1e-7]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) {
      if (a[axis] < minimum || a[axis] > maximum) return false;
    } else {
      const bounds = [(minimum - a[axis]) / delta, (maximum - a[axis]) / delta].sort((x, y) => x - y);
      low = Math.max(low, bounds[0]);
      high = Math.min(high, bounds[1]);
    }
  }
  return high - low > 1e-10;
}
function assertSafeCertificateCircuits(circuits, cards) {
  for (const circuit of circuits) {
    assert.equal(circuit.tracks.length, 3);
    assert.equal(circuit.branches.length, 6);
    assert.equal(circuit.pads.length, 6);
    for (const { points } of [...circuit.tracks, ...circuit.branches]) {
      assert.ok(points.length <= 12, 'geometry is bounded');
      for (let index = 0; index < points.length; index++) {
        assert.ok(points[index].every(Number.isFinite));
        if (!index) continue;
        const [x, y] = points[index];
        const [px, py] = points[index - 1];
        const dx = Math.abs(x - px);
        const dy = Math.abs(y - py);
        assert.ok(dx < 1e-8 || dy < 1e-8 || Math.abs(dx - dy) < 1e-8, 'rotation preserves 45/90-degree traces');
        for (const rect of cards) assert.equal(segmentInsideCard(points[index - 1], points[index], rect), false, 'trace stays outside card interiors');
      }
    }
    for (const pad of circuit.pads) {
      const rx = pad.chip ? 4 : 1.2; // Include chip pins, not only its rectangle.
      const ry = pad.chip ? 2 : 1.2;
      for (const rect of cards) {
        const overlaps = pad.x + rx > rect.left + 1e-7 && pad.x - rx < rect.left + rect.width - 1e-7
          && pad.y + ry > rect.top + 1e-7 && pad.y - ry < rect.top + rect.height - 1e-7;
        assert.equal(overlaps, false, 'pad and chip extents stay outside cards');
      }
    }
  }
}

test('certificate connectors safely cross horizontal, stacked, and wrapped grid gutters', () => {
  for (const cards of [
    [card(0, 0), card(324, 0), card(648, 0)],
    [card(0, 0), card(0, 324), card(0, 648)],
    [card(0, 0), card(324, 0), card(0, 324)],
    [card(0, 0, 300, 500), card(324, 0, 300, 300), card(0, 524)],
  ]) {
    const circuits = buildCertificateCircuits(cards);
    assert.equal(circuits.length, 2);
    assertSafeCertificateCircuits(circuits, cards);
  }
  const horizontal = buildCertificateCircuits([card(0, 0), card(324, 0)])[0];
  assert.deepEqual(horizontal.tracks[0].points[0], [300, 36]);
  assert.deepEqual(horizontal.tracks[0].points.at(-1), [324, 36]);
  const wrap = buildCertificateCircuits([card(324, 0), card(0, 324)])[0];
  assert.deepEqual(wrap.tracks[0].points[0], [474, 300]);
  assert.deepEqual(wrap.tracks[0].points.at(-1), [150, 324]);
});

test('certificate geometry omits missing, invalid, or unsafe narrow connections', () => {
  for (const cards of [
    [], [card(0, 0)],
    [card(0, 0), card(304, 0)],
    [card(0, 0), card(324, 310)],
    [card(0, 0, 0), card(324, 0)],
    [card(0, 0, 300, -1), card(324, 0)],
    [card(NaN, 0), card(324, 0)],
    [card(0, 0), card(324, Infinity)],
  ]) assert.deepEqual(buildCertificateCircuits(cards), []);
});

test('card-index transitions keep certificate flow correct across the two-column row wrap', () => {
  let motion = updateCircuitMotion(null, 150, 0);
  motion = updateCircuitMotion(motion, 474, 1);
  assert.equal(motion.direction, 'down');
  motion = updateCircuitMotion(motion, 150, 2);
  assert.equal(motion.direction, 'down', 'later card wins over decreasing X at row wrap');
  motion = updateCircuitMotion(motion, 474, 1);
  assert.equal(motion.direction, 'up', 'earlier card wins over increasing X at reverse wrap');
  motion = updateCircuitMotion(motion, 150, 0);
  assert.equal(motion.direction, 'up');
});

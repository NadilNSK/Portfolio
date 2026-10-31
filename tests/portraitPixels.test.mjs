import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortraitPixels } from '../src/animations/portraitPixels.js';
import { requestEffectFrame, cancelEffectFrame } from '../src/animations/effectFrames.js';

function mockBrowser(t, { weak = true, coarse = false } = {}) {
  const descriptors = new Map();
  const install = (key, value) => {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  };
  const frames = new Map();
  const surfaces = [];
  const listeners = new Map();
  const intersections = [];
  const resizes = [];
  const classes = new Set();
  let time = 0;
  let nextFrame = 0;
  let reads = 0;
  let failDrawing = false;
  const makeCanvas = () => {
    const operations = [];
    const context = new Proxy({
      operations,
      drawImage(...args) {
        if (failDrawing) throw new Error('Simulated renderer failure');
        operations.push({ name: 'drawImage', args });
      },
      getImageData(x, y, width, height) {
        reads++;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < data.length; i += 4) data.set([40, 60, 80, 255], i);
        return { data, width, height };
      },
    }, { get(target, key) {
      if (key in target) return target[key];
      return (...args) => operations.push({ name: key, args });
    } });
    const canvas = { width: 0, height: 0, hidden: true, getContext: () => context, context };
    surfaces.push(canvas);
    return canvas;
  };
  const document = {
    hidden: false, createElement: makeCanvas,
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  };
  const window = {
    devicePixelRatio: 3,
    matchMedia: () => ({ matches: coarse }),
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const rect = { width: 360, height: 360, left: 0, top: 0, right: 360, bottom: 360 };
  const host = {
    getBoundingClientRect: () => rect,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
  };
  install('window', window);
  install('document', document);
  install('navigator', { hardwareConcurrency: weak ? 4 : 8, deviceMemory: weak ? 4 : 8 });
  install('performance', { now: () => time });
  install('IntersectionObserver', class {
    constructor(callback) { this.callback = callback; intersections.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  });
  install('ResizeObserver', class {
    constructor(callback) { this.callback = callback; resizes.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  });
  t.after(() => {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const image = { naturalWidth: 1254, naturalHeight: 1254, getBoundingClientRect: () => rect };
  const canvas = makeCanvas();
  return {
    image, canvas, host, rect, classes, surfaces, frames, document, intersections, resizes,
    get reads() { return reads; },
    setTime(value) { time = value; },
    fail() { failDrawing = true; },
    fire(type) { for (const callback of listeners.get(type) || []) callback(); },
    get listenerCount() { return [...listeners.values()].reduce((sum, entries) => sum + entries.size, 0); },
    visible(value) { for (const observer of intersections) observer.callback([{ isIntersecting: value }]); },
    step(value) {
      time = value;
      assert.ok(frames.size <= 1, 'effects share at most one native frame callback');
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(value));
    },
    removals() { return surfaces[2].context.operations.filter(operation => operation.name === 'clearRect'); },
    restorations() { return surfaces[2].context.operations.filter(operation => operation.name === 'drawImage' && operation.args.length === 9); },
  };
}
const center = { clientX: 180, clientY: 180 };

test('shatter erases only cursor-local tiles and samples image data once', t => {
  const browser = mockBrowser(t);
  const controller = createPortraitPixels(browser.image, browser.canvas, browser.host);
  try {
    assert.equal(browser.reads, 1);
    assert.equal(browser.canvas.width, 360, 'weak devices cap DPR at one');
    assert.equal(browser.canvas.hidden, true);
    assert.equal(browser.frames.size, 0, 'initialization has no perpetual loop');
    controller.enter(center);
    browser.step(100);
    const removals = browser.removals();
    assert.ok(removals.length > 0);
    assert.ok(removals.length <= 200, '800-particle cap permits at most 200 new four-fragment cells');
    assert.ok(removals.every(({ args: [x, y, width, height] }) => Math.hypot(x + width / 2 - 180, y + height / 2 - 180) <= 55), 'distant photo pixels remain intact');
    assert.equal(browser.canvas.hidden, false);
    assert.ok(browser.classes.has('portrait-broken'));
    controller.leave();
    for (let now = 150; now <= 1300; now += 50) browser.step(now);
    assert.equal(browser.frames.size, 0, 'scatter settles to a static broken image');
    assert.equal(browser.reads, 1, 'pixels are never re-read during rendering');
    assert.equal(browser.canvas.hidden, false, 'holes remain visible after leave');
  } finally { controller.dispose(); }
});

test('next hover repairs all damaged cells and movement cannot immediately shatter again', t => {
  const browser = mockBrowser(t);
  const controller = createPortraitPixels(browser.image, browser.canvas, browser.host);
  try {
    controller.enter(center);
    browser.step(100);
    const removed = browser.removals().length;
    controller.leave();
    controller.enter(center);
    for (let now = 150; now <= 1200; now += 50) {
      controller.move(center);
      browser.step(now);
    }
    assert.equal(browser.restorations().length, removed, 'each missing source tile is restored exactly once');
    assert.equal(browser.canvas.hidden, true, 'sharp DOM photo is restored');
    assert.equal(browser.classes.has('portrait-broken'), false);
    assert.equal(browser.frames.size, 0);
    browser.setTime(1300);
    controller.move({ clientX: 210, clientY: 180 });
    assert.equal(browser.removals().length, removed, 'same hover session stays reconstructed');
    controller.leave();
    controller.enter(center);
    browser.step(1400);
    assert.ok(browser.removals().length > removed, 'a fresh hover can start a new scatter cycle');
    assert.equal(browser.reads, 1);
  } finally { controller.dispose(); }
});

test('hidden and offscreen effects pause, share one frame scheduler, and release resources', t => {
  const browser = mockBrowser(t);
  const controller = createPortraitPixels(browser.image, browser.canvas, browser.host);
  const otherEffect = () => {};
  try {
    controller.enter(center);
    requestEffectFrame(otherEffect);
    assert.equal(browser.frames.size, 1);
    browser.step(100);
    browser.document.hidden = true;
    browser.fire('visibilitychange');
    assert.equal(browser.frames.size, 0);
    browser.document.hidden = false;
    browser.fire('visibilitychange');
    browser.visible(false);
    assert.equal(browser.frames.size, 0);
    browser.visible(true);
    assert.equal(browser.frames.size, 1);
    browser.step(2000);
    controller.dispose();
    assert.equal(browser.frames.size, 0);
    assert.equal(browser.canvas.hidden, true);
    assert.equal(browser.classes.has('portrait-broken'), false);
    assert.equal(browser.listenerCount, 0);
    assert.ok(browser.surfaces.every(surface => surface.width === 0 && surface.height === 0));
    assert.ok(browser.intersections.every(observer => observer.disconnected));
    assert.ok(browser.resizes.every(observer => observer.disconnected));
  } finally { cancelEffectFrame(otherEffect); controller.dispose(); }
});

test('rendering failures restore the original photo and cancel all scheduled work', t => {
  const browser = mockBrowser(t);
  const controller = createPortraitPixels(browser.image, browser.canvas, browser.host);
  try {
    controller.enter(center);
    browser.step(100);
    browser.fail();
    browser.step(150);
    assert.equal(browser.canvas.hidden, true);
    assert.equal(browser.classes.has('portrait-broken'), false);
    assert.equal(browser.frames.size, 0);
    assert.equal(browser.listenerCount, 0);
    assert.ok(browser.surfaces.every(surface => surface.width === 0));
  } finally { controller.dispose(); }
});

test('resource caps remain bounded while the cursor visits many regions', t => {
  const browser = mockBrowser(t);
  const controller = createPortraitPixels(browser.image, browser.canvas, browser.host);
  try {
    controller.enter(center);
    let now = 100;
    for (const y of [90, 150, 210, 270]) {
      for (const x of [90, 150, 210, 270]) {
        // Allow old particles to expire, then visit a new neighborhood.
        for (let i = 0; i < 22; i++) { browser.step(now); now += 50; }
        browser.setTime(now);
        controller.move({ clientX: x, clientY: y });
      }
    }
    assert.ok(browser.removals().length <= 600, 'weak-device damaged-cell cap is enforced');
    assert.equal(browser.reads, 1);
  } finally { controller.dispose(); }
});

test('resizing disposes safely and a later hover can initialize at the new size', t => {
  const browser = mockBrowser(t);
  const original = createPortraitPixels(browser.image, browser.canvas, browser.host);
  let resized;
  try {
    original.enter(center);
    browser.step(100);
    browser.rect.width = browser.rect.height = 400;
    browser.resizes[0].callback([]);
    assert.equal(original.disposed, true);
    assert.equal(browser.canvas.hidden, true);
    assert.equal(browser.frames.size, 0);
    original.enter(center);
    assert.equal(browser.frames.size, 0, 'disposed controller cannot schedule work');
    resized = createPortraitPixels(browser.image, browser.canvas, browser.host);
    assert.equal(resized.disposed, false);
    assert.equal(browser.canvas.width, 400);
    resized.enter(center);
    browser.step(200);
    assert.equal(browser.canvas.hidden, false);
    assert.equal(browser.reads, 2, 'one new cached sample only after resize reinitialization');
  } finally { original.dispose(); resized?.dispose(); }
});

test('touch-style tap sessions scatter then repair with conservative coarse-pointer budgets', t => {
  const browser = mockBrowser(t, { weak: false, coarse: true });
  const controller = createPortraitPixels(browser.image, browser.canvas, browser.host);
  try {
    assert.equal(browser.canvas.width, 360, 'powerful touch devices still cap DPR at one');
    controller.enter(center);
    controller.leave();
    browser.step(100);
    const removed = browser.removals().length;
    assert.ok(removed > 0 && removed <= 200, 'tap uses the conservative 800-particle budget');
    controller.enter(center);
    controller.leave();
    for (let time = 150; time <= 1300; time += 50) browser.step(time);
    assert.equal(browser.restorations().length, removed);
    assert.equal(browser.canvas.hidden, true, 'second tap restores original photo');
    assert.equal(browser.frames.size, 0);
    assert.equal(browser.reads, 1);
  } finally { controller.dispose(); }
});

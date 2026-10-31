// Both decorative effects share a single browser animation-frame callback.
const callbacks = new Set();
let frame = 0;
function tick(now) {
  frame = 0;
  for (const callback of [...callbacks]) {
    if (!callbacks.delete(callback)) continue;
    callback(now);
  }
  if (callbacks.size && !frame) frame = window.requestAnimationFrame(tick);
}
export function requestEffectFrame(callback) {
  callbacks.add(callback);
  if (!frame) frame = window.requestAnimationFrame(tick);
  return callback;
}
export function cancelEffectFrame(callback) {
  callbacks.delete(callback);
  if (!callbacks.size && frame) {
    window.cancelAnimationFrame(frame);
    frame = 0;
  }
}

/**
 * Integration: the real entry point wired against a fake YouTube DOM. Checks
 * that settings gate the wheel-volume feature live and that navigation
 * re-initialises both features.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeEl, fakeChromeStorage, tick } from './helpers/fakeDom.js';

globalThis.chrome = fakeChromeStorage();
await chrome.storage.sync.set({ scrollVolume: false });

const video = { duration: NaN, currentTime: 0, volume: 0.5, muted: false, isConnected: true };
const player = fakeEl({ querySelector: (s) => (s === 'video.html5-main-video' ? video : null) });
const docListeners = {};
const cssVars = {};
globalThis.window = { location: { href: 'https://www.youtube.com/watch?v=abc', pathname: '/watch' } };
globalThis.document = {
  readyState: 'complete',
  body: {},
  documentElement: { style: { setProperty: (k, v) => { cssVars[k] = v; } }, setAttribute() {}, getAttribute: () => null },
  getElementById: (id) => (id === 'movie_player' ? player : null),
  addEventListener: (t, f) => { docListeners[t] = f; },
  removeEventListener: (t) => { delete docListeners[t]; },
  createElement: fakeEl,
  createElementNS: () => fakeEl(),
  dispatchEvent() {}
};
globalThis.MutationObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

await import('../src/content/index.js');
await tick();

const overlayCount = () => player.children.filter((c) => c.className === 'yte-progress-overlay').length;
const hasWheel = () => typeof player.listeners.wheel === 'function';

test('settings are applied before the first video is wired up', () => {
  assert.equal(cssVars['--yte-bar-height'], '3px');
  assert.equal(overlayCount(), 1, 'progress overlay attached');
  assert.equal(hasWheel(), false, 'wheel volume stays off when disabled');
});

test('enabling wheel volume in settings attaches it to the current video', async () => {
  await chrome.storage.sync.set({ scrollVolume: true });
  await tick();
  assert.equal(hasWheel(), true);
});

test('disabling it detaches immediately', async () => {
  await chrome.storage.sync.set({ scrollVolume: false });
  await tick();
  assert.equal(hasWheel(), false);
});

test('size changes apply live without touching wheel volume', async () => {
  await chrome.storage.sync.set({ barHeight: 8 });
  await tick();
  assert.equal(cssVars['--yte-bar-height'], '8px');
  assert.equal(hasWheel(), false);
});

test('navigating to another video re-initialises both features', async () => {
  await chrome.storage.sync.set({ scrollVolume: true });
  await tick();
  window.location.href = 'https://www.youtube.com/watch?v=def';
  docListeners['yt-navigate-finish']();
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(overlayCount(), 1, 'old overlay removed, new one attached');
  assert.equal(hasWheel(), true);
});

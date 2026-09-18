import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let pathname = '/watch';
let playerPresent = true;
const video = { isConnected: true };
const player = { isConnected: true, querySelector: (s) => (s === 'video.html5-main-video' ? video : null) };
const docListeners = {};
let mutationCb = null;
globalThis.window = { location: { get pathname() { return pathname; } } };
globalThis.document = {
  getElementById: (id) => (id === 'movie_player' && playerPresent ? player : null),
  addEventListener: (t, f) => { docListeners[t] = f; },
  removeEventListener: (t) => { delete docListeners[t]; },
  body: {}
};
globalThis.MutationObserver = class { constructor(cb) { mutationCb = cb; } observe() {} disconnect() {} };

const { YouTubeDetector } = await import('../src/content/youtubeDetector.js');

mock.timers.enable({ apis: ['setTimeout'] });
let calls = 0;
const d = new YouTubeDetector();
d.init(() => calls++);

test('direct load on /watch calls back once', () => {
  assert.equal(calls, 1);
});

test('DOM churn with a connected player adds no callbacks', () => {
  mutationCb(); mutationCb(); mutationCb();
  assert.equal(calls, 1);
});

test('navigation calls back again on the same elements', () => {
  docListeners['yt-navigate-finish']();
  mock.timers.tick(YouTubeDetector.NAV_SETTLE_MS);
  assert.equal(calls, 2);
});

test('navigation to a non-watch page does not call back', () => {
  pathname = '/';
  docListeners['yt-navigate-finish']();
  mock.timers.tick(YouTubeDetector.NAV_SETTLE_MS);
  assert.equal(calls, 2);
  pathname = '/watch';
});

test('the observer only re-fires for a different element', () => {
  playerPresent = false; video.isConnected = false; player.isConnected = false;
  mutationCb();
  assert.equal(calls, 2);
  playerPresent = true; video.isConnected = true; player.isConnected = true;
  mutationCb();
  assert.equal(calls, 2);
});

test('cleanup removes the document listeners', () => {
  d.cleanup();
  assert.deepEqual(Object.keys(docListeners), []);
});

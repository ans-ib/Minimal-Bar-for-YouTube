import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeEl } from './helpers/fakeDom.js';

globalThis.document = { createElement: fakeEl };
let rafCb = null;
globalThis.requestAnimationFrame = (fn) => { rafCb = fn; return 1; };
globalThis.cancelAnimationFrame = () => {};

const { NativeControlsEnhancer } = await import('../src/content/progressBar.js');

// YouTube DOM, as captured in docs/youtube-player-dom.example.html: chapter
// widths on the progress bar, and TWO chapter buttons (creator chapters and
// key moments / "In this video"), one of which is hidden with display:none.
let widths = ['18px', '53px', '47px', '0px'];
let buttons = [
  { display: '', disabled: false, cls: [], text: ' Intro ' },
  { display: 'none', disabled: true, cls: ['ytp-chapter-container-disabled'], text: '' }
];
const chapterContents = () => buttons.map((b) => {
  const container = { style: { display: b.display } };
  const button = { disabled: b.disabled, classList: { contains: (c) => b.cls.includes(c) } };
  return { textContent: b.text, closest: (sel) => (sel === '.ytp-chapter-container' ? container : button) };
});
const player = fakeEl({
  querySelector: (sel) => (sel === '.ytp-progress-bar'
    ? { querySelectorAll: () => widths.map((w) => ({ style: { width: w } })) }
    : null),
  querySelectorAll: (sel) => (sel === '.ytp-chapter-container .ytp-chapter-title-content' ? chapterContents() : [])
});
const video = { duration: 100, currentTime: 0 };
const e = new NativeControlsEnhancer(video, player);
e.init();
const fills = () => e.chapterFills.map((s) => s.fill.style.transform);

test('builds one segment per non-empty chapter', () => {
  rafCb(0);
  assert.equal(e.chapterFills.length, 3);
  const total = 18 + 53 + 47;
  assert.ok(Math.abs(e.chapterFills[1].start - (18 / total) * 100) < 1e-9);
  assert.ok(Math.abs(e.chapterFills[2].start - (71 / total) * 100) < 1e-9);
});

test('labels come from the visible chapter button', () => {
  assert.equal(e.chapterLabel.textContent, 'Intro');
  assert.equal(e.timeLabel.textContent, '0:00 / 1:40');
});

test('fills reflect the current time per chapter', () => {
  video.currentTime = 50;
  rafCb(16);
  const f = fills();
  assert.equal(f[0], 'scaleX(1)');
  assert.ok(f[1].startsWith('scaleX(0.'));
  assert.equal(f[2], 'scaleX(0)');
});

test('unchanged progress does not rewrite transforms', () => {
  e.chapterFills.forEach((s) => { s.fill.style.transform = 'UNTOUCHED'; });
  rafCb(32);
  assert.ok(fills().every((v) => v === 'UNTOUCHED'));
});

test('DOM queries are throttled to DOM_POLL_MS', () => {
  buttons[0].text = 'Part 2';
  rafCb(100);
  assert.equal(e.chapterLabel.textContent, 'Intro');
  rafCb(260);
  assert.equal(e.chapterLabel.textContent, 'Part 2');
});

test('no chapters + visible "In this video" button: label suppressed', () => {
  widths = ['118px'];
  buttons = [
    { display: 'none', disabled: true, cls: ['ytp-chapter-container-disabled'], text: '' },
    { display: '', disabled: false, cls: [], text: 'In this video' }
  ];
  rafCb(600);
  assert.equal(e.chapterFills.length, 1);
  assert.equal(e.chapterLabel.textContent, '');
  assert.equal(e.chapterLabel.classList.contains('yte-has-text'), false);
});

test('hidden or disabled buttons are skipped whatever their order', () => {
  widths = ['50px', '50px'];
  buttons = [
    { display: 'none', disabled: false, cls: [], text: 'In this video' },
    { display: '', disabled: false, cls: [], text: 'Real chapter' }
  ];
  rafCb(900);
  assert.equal(e.chapterLabel.textContent, 'Real chapter');
  buttons = [
    { display: '', disabled: true, cls: ['ytp-chapter-container-disabled'], text: 'In this video' },
    { display: '', disabled: false, cls: [], text: 'Another chapter' }
  ];
  rafCb(1200);
  assert.equal(e.chapterLabel.textContent, 'Another chapter');
});

test('long videos format as h:mm:ss', () => {
  widths = [];
  video.duration = 3661;
  video.currentTime = 3661;
  rafCb(1500);
  assert.equal(e.chapterFills.length, 1);
  assert.equal(fills()[0], 'scaleX(1)');
  assert.equal(e.timeLabel.textContent, '1:01:01 / 1:01:01');
});

test('a click on the overlay seeks without reaching the player', () => {
  let propagated = true;
  e.handleSeek({ clientX: 25, stopPropagation: () => { propagated = false; } });
  assert.equal(propagated, false);
  assert.ok(Math.abs(video.currentTime - 3661 * 0.25) < 1e-9);
});

test('cleanup stops the loop and removes the overlay', () => {
  e.cleanup();
  assert.equal(e.running, false);
  assert.equal(e.overlay, null);
  assert.equal(player.children.length, 0);
});

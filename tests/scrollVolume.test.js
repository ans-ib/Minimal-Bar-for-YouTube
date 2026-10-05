/*
 * Minimal Bar for YouTube
 * Copyright (C) 2026 Anas Ibn Bari
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version. See the LICENSE file for details.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { fakeEl } from './helpers/fakeDom.js';

// Fake page-side player state, answered the way inject.js answers.
let state = { volume: 50, muted: false };
const setCalls = [];
const attrs = {};
globalThis.document = {
  documentElement: {
    setAttribute: (k, v) => { attrs[k] = v; },
    getAttribute: (k) => (k in attrs ? attrs[k] : null)
  },
  createElement: fakeEl,
  createElementNS: () => fakeEl(),
  dispatchEvent(e) {
    if (e.type === 'yte-volume-get') attrs['data-yte-volume'] = JSON.stringify(state);
    if (e.type === 'yte-volume-set') {
      const v = Number(attrs['data-yte-set-volume']);
      setCalls.push(v);
      state.volume = v;
      if (v > 0) state.muted = false;
    }
  }
};
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const { ScrollVolumeControl } = await import('../src/content/scrollVolume.js');

const player = fakeEl();
const ctl = new ScrollVolumeControl({ volume: 0.5, muted: false }, player);
ctl.init();
const wheel = (deltaY, extra = {}) => {
  const ev = {
    deltaY, deltaMode: 0, ctrlKey: false, metaKey: false, prevented: false,
    preventDefault() { this.prevented = true; }, stopPropagation() {}, ...extra
  };
  player.listeners.wheel(ev);
  return ev;
};
const reset = (volume, muted = false) => { state = { volume, muted }; setCalls.length = 0; ctl.wheelAccumulator = 0; };
after(() => ctl.cleanup());

test('a mouse notch is exactly one 5% step', () => {
  reset(50);
  wheel(-100); wheel(-100); wheel(100);
  assert.deepEqual(setCalls, [55, 60, 55]);
});

test('trackpad deltas accumulate instead of stepping on every event', () => {
  reset(50);
  for (let i = 0; i < 20; i++) wheel(-4);
  assert.deepEqual(setCalls, [55, 60]);
});

test('reversing direction resets the accumulator', () => {
  reset(50);
  wheel(-30); wheel(30); wheel(30);
  assert.deepEqual(setCalls, [45]);
});

test('volume clamps at 0 and 100', () => {
  reset(98); wheel(-100); assert.equal(setCalls[0], 100);
  reset(3); wheel(100); assert.equal(setCalls[0], 0);
});

test('scrolling down while muted leaves the volume alone', () => {
  reset(50, true);
  wheel(100);
  assert.equal(setCalls.length, 0);
});

test('scrolling up while muted unmutes at the previous level plus one step', () => {
  reset(50, true);
  wheel(-100);
  assert.deepEqual(setCalls, [55]);
  assert.equal(state.muted, false);
});

test('ctrl+wheel (pinch zoom) is ignored and not prevented', () => {
  reset(50);
  const ev = wheel(-100, { ctrlKey: true });
  assert.equal(setCalls.length, 0);
  assert.equal(ev.prevented, false);
});

test('line-mode deltas count as one notch', () => {
  reset(50);
  wheel(-3, { deltaMode: 1 });
  assert.deepEqual(setCalls, [55]);
});

test('the indicator shows the value that was set', () => {
  reset(50);
  wheel(-100);
  assert.equal(ctl.textEl.textContent, '55%');
  assert.ok(ctl.icons.medium.classList.contains('yte-active'));
});

test('the step can be changed while running and applies to the next notch', () => {
  reset(50);
  ctl.setStep(10);
  wheel(-100); wheel(100); wheel(100);
  assert.deepEqual(setCalls, [60, 50, 40]);
  ctl.setStep(1);
  reset(50);
  wheel(-100); wheel(-100);
  assert.deepEqual(setCalls, [51, 52]);
  ctl.setStep(5);
});

test('a step that does not divide 100 still clamps cleanly at the ends', () => {
  ctl.setStep(15);
  reset(95); wheel(-100);
  assert.deepEqual(setCalls, [100]);
  reset(10); wheel(100);
  assert.deepEqual(setCalls, [0]);
  ctl.setStep(5);
});

test('trackpad accumulation uses the configured step too', () => {
  ctl.setStep(2);
  reset(50);
  for (let i = 0; i < 20; i++) wheel(-4);
  assert.deepEqual(setCalls, [52, 54]);
  ctl.setStep(5);
});

test('invalid steps are ignored and the constructor accepts one', () => {
  ctl.setStep(0); ctl.setStep(-3); ctl.setStep('x'); ctl.setStep(undefined);
  assert.equal(ctl.step, 5);
  const other = new ScrollVolumeControl({ volume: 0.5, muted: false }, fakeEl(), 12);
  assert.equal(other.step, 12);
  assert.equal(new ScrollVolumeControl({ volume: 0.5, muted: false }, fakeEl()).step, 5);
});

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
import { test } from 'node:test';
import assert from 'node:assert/strict';

const handlers = {};
let vol = 50;
let muted = true;
const player = { getVolume: () => vol, isMuted: () => muted, setVolume: (v) => { vol = v; }, unMute: () => { muted = false; } };
const attrs = {};
globalThis.document = {
  addEventListener: (t, f) => { handlers[t] = f; },
  getElementById: (id) => (id === 'movie_player' ? player : null),
  documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => (k in attrs ? attrs[k] : null) }
};
const local = {};
const session = {};
globalThis.window = {
  localStorage: { setItem: (k, v) => { local[k] = v; } },
  sessionStorage: { setItem: (k, v) => { session[k] = v; } }
};

await import('../src/content/inject.js');

test('volume-set applies the value from the attribute and unmutes', () => {
  attrs['data-yte-set-volume'] = '65';
  handlers['yte-volume-set']();
  assert.equal(vol, 65);
  assert.equal(muted, false);
});

test('the volume is persisted in the record format YouTube uses', () => {
  const rec = JSON.parse(local['yt-player-volume']);
  assert.deepEqual(JSON.parse(rec.data), { volume: 65, muted: false });
  assert.equal(rec.expiration - rec.creation, 30 * 24 * 3600 * 1000);
  assert.equal(session['yt-player-volume'], local['yt-player-volume']);
});

test('a missing attribute is ignored', () => {
  delete attrs['data-yte-set-volume'];
  handlers['yte-volume-set']();
  assert.equal(vol, 65);
});

test('volume-get publishes the current state', () => {
  handlers['yte-volume-get']();
  assert.deepEqual(JSON.parse(attrs['data-yte-volume']), { volume: 65, muted: false });
});

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

const KEY = 'yt-player-volume';
const DAY = 24 * 3600 * 1000;
/** A record in the exact shape YouTube stores. */
const record = (volume, muted, creation, expiration = Date.now() + 30 * DAY) =>
  JSON.stringify({ data: JSON.stringify({ volume, muted }), expiration, creation });

const docHandlers = {};
const winHandlers = {};
let vol = 50;
let muted = false;
let playerPresent = true;
const player = {
  getVolume: () => vol, isMuted: () => muted,
  setVolume: (v) => { vol = v; }, mute: () => { muted = true; }, unMute: () => { muted = false; }
};
const attrs = {};
const makeStorage = () => {
  const data = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};
const local = makeStorage();
const session = makeStorage();

globalThis.document = {
  addEventListener: (t, f) => { docHandlers[t] = f; },
  getElementById: (id) => (id === 'movie_player' && playerPresent ? player : null),
  documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => (k in attrs ? attrs[k] : null) }
};
globalThis.window = {
  localStorage: local,
  sessionStorage: session,
  addEventListener: (t, f) => { winHandlers[t] = f; }
};

// State before the script loads: this tab remembers 50 from long ago, while
// another tab has since set 10. This is the two-tab case that lost the volume.
session.data[KEY] = record(50, false, 1000);
local.data[KEY] = record(10, false, 2000);

await import('../src/content/inject.js');

test('at page start the newer shared record replaces the tab\'s stale copy', () => {
  assert.equal(session.data[KEY], local.data[KEY]);
  assert.equal(JSON.parse(JSON.parse(session.data[KEY]).data).volume, 10);
});

test('an in-page navigation applies a newer shared volume to the running player', () => {
  vol = 10; muted = false;
  local.data[KEY] = record(35, false, 3000);
  docHandlers['yt-navigate-finish']();
  assert.equal(vol, 35);
  assert.equal(session.data[KEY], local.data[KEY]);
});

test('a newer shared record also carries the mute state', () => {
  local.data[KEY] = record(35, true, 4000);
  docHandlers['yt-navigate-finish']();
  assert.equal(muted, true);
  local.data[KEY] = record(35, false, 5000);
  docHandlers['yt-navigate-finish']();
  assert.equal(muted, false);
});

test('nothing changes when the tab\'s copy is already the newest', () => {
  vol = 80;
  session.data[KEY] = record(80, false, 9000);
  local.data[KEY] = record(20, false, 8000);
  docHandlers['yt-navigate-finish']();
  assert.equal(vol, 80);
  assert.equal(JSON.parse(JSON.parse(session.data[KEY]).data).volume, 80);
});

test('expired or malformed shared records are ignored', () => {
  vol = 80;
  local.data[KEY] = record(5, false, 99000, Date.now() - 1000);
  docHandlers['yt-navigate-finish']();
  assert.equal(vol, 80);
  local.data[KEY] = '{not json';
  docHandlers['yt-navigate-finish']();
  assert.equal(vol, 80);
});

test('a back/forward-cache restore syncs, an ordinary pageshow does not', () => {
  vol = 80;
  local.data[KEY] = record(25, false, 100000);
  winHandlers.pageshow({ persisted: false });
  assert.equal(vol, 80);
  winHandlers.pageshow({ persisted: true });
  assert.equal(vol, 25);
});

test('with no player yet, the record is still adopted for when it starts', () => {
  playerPresent = false;
  local.data[KEY] = record(60, false, 200000);
  docHandlers['yt-navigate-finish']();
  assert.equal(session.data[KEY], local.data[KEY]);
  playerPresent = true;
});

test('volume-set applies the value from the attribute and unmutes', () => {
  muted = true;
  attrs['data-yte-set-volume'] = '65';
  docHandlers['yte-volume-set']();
  assert.equal(vol, 65);
  assert.equal(muted, false);
});

test('the volume is persisted to both storages in the format YouTube uses', () => {
  const rec = JSON.parse(local.data[KEY]);
  assert.deepEqual(JSON.parse(rec.data), { volume: 65, muted: false });
  assert.equal(rec.expiration - rec.creation, 30 * DAY);
  assert.equal(session.data[KEY], local.data[KEY]);
});

test('a wheel change in this tab is not "newer" than itself on the next navigation', () => {
  const before = session.data[KEY];
  docHandlers['yt-navigate-finish']();
  assert.equal(vol, 65);
  assert.equal(session.data[KEY], before);
});

test('a missing attribute is ignored', () => {
  delete attrs['data-yte-set-volume'];
  docHandlers['yte-volume-set']();
  assert.equal(vol, 65);
});

test('volume-get publishes the current state', () => {
  docHandlers['yte-volume-get']();
  assert.deepEqual(JSON.parse(attrs['data-yte-volume']), { volume: 65, muted: false });
});

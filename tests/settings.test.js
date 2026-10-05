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
import { fakeChromeStorage } from './helpers/fakeDom.js';

globalThis.chrome = fakeChromeStorage();
const cssVars = {};
globalThis.document = { documentElement: { style: { setProperty: (k, v) => { cssVars[k] = v; } } } };

const { YteSettings } = await import('../src/common/settings.js');

test('normalize(null) returns the defaults', () => {
  assert.deepEqual(YteSettings.normalize(null), YteSettings.DEFAULTS);
});

test('normalize clamps and rounds numeric settings', () => {
  assert.deepEqual(
    YteSettings.normalize({ barHeight: 99, labelFontSize: 3.6, scrollVolume: false, volumeStep: 2.4 }),
    { scrollVolume: false, volumeStep: 2, barHeight: 12, labelFontSize: 10 }
  );
});

test('the volume step defaults to 5 and stays within 1 to 20', () => {
  assert.equal(YteSettings.DEFAULTS.volumeStep, 5);
  assert.equal(YteSettings.normalize({ volumeStep: 0 }).volumeStep, 1);
  assert.equal(YteSettings.normalize({ volumeStep: 500 }).volumeStep, 20);
  assert.equal(YteSettings.normalize({ volumeStep: 'loud' }).volumeStep, 5);
});

test('settings saved by an older version without a volume step still load', () => {
  assert.deepEqual(
    YteSettings.normalize({ scrollVolume: true, barHeight: 4, labelFontSize: 14 }),
    { scrollVolume: true, volumeStep: 5, barHeight: 4, labelFontSize: 14 }
  );
});

test('normalize ignores garbage values', () => {
  assert.deepEqual(YteSettings.normalize({ barHeight: 'x', scrollVolume: 'no' }), YteSettings.DEFAULTS);
});

test('load with empty storage returns the defaults', async () => {
  assert.deepEqual(await YteSettings.load(), YteSettings.DEFAULTS);
});

test('save merges partial updates', async () => {
  await YteSettings.save({ barHeight: 6 });
  await YteSettings.save({ scrollVolume: false });
  await YteSettings.save({ volumeStep: 10 });
  assert.deepEqual(await YteSettings.load(), { scrollVolume: false, volumeStep: 10, barHeight: 6, labelFontSize: 12 });
});

test('applyToDocument writes the CSS variables', async () => {
  YteSettings.applyToDocument(await YteSettings.load());
  assert.equal(cssVars['--yte-bar-height'], '6px');
  assert.equal(cssVars['--yte-label-font-size'], '12px');
});

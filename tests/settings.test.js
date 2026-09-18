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
    YteSettings.normalize({ barHeight: 99, labelFontSize: 3.6, scrollVolume: false }),
    { scrollVolume: false, barHeight: 12, labelFontSize: 10 }
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
  assert.deepEqual(await YteSettings.load(), { scrollVolume: false, barHeight: 6, labelFontSize: 12 });
});

test('applyToDocument writes the CSS variables', async () => {
  YteSettings.applyToDocument(await YteSettings.load());
  assert.equal(cssVars['--yte-bar-height'], '6px');
  assert.equal(cssVars['--yte-label-font-size'], '12px');
});

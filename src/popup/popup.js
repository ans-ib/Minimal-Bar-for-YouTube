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
/**
 * Popup / options page. Reads settings, writes them back on change, and stays
 * in sync if another window changes them. Sliders save when released so
 * storage.sync's write quota is never approached.
 */
import { YteSettings } from '../common/settings.js';

const $ = (id) => document.getElementById(id);
const scrollVolume = $('scrollVolume');
const sliders = {
  barHeight: { input: $('barHeight'), output: $('barHeightValue') },
  labelFontSize: { input: $('labelFontSize'), output: $('labelFontSizeValue') }
};
const status = $('status');
let statusTimer = 0;

for (const key of Object.keys(sliders)) {
  const [lo, hi] = YteSettings.LIMITS[key];
  sliders[key].input.min = lo;
  sliders[key].input.max = hi;
}

function render(settings) {
  scrollVolume.checked = settings.scrollVolume;
  for (const key of Object.keys(sliders)) {
    sliders[key].input.value = settings[key];
    sliders[key].output.textContent = settings[key] + ' px';
  }
}

function flash(text) {
  status.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.textContent = ''; }, 1500);
}

async function save(partial) {
  try {
    await YteSettings.save(partial);
    flash('Saved');
  } catch (e) {
    flash('Could not save');
  }
}

scrollVolume.addEventListener('change', () => save({ scrollVolume: scrollVolume.checked }));

for (const key of Object.keys(sliders)) {
  const { input, output } = sliders[key];
  input.addEventListener('input', () => { output.textContent = input.value + ' px'; });
  input.addEventListener('change', () => save({ [key]: Number(input.value) }));
}

$('reset').addEventListener('click', async () => {
  await save(YteSettings.DEFAULTS);
  render(await YteSettings.load());
});

YteSettings.onChange(render);
YteSettings.load().then((settings) => {
  render(settings);
  // Two frames: the first paints the saved state, then transitions come on.
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('ready')));
});

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
 * Settings shared by the content scripts and the popup / options page.
 *
 * Stored in storage.sync so they persist across sessions and follow the
 * user's browser profile. Every read passes through normalize(), so the rest
 * of the code can trust the shape and ranges.
 */

/** Firefox exposes promise-based APIs on `browser`; Chromium on `chrome`. */
function storageApi() {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) return browser.storage;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) return chrome.storage;
  return null;
}

export const YteSettings = {
  DEFAULTS: Object.freeze({
    scrollVolume: true,   // mouse wheel over the video changes volume
    barHeight: 3,         // px, thickness of the minimal progress bar
    labelFontSize: 12     // px, chapter / time label text size
  }),

  LIMITS: Object.freeze({
    barHeight: [1, 12],
    labelFontSize: [10, 24]
  }),

  /** @returns {{scrollVolume: boolean, barHeight: number, labelFontSize: number}} */
  normalize(raw) {
    const out = Object.assign({}, this.DEFAULTS);
    if (!raw || typeof raw !== 'object') return out;
    if (typeof raw.scrollVolume === 'boolean') out.scrollVolume = raw.scrollVolume;
    for (const key of Object.keys(this.LIMITS)) {
      const n = Number(raw[key]);
      if (Number.isFinite(n)) {
        const [lo, hi] = this.LIMITS[key];
        out[key] = Math.min(hi, Math.max(lo, Math.round(n)));
      }
    }
    return out;
  },

  hasStorage() {
    return storageApi() !== null;
  },

  async load() {
    const storage = storageApi();
    if (!storage) return this.normalize(null);
    try {
      return this.normalize(await storage.sync.get(this.DEFAULTS));
    } catch (e) {
      return this.normalize(null);
    }
  },

  /** Merge a partial update into the stored settings. */
  async save(partial) {
    const storage = storageApi();
    if (!storage) throw new Error('storage API is unavailable');
    const current = await this.load();
    await storage.sync.set(this.normalize(Object.assign({}, current, partial)));
  },

  /** Call back with the full, normalized settings whenever they change. */
  onChange(callback) {
    const storage = storageApi();
    if (!storage || !storage.onChanged) return;
    storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      this.load().then(callback);
    });
  },

  /** Push size settings into CSS custom properties read by content.css. */
  applyToDocument(settings) {
    const style = document.documentElement.style;
    style.setProperty('--yte-bar-height', settings.barHeight + 'px');
    style.setProperty('--yte-label-font-size', settings.labelFontSize + 'px');
  }
};

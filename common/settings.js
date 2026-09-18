/**
 * Settings shared by the content scripts and the popup/options page.
 *
 * Stored in chrome.storage.sync so they persist across sessions and follow
 * the user's Chrome profile. Every read passes through normalize(), so the
 * rest of the code can trust the shape and ranges.
 */
const YteSettings = {
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
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.sync;
  },

  async load() {
    if (!this.hasStorage()) return this.normalize(null);
    try {
      return this.normalize(await chrome.storage.sync.get(this.DEFAULTS));
    } catch (e) {
      return this.normalize(null);
    }
  },

  /** Merge a partial update into the stored settings. */
  async save(partial) {
    if (!this.hasStorage()) throw new Error('chrome.storage is unavailable');
    const current = await this.load();
    await chrome.storage.sync.set(this.normalize(Object.assign({}, current, partial)));
  },

  /** Call back with the full, normalized settings whenever they change. */
  onChange(callback) {
    if (!this.hasStorage() || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
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

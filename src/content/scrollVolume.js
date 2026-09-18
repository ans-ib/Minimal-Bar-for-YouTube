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
 * ScrollVolumeControl - mouse wheel over the player adjusts the volume.
 * Scroll up = louder, scroll down = quieter, with a small on-screen indicator.
 *
 * Volume is read and written through YouTube's own player API (via the
 * MAIN-world bridge in inject.js) so the native slider and mute state stay
 * in sync.
 */
export class ScrollVolumeControl {
  /** Percent per step. */
  static STEP = 5;
  /**
   * A delta at or above this is treated as one mouse-wheel notch. Smaller
   * deltas (trackpads, some mice on macOS) are accumulated so a swipe moves
   * the volume smoothly instead of slamming it to 0 or 100.
   */
  static WHEEL_THRESHOLD = 40;
  static FEEDBACK_MS = 1000;
  static BAR_COUNT = 10;

  static ICON_PATHS = {
    muted: [
      'M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V12.18L16.45,14.63C16.5,14.43 16.5,14.21 16.5,12Z',
      'M4,4L20,20'
    ],
    low: ['M3,9V15H7L12,20V4L7,9H3M14,11H16.5V13H14V11Z'],
    medium: ['M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12Z'],
    high: ['M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12M19,12C19,15.17 16.89,17.85 14,18.71V20.77C17.97,19.86 21,16.28 21,12C21,7.72 17.97,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12Z']
  };

  constructor(video, player) {
    this.video = video;
    this.player = player;
    this.feedbackElement = null;
    this.feedbackTimeout = 0;
    this.wheelAccumulator = 0;
    this.bars = [];
    this.icons = {};
    this.textEl = null;
    this.handleWheel = this.handleWheel.bind(this);
  }

  /**
   * Current player state via the bridge, falling back to the <video> element.
   * @returns {{volume: number, muted: boolean}} volume is 0-100
   */
  getVolumeState() {
    document.dispatchEvent(new CustomEvent('yte-volume-get'));
    try {
      const raw = document.documentElement.getAttribute('data-yte-volume');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.volume === 'number' && isFinite(parsed.volume)) {
          return { volume: Math.round(parsed.volume), muted: !!parsed.muted };
        }
      }
    } catch (e) {
      /* fall through to the element */
    }
    return { volume: Math.round(this.video.volume * 100), muted: this.video.muted };
  }

  /**
   * @param {number} volume 0-100
   * The value travels through a DOM attribute rather than CustomEvent.detail:
   * DOM state is shared between the isolated and page worlds in every
   * browser, whereas detail objects are not readable across worlds in Firefox.
   */
  setVolume(volume) {
    volume = Math.max(0, Math.min(100, Math.round(volume)));
    document.documentElement.setAttribute('data-yte-set-volume', String(volume));
    document.dispatchEvent(new CustomEvent('yte-volume-set'));
  }

  handleWheel(event) {
    // Leave pinch-zoom (ctrl+wheel) and browser zoom alone.
    if (event.ctrlKey || event.metaKey) return;
    if (!this.player.matches(':hover')) return;

    event.preventDefault();
    event.stopPropagation();

    const delta = event.deltaY;
    if (delta === 0) return;

    let steps;
    if (event.deltaMode !== 0 || Math.abs(delta) >= ScrollVolumeControl.WHEEL_THRESHOLD) {
      // One discrete notch.
      steps = delta < 0 ? 1 : -1;
      this.wheelAccumulator = 0;
    } else {
      // Fine-grained input: accumulate until a full step is reached.
      if (Math.sign(delta) !== Math.sign(this.wheelAccumulator)) this.wheelAccumulator = 0;
      this.wheelAccumulator += delta;
      const whole = Math.trunc(this.wheelAccumulator / ScrollVolumeControl.WHEEL_THRESHOLD);
      if (whole === 0) return;
      this.wheelAccumulator -= whole * ScrollVolumeControl.WHEEL_THRESHOLD;
      steps = -whole; // negative deltaY (scroll up) raises volume
    }

    const state = this.getVolumeState();
    const shown = state.muted ? 0 : state.volume;
    let next;
    if (steps > 0) {
      // Scrolling up from mute unmutes at the previous level plus one step.
      next = Math.min(100, (state.muted ? state.volume : shown) + steps * ScrollVolumeControl.STEP);
    } else {
      next = Math.max(0, shown + steps * ScrollVolumeControl.STEP);
    }

    if (next !== shown) this.setVolume(next);
    this.showVolumeFeedback(next);
  }

  buildFeedback() {
    const root = document.createElement('div');
    root.id = 'yte-volume-feedback';
    root.className = 'yte-volume-feedback';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'yte-volume-icon';
    for (const level of Object.keys(ScrollVolumeControl.ICON_PATHS)) {
      const svg = this.makeIcon(level);
      this.icons[level] = svg;
      iconWrap.appendChild(svg);
    }
    root.appendChild(iconWrap);

    const bars = document.createElement('div');
    bars.className = 'yte-volume-bars';
    for (let i = 0; i < ScrollVolumeControl.BAR_COUNT; i++) {
      const bar = document.createElement('div');
      bar.className = 'yte-volume-bar';
      this.bars.push(bar);
      bars.appendChild(bar);
    }
    root.appendChild(bars);

    this.textEl = document.createElement('div');
    this.textEl.className = 'yte-volume-text';
    root.appendChild(this.textEl);

    this.player.appendChild(root);
    this.feedbackElement = root;
  }

  makeIcon(level) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'white');
    svg.setAttribute('aria-hidden', 'true');
    const paths = ScrollVolumeControl.ICON_PATHS[level];
    paths.forEach((d, i) => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      if (level === 'muted' && i === 1) {
        path.setAttribute('stroke', 'white');
        path.setAttribute('stroke-width', '2');
      }
      svg.appendChild(path);
    });
    return svg;
  }

  /** @param {number} volume 0-100 */
  showVolumeFeedback(volume) {
    if (!this.feedbackElement) this.buildFeedback();

    const level = volume === 0 ? 'muted' : volume < 33 ? 'low' : volume < 66 ? 'medium' : 'high';
    for (const key of Object.keys(this.icons)) {
      this.icons[key].classList.toggle('yte-active', key === level);
    }

    const filled = Math.round((volume / 100) * this.bars.length);
    this.bars.forEach((bar, i) => bar.classList.toggle('yte-volume-bar-filled', i < filled));
    this.textEl.textContent = volume + '%';

    this.feedbackElement.classList.add('yte-visible');
    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      if (this.feedbackElement) this.feedbackElement.classList.remove('yte-visible');
    }, ScrollVolumeControl.FEEDBACK_MS);
  }

  init() {
    if (!this.player) return;
    // passive: false so preventDefault() can stop the page from scrolling.
    this.player.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  cleanup() {
    if (this.player) this.player.removeEventListener('wheel', this.handleWheel);
    clearTimeout(this.feedbackTimeout);
    if (this.feedbackElement) this.feedbackElement.remove();
    this.feedbackElement = null;
    this.bars = [];
    this.icons = {};
    this.textEl = null;
  }
}

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
 * Content script entry: loads settings, wires the detector to the features,
 * and re-initialises them when YouTube navigates to a different video.
 */
import { YteSettings } from '../common/settings.js';
import { YouTubeDetector } from './youtubeDetector.js';
import { NativeControlsEnhancer } from './progressBar.js';
import { ScrollVolumeControl } from './scrollVolume.js';

let settings = null;
let currentVideo = null;
let currentPlayer = null;
let currentVideoId = null;
let controlsEnhancer = null;
let scrollVolume = null;

function getVideoId() {
  try {
    return new URL(window.location.href).searchParams.get('v') || window.location.href;
  } catch (e) {
    return window.location.href;
  }
}

function startScrollVolume() {
  if (scrollVolume || !currentVideo || !settings || !settings.scrollVolume) return;
  try {
    scrollVolume = new ScrollVolumeControl(currentVideo, currentPlayer);
    scrollVolume.init();
  } catch (e) {
    console.error('[YTE] Failed to initialise scroll volume', e);
    scrollVolume = null;
  }
}

function stopScrollVolume() {
  if (!scrollVolume) return;
  try { scrollVolume.cleanup(); } catch (e) { console.error('[YTE] Cleanup error', e); }
  scrollVolume = null;
}

function initializeFeatures(video, player) {
  const videoId = getVideoId();
  if (video === currentVideo && player === currentPlayer && videoId === currentVideoId) {
    return;
  }

  cleanup();
  currentVideo = video;
  currentPlayer = player;
  currentVideoId = videoId;

  try {
    controlsEnhancer = new NativeControlsEnhancer(video, player);
    controlsEnhancer.init();
  } catch (e) {
    console.error('[YTE] Failed to initialise progress overlay', e);
    controlsEnhancer = null;
  }

  startScrollVolume();
}

function cleanup() {
  if (controlsEnhancer) {
    try { controlsEnhancer.cleanup(); } catch (e) { console.error('[YTE] Cleanup error', e); }
    controlsEnhancer = null;
  }
  stopScrollVolume();
  const leftover = document.getElementById('yte-volume-feedback');
  if (leftover) leftover.remove();

  currentVideo = null;
  currentPlayer = null;
  currentVideoId = null;
}

/** Apply settings immediately, including on a video already playing. */
function applySettings(next) {
  settings = next;
  YteSettings.applyToDocument(settings);
  if (settings.scrollVolume) startScrollVolume();
  else stopScrollVolume();
}

function initialize() {
  // Settings are read before the first video is wired up so a disabled
  // feature never flashes on. The read takes a few milliseconds.
  YteSettings.load().then((loaded) => {
    applySettings(loaded);
    YteSettings.onChange(applySettings);
    new YouTubeDetector().init(initializeFeatures);
  });
}

// No unload/beforeunload handlers: the document teardown releases everything,
// and an `unload` listener would make YouTube ineligible for back/forward cache.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}

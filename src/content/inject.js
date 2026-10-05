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
 * MAIN-world bridge.
 *
 * Content scripts run in an isolated world and cannot call YouTube's player
 * API directly. They dispatch DOM events, and this script (which runs in the
 * page's own world) answers them using the real #movie_player API so the
 * native volume slider and mute state stay in sync. Values are exchanged via
 * attributes on <html>, which both worlds can read in every browser.
 *
 * This file touches nothing but the player's volume and the storage record
 * YouTube itself uses to remember it. No network.
 */
(function () {
  'use strict';

  var VOLUME_KEY = 'yt-player-volume';
  var THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  function getPlayer() {
    var player = document.getElementById('movie_player');
    return player && typeof player.getVolume === 'function' ? player : null;
  }

  /**
   * YouTube only persists volume changes made through its own slider. Changes
   * made via the player API are never written to storage, so a wheel-adjusted
   * volume was forgotten on the next page load. Write the same record YouTube
   * writes (session + local storage, 30-day expiry) so the player restores it.
   */
  function persistVolume(player) {
    try {
      var now = Date.now();
      var record = JSON.stringify({
        data: JSON.stringify({ volume: player.getVolume(), muted: player.isMuted() }),
        expiration: now + THIRTY_DAYS,
        creation: now
      });
      window.sessionStorage.setItem(VOLUME_KEY, record);
      window.localStorage.setItem(VOLUME_KEY, record);
    } catch (err) {
      /* Storage blocked by the browser; the volume just won't persist. */
    }
  }

  /** Parses a stored volume record; null if absent, malformed or expired. */
  function readRecord(storage) {
    try {
      var raw = storage.getItem(VOLUME_KEY);
      if (!raw) return null;
      var record = JSON.parse(raw);
      var data = JSON.parse(record.data);
      if (typeof data.volume !== 'number' || !isFinite(data.volume)) return null;
      if (typeof record.expiration === 'number' && record.expiration < Date.now()) return null;
      return { raw: raw, creation: Number(record.creation) || 0, volume: data.volume, muted: !!data.muted };
    } catch (err) {
      return null;
    }
  }

  /**
   * YouTube keeps one copy of the volume per tab (sessionStorage) and one
   * shared by all tabs (localStorage). When a player starts it prefers the
   * tab's own copy even if the shared one is newer, so a volume set in another
   * tab, or after this tab was last used, was silently ignored.
   *
   * @returns the shared record when it is newer than this tab's copy, else null
   */
  function newerSharedRecord() {
    var shared = readRecord(window.localStorage);
    if (!shared) return null;
    var own = readRecord(window.sessionStorage);
    return !own || shared.creation > own.creation ? shared : null;
  }

  /** Makes the newest record this tab's copy. Returns it, or null if already current. */
  function adoptNewestRecord() {
    var shared = newerSharedRecord();
    if (!shared) return null;
    try {
      window.sessionStorage.setItem(VOLUME_KEY, shared.raw);
    } catch (err) {
      /* Storage blocked; the player keeps whatever it has. */
    }
    return shared;
  }

  /** For a player that is already running: apply a newer volume directly. */
  function syncRunningPlayer() {
    var record = adoptNewestRecord();
    var player = getPlayer();
    if (!record || !player) return;
    try {
      if (player.getVolume() !== record.volume) player.setVolume(record.volume);
      if (record.muted && !player.isMuted()) player.mute();
      else if (!record.muted && player.isMuted()) player.unMute();
    } catch (err) {
      /* Player not ready; it will read the adopted record when it starts. */
    }
  }

  // This script runs at document_start, before YouTube creates its player, so
  // adopting here is enough for a fresh page load or a reload.
  adoptNewestRecord();
  // The player survives in-page navigation and back/forward cache restores,
  // so those need the running player updated. Other tabs are never changed
  // while they play; they pick the new volume up when their next video starts.
  document.addEventListener('yt-navigate-finish', syncRunningPlayer);
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) syncRunningPlayer();
  });

  document.addEventListener('yte-volume-set', function () {
    var player = getPlayer();
    var raw = document.documentElement.getAttribute('data-yte-set-volume');
    var volume = raw === null ? NaN : Number(raw);
    if (!player || !isFinite(volume)) return;
    try {
      volume = Math.max(0, Math.min(100, volume));
      player.setVolume(volume);
      if (volume > 0 && player.isMuted()) player.unMute();
      persistVolume(player);
    } catch (err) {
      /* Player not ready yet; nothing to do. */
    }
  });

  document.addEventListener('yte-volume-get', function () {
    var player = getPlayer();
    if (!player) return;
    try {
      document.documentElement.setAttribute(
        'data-yte-volume',
        JSON.stringify({ volume: player.getVolume(), muted: player.isMuted() })
      );
    } catch (err) {
      /* Player not ready yet; the reader falls back to the <video> element. */
    }
  });
})();

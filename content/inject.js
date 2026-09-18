/**
 * MAIN-world bridge.
 *
 * Content scripts run in an isolated world and cannot call YouTube's player
 * API directly. They dispatch DOM events, and this script (which runs in the
 * page's own world) answers them using the real #movie_player API so the
 * native volume slider and mute state stay in sync.
 *
 * This file touches nothing but the player's volume. No network, no storage.
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

  document.addEventListener('yte-volume-set', function (e) {
    var player = getPlayer();
    var volume = e.detail ? Number(e.detail.volume) : NaN;
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

// This script runs in the MAIN world, so it has access to the page's global variables (like the YouTube player API).

document.addEventListener('yte-volume-set', function(e) {
  try {
    var player = document.querySelector('#movie_player');
    if (!player) return;
    player.setVolume(e.detail.volume);
    if (e.detail.volume > 0 && player.isMuted()) {
      player.unMute();
    }
  } catch(err) { console.log('YTE: volume set error', err); }
});

document.addEventListener('yte-volume-get', function() {
  try {
    var player = document.querySelector('#movie_player');
    if (!player) return;
    document.documentElement.setAttribute('data-yte-volume',
      JSON.stringify({ volume: player.getVolume(), muted: player.isMuted() })
    );
  } catch(err) { console.log('YTE: volume get error', err); }
});

/**
 * YouTubeDetector - finds the main player and its <video>, and re-checks on
 * YouTube's single-page-app navigation events.
 *
 * The video is looked up *inside* #movie_player so that YouTube's inline
 * preview players (which use the same video class) are never picked up.
 */
class YouTubeDetector {
  static NAV_SETTLE_MS = 100;

  constructor() {
    this.video = null;
    this.player = null;
    this.callback = null;
    this.observer = null;
    this.navTimer = 0;
    this.handleNavigate = this.handleNavigate.bind(this);
  }

  findPlayerContainer() {
    return document.getElementById('movie_player');
  }

  findVideoElement(player) {
    return player ? player.querySelector('video.html5-main-video') : null;
  }

  isVideoPage() {
    return window.location.pathname === '/watch';
  }

  /**
   * Invoke the callback if a player and video exist on a watch page.
   * @param {boolean} force - call back even if the elements are unchanged
   *   (used after navigation, where the same elements host a new video)
   */
  check(force) {
    if (!this.isVideoPage()) return;
    const player = this.findPlayerContainer();
    const video = this.findVideoElement(player);
    if (!player || !video) return;
    if (!force && video === this.video && player === this.player) return;
    this.video = video;
    this.player = player;
    this.callback(video, player);
  }

  handleNavigate() {
    clearTimeout(this.navTimer);
    this.navTimer = setTimeout(() => this.check(true), YouTubeDetector.NAV_SETTLE_MS);
  }

  /**
   * @param {(video: HTMLVideoElement, player: HTMLElement) => void} onVideoFound
   */
  init(onVideoFound) {
    if (typeof onVideoFound !== 'function') {
      console.error('YouTubeDetector: onVideoFound callback is required');
      return;
    }
    this.callback = onVideoFound;

    // Direct page load.
    this.check(true);

    // Player inserted later. Once we hold connected elements this is a
    // near-free early return, so YouTube's constant DOM churn costs nothing.
    this.observer = new MutationObserver(() => {
      if (this.video && this.video.isConnected && this.player && this.player.isConnected) return;
      this.check(false);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });

    // SPA navigation between videos.
    document.addEventListener('yt-navigate-finish', this.handleNavigate);
    document.addEventListener('yt-page-data-updated', this.handleNavigate);
  }

  cleanup() {
    if (this.observer) this.observer.disconnect();
    this.observer = null;
    clearTimeout(this.navTimer);
    document.removeEventListener('yt-navigate-finish', this.handleNavigate);
    document.removeEventListener('yt-page-data-updated', this.handleNavigate);
    this.video = null;
    this.player = null;
    this.callback = null;
  }
}

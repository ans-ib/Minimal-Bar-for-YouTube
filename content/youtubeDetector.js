/**
 * YouTubeDetector - Detects and monitors YouTube video player
 * Handles YouTube's SPA (Single Page Application) navigation
 */
class YouTubeDetector {
  constructor() {
    this.video = null;
    this.player = null;
    this.observers = [];
    this.onVideoFoundCallback = null;
  }

  /**
   * Find the video element
   * @returns {HTMLVideoElement|null}
   */
  findVideoElement() {
    return document.querySelector('video.html5-main-video');
  }

  /**
   * Find the player container
   * @returns {HTMLElement|null}
   */
  findPlayerContainer() {
    return document.querySelector('#movie_player');
  }

  /**
   * Check if we're on a video page
   * @returns {boolean}
   */
  isVideoPage() {
    return window.location.pathname === '/watch';
  }

  /**
   * Setup mutation observer to watch for video element changes
   * @param {Function} callback
   */
  setupMutationObserver(callback) {
    const observer = new MutationObserver((mutations) => {
      // Only check if we're on a video page
      if (!this.isVideoPage()) {
        return;
      }

      const video = this.findVideoElement();
      const player = this.findPlayerContainer();

      if (video && player && video !== this.video) {
        this.video = video;
        this.player = player;
        callback(video, player);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);
    return observer;
  }

  /**
   * Setup YouTube navigation event listeners
   * Handles SPA navigation (yt-navigate-finish event)
   * @param {Function} callback
   */
  setupYouTubeEventListeners(callback) {
    // YouTube fires 'yt-navigate-finish' on page changes
    document.addEventListener('yt-navigate-finish', () => {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (!this.isVideoPage()) {
          return;
        }

        const video = this.findVideoElement();
        const player = this.findPlayerContainer();

        if (video && player) {
          this.video = video;
          this.player = player;
          callback(video, player);
        }
      }, 100);
    });

    // Also listen for 'yt-page-data-updated' (older YouTube versions)
    document.addEventListener('yt-page-data-updated', () => {
      setTimeout(() => {
        if (!this.isVideoPage()) {
          return;
        }

        const video = this.findVideoElement();
        const player = this.findPlayerContainer();

        if (video && player) {
          this.video = video;
          this.player = player;
          callback(video, player);
        }
      }, 100);
    });
  }

  /**
   * Initialize video detection
   * @param {Function} onVideoFound - Callback called when video is found (receives video and player elements)
   */
  init(onVideoFound) {
    if (!onVideoFound || typeof onVideoFound !== 'function') {
      console.error('YouTubeDetector: onVideoFound callback is required');
      return;
    }

    this.onVideoFoundCallback = onVideoFound;

    // Try immediate detection (for direct page loads)
    if (this.isVideoPage()) {
      const video = this.findVideoElement();
      const player = this.findPlayerContainer();

      if (video && player) {
        this.video = video;
        this.player = player;
        onVideoFound(video, player);
      }
    }

    // Setup continuous monitoring for SPA navigation
    this.setupMutationObserver(onVideoFound);
    this.setupYouTubeEventListeners(onVideoFound);

    console.log('YouTubeDetector: Initialized');
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.video = null;
    this.player = null;
    console.log('YouTubeDetector: Cleaned up');
  }
}

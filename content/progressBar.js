/**
 * NativeControlsEnhancer - Keeps YouTube's native controls always visible
 * When controls would auto-hide, shows them in a minimal state (thin progress bar, no buttons)
 * When controls are naturally shown (mouse moving), everything looks 100% native
 *
 * Uses a class on <html> instead of on #movie_player to avoid interfering
 * with YouTube's own class-watching logic.
 */
class NativeControlsEnhancer {
  constructor(video, player) {
    this.video = video;
    this.player = player;
    this.observers = [];
    this.chapterLabel = null;
  }

  /**
   * Create a floating chapter label pinned to the player element itself
   */
  createChapterLabel() {
    this.chapterLabel = document.createElement('div');
    this.chapterLabel.className = 'yte-chapter-label';
    this.player.appendChild(this.chapterLabel);
  }

  /**
   * Read the current chapter name from YouTube's native element and update our label
   */
  updateChapterLabel() {
    if (!this.chapterLabel) return;

    const isMinimal = document.documentElement.classList.contains('yte-minimal-controls');
    if (!isMinimal) {
      this.chapterLabel.style.display = 'none';
      return;
    }

    // Read from YouTube's native chapter title
    const chapterEl = this.player.querySelector('.ytp-chapter-title-content');
    const text = chapterEl ? chapterEl.textContent.trim() : '';

    if (text) {
      this.chapterLabel.textContent = text;
      this.chapterLabel.style.display = 'block';
    } else {
      this.chapterLabel.style.display = 'none';
    }
  }

  /**
   * Watch for YouTube's ytp-autohide class and toggle minimal mode
   */
  setupVisibilityControl() {
    if (!this.player) return;

    const observer = new MutationObserver(() => {
      const controlsHidden = this.player.classList.contains('ytp-autohide');

      if (controlsHidden) {
        document.documentElement.classList.add('yte-minimal-controls');
      } else {
        document.documentElement.classList.remove('yte-minimal-controls');
      }

      this.updateChapterLabel();
    });

    observer.observe(this.player, {
      attributes: true,
      attributeFilter: ['class']
    });

    this.observers.push(observer);

    // Watch for chapter text changes (YouTube updates it as video plays)
    const chapterObserver = new MutationObserver(() => {
      this.updateChapterLabel();
    });

    // Observe the chrome-bottom area for text changes
    const chromeBottom = this.player.querySelector('.ytp-chrome-bottom');
    if (chromeBottom) {
      chapterObserver.observe(chromeBottom, {
        subtree: true,
        characterData: true,
        childList: true
      });
      this.observers.push(chapterObserver);
    }

    // Initial state check
    if (this.player.classList.contains('ytp-autohide')) {
      document.documentElement.classList.add('yte-minimal-controls');
    }

    this.updateChapterLabel();
  }

  /**
   * Initialize the enhancer
   */
  init() {
    if (!this.video || !this.player) {
      console.error('NativeControlsEnhancer: video or player not found');
      return;
    }

    this.createChapterLabel();
    this.setupVisibilityControl();
    console.log('NativeControlsEnhancer: Initialized');
  }

  /**
   * Cleanup
   */
  cleanup() {
    document.documentElement.classList.remove('yte-minimal-controls');

    if (this.chapterLabel && this.chapterLabel.parentNode) {
      this.chapterLabel.parentNode.removeChild(this.chapterLabel);
    }
    this.chapterLabel = null;

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    console.log('NativeControlsEnhancer: Cleaned up');
  }
}

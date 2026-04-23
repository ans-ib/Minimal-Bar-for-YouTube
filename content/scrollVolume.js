/**
 * ScrollVolumeControl - Control video volume by scrolling
 * Scroll up = increase volume, scroll down = decrease volume
 * Shows a Windows-style volume indicator
 */
class ScrollVolumeControl {
  constructor(video, player) {
    this.video = video;
    this.player = player;
    this.isHovering = false;
    this.feedbackTimeout = null;
    this.feedbackElement = null;
    this._boundHandlers = {};
  }

  /**
   * Get current volume via page context bridge (0-100).
   * dispatchEvent is synchronous, so the response is available immediately.
   * @returns {number}
   */
  getVolume() {
    // Dispatch fires the page-context listener synchronously
    document.dispatchEvent(new CustomEvent('yte-volume-get'));

    try {
      const data = document.documentElement.getAttribute('data-yte-volume');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.volume || 0;
      }
    } catch (e) {}

    // Fallback
    return Math.round(this.video.volume * 100);
  }

  handleScroll(event) {
    // Only process if hovering over video/player
    if (!this.player.matches(':hover')) return;

    // Prevent page scroll
    event.preventDefault();
    event.stopPropagation();

    // Get current volume (0-100)
    const currentVolume = this.getVolume();

    // Determine scroll direction
    const delta = event.deltaY;

    let newVolume = currentVolume;
    if (delta < 0) {
      // Scroll up = increase volume
      newVolume = Math.min(100, currentVolume + 5);
    } else if (delta > 0) {
      // Scroll down = decrease volume
      newVolume = Math.max(0, currentVolume - 5);
    }

    this.setVolume(newVolume);

    // Show visual feedback with the volume we just set
    this.showVolumeFeedback(newVolume);
  }

  /**
   * Set volume via page context bridge using YouTube's player API
   * @param {number} volume - Volume level (0 to 100)
   */
  setVolume(volume) {
    volume = Math.max(0, Math.min(100, Math.round(volume)));
    document.dispatchEvent(new CustomEvent('yte-volume-set', { detail: { volume: volume } }));
  }

  /**
   * Show volume feedback indicator
   * @param {number} volumePercent - Volume level (0 to 100)
   */
  showVolumeFeedback(volumePercent) {
    // Find or create feedback element
    if (!this.feedbackElement) {
      this.feedbackElement = document.createElement('div');
      this.feedbackElement.id = 'yte-volume-feedback';
      this.feedbackElement.className = 'yte-volume-feedback';
      this.player.appendChild(this.feedbackElement);
    }

    // Create volume bar visualization (Windows style)
    const barCount = 10;
    const filledBars = Math.round((volumePercent / 100) * barCount);

    let volumeBar = '';
    for (let i = 0; i < barCount; i++) {
      if (i < filledBars) {
        volumeBar += '<div class="yte-volume-bar yte-volume-bar-filled"></div>';
      } else {
        volumeBar += '<div class="yte-volume-bar"></div>';
      }
    }

    this.feedbackElement.innerHTML = `
      <div class="yte-volume-icon">
        ${this.getVolumeIcon(volumePercent)}
      </div>
      <div class="yte-volume-bars">
        ${volumeBar}
      </div>
      <div class="yte-volume-text">${volumePercent}%</div>
    `;

    // Show feedback
    this.feedbackElement.classList.add('yte-visible');

    // Hide after delay
    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      if (this.feedbackElement) {
        this.feedbackElement.classList.remove('yte-visible');
      }
    }, 1000);
  }

  /**
   * Get volume icon based on volume level
   * @param {number} volumePercent
   * @returns {string} SVG icon
   */
  getVolumeIcon(volumePercent) {
    if (volumePercent === 0) {
      // Muted icon
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V12.18L16.45,14.63C16.5,14.43 16.5,14.21 16.5,12Z"/>
          <path d="M4,4L20,20" stroke="white" stroke-width="2"/>
        </svg>
      `;
    } else if (volumePercent < 33) {
      // Low volume icon
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M3,9V15H7L12,20V4L7,9H3M14,11H16.5V13H14V11Z"/>
        </svg>
      `;
    } else if (volumePercent < 66) {
      // Medium volume icon
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12Z"/>
        </svg>
      `;
    } else {
      // High volume icon
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12M19,12C19,15.17 16.89,17.85 14,18.71V20.77C17.97,19.86 21,16.28 21,12C21,7.72 17.97,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12Z"/>
        </svg>
      `;
    }
  }

  /**
   * Handle mouse enter on video/player
   */
  handleMouseEnter() {
    this.isHovering = true;
  }

  /**
   * Handle mouse leave from video/player
   */
  handleMouseLeave() {
    this.isHovering = false;
  }

  /**
   * Initialize scroll volume control
   */
  init() {
    if (!this.player) {
      console.error('ScrollVolumeControl: player not found');
      return;
    }

    // Create bound handlers for cleanup
    this._boundHandlers.wheel = (e) => this.handleScroll(e);
    this._boundHandlers.playerMouseEnter = () => this.handleMouseEnter();
    this._boundHandlers.playerMouseLeave = () => this.handleMouseLeave();

    // Listen to wheel events on player element to catch events over UI
    this.player.addEventListener('wheel', this._boundHandlers.wheel, {
      passive: false // Allow preventDefault
    });

    // Track hover state on player container
    this.player.addEventListener('mouseenter', this._boundHandlers.playerMouseEnter);
    this.player.addEventListener('mouseleave', this._boundHandlers.playerMouseLeave);

    console.log('ScrollVolumeControl: Initialized');
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Remove event listeners from player
    if (this.player && this._boundHandlers) {
      this.player.removeEventListener('wheel', this._boundHandlers.wheel);
      this.player.removeEventListener('mouseenter', this._boundHandlers.playerMouseEnter);
      this.player.removeEventListener('mouseleave', this._boundHandlers.playerMouseLeave);
    }

    this._boundHandlers = {};

    // Remove feedback element
    if (this.feedbackElement && this.feedbackElement.parentNode) {
      this.feedbackElement.parentNode.removeChild(this.feedbackElement);
    }
    this.feedbackElement = null;

    // Clear timeout
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }

    console.log('ScrollVolumeControl: Cleaned up');
  }
}

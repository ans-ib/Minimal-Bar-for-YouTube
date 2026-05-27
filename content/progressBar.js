/**
 * NativeControlsEnhancer - Keeps YouTube's native controls always visible
 * When controls would auto-hide, shows them in a minimal state (thin progress bar, no buttons)
 * When controls are naturally shown (mouse moving), everything looks 100% native
 *
 * Transitions are done via inline styles to bypass YouTube's CSS conflicts.
 */
class NativeControlsEnhancer {
  constructor(video, player) {
    this.video = video;
    this.player = player;
    this.observers = [];
    this.chapterLabel = null;
    this.timeLabel = null;
    this.isMinimal = false;
  }

  createChapterLabel() {
    this.chapterLabel = document.createElement('div');
    this.chapterLabel.className = 'yte-chapter-label';
    this.player.appendChild(this.chapterLabel);

    this.timeLabel = document.createElement('div');
    this.timeLabel.className = 'yte-time-label';
    this.player.appendChild(this.timeLabel);
  }

  updateChapterLabel() {
    if (!this.chapterLabel) return;

    const chapterEl = this.player.querySelector('.ytp-chapter-title-content');
    const text = chapterEl ? chapterEl.textContent.trim() : '';

    if (this.isMinimal && text) {
      this.chapterLabel.textContent = text;
      this.chapterLabel.classList.add('yte-visible');
    } else {
      this.chapterLabel.classList.remove('yte-visible');
    }
  }

  updateProgressBar() {
    if (!this.isMinimal || !this.video) return;
    this.applyProgress(true);
  }

  applyProgress(important) {
    const duration = this.video.duration;
    if (!isFinite(duration) || duration <= 0) return;

    const currentTime = this.video.currentTime;
    const progressBar = this.player.querySelector('.ytp-progress-bar');
    if (!progressBar) return;

    const setT = (el, v) => {
      const value = `scaleX(${v})`;
      if (important) {
        el.style.setProperty('transform', value, 'important');
      } else {
        // Empty priority replaces an !important inline value with a normal one
        el.style.setProperty('transform', value, '');
      }
    };

    const chapters = progressBar.querySelectorAll('.ytp-chapter-hover-container');

    if (chapters.length > 0) {
      // Each chapter container's inline width (px) is its share of the total duration.
      // Pixel values are arbitrary — what matters is each chapter's width / sum-of-widths.
      const widths = Array.from(chapters).map((c) => parseFloat(c.style.width) || 0);
      const totalWidth = widths.reduce((a, b) => a + b, 0);
      if (totalWidth <= 0) return;

      let cumulative = 0;
      chapters.forEach((container, i) => {
        const chapterDuration = (widths[i] / totalWidth) * duration;
        const chapterStart = cumulative;
        cumulative += chapterDuration;

        let progress;
        if (chapterDuration <= 0) progress = 0;
        else if (currentTime >= cumulative) progress = 1;
        else if (currentTime <= chapterStart) progress = 0;
        else progress = (currentTime - chapterStart) / chapterDuration;

        const playEl = container.querySelector('.ytp-play-progress');
        if (playEl) setT(playEl, progress);
      });
    } else {
      // Non-chaptered fallback: single global play-progress
      const playEl = progressBar.querySelector('.ytp-play-progress');
      if (playEl) {
        const progress = Math.min(1, Math.max(0, currentTime / duration));
        setT(playEl, progress);
      }
    }
  }

  releaseProgressBar() {
    // Demote our !important override to a normal inline value at the current
    // progress, so YouTube's next update can overwrite without a flash.
    if (!this.video) return this.clearProgressBarOverride();
    const duration = this.video.duration;
    if (!isFinite(duration) || duration <= 0) return this.clearProgressBarOverride();
    this.applyProgress(false);
  }

  clearProgressBarOverride() {
    const progressBar = this.player ? this.player.querySelector('.ytp-progress-bar') : null;
    if (!progressBar) return;
    progressBar.querySelectorAll('.ytp-play-progress').forEach((el) => {
      el.style.removeProperty('transform');
    });
  }

  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '';
    const total = Math.floor(seconds);
    const s = total % 60;
    const m = Math.floor(total / 60) % 60;
    const h = Math.floor(total / 3600);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  updateTimeLabel() {
    if (!this.timeLabel || !this.video) return;

    if (!this.isMinimal) {
      this.timeLabel.classList.remove('yte-visible');
      return;
    }

    const current = this.formatTime(this.video.currentTime);
    const duration = this.formatTime(this.video.duration);
    const text = duration ? `${current} / ${duration}` : current;

    if (text) {
      this.timeLabel.textContent = text;
      this.timeLabel.classList.add('yte-visible');
    } else {
      this.timeLabel.classList.remove('yte-visible');
    }
  }

  /**
   * Smoothly fade an element's opacity via inline styles
   */
  fadeTo(el, targetOpacity, duration) {
    if (!el) return;
    el.style.setProperty('transition', `opacity ${duration}ms ease`, 'important');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.setProperty('opacity', String(targetOpacity), 'important');
      });
    });
  }

  enterMinimal() {
    this.isMinimal = true;

    const controls = this.player.querySelector('.ytp-chrome-controls');
    const gradient = this.player.querySelector('.ytp-gradient-bottom');
    const scrubber = this.player.querySelector('.ytp-scrubber-container');

    this.fadeTo(controls, 0, 800);
    this.fadeTo(gradient, 0, 800);
    this.fadeTo(scrubber, 0, 600);

    this.updateChapterLabel();
    this.updateTimeLabel();
    this.updateProgressBar();
  }

  exitMinimal() {
    this.isMinimal = false;

    const controls = this.player.querySelector('.ytp-chrome-controls');
    const gradient = this.player.querySelector('.ytp-gradient-bottom');
    const scrubber = this.player.querySelector('.ytp-scrubber-container');

    this.releaseProgressBar();

    this.fadeTo(controls, 1, 600);
    this.fadeTo(gradient, 1, 600);
    this.fadeTo(scrubber, 1, 400);

    this.updateChapterLabel();
    this.updateTimeLabel();
  }

  setupObservers() {
    if (!this.player) return;

    const autohideObserver = new MutationObserver(() => {
      const controlsHidden = this.player.classList.contains('ytp-autohide');

      if (controlsHidden && !this.isMinimal) {
        this.enterMinimal();
      } else if (!controlsHidden && this.isMinimal) {
        this.exitMinimal();
      }
    });

    autohideObserver.observe(this.player, {
      attributes: true,
      attributeFilter: ['class']
    });
    this.observers.push(autohideObserver);

    // Drive time-label updates directly off the video element so they fire
    // even while controls are auto-hidden (YouTube only updates the DOM
    // .ytp-time-display when controls are visible).
    this.timeUpdateHandler = () => {
      this.updateTimeLabel();
      this.updateProgressBar();
    };
    this.video.addEventListener('timeupdate', this.timeUpdateHandler);
    this.video.addEventListener('durationchange', this.timeUpdateHandler);

    // Watch for chapter text changes
    const chapterObserver = new MutationObserver(() => {
      this.updateChapterLabel();
    });

    const chromeBottom = this.player.querySelector('.ytp-chrome-bottom');
    if (chromeBottom) {
      chapterObserver.observe(chromeBottom, {
        subtree: true,
        characterData: true,
        childList: true
      });
      this.observers.push(chapterObserver);
    }

    // Initial state
    if (this.player.classList.contains('ytp-autohide')) {
      this.isMinimal = true;
      const controls = this.player.querySelector('.ytp-chrome-controls');
      const gradient = this.player.querySelector('.ytp-gradient-bottom');
      const scrubber = this.player.querySelector('.ytp-scrubber-container');
      if (controls) controls.style.setProperty('opacity', '0', 'important');
      if (gradient) gradient.style.setProperty('opacity', '0', 'important');
      if (scrubber) scrubber.style.setProperty('opacity', '0', 'important');
      this.updateChapterLabel();
      this.updateTimeLabel();
      this.updateProgressBar();
    }
  }

  init() {
    if (!this.video || !this.player) {
      console.error('NativeControlsEnhancer: video or player not found');
      return;
    }

    this.createChapterLabel();
    this.setupObservers();
    console.log('NativeControlsEnhancer: Initialized');
  }

  cleanup() {
    const controls = this.player ? this.player.querySelector('.ytp-chrome-controls') : null;
    const gradient = this.player ? this.player.querySelector('.ytp-gradient-bottom') : null;
    const scrubber = this.player ? this.player.querySelector('.ytp-scrubber-container') : null;
    if (controls) { controls.style.removeProperty('opacity'); controls.style.removeProperty('transition'); }
    if (gradient) { gradient.style.removeProperty('opacity'); gradient.style.removeProperty('transition'); }
    if (scrubber) { scrubber.style.removeProperty('opacity'); scrubber.style.removeProperty('transition'); }

    this.clearProgressBarOverride();

    if (this.chapterLabel && this.chapterLabel.parentNode) {
      this.chapterLabel.parentNode.removeChild(this.chapterLabel);
    }
    this.chapterLabel = null;

    if (this.timeLabel && this.timeLabel.parentNode) {
      this.timeLabel.parentNode.removeChild(this.timeLabel);
    }
    this.timeLabel = null;

    if (this.video && this.timeUpdateHandler) {
      this.video.removeEventListener('timeupdate', this.timeUpdateHandler);
      this.video.removeEventListener('durationchange', this.timeUpdateHandler);
    }
    this.timeUpdateHandler = null;

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    console.log('NativeControlsEnhancer: Cleaned up');
  }
}

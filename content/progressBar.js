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
    this.isMinimal = false;
  }

  createChapterLabel() {
    this.chapterLabel = document.createElement('div');
    this.chapterLabel.className = 'yte-chapter-label';
    this.player.appendChild(this.chapterLabel);
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
  }

  exitMinimal() {
    this.isMinimal = false;

    const controls = this.player.querySelector('.ytp-chrome-controls');
    const gradient = this.player.querySelector('.ytp-gradient-bottom');
    const scrubber = this.player.querySelector('.ytp-scrubber-container');

    this.fadeTo(controls, 1, 600);
    this.fadeTo(gradient, 1, 600);
    this.fadeTo(scrubber, 1, 400);

    this.updateChapterLabel();
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

    if (this.chapterLabel && this.chapterLabel.parentNode) {
      this.chapterLabel.parentNode.removeChild(this.chapterLabel);
    }
    this.chapterLabel = null;

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    console.log('NativeControlsEnhancer: Cleaned up');
  }
}

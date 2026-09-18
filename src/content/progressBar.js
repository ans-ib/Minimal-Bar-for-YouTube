/**
 * NativeControlsEnhancer
 *
 * Renders an independent overlay inside the player: a slim segmented progress
 * bar (one segment per chapter), a chapter label and a time label. The overlay
 * is fade-toggled purely by CSS keyed off YouTube's own `.ytp-autohide` class,
 * so YouTube's chrome is never touched and no layout reflow is forced when the
 * controls hide or show.
 *
 * Per-frame work is kept minimal: only the fill transforms are written on each
 * animation frame, and only when they change. DOM queries for chapter layout
 * and label text run on the slower DOM_POLL_MS cadence.
 */
export class NativeControlsEnhancer {
  static DOM_POLL_MS = 250;

  constructor(video, player) {
    this.video = video;
    this.player = player;
    this.overlay = null;
    this.chapterLabel = null;
    this.timeLabel = null;
    this.chapterFills = [];
    this.lastChapterSignature = '';
    this.lastChapterText = '';
    this.lastTimeText = '';
    this.lastDomPoll = -Infinity;
    this.running = false;
    this.rafId = 0;
    this.frame = this.frame.bind(this);
    this.handleSeek = this.handleSeek.bind(this);
  }

  init() {
    if (!this.video || !this.player) {
      console.error('NativeControlsEnhancer: video or player not found');
      return;
    }
    this.createElements();
    this.running = true;
    this.rafId = requestAnimationFrame(this.frame);
  }

  createElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'yte-progress-overlay';
    this.overlay.addEventListener('click', this.handleSeek);
    this.player.appendChild(this.overlay);

    this.chapterLabel = document.createElement('div');
    this.chapterLabel.className = 'yte-chapter-label';
    this.player.appendChild(this.chapterLabel);

    this.timeLabel = document.createElement('div');
    this.timeLabel.className = 'yte-time-label';
    this.player.appendChild(this.timeLabel);
  }

  frame(now) {
    if (!this.running) return;
    if (now - this.lastDomPoll >= NativeControlsEnhancer.DOM_POLL_MS) {
      this.lastDomPoll = now;
      this.rebuildChaptersIfNeeded();
      this.updateChapterText();
      this.updateTimeText();
    }
    this.updateProgress();
    this.rafId = requestAnimationFrame(this.frame);
  }

  /**
   * Build the overlay's segmented structure to mirror YouTube's chapter layout.
   * Rebuilds only when the chapter signature (duration + widths) changes.
   * Falls back to a single continuous segment when there are no chapters.
   */
  rebuildChaptersIfNeeded() {
    const duration = this.video.duration;
    const progressBar = this.player.querySelector('.ytp-progress-bar');
    const containers = progressBar
      ? progressBar.querySelectorAll('.ytp-chapter-hover-container')
      : [];
    const widths = Array.from(containers, (c) => parseFloat(c.style.width) || 0);
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const signature = `${isFinite(duration) ? duration.toFixed(2) : '0'}|${widths.join(',')}`;
    if (signature === this.lastChapterSignature) return;
    this.lastChapterSignature = signature;

    this.overlay.textContent = '';
    this.chapterFills = [];

    if (totalWidth <= 0 || !isFinite(duration) || duration <= 0) {
      const segment = this.makeSegment(1);
      this.overlay.appendChild(segment.el);
      this.chapterFills.push({
        start: 0,
        duration: isFinite(duration) ? duration : 0,
        fill: segment.fill,
        last: -1
      });
      return;
    }

    let cumulative = 0;
    for (const w of widths) {
      if (w <= 0) continue;
      const chapterDuration = (w / totalWidth) * duration;
      const segment = this.makeSegment(w);
      this.overlay.appendChild(segment.el);
      this.chapterFills.push({ start: cumulative, duration: chapterDuration, fill: segment.fill, last: -1 });
      cumulative += chapterDuration;
    }
  }

  makeSegment(flexGrow) {
    const el = document.createElement('div');
    el.className = 'yte-progress-segment';
    el.style.flexGrow = String(flexGrow);
    const fill = document.createElement('div');
    fill.className = 'yte-progress-fill';
    el.appendChild(fill);
    return { el, fill };
  }

  updateProgress() {
    const t = this.video.currentTime;
    for (const seg of this.chapterFills) {
      let p;
      if (seg.duration <= 0) p = 0;
      else if (t >= seg.start + seg.duration) p = 1;
      else if (t <= seg.start) p = 0;
      else p = (t - seg.start) / seg.duration;
      if (p !== seg.last) {
        seg.last = p;
        seg.fill.style.transform = `scaleX(${p})`;
      }
    }
  }

  /**
   * YouTube renders two chapter buttons: one for creator chapters and one for
   * key moments / the "In this video" panel, hiding whichever doesn't apply
   * with an inline display:none. Only a visible, enabled button holds a real
   * chapter name, and only when the bar is actually split into chapters.
   */
  readChapterTitle() {
    if (this.chapterFills.length <= 1) return '';
    const contents = this.player.querySelectorAll('.ytp-chapter-container .ytp-chapter-title-content');
    for (const el of contents) {
      const container = el.closest('.ytp-chapter-container');
      if (container && container.style.display === 'none') continue;
      const button = el.closest('.ytp-chapter-title');
      if (button && (button.disabled || button.classList.contains('ytp-chapter-container-disabled'))) continue;
      const text = el.textContent.trim();
      if (text) return text;
    }
    return '';
  }

  updateChapterText() {
    const text = this.readChapterTitle();
    if (text !== this.lastChapterText) {
      this.lastChapterText = text;
      this.chapterLabel.textContent = text;
      this.chapterLabel.classList.toggle('yte-has-text', !!text);
    }
  }

  updateTimeText() {
    const current = this.formatTime(this.video.currentTime);
    const total = this.formatTime(this.video.duration);
    const text = total ? `${current} / ${total}` : current;
    if (text !== this.lastTimeText) {
      this.lastTimeText = text;
      this.timeLabel.textContent = text;
      this.timeLabel.classList.toggle('yte-has-text', !!text);
    }
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

  handleSeek(event) {
    // Don't let the click reach the player, where it would toggle play/pause.
    event.stopPropagation();
    const duration = this.video.duration;
    if (!isFinite(duration) || duration <= 0) return;
    const rect = this.overlay.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    this.video.currentTime = ratio * duration;
  }

  cleanup() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.overlay) {
      this.overlay.removeEventListener('click', this.handleSeek);
      this.overlay.remove();
    }
    if (this.chapterLabel) this.chapterLabel.remove();
    if (this.timeLabel) this.timeLabel.remove();
    this.overlay = null;
    this.chapterLabel = null;
    this.timeLabel = null;
    this.chapterFills = [];
  }
}

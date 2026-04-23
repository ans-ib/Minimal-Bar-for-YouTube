/**
 * YouTube Enhancer - Main Content Script
 * Coordinates all features and initializes them when video is detected
 */
(function() {
  'use strict';

  // Feature instances
  let currentVideo = null;
  let currentPlayer = null;
  let currentVideoUrl = null;
  let controlsEnhancer = null;
  let scrollVolume = null;
  let detector = null;

  /**
   * Initialize all features for a detected video
   * @param {HTMLVideoElement} video
   * @param {HTMLElement} player
   */
  function initializeFeatures(video, player) {
    const newUrl = window.location.href;

    // Only skip if same video element AND same URL
    if (video === currentVideo && player === currentPlayer && newUrl === currentVideoUrl) {
      return;
    }

    console.log('YouTube Enhancer: Initializing features for new video');

    // Cleanup previous instances
    cleanup();

    // Update references
    currentVideo = video;
    currentPlayer = player;
    currentVideoUrl = newUrl;

    // Initialize native controls enhancer
    try {
      controlsEnhancer = new NativeControlsEnhancer(video, player);
      controlsEnhancer.init();
    } catch (e) {
      console.error('YouTube Enhancer: Failed to initialize controls enhancer', e);
    }

    // Initialize scroll volume control
    try {
      scrollVolume = new ScrollVolumeControl(video, player);
      scrollVolume.init();
    } catch (e) {
      console.error('YouTube Enhancer: Failed to initialize scroll volume', e);
    }

    console.log('YouTube Enhancer: All features initialized successfully');
  }

  /**
   * Cleanup all features
   */
  function cleanup() {
    console.log('YouTube Enhancer: Cleaning up features');

    // Cleanup controls enhancer
    if (controlsEnhancer) {
      try {
        controlsEnhancer.cleanup();
      } catch (e) {
        console.error('YouTube Enhancer: Error cleaning up controls enhancer', e);
      }
      controlsEnhancer = null;
    }

    // Cleanup scroll volume
    if (scrollVolume) {
      try {
        scrollVolume.cleanup();
      } catch (e) {
        console.error('YouTube Enhancer: Error cleaning up scroll volume', e);
      }
      scrollVolume = null;
    }

    // Remove any leftover elements
    const existingVolumeFeedback = document.getElementById('yte-volume-feedback');
    if (existingVolumeFeedback) {
      existingVolumeFeedback.remove();
    }

    currentVideo = null;
    currentPlayer = null;
    currentVideoUrl = null;
  }

  /**
   * Initialize the extension
   */
  function initialize() {
    console.log('YouTube Enhancer: Starting initialization');

    // Check if classes are available
    if (typeof YouTubeDetector === 'undefined') {
      console.error('YouTube Enhancer: YouTubeDetector class not found');
      return;
    }

    if (typeof NativeControlsEnhancer === 'undefined') {
      console.error('YouTube Enhancer: NativeControlsEnhancer class not found');
      return;
    }

    if (typeof ScrollVolumeControl === 'undefined') {
      console.error('YouTube Enhancer: ScrollVolumeControl class not found');
      return;
    }

    // Create detector instance
    detector = new YouTubeDetector();

    // Initialize detector with callback
    detector.init((video, player) => {
      initializeFeatures(video, player);
    });

    console.log('YouTube Enhancer: Extension initialized');
  }

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    cleanup();
    if (detector) {
      detector.cleanup();
    }
  });

  // Handle extension unload (for development)
  window.addEventListener('unload', () => {
    cleanup();
    if (detector) {
      detector.cleanup();
    }
  });

  // Start the extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM already loaded
    initialize();
  }

  console.log('YouTube Enhancer: Content script loaded');
})();

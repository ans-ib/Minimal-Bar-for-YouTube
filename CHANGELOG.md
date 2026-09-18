# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-09-18

### Added
- Minimal progress bar with one segment per chapter, shown while YouTube's
  controls are hidden, with chapter and time labels.
- Mouse-wheel volume control with an on-screen indicator. Trackpad input is
  smoothed, ctrl+wheel is left to the browser, scrolling up from mute unmutes.
- The wheel-set volume is saved the same way YouTube saves slider changes, so
  it is restored on the next visit.
- Settings popup (also the options page): wheel volume on/off, bar thickness,
  label text size. Stored with `storage.sync` and applied live.
- Builds for Chrome, Brave, Edge and other Chromium browsers, and for Firefox 142+.

### Fixed
- The chapter label no longer shows YouTube's "In this video" placeholder on
  videos without creator chapters.

[Unreleased]: https://github.com/ans-ib/Minimal-Bar-for-YouTube/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ans-ib/Minimal-Bar-for-YouTube/releases/tag/v1.0.0

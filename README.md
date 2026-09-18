# Minimal Bar for YouTube

A Chrome extension (Manifest V3) that adds two things to the YouTube watch page:

- **Minimal progress bar.** When YouTube hides its controls, a thin segmented progress bar (one segment per chapter) stays visible along the bottom of the player, with the current chapter name and the time in small labels. It fades out again when YouTube's own controls come back, and during ads.
- **Wheel volume.** Scrolling the mouse wheel over the video changes the volume in 5% steps with an on-screen indicator. Trackpad scrolling is smoothed so a swipe doesn't jump straight to 0 or 100. Scrolling up from mute unmutes. The new volume is saved the same way YouTube saves slider changes, so it is restored the next time YouTube opens.

**Settings** live behind the toolbar icon (and on the extension's options page): switch wheel volume on or off, and set the bar thickness and the label text size. Changes apply immediately and are stored with `chrome.storage.sync`, so they persist and follow your Chrome profile.

No data is collected or transmitted. There is no background worker and no network access. The only thing stored is your three settings. The extension only runs on `https://www.youtube.com`.

## Layout

| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest |
| `content/inject.js` | Runs in the page's own world and answers volume get/set requests using YouTube's player API |
| `content/youtubeDetector.js` | Finds the player and follows YouTube's single-page navigation |
| `content/progressBar.js` | Minimal progress overlay, chapter label, time label |
| `content/scrollVolume.js` | Wheel volume and the indicator |
| `content/content.js` | Loads settings and wires the pieces together |
| `common/settings.js` | Settings defaults, validation and storage, shared by content scripts and popup |
| `popup/` | Toolbar popup, also used as the options page |
| `styles/content.css` | All styles, prefixed `yte-` |
| `icons/` | 16, 48 and 128 px icons |
| `build.ps1` | Packages the store zip |
| `dev/youtube.example` | Captured player DOM used as a reference while developing. Not shipped. |
| `docs/store-listing.md` | Listing copy and privacy answers for the Chrome Web Store |

## Develop

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick this folder.
2. After editing, click the reload icon on the extension's card, then reload the YouTube tab.

## Package for the Chrome Web Store

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1
```

This writes `dist/minimal-bar-for-youtube-<version>.zip` containing only the files the manifest references. Bump `version` in `manifest.json` before every upload; the store rejects a zip whose version is not higher than the published one.

# Privacy Policy

**Minimal Bar for YouTube** does not collect, store, transmit or sell any user data.

## What the extension does with data

- **Settings.** Your three preferences (wheel volume on/off, bar thickness,
  label text size) are saved with the browser's `storage.sync` API. They stay
  inside your browser profile and, if you have browser sync enabled, are synced
  by your browser vendor between your own devices. The extension never sends
  them anywhere else.
- **Volume.** When you change the volume with the mouse wheel, the new level is
  written to the same browser storage YouTube itself uses to remember the
  volume, so YouTube restores it next time. This stays on your device.
- **Page content.** The extension reads the YouTube player's state (current
  time, duration, chapter layout) on `www.youtube.com` only, in order to draw
  the progress bar and labels. Nothing read from the page is stored or
  transmitted.

## What the extension does not do

- No analytics, telemetry or crash reporting.
- No network requests of any kind. There is no background process.
- No access to any site other than `www.youtube.com`.
- No cookies, no account information, no browsing history.

## Permissions

- `storage`: to save the settings above.
- Access to `https://www.youtube.com/*`: to run on YouTube watch pages.

## Changes and contact

If this policy ever changes, the change is recorded in the project's
[changelog](CHANGELOG.md). Questions can be raised on the
[issue tracker](https://github.com/ans-ib/Youtube_Enhancer/issues).

_Last updated: 2026-09-18_

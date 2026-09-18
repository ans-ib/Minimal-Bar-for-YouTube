# Chrome Web Store listing

Everything below is ready to paste into the Developer Dashboard. Anything in
**[brackets]** is a decision or asset that only you can supply.

## Before you start

- Developer account: https://chrome.google.com/webstore/devconsole. One-time
  registration fee, a verified email, and 2-step verification on the Google
  account are required before you can publish.
- Build the zip: `powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1`
  → upload `dist/minimal-bar-for-youtube-1.0.0.zip`.
- The name and short description come from `manifest.json`. If you rename the
  extension, change it there and rebuild. Avoid names that start with
  "YouTube" (the store treats "YouTube ___" as implying affiliation; the
  "___ for YouTube" form is the accepted one). "Enhancer for YouTube" is an
  existing, well-known extension, so avoid that too.

## Store listing tab

**Category:** Productivity → Tools (or Entertainment; either is accepted).

**Language:** English.

**Description** (paste as is, edit freely):

> Minimal Bar keeps you oriented while you watch, without cluttering the player.
>
> **Minimal progress bar.** When YouTube hides its controls, a thin progress bar stays visible along the bottom edge of the video. It is split into the video's chapters, and the current chapter name and time appear as small unobtrusive labels. Move the mouse and YouTube's normal controls come back exactly as before.
>
> **Wheel volume.** Roll the mouse wheel anywhere over the video to change the volume in 5% steps. A small indicator shows the new level. Trackpads are handled smoothly, scrolling up from mute unmutes, and the new volume is remembered the next time you open YouTube.
>
> **Your way.** Click the toolbar icon to switch wheel volume off, make the bar thicker, or make the chapter and time labels larger. Changes apply instantly.
>
> Minimal Bar uses YouTube's own player, so the native volume slider and mute button always stay in sync. It works in normal, theater and fullscreen modes.
>
> Privacy: this extension collects no data of any kind. It has no background process and no network access. The only thing it stores is your settings. It runs only on www.youtube.com.
>
> Not affiliated with YouTube or Google. YouTube is a trademark of Google LLC.

**Graphic assets** (all PNG or JPEG, no transparency except the icon):

| Asset | Size | Required | Notes |
| --- | --- | --- | --- |
| Store icon | 128×128 | Yes | Use `icons/icon128.png` |
| Screenshots | 1280×800 (or 640×400) | Yes, 1–5 | **[Take these]**: one showing the bar with chapter/time labels while controls are hidden, one showing the volume indicator mid-scroll, one of the settings popup |
| Small promo tile | 440×280 | No | Shown in search results and category pages; worth having |
| Marquee | 1400×560 | No | Only used if the store features the extension |

**[Optional] URLs:** homepage, support URL (a GitHub issues page works).

## Privacy practices tab

**Single purpose description:**

> Adds a minimal always-visible progress bar and mouse-wheel volume control to the YouTube video player.

**Permission justification — host permission `https://www.youtube.com/*`:**

> The extension is a content script that draws a slim progress overlay inside the YouTube player and adjusts the player's volume in response to the mouse wheel. It must run on www.youtube.com pages to do this. No other site is accessed.

**Permission justification — `storage`:**

> Stores the user's three settings (wheel volume on/off, bar thickness, label text size) so they persist between sessions. No other data is stored.

**Are you using remote code?** No. All code is packaged in the extension.

**Data usage:** tick nothing in the "What user data do you plan to collect" list.
Then certify all three disclosures (no sale of data, no use unrelated to the
single purpose, no use for creditworthiness or lending). No privacy policy URL
is needed because no user data is handled; you may still link one if you have it.

## Distribution tab

- Visibility: Public (or Unlisted if you only want to share a link).
- Payments: Free.
- Regions: All regions.

## After submitting

- Review usually takes one to a few business days for a first submission.
- Each later update needs a higher `version` in `manifest.json` and a fresh
  `build.ps1` run.
- Keep `dist/` out of git (already in `.gitignore`).

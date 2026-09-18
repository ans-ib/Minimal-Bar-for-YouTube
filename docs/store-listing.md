# Chrome Web Store listing

Everything below is ready to paste into the Developer Dashboard. Anything in
**[brackets]** is a decision or asset that only you can supply.

## Before you start

- Developer account: https://chrome.google.com/webstore/devconsole. One-time
  registration fee, a verified email, and 2-step verification on the Google
  account are required before you can publish.
- Build the zip: `npm run package:chromium`
  → upload `web-ext-artifacts/minimal-bar-for-youtube-chromium-<version>.zip`
  (or download it from the GitHub release the tag workflow creates).
- The name comes from `manifests/manifest.chromium.json`; the short description
  and version come from `package.json`. Change them there and rebuild. Avoid names that start with
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
| Store icon | 128×128 | Yes | Use `assets/icons/icon128.png` |
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
- Each later update needs a higher `version` in `package.json`, a changelog
  entry, and a `vX.Y.Z` tag (see CONTRIBUTING.md → Releasing).
- `dist/` and `web-ext-artifacts/` are build output and stay out of git.

---

# Firefox Add-ons (addons.mozilla.org)

- Account: https://addons.mozilla.org/developers/ (free, a Mozilla account).
- Files: `npm run package:firefox` and `npm run source:mozilla`, or take both
  from the GitHub release: the `firefox` zip and the `source` zip.
- Submit a New Add-on → "On this site" → upload the firefox zip. The linter
  runs on upload; it passes with zero warnings.
- "Do you need to submit source code?" → **Yes**, upload the source zip. The
  build is bundled (esbuild) and minified (Tailwind), so Mozilla requires it.
  In the notes to reviewers paste:

  > Node 20+. `npm ci` then `npm run build:firefox` produces `dist/`, which is
  > exactly the uploaded package. See README "Build it yourself".

- License: pick "GNU Affero General Public License v3.0" from the list.
- Listing: reuse the Chrome description above. Categories: "Appearance" or
  "Photos, Music & Videos". Screenshots: the same four images work.
- Privacy policy: paste the text of PRIVACY.md or link to it. Data collection
  section: "none", which matches `data_collection_permissions` in the manifest.
- Review is mostly automated for add-ons without risky permissions; it is
  often live within a day.

# Microsoft Edge Add-ons

- Account: https://partner.microsoft.com/dashboard/microsoftedge (free).
- Upload the **chromium** zip unchanged. The extension was verified in Edge
  (the store screenshots were captured in headless Edge).
- Listing, privacy and screenshots: same as the Chrome Web Store above.
- Review typically takes a few days.

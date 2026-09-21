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

---

# Automated submission (Chrome, Edge and Firefox, one command)

Pushing a version tag builds the extension, publishes the GitHub release, and
then uploads the zips to the Chrome Web Store, Microsoft Edge Add-ons and
Firefox Add-ons and submits them for review, using
[publish-browser-extension](https://github.com/aklinker1/publish-browser-extension).
Each store's API can only update an item that already exists, which all three
do. A store whose credentials are missing is skipped, so they can be added one
at a time.

## How the credentials are protected

- They are stored only as **GitHub environment secrets** in an environment
  named `stores`. Secrets are encrypted, write-only (nobody can read them back,
  including you), masked in logs, and not available to pull requests or forks.
- The environment can require **your manual approval** before the submit job
  runs, so a tag push never ships to the stores without a click from you.
- The submit job runs with a read-only repository token, on a runner that is
  destroyed afterwards, and verifies the checksums of the files it uploads.
- No credential ever needs to exist on your computer. Skip the local
  `.env.submit` file entirely unless you want to submit from your own machine.
  If you do create it, it is git-ignored, and CI scans every push for secrets.

## One-time setup

### 1. Chrome Web Store: a service account

This is Google's recommended server-to-server method (API v2). It does not
need OAuth screens or refresh tokens.

1. Open https://console.cloud.google.com and create a project (any name, e.g.
   `minimal-bar-publishing`).
2. In the search bar type **Chrome Web Store API**, open it, click **Enable**.
3. Go to **IAM & Admin → Service Accounts → Create service account**. Name it
   `store-publisher`. Give it **no roles**. Finish.
4. Open the new account → **Keys** tab → **Add key → Create new key → JSON**.
   A `.json` file downloads. It holds the private key. Treat it like a
   password and delete it once the secrets below are saved.
5. In the Chrome Web Store Developer Dashboard
   (https://chrome.google.com/webstore/devconsole) open the **Account** page
   and add the service account's email (it ends in
   `.iam.gserviceaccount.com`) in the service-account field. Google allows one
   per publisher. The same page shows your **Publisher ID**.
6. Your **extension ID** is the last part of the store URL:
   `oplglmmjagffpojanjhnjboogdokljld`.

### 2. Microsoft Edge Add-ons: Publish API credentials

1. Open Partner Center → **Microsoft Edge** → **Publish API**.
2. If you see "enable the new experience", click **Enable** (this is the
   API-key flow, v1.1).
3. Click **Create API credentials**. It shows a **Client ID** and a new
   **API key** with an expiry date. Copy both now; the key is not shown again.
4. The **Product ID** is on the extension's overview page under *Extension
   identity*, and also in the dashboard URL between `microsoftedge/` and
   `/packages`. It is a GUID, not the id in the public store URL.

Edge API keys expire (the page shows when). Before that date, create a new key
on the same page and update the `EDGE_API_KEY` secret.

### 3. Firefox Add-ons: API credentials

1. Sign in at https://addons.mozilla.org/developers/addon/api/key/ with the
   account that owns the listing.
2. Click **Generate new credentials**. It shows a **JWT issuer** (looks like
   `user:12345:678`) and a **JWT secret**. Copy both; the secret is shown once.

The add-on is identified by the ID already in the Firefox manifest
(`minimal-bar-for-youtube@ans-ib.github.io`), so nothing else is needed. Each
submission automatically includes the source archive and the reviewer notes in
`scripts/amo-metadata.json` (test steps and build instructions), which Mozilla
requires because the package is bundled.

### 4. GitHub: the protected environment

1. Repo → **Settings → Environments → New environment**, name it `stores`.
2. Tick **Required reviewers** and add yourself. Optionally restrict
   **Deployment branches and tags** to tags matching `v*`.
3. Under that environment's **Environment secrets**, add:

   | Secret | Value |
   | --- | --- |
   | `CHROME_EXTENSION_ID` | `oplglmmjagffpojanjhnjboogdokljld` |
   | `CHROME_PUBLISHER_ID` | from the dashboard Account page |
   | `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` | `client_email` from the JSON key |
   | `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` from the JSON key, the whole `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----` block (pasting it with literal `\n` is fine too) |
   | `EDGE_PRODUCT_ID` | the GUID from Partner Center |
   | `EDGE_CLIENT_ID` | from the Publish API page |
   | `EDGE_API_KEY` | from the Publish API page |
   | `FIREFOX_JWT_ISSUER` | from the AMO API key page |
   | `FIREFOX_JWT_SECRET` | from the AMO API key page |

4. Repo → **Settings → Secrets and variables → Actions**. Open the
   **Variables** tab (not Secrets, and not the environment's own variables),
   click **New repository variable**, name `SUBMIT_TO_STORES`, value `true`.
   Delete it to go back to manual uploads; nothing else changes.

   If a release run shows the submit job as *skipped*, this variable is
   missing. Set it, then submit that release by hand with the workflow below.

## Releasing after that

```bash
# edit CHANGELOG.md, bump "version" in package.json, commit, then:
git tag v1.1.0
git push origin main v1.1.0
```

The Release workflow builds and publishes the GitHub release, then waits on
the `stores` environment. Approve it under the run's **Review deployments**
button. The submit job first checks the credentials without uploading
(`submit:dry`), then uploads and submits. Each store reviews the version as
usual and emails you.

## Submitting an existing release by hand

Actions tab → **Submit a release to the stores** → **Run workflow**. Leave the
tag empty for the latest release or type one, e.g. `v1.0.1`. The workflow
downloads that release's zips, verifies them against the `SHA256SUMS` file
recorded at build time, checks the credentials, and submits. Use it when the
automatic job was skipped, or to resubmit the same build after a store
rejection once the listing is fixed.

## Local use (optional)

```bash
npm run submit:init    # interactive wizard, writes .env.submit (git-ignored)
npm run submit:plan    # shows what would be sent, no network
npm run submit:dry     # checks credentials, uploads nothing
npm run submit         # uploads and submits
```

## If a credential leaks

Revoke it at the source first, then replace the secret: delete the JSON key
in Google Cloud (Service account → Keys) and create a new one; on Partner
Center's Publish API page create a new API key. Deleting a commit is not
enough once a repo is public.

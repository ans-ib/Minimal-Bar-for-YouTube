# Contributing

Thanks for your interest. Bug reports, fixes and ideas are all welcome.

## Getting started

1. Install [Node.js](https://nodejs.org/) 20 or newer.
2. Fork and clone the repository, then install dependencies:

   ```bash
   git clone https://github.com/<you>/Minimal-Bar-for-YouTube.git
   cd Minimal-Bar-for-YouTube
   npm install
   ```

3. Build once, or keep rebuilding while you edit:

   ```bash
   npm run build:chromium   # one-off build into dist/
   npm run watch            # rebuild dist/ on every change
   ```

4. Load `dist/` unpacked: `chrome://extensions` (or `brave://extensions`) →
   Developer mode → Load unpacked. For Firefox: `npm run build:firefox`, then
   `about:debugging` → This Firefox → Load Temporary Add-on → `dist/manifest.json`.

## Project structure

```
src/
  content/index.js            entry point: loads settings, wires the features
  content/youtubeDetector.js  finds the player, follows SPA navigation
  content/progressBar.js      minimal progress overlay + chapter/time labels
  content/scrollVolume.js     wheel volume + indicator
  content/inject.js           MAIN-world bridge to YouTube's player API
  common/settings.js          defaults, validation, storage.sync access
  popup/                      toolbar popup / options page (Tailwind CSS)
  styles/content.css          styles injected into YouTube (all prefixed yte-)
manifests/                    one manifest per browser target
scripts/build.js              esbuild + Tailwind + web-ext, cross-platform
tests/                        unit tests (node:test) on a small fake DOM
docs/                         store listing copy, captured YouTube player DOM
```

## Development guidelines

- Plain JavaScript ES modules. No framework, no TypeScript, no runtime
  dependencies. Keep it that way unless there is a clear win.
- Everything the extension adds to YouTube's page is prefixed `yte-` (CSS
  classes, element ids, data attributes, custom events).
- Never restyle or reposition YouTube's own controls. The overlay lives on its
  own layer and is shown/hidden with CSS keyed off YouTube's `.ytp-autohide`.
  See the comment at the top of `src/content/progressBar.js` for why.
- Per-frame work must stay minimal. DOM queries belong in the throttled poll,
  not in the animation frame.
- Content scripts and the page script exchange values through DOM attributes
  and events, never through `CustomEvent.detail` (it is not readable across
  worlds in Firefox).
- No `innerHTML` with anything that is not a compile-time constant.
- No logging except `console.error` for real failures.

## Browser compatibility

Chromium browsers (Chrome, Brave, Edge, ...) 111+ and Firefox 142+ both use
Manifest V3 with a `world: "MAIN"` content script. They differ only in
`browser_specific_settings`, so each has its own file in `manifests/`.
`version` and `description` are copied from `package.json` at build time; edit
them there. `npm run lint:firefox` runs Mozilla's add-on linter on the Firefox
build; keep it at zero warnings.

## Testing

```bash
npm test
```

Tests run on Node's built-in runner against a tiny fake DOM in
`tests/helpers/fakeDom.js`. Add a test when you fix a bug that a test could
have caught. Then check by hand on a YouTube video with chapters:

- bar and labels appear when the controls hide, and disappear when they return
- the chapter label is empty on a video without chapters
- wheel over the video changes the volume and the native slider follows
- settings popup changes apply without a reload

## Making changes

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Add a line under **Unreleased** in `CHANGELOG.md` (Added / Changed / Fixed /
  Removed).
- Keep pull requests focused. One fix or feature per PR.
- Do not bump the version in a PR. Releases are cut by tagging `main`.

## Releasing (maintainers)

1. Move the Unreleased entries in `CHANGELOG.md` under a new version heading.
2. Bump `version` in `package.json` (`npm version patch|minor|major --no-git-tag-version`).
3. Commit, then tag and push: `git tag v1.2.3 && git push origin main v1.2.3`.
4. The release workflow runs the tests, builds both targets and the source
   archive, and attaches them to a GitHub release.
5. Submit to the stores. Either upload by hand (Chromium zip to the Chrome Web
   Store and Edge Add-ons; Firefox zip plus the source archive to Firefox
   Add-ons, since Mozilla requires source for bundled code), or let the
   release workflow submit to Chrome, Edge and Firefox for you: with the repository
   variable `SUBMIT_TO_STORES` set to `true`, the workflow pauses at the
   `stores` environment for your approval, then uploads and submits. See
   "Automated submission" in `docs/store-listing.md`.

## Reporting issues

Use the issue templates. For bugs, include the browser and version, the
extension version, a video URL where it happens, and what you expected.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE)
or later. By contributing you agree that your contributions are licensed under
the same terms. Start new source files with the license header used in the
existing ones (see the top of `src/content/index.js`).

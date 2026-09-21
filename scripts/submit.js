#!/usr/bin/env node
/*
 * Minimal Bar for YouTube
 * Copyright (C) 2026 Anas Ibn Bari
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version. See the LICENSE file for details.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Submits the packaged zips to every store that has credentials configured,
 * using publish-browser-extension.
 *
 *   node scripts/submit.js [--dry-run] [--plan] [--stores=chrome,firefox,edge]
 *
 * --dry-run  checks authentication with each store but uploads nothing
 * --plan     prints what would be submitted and exits (no network)
 * --stores   restrict to a subset of the configured stores
 *
 * Credentials come from environment variables (GitHub secrets in CI) or from
 * a local .env.submit file, which is git-ignored. Create it with
 * `npm run submit:init`. A store without credentials is skipped, so stores
 * can be added one at a time.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const firefoxManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifests/manifest.firefox.json'), 'utf8'));

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value === undefined ? true : value];
  })
);

/** Minimal .env parser: KEY=value lines, optional quotes, # comments. */
function readEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (/^".*"$/.test(value)) value = value.slice(1, -1).replace(/\\n/g, '\n');
    else if (/^'.*'$/.test(value)) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}

// Real environment wins over the file, so CI secrets are never shadowed.
const env = Object.assign({}, readEnvFile(path.join(root, '.env.submit')), process.env);

// The service-account key is often pasted as the one-line JSON value, where
// newlines are the two characters "\n". Google's auth library needs real ones.
if (typeof env.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY === 'string' && !env.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY.includes('\n')) {
  env.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY = env.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
}
const has = (...keys) => keys.every((k) => typeof env[k] === 'string' && env[k].trim() !== '');

const artifact = (kind) => path.join('web-ext-artifacts', `${pkg.name}-${kind}-${pkg.version}.zip`);

const STORES = {
  chrome: {
    label: 'Chrome Web Store',
    configured: has('CHROME_EXTENSION_ID') && (
      has('CHROME_PUBLISHER_ID', 'CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL', 'CHROME_SERVICE_ACCOUNT_PRIVATE_KEY') ||
      has('CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN')
    ),
    needs: 'CHROME_EXTENSION_ID + (CHROME_PUBLISHER_ID, CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL, CHROME_SERVICE_ACCOUNT_PRIVATE_KEY)',
    zips: [artifact('chromium')],
    flags: () => {
      const f = ['--chrome-zip', artifact('chromium')];
      if (has('CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL') && !has('CHROME_API_VERSION')) f.push('--chrome-api-version', 'v2');
      return f;
    }
  },
  firefox: {
    label: 'Firefox Add-ons',
    configured: has('FIREFOX_JWT_ISSUER', 'FIREFOX_JWT_SECRET'),
    needs: 'FIREFOX_JWT_ISSUER, FIREFOX_JWT_SECRET',
    zips: [artifact('firefox'), artifact('source')],
    flags: () => {
      const f = ['--firefox-zip', artifact('firefox'), '--firefox-sources-zip', artifact('source')];
      if (!has('FIREFOX_EXTENSION_ID')) f.push('--firefox-extension-id', firefoxManifest.browser_specific_settings.gecko.id);
      // Reviewer notes with the build instructions Mozilla requires for bundled code.
      const metadata = path.join('scripts', 'amo-metadata.json');
      if (fs.existsSync(path.join(root, metadata))) f.push('--firefox-amo-metadata-file', metadata);
      return f;
    }
  },
  edge: {
    label: 'Microsoft Edge Add-ons',
    configured: has('EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY'),
    needs: 'EDGE_PRODUCT_ID, EDGE_CLIENT_ID, EDGE_API_KEY',
    zips: [artifact('chromium')],
    flags: () => ['--edge-zip', artifact('chromium')]
  }
};

const requested = args.has('stores') ? String(args.get('stores')).split(',').map((s) => s.trim()) : Object.keys(STORES);
const unknown = requested.filter((s) => !STORES[s]);
if (unknown.length) {
  console.error(`Unknown store(s): ${unknown.join(', ')}. Use: ${Object.keys(STORES).join(', ')}`);
  process.exit(1);
}

const selected = requested.filter((s) => STORES[s].configured);
const skipped = requested.filter((s) => !STORES[s].configured);

console.log(`Submitting ${pkg.name} ${pkg.version}`);
for (const s of selected) console.log(`  + ${STORES[s].label}: ${STORES[s].zips.join(', ')}`);
for (const s of skipped) console.log(`  - ${STORES[s].label}: skipped, no credentials (${STORES[s].needs})`);

if (selected.length === 0) {
  console.error('\nNo store is configured. Run `npm run submit:init` to create .env.submit, or set the variables above.');
  process.exit(1);
}

const missing = [...new Set(selected.flatMap((s) => STORES[s].zips))].filter((z) => !fs.existsSync(path.join(root, z)));
if (missing.length) {
  console.error(`\nMissing build output:\n  ${missing.join('\n  ')}\nRun \`npm run package\` and \`npm run source:mozilla\` first.`);
  process.exit(1);
}

if (args.has('plan')) {
  console.log('\n--plan: nothing was sent.');
  process.exit(0);
}

// The package's "exports" map does not expose package.json, so resolve its
// main entry (which is exported) and walk up to the package directory.
function locateCli() {
  let dir = path.dirname(require.resolve('publish-browser-extension'));
  for (;;) {
    const pkgJson = path.join(dir, 'package.json');
    if (fs.existsSync(pkgJson)) {
      const meta = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
      if (meta.name === 'publish-browser-extension') {
        const bin = typeof meta.bin === 'string' ? meta.bin : meta.bin['publish-extension'];
        return path.join(dir, bin);
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('publish-browser-extension is not installed; run npm install');
    dir = parent;
  }
}
const cli = locateCli();

const cliArgs = selected.flatMap((s) => STORES[s].flags());
if (args.has('dry-run')) cliArgs.push('--dry-run');

const child = spawn(process.execPath, [cli, ...cliArgs], { cwd: root, env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code === null ? 1 : code));

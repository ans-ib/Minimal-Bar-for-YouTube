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
 * Build script (cross-platform, no shell commands).
 *
 *   node scripts/build.js --target=chromium|firefox [--watch] [--package]
 *   node scripts/build.js --clean
 *
 * Steps: clean dist/, write the target manifest with version/description from
 * package.json, copy static files and icons, bundle the scripts with esbuild,
 * compile the popup CSS with Tailwind, and with --package zip dist/ into
 * web-ext-artifacts/ using web-ext.
 */
import { build as esbuild, context as esbuildContext } from 'esbuild';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncPackageFieldsToManifest } from './sync-package-fields-to-manifest.js';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const artifacts = path.join(root, 'web-ext-artifacts');

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value === undefined ? true : value];
  })
);
const TARGETS = ['chromium', 'firefox'];
const target = args.get('target') || 'chromium';
if (!TARGETS.includes(target)) {
  console.error(`Unknown target "${target}". Use one of: ${TARGETS.join(', ')}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const bundles = [
  { in: 'src/content/index.js', out: 'content/content' },
  { in: 'src/content/inject.js', out: 'content/inject' },
  { in: 'src/popup/popup.js', out: 'popup/popup' }
];
const staticFiles = [
  ['LICENSE', 'LICENSE'],
  ['src/popup/popup.html', 'popup/popup.html'],
  ['src/styles/content.css', 'styles/content.css'],
  ['assets/icons/icon16.png', 'assets/icons/icon16.png'],
  ['assets/icons/icon48.png', 'assets/icons/icon48.png'],
  ['assets/icons/icon128.png', 'assets/icons/icon128.png']
];
const manifestSource = `manifests/manifest.${target}.json`;

const esbuildOptions = {
  entryPoints: bundles.map((b) => ({ in: path.join(root, b.in), out: b.out })),
  outdir: dist,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: target === 'firefox' ? ['firefox142'] : ['chrome111'],
  legalComments: 'none',
  logLevel: 'warning'
};

const log = (msg) => console.log(`[build:${target}] ${msg}`);

function clean() {
  fs.rmSync(dist, { recursive: true, force: true });
}

function writeManifest() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestSource), 'utf8'));
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(
    path.join(dist, 'manifest.json'),
    JSON.stringify(syncPackageFieldsToManifest(manifest, pkg), null, 2) + '\n'
  );
}

function copyStatic() {
  for (const [from, to] of staticFiles) {
    const dest = path.join(dist, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, from), dest);
  }
}

/** Runs the Tailwind CLI. Resolves on exit, or immediately in --watch mode. */
function tailwind(extraArgs = []) {
  const cli = require.resolve('tailwindcss/lib/cli.js');
  const child = spawn(
    process.execPath,
    [cli, '-i', path.join(root, 'src/popup/popup.css'), '-o', path.join(dist, 'popup/popup.css'), '--minify', ...extraArgs],
    { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] }
  );
  return new Promise((resolve, reject) => {
    if (extraArgs.includes('--watch')) return resolve(child);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`tailwindcss exited with code ${code}`))));
  });
}

async function buildOnce() {
  clean();
  writeManifest();
  copyStatic();
  await esbuild(esbuildOptions);
  await tailwind();
  log('built -> dist/');
}

async function packageZip() {
  const { default: webExt } = await import('web-ext');
  const filename = `${pkg.name}-${target}-${pkg.version}.zip`;
  await webExt.cmd.build(
    { sourceDir: dist, artifactsDir: artifacts, overwriteDest: true, filename },
    { shouldExitProgram: false }
  );
  log(`packaged -> web-ext-artifacts/${filename}`);
}

/**
 * Source archive for addons.mozilla.org reviewers. Mozilla requires the
 * source of any bundled or minified add-on, plus build instructions (README).
 */
function sourceZip() {
  fs.mkdirSync(artifacts, { recursive: true });
  const file = path.join(artifacts, `${pkg.name}-source-${pkg.version}.zip`);
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['archive', '--format=zip', `--prefix=${pkg.name}-${pkg.version}/`, '-o', file, 'HEAD'], { cwd: root, stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`git archive exited with code ${code}`));
      console.log(`[source] -> web-ext-artifacts/${path.basename(file)}`);
      resolve();
    });
  });
}

async function watchMode() {
  await buildOnce();
  const ctx = await esbuildContext(esbuildOptions);
  await ctx.watch();
  await tailwind(['--watch']);
  for (const rel of [...staticFiles.map(([from]) => from), manifestSource]) {
    fs.watch(path.join(root, rel), () => {
      try {
        copyStatic();
        writeManifest();
        log(`updated ${rel}`);
      } catch (e) {
        console.error(e);
      }
    });
  }
  log('watching for changes (Ctrl+C to stop)');
}

if (args.has('clean')) {
  clean();
  fs.rmSync(artifacts, { recursive: true, force: true });
  log('removed dist/ and web-ext-artifacts/');
} else if (args.has('source')) {
  await sourceZip();
} else if (args.has('watch')) {
  await watchMode();
} else {
  await buildOnce();
  if (args.has('package')) await packageZip();
}

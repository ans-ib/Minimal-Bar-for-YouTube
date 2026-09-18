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
 * package.json is the single source of truth for the version and description.
 * The build copies them into whichever manifest is being built so the two can
 * never drift apart.
 */
export function syncPackageFieldsToManifest(manifest, pkg) {
  return Object.assign({}, manifest, {
    version: pkg.version,
    description: pkg.description
  });
}

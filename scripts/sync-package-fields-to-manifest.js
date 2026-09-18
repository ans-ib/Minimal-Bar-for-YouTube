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

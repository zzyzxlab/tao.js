/**
 * Extends @nx/js release version actions to keep peerDependency ranges of `*`
 * instead of pinning them to the release version.
 *
 * Native `preserveMatchingDependencyRanges` lands in newer Nx; this keeps
 * development ergonomics on Nx 21.3.
 */
const {
  default: JsVersionActions,
  afterAllProjectsVersioned,
} = require('@nx/js/src/release/version-actions');
const { updateJson } = require('@nx/devkit');

class PreserveStarPeerVersionActions extends JsVersionActions {
  async updateProjectDependencies(tree, projectGraph, dependenciesToUpdate) {
    if (Object.keys(dependenciesToUpdate).length === 0) {
      return [];
    }

    const logMessages = [];

    for (const manifestToUpdate of this.manifestsToUpdate) {
      let updatedCount = 0;

      updateJson(tree, manifestToUpdate.manifestPath, (json) => {
        const dependencyTypes = [
          'dependencies',
          'devDependencies',
          'peerDependencies',
          'optionalDependencies',
        ];

        for (const depType of dependencyTypes) {
          if (!json[depType]) continue;

          for (const [dep, version] of Object.entries(dependenciesToUpdate)) {
            const packageName =
              projectGraph.nodes[dep].data.metadata?.js?.packageName;
            if (!packageName) {
              throw new Error(
                `Unable to determine the package name for project "${dep}" from the project graph metadata`
              );
            }

            const currentVersion = json[depType][packageName];
            if (!currentVersion) continue;

            if (
              manifestToUpdate.preserveLocalDependencyProtocols &&
              this.isLocalDependencyProtocol(currentVersion)
            ) {
              continue;
            }

            // Keep wildcards for easier local development / peer flexibility
            if (shouldPreserveDependencyRange(currentVersion)) {
              continue;
            }

            json[depType][packageName] = version;
            updatedCount++;
          }
        }

        return json;
      });

      if (updatedCount === 0) {
        continue;
      }

      const depText = updatedCount === 1 ? 'dependency' : 'dependencies';
      logMessages.push(
        `✍️  Updated ${updatedCount} ${depText} in manifest: ${manifestToUpdate.manifestPath}`
      );
    }

    return logMessages;
  }
}

function shouldPreserveDependencyRange(specifier) {
  return (
    specifier === '*' ||
    specifier === 'x' ||
    specifier === 'X' ||
    // floor-only ranges (e.g. `>=0.18.0`) express a minimum capability
    // (envelope-aware core), not a pin — leave them alone across releases
    specifier.startsWith('>=')
  );
}

module.exports = PreserveStarPeerVersionActions;
module.exports.default = PreserveStarPeerVersionActions;
module.exports.afterAllProjectsVersioned = afterAllProjectsVersioned;

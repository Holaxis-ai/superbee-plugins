# Superbee plugins

Community recipes and independently versioned integrations for [Superbee](https://github.com/Holaxis-ai/superbee).

- `recipes/` contains declarative models and Connector mappings.
- `integrations/` contains provider packages, synthetic fixtures and their tests.
- Core, the source engine and CLI loading belong in the Superbee repository.

Recipes install as data. Code integrations require an explicit installation and trust decision;
contributing to this repository does not automatically enable code in a user's CLI or hosted workspace.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution boundary.

## GitHub reference package

[`integrations/github`](integrations/github) contains `@superbee/integration-github` version
`0.1.0-pre.1`, a standalone issue-profile factory and generated recipe payloads. The canonical
[`source-feeds`](recipes/source-feeds) and [`work-items`](recipes/work-items) recipes live here.
The [GitHub example](examples/work-items-github) exercises the provider profile; the
[Linear example](examples/work-items-linear) proves the shared Work Item model with an offline
projection double. Linear is not an admitted runtime integration.

## Develop against the public Core contract

Use Node 26.8.2 for the recorded development checks. Install tools first, then the exact compatible
Core artifact explicitly:

```sh
npm ci
npm install --no-save --package-lock=false --ignore-scripts @superbee/core@0.2.0-pre.23
npm run build
npm run typecheck
npm run test:unit
npm run test:packaged
```

Core `0.2.0-pre.23` is the first compatible prerelease because it adds the host helper exports.
The plugin declares it only as an optional exact peer, so `npm ci` works before that Core version
is published. Build, typecheck and runtime tests require the explicit second installation step;
CI fails there while the prerequisite release is unavailable. An older Core version cannot
substitute for the helper contract. No Core source or sibling checkout is used.

Before publication, a maintainer may test a locally packed Core candidate with the same version:
install its tarball using `npm install --no-save --package-lock=false --ignore-scripts <tarball>`
and run the checks above. For the packed consumer proof, set `SUPERBEE_CORE_TARBALL` to that exact
candidate tarball. The override belongs to test invocation only; no local artifact path enters
package manifests or the lockfile. Without it, the proof packs the exact public Core version.
The proof installs packed Core and plugin bytes outside this checkout using an isolated environment,
then checks public types, browser exports, recipes, normalization and the public source harness.

This repository provides source CI. Package creation on npm, publisher configuration, retained
release artifacts and maintainer approval remain separate work. `prepublishOnly` blocks direct
publication while those controls are prepared; no release workflow or npm credentials are configured.

## Shared verification tooling

The package proof imports a generated snapshot of Superbee's
[owning package verification tools](https://github.com/Holaxis-ai/superbee/tree/50ebd89a3598d273e8966e72c66db36ab1fe9782/packages/package-verification).
`scripts/vendor/package-verification/snapshot.json` records the public producer commit and file
digests. CI checks those bytes against the producer's actual Git objects before installing tools.
Do not edit snapshot files independently. From a clean producer checkout at the selected exact
commit, refresh and check using the owning exporter:

```sh
node packages/package-verification/export.mjs --source . --target <plugins-checkout>/scripts/vendor/package-verification --commit <new-sha> --expected <previous-sha>
node packages/package-verification/export.mjs --source . --target <plugins-checkout>/scripts/vendor/package-verification --check
```

A refresh requires both pinned commits in the producer's Git objects and a reviewed snapshot and
CI pin update. These are build-time test tools; they do not provide plugin execution isolation.

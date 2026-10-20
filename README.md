# Superbee plugins

Community recipes and independently versioned integrations for [Superbee](https://github.com/Holaxis-ai/superbee).

- `recipes/` contains declarative models and Connector mappings.
- `integrations/` contains provider adapters, synthetic fixtures and their tests.
- Core, the source engine and CLI loading belong in the Superbee repository.

Recipes install as data. Code integrations require an explicit installation and trust decision;
contributing to this repository does not automatically enable code in a user's CLI or hosted workspace.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution boundary.

## GitHub reference integration

[`integrations/github`](integrations/github) contains the independently versioned GitHub issue
adapter and generated recipe payloads. Its private `package.json` supplies the existing loader
identity `@superbee/integration-github`, compatibility and build metadata. Integrations are
acquired from pinned Git checkouts; integration npm publication is disabled under the current
policy. Core, CLI and development tools continue to use their existing npm channels.

The canonical [`source-feeds`](recipes/source-feeds) and [`work-items`](recipes/work-items)
recipes live here. The [GitHub example](examples/work-items-github) exercises the provider profile;
the [Linear example](examples/work-items-linear) proves the shared model with an offline projection
double. Linear is not an admitted runtime integration.

The [local snapshot examples](examples/local-snapshots) demonstrate caller-associated camera and
nested benchmark data with deliberately linked targets; ingestion requires the reviewed unreleased
local snapshot capability described there.

## Install the GitHub integration from source

Use a reviewed full 40-character commit SHA for `REVIEWED_FULL_COMMIT_SHA`. Verify that checkout
before trusting and building it. This checkout requires embedded Core `0.2.0-pre.30` exactly.
Install the published matching Core before building, and use a CLI with this helper pin.
Core30 and CLI20 are proposed compatibility targets, not a claim of registry availability.
Run the public installation below only after those exact versions are published. Before publication,
maintainers qualify the same versions with retained local candidate archives using the overrides below.
Use Node 26.8.2 for these build steps:

| Repository checkout | Exact Core helper pin |
| --- | --- |
| This proposed checkout — CLI `0.4.3-pre.20` | `0.2.0-pre.30` |
| Core29/CLI19 checkout `a92e24820f6abc1968e73d9a278e7944a3eaef67` — CLI `0.4.3-pre.19` | `0.2.0-pre.29` |
| [`0752fb1ca4374b09049c7e7adbd9990d943f8eae`](https://github.com/Holaxis-ai/superbee-plugins/tree/0752fb1ca4374b09049c7e7adbd9990d943f8eae) — published CLI `0.4.3-pre.18` | `0.2.0-pre.28` |
| [`09e98187942690ec1a146f2cd7dae6863e3e79fb`](https://github.com/Holaxis-ai/superbee-plugins/tree/09e98187942690ec1a146f2cd7dae6863e3e79fb) | `0.2.0-pre.27` |
| [`91af04ecda6db0bd3f97245ed3e5c81152ab787c`](https://github.com/Holaxis-ai/superbee-plugins/tree/91af04ecda6db0bd3f97245ed3e5c81152ab787c) | `0.2.0-pre.26` |
| [`e0186bf5b715895bcaab291877e98228719dab82`](https://github.com/Holaxis-ai/superbee-plugins/tree/e0186bf5b715895bcaab291877e98228719dab82) | `0.2.0-pre.25` |
| [`7484875919098720732be9fd3d96dc34fe016ffe`](https://github.com/Holaxis-ai/superbee-plugins/tree/7484875919098720732be9fd3d96dc34fe016ffe) — published CLI `0.4.3-pre.14` | `0.2.0-pre.24` |
| [`7534c84fde8f18d46a625473eb7b6c7ba41401e1`](https://github.com/Holaxis-ai/superbee-plugins/tree/7534c84fde8f18d46a625473eb7b6c7ba41401e1) | `0.2.0-pre.23` |

CLI `0.4.3-pre.14` embeds Core24; use its full pinned checkout above.
Build and register a checkout matching the selected CLI’s embedded Core version.
Core23, Core24, Core25, Core26, Core27, Core28 and Core29 CLIs refuse this checkout; use the matching reviewed checkout above for those hosts.

```sh
git clone https://github.com/Holaxis-ai/superbee-plugins.git
cd superbee-plugins
git checkout --detach REVIEWED_FULL_COMMIT_SHA
git rev-parse HEAD
git status --short
npm ci
npm install --no-save --package-lock=false --ignore-scripts @superbee/core@0.2.0-pre.30
npm install --global superbee@0.4.3-pre.20
npm run build
superbee source plugin register "$PWD/integrations/github"
```

The last command previews the exact local bytes and returns a proposal digest without importing
the profile. Review the trusted-code statement, then accept that digest explicitly:

```sh
superbee source plugin register "$PWD/integrations/github" --accept PROPOSAL_DIGEST
superbee source plugin list
superbee recipe add github:source-feeds --dir YOUR_BUNDLE
superbee recipe add github:work-items --dir YOUR_BUNDLE
```

These namespaced recipe commands install the accepted snapshot's inert definitions. Feed binding
and execution remain explicit. Registration trusts the selected local bytes, not authenticated
publisher origin, and approved code has ambient process authority. A later checkout or rebuild
does not change the accepted snapshot. To update, select and review another full commit, rebuild,
explicitly register/accept it, and rebind affected feeds; changed bindings reset observation and
accepted overlay state for reacquisition.

## Develop and verify

After the same tool and public Core installation and build:

```sh
npm run typecheck
npm run test:unit
npm run test:packaged
```

Core 0.2.0-pre.30 provides the public host helper exports. It remains an optional exact peer;
build and typecheck require its explicit installation above. No Core source or sibling checkout
is used. A maintainer testing a compatible Core candidate may install its tarball with
`npm install --no-save --package-lock=false --ignore-scripts <tarball>` and set
`SUPERBEE_CORE_TARBALL` to that exact archive for the packaged consumer proof. Local candidate
paths never enter manifests or the lockfile. The packaged author journey defaults to the exact
CLI `superbee@0.4.3-pre.20` after publication; before publication, `SUPERBEE_CLI_TARBALL` may select its
retained candidate archive. The proof requires the same package version and unchanged archive bytes.

Local `npm pack` tests are artifact portability checks, not an integration publication or required
user acquisition route. They install packed test bytes outside this checkout with a clean explicit
environment and check public types, browser exports, recipes and the source harness. Source CI
uses the published Core and CLI artifacts. Qualify the proposed exact head with both local archive
overrides before CLI approval; ordinary consumer CI and merge follow availability of the matching
public CLI. This does not authorize a release. Integration metadata is private and `prepublishOnly` refuses
publication; no integration registry bootstrap, publisher setup or release workflow is planned.

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

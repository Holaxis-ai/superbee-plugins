# Superbee plugins

Community recipes and independently versioned integrations for [Superbee](https://github.com/Holaxis-ai/superbee).

- `recipes/` contains declarative models and Connector mappings.
- `integrations/` contains provider adapters, synthetic fixtures and their tests.
- Core, the source engine and CLI loading belong in the Superbee repository.

Recipes install as data. Code integrations require an explicit installation and trust decision;
contributing to this repository does not automatically enable code in a user's CLI or hosted workspace.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution boundary.

## My Home

The data-only [`my-home`](recipes/my-home/recipe.md) core and its
[`maintenance`](recipes/my-home-maintenance/recipe.md) and
[`costs`](recipes/my-home-costs/recipe.md) extensions supply seven Kinds for homes,
spaces, assets, service history, projects and money records. Basic quotes, budgets,
invoices and actual reported payments are included; alternatives, billed amounts
and cash spent stay separate. The [fictional consumer example](examples/my-home/README.md)
qualifies explicit composition, native field validation and scoped read-time domain
checks against public artifacts. Installation creates no household records, schedules,
model bindings, vendor messages or financial transactions.

## Deep, Deep Research (experimental)

The data-only [`deep-research`](recipes/deep-research/recipe.md) recipe supplies four
Kinds—Source, Observation, Claim and Question—with defined evidence, challenge,
dependency and correction relationships. Its references explain bounded research,
scope, inspection limits and extension ownership. It does not run research or install
instances. The [three synthetic journeys](examples/deep-research/README.md) include
an explicitly invoked new-bundle starter, a small disjoint place-history extension
and focused installed-public-CLI checks. Existing research migrations, optional
readers/companions and real-use effectiveness remain separate work.

## Optional recipe-author tooling

The [local recipe preflight example](examples/recipe-preflight/README.md) prepares
explicit local evidence for Superbee's existing compatibility checker. It is
independent of the research recipe, runs only when invoked, and is not installed
by any recipe. Its supplied research/place plan is one example input.

## Civic records experiment

Start with the [two-document supplied-file walkthrough](examples/civic-records/getting-started.md):
isolated tools, both recipes, explicit preparation/import, native queries and safe repeats.


The experimental [Civic Records recipe](recipes/civic-records) separates source, immutable record,
complete text and interpretation without encoding a municipality in the definitions. The
[captured-text local operation](integrations/civic-records) is an explicit finite-input prototype,
with [synthetic experiments and learning questions](examples/civic-records). Its [captured-input capabilities](integrations/civic-records/CAPTURE.md) now discover PDF links
from captured listings and execute an explicitly bound native PDF converter. They do not crawl
providers, create domain records, schedule work or publish civic news. Keep real municipal
capture evidence in private/local research, not repository fixtures.

## GitHub reference integration

[`integrations/github`](integrations/github) contains the independently versioned GitHub issue
adapter and generated recipe payloads. Its private `package.json` supplies the existing loader
identity `@superbee/integration-github`, compatibility and build metadata. Integrations are
acquired from pinned Git checkouts; integration npm publication is disabled under the current
policy. Core, CLI and development tools continue to use their existing npm channels.

The current GitHub profile is version 2; its canonical Connector and Work Items recipe are
version 2 and add an explicit read policy using Core page-number paging. Legacy Link-mode
declarations remain supported. Existing installations require reviewed registration, feed
rebinding and approval of the exact bound policy digest. This checkout targets exact Core41
and CLI `0.4.4-pre.6`, whose author command projects the literal fixture approval. Local archive
qualification and normal public-default/native CI qualification remain separate gates. No prior
cohort's result substitutes for the current source and artifact proof.

The canonical [`source-feeds`](recipes/source-feeds) and [`work-items`](recipes/work-items)
recipes live here. The [GitHub example](examples/work-items-github) exercises the provider profile;
the [Linear example](examples/work-items-linear) proves the shared model with an offline projection
double. Linear is not an admitted runtime integration.

The [local snapshot examples](examples/local-snapshots) wrap caller-associated camera and nested
benchmark data for deliberately linked targets. Core owns mapping, reconciliation, generation
admission and input applicability through its
[snapshot contract](https://github.com/Holaxis-ai/superbee/blob/73c47c4473f3f1dd9b2f0533810dbac43b8b0104/packages/core/SNAPSHOT-SOURCES.md);
this checkout supplies data-only wrappers and declarations. The prior reviewed Core34 checkout
passed installed consumer journeys with stable CLI 0.4.3 (npm `latest`), which embeds Core 0.2.0-pre.34. These fixtures claim
no real render or benchmark execution. The [comparison-review recipe](recipes/comparison-review)
adds human discrepancies and revision-bound decisions; its [two synthetic journeys](examples/comparison-review)
reuse these observations and the existing Artifact command without registering executable code.

## Install the GitHub integration from source

Use a reviewed full 40-character commit SHA for `REVIEWED_FULL_COMMIT_SHA`. Verify that checkout
before trusting and building it. This checkout requires embedded Core `0.2.0-pre.41` exactly
and executable CLI `0.4.4-pre.6`. Use matching public artifacts after their native release/finalizer
verification, or explicitly selected retained archives for candidate qualification. Publication,
installed consumer proof and managed admission remain separate. The selected producer source is
[`688d62a2e1395a6ca7dde52f08e0caf97b643d60`](https://github.com/Holaxis-ai/superbee/tree/688d62a2e1395a6ca7dde52f08e0caf97b643d60);
that exact source identity is required for explicit candidate archives. Local retained-archive
qualification covers the positive 16-scenario GitHub author journey and negative controls,
comparison journeys, verification ingestion, and standalone Blender registration. Blender render
and native media qualification remain separate. These local checks establish neither native
attestation nor registry finalization. Public-default qualification still requires the native
release/finalizers and normal source CI.

Historical Core37 prerelease CLI `0.4.4-pre.2` was published on npm `next` from source tag
[`v0.4.4-pre.2`](https://github.com/Holaxis-ai/superbee/releases/tag/v0.4.4-pre.2)
(`008e00fa04d0ff726dfa3d6da80343cbcf230309`), embedding Core `0.2.0-pre.37`.
The [library finalizer](https://github.com/Holaxis-ai/superbee/actions/runs/39834056403)
and [CLI finalizer](https://github.com/Holaxis-ai/superbee/actions/runs/39834060825)
verified the published artifacts. Installed consumer qualification is described below.

Historical stable CLI `0.4.3` is published on npm `latest` from source tag
[`v0.4.3`](https://github.com/Holaxis-ai/superbee/releases/tag/v0.4.3)
(`bb3589106691c27d15b156d8b45e4178836bd4be`); its [release finalizer](https://github.com/Holaxis-ai/superbee/actions/runs/39633547715)
verified the registry bytes. It embeds Core `0.2.0-pre.34`. The prior Core34 checkout passed the
installed GitHub author and comparison consumer journeys against those exact public artifacts.
The Core33/CLI22 [library finalizer](https://github.com/Holaxis-ai/superbee/actions/runs/39526383098)
and [CLI finalizer](https://github.com/Holaxis-ai/superbee/actions/runs/39526385946) remain historical
evidence. Maintainers can use the existing archive overrides for separate candidate qualification.
Use Node 26.8.2 for these build steps:

| Repository checkout | Exact Core helper pin |
| --- | --- |
| Prior Core39 compatibility checkout [`c46c0e5c47cae129195edf17315f9f02cb0b9bd6`](https://github.com/Holaxis-ai/superbee-plugins/tree/c46c0e5c47cae129195edf17315f9f02cb0b9bd6) — CLI `0.4.4-pre.4`, producer `128ccfcc43843e6dd97380a124b85e5bfe1d1711` | `0.2.0-pre.39` |
| Prior Core38 compatibility checkout [`f56a8b019c2defe4627bc7196fd387c5328c3e70`](https://github.com/Holaxis-ai/superbee-plugins/tree/f56a8b019c2defe4627bc7196fd387c5328c3e70) — CLI `0.4.4-pre.3`, producer `bf9a2a2bb54c7d682853679a4c241533eb8de381` | `0.2.0-pre.38` |
| Prior Core37 compatibility checkout [`d271adbdb4949a3fb279ec9c79edacbc3f697739`](https://github.com/Holaxis-ai/superbee-plugins/tree/d271adbdb4949a3fb279ec9c79edacbc3f697739) — CLI `0.4.4-pre.2` | `0.2.0-pre.37` |
| Prior Core34 compatibility checkout, first reviewed at [`0b9241c7ebc24de55e6a717a1533c4d38a7bf88a`](https://github.com/Holaxis-ai/superbee-plugins/tree/0b9241c7ebc24de55e6a717a1533c4d38a7bf88a) — stable CLI `0.4.3` | `0.2.0-pre.34` |
| Prior Core33 compatibility checkout [`d8c2dc755ed598a3a0dc9190082198dfd2825c75`](https://github.com/Holaxis-ai/superbee-plugins/tree/d8c2dc755ed598a3a0dc9190082198dfd2825c75) — CLI `0.4.3-pre.22` | `0.2.0-pre.33` |
| Prior published compatibility checkout [`769bf609f3fe9c78e962f94ead11567cac7fcfd3`](https://github.com/Holaxis-ai/superbee-plugins/tree/769bf609f3fe9c78e962f94ead11567cac7fcfd3) — CLI `0.4.3-pre.21` | `0.2.0-pre.32` |
| Prior Core30 compatibility checkout [`333d537d3dd92aab87f5801c60f5a609daf648ee`](https://github.com/Holaxis-ai/superbee-plugins/tree/333d537d3dd92aab87f5801c60f5a609daf648ee) — CLI `0.4.3-pre.20` | `0.2.0-pre.30` |
| Core29/CLI19 checkout `a92e24820f6abc1968e73d9a278e7944a3eaef67` — CLI `0.4.3-pre.19` | `0.2.0-pre.29` |
| [`0752fb1ca4374b09049c7e7adbd9990d943f8eae`](https://github.com/Holaxis-ai/superbee-plugins/tree/0752fb1ca4374b09049c7e7adbd9990d943f8eae) — published CLI `0.4.3-pre.18` | `0.2.0-pre.28` |
| [`09e98187942690ec1a146f2cd7dae6863e3e79fb`](https://github.com/Holaxis-ai/superbee-plugins/tree/09e98187942690ec1a146f2cd7dae6863e3e79fb) | `0.2.0-pre.27` |
| [`91af04ecda6db0bd3f97245ed3e5c81152ab787c`](https://github.com/Holaxis-ai/superbee-plugins/tree/91af04ecda6db0bd3f97245ed3e5c81152ab787c) | `0.2.0-pre.26` |
| [`e0186bf5b715895bcaab291877e98228719dab82`](https://github.com/Holaxis-ai/superbee-plugins/tree/e0186bf5b715895bcaab291877e98228719dab82) | `0.2.0-pre.25` |
| [`7484875919098720732be9fd3d96dc34fe016ffe`](https://github.com/Holaxis-ai/superbee-plugins/tree/7484875919098720732be9fd3d96dc34fe016ffe) — published CLI `0.4.3-pre.14` | `0.2.0-pre.24` |
| [`7534c84fde8f18d46a625473eb7b6c7ba41401e1`](https://github.com/Holaxis-ai/superbee-plugins/tree/7534c84fde8f18d46a625473eb7b6c7ba41401e1) | `0.2.0-pre.23` |

CLI `0.4.3-pre.14` embeds Core24; use its full pinned checkout above.
Build and register a checkout matching the selected CLI’s embedded Core version.
A CLI embedding another Core helper version refuses this checkout; use a separately reviewed
checkout with the exact matching pin.

```sh
git clone https://github.com/Holaxis-ai/superbee-plugins.git
cd superbee-plugins
git checkout --detach REVIEWED_FULL_COMMIT_SHA
git rev-parse HEAD
git status --short
npm ci
npm install --no-save --package-lock=false --ignore-scripts @superbee/core@0.2.0-pre.41
npm install --global superbee@0.4.4-pre.6
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

The exact Core 0.2.0-pre.41 artifact provides the public host helper exports. It remains an
optional exact peer; build and typecheck require its explicit installation above. No Core source or sibling checkout
is used. A maintainer testing a compatible Core candidate may install its tarball with
`npm install --no-save --package-lock=false --ignore-scripts <tarball>` and set
`SUPERBEE_CORE_TARBALL` to that exact archive for the packaged consumer proof. Local candidate
paths never enter manifests or the lockfile. The packaged author journey defaults to the exact
CLI `superbee@0.4.4-pre.6` after publication; `SUPERBEE_CLI_TARBALL` may explicitly select its
retained matching archive. The proof requires that exact version and unchanged archive bytes.
The data-only comparison proof preserves stable CLI `0.4.3` / source `bb3589106691c27d15b156d8b45e4178836bd4be`
as its normal historical control. An explicit CLI archive instead requires `0.4.4-pre.6` and its
producer source `688d62a2e1395a6ca7dde52f08e0caf97b643d60`; both paths require a clean npm-package identity.
These synthetic GitHub/comparison journeys do not establish native Blender rendering or video-host adoption.

Local `npm pack` tests are artifact portability checks, not an integration publication or required
user acquisition route. They install packed test bytes outside this checkout with a clean explicit
environment and check public types, browser exports, recipes and the source harness. Ordinary source CI requires the matching published Core and CLI artifacts; the current
public-default gate remains held until those artifacts are available. Qualify a proposed exact head with both local archive
overrides during candidate qualification; ordinary consumer CI uses the matching public CLI. This
does not authorize a release. Integration metadata is private and `prepublishOnly` refuses
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

## Verification report observations

[`integrations/verification`](integrations/verification) supplies a separately registered local
operation for retained native TLC checker reports. It checks an explicit original-input/run plan
and selected current files, then exports a caller-associated snapshot for Core's existing source
admission and overlay. It runs no prover and cannot discharge an obligation. Native installed
host/ingestion qualification is separate from synthetic unit evidence. It targets exact Core41
and executable CLI0.4.4-pre.6; registration never activates a source binding automatically.

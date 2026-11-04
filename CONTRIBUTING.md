# Contributing

Contribute a recipe, an integration adapter or a correction through a pull request. Explain its
purpose, compatibility, permitted provider access and test evidence. Use synthetic fixtures.

Recipes are inert declarations. Installation must not run code, read credentials or start a job.
An integration adapter owns provider-specific normalization and adaptation and consumes public
Superbee contracts. Keep adapter compatibility and version metadata explicit; compatible updates must not require
rebuilding the CLI. No adapter may claim that local hashes authenticate its publisher or sandbox
JavaScript.

Use a fresh branch and install its declared development dependencies before trusting tests. Run
the affected build, typecheck and focused tests. Loading, permission, concurrency and release changes
need independent exact-head review, then adversarial QA. CI must pass before merge. Keep reviewed
commits intact and append fixes.

Do not add private keys, live customer data, generated dependency trees or local artifact paths to
commits. Integration npm publication is disabled. Core, CLI and tool npm channels remain separate; enabling
managed execution requires its own maintainer decision.

## Add a contribution

For a recipe, add one canonical directory under `recipes/` with `recipe.md` and its declared
Markdown payload. For a code integration, add an adapter folder under
`integrations/`, document the provider fields and deliberate omissions, and add synthetic public
API tests. Start with the [contribution checklist](.github/PULL_REQUEST_TEMPLATE.md).

Keep source-model examples under `examples/`. A fixture double is not runtime provider admission.
Follow the pinned checkout and native tool/Core setup in [README.md](README.md) before
build/typecheck/tests. The
GitHub reference includes a complete synthetic author fixture with exact expectations. Run the
public `source test` command in its README and retain Core's invariant checks; scenario names alone
are not qualification. Cover native provider refusals separately from generic mapper diagnostics.

Generated integration recipe payloads and `dist/` are build outputs. Edit root recipes and source
files; do not maintain a second authored recipe copy. Document compatibility and whether a change
requires feed rebinding. Tests consume installed public Core APIs; no sibling paths, workspace
Core aliases, private loaders or copied Core parsers belong here.

Integration folders may use private `package.json` files for the existing loader contract and local
builds. Contributions do not require a separate npm package per provider or registry publication.
Acquire and review a full Git commit before building and registering an adapter folder.

## Publish a recipe version

[`recipe-index.source.json`](recipe-index.source.json) is the curated input and
[`recipe-index.json`](recipe-index.json) is generated from it and the recipe folders. Never edit the
generated file by hand.

1. Change the recipe and bump `version` in its `recipe.md`. Versions are dotted numbers with an
   optional `-prerelease`, ordered by semver precedence.
2. Run `node scripts/build-recipe-index.mjs` and commit the regenerated index in the same pull request.
3. CI runs `--check`, which fails on any drift, and `--compare <base>`, which refuses a changed id
   plus version and a version going backwards. Run both locally the same way.

To list a new recipe, add it to the input's `recipes`. Holaxis maintainers set `designation`
(`supported` or `community`) and `maintainer` through review; a contributor proposes neither for
themselves. CI raises a `maintainer decision` annotation for every new listing and every change to
either field, so review the annotations before merging. Designation is the publisher's statement,
not a security property, and implies no service level. Digests are the integrity guarantee.

A recipe is one installable set of Kinds. A cookbook is a named, ordered group of listed recipes
with no content or version of its own, ordered so that dependencies come first. Its members must not
install the same target, and a `supported` cookbook holds only `supported` recipes.

A committed test may not use a sibling CLI, so a change to the index format needs this manual proof
with a CLI that has `recipe add --index`, against an empty temporary bundle:

```sh
superbee init --dir <tmp>/home --recipe none
superbee recipe add my-home --cookbook --index recipe-index.json --dir <tmp>/home --actor process:index-proof
superbee kinds --dir <tmp>/home
```

To remove a listed recipe, delete its id from `recipes` and from any cookbook, and add
`{"id", "last_version", "reason"}` to the input's `removed`. The marker stays in the input for good
and the id is not listed again; republish under a new id. This keeps an old id plus version from
returning with different bytes, since the index only remembers current versions. Installing by path
from `recipes/` is unaffected. To remove a cookbook, delete it from `cookbooks` and add
`{"id", "reason"}` to `removed_cookbooks`, under the same permanent rule.

`.github/CODEOWNERS` names the owners of the index files, the generator and the workflows. It has no
effect until a branch rule requires code owner review, which is a separate repository setting.
`.gitattributes` keeps recipe and index bytes unconverted, so digests match on any checkout.

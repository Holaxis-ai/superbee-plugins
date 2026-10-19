# Contributing

Contribute a recipe, an integration package or a correction through a pull request. Explain its
purpose, compatibility, permitted provider access and test evidence. Use synthetic fixtures.

Recipes are inert declarations. Installation must not run code, read credentials or start a job.
An integration package owns provider-specific normalization and adaptation and consumes public
Superbee contracts. Give each package an independent version; compatible updates must not require
rebuilding the CLI. No package may claim that local hashes authenticate its publisher or sandbox
JavaScript.

Use a fresh branch and install its declared development dependencies before trusting tests. Run
the affected build, typecheck and focused tests. Loading, permission, concurrency and release changes
need independent exact-head review, then adversarial QA. CI must pass before merge. Keep reviewed
commits intact and append fixes.

Do not add private keys, live customer data, generated dependency trees or local artifact paths to
commits. Publishing packages and enabling managed execution are separate maintainer decisions.

## Add a contribution

For a recipe, add one canonical directory under `recipes/` with `recipe.md` and its declared
Markdown payload. For a code integration, add an independently versioned package under
`integrations/`, document the provider fields and deliberate omissions, and add synthetic public
API tests. Start with the [contribution checklist](.github/PULL_REQUEST_TEMPLATE.md).

Keep source-model examples under `examples/`. A fixture double is not runtime provider admission.
Follow the two installation steps in [README.md](README.md) before build/typecheck/tests. The
GitHub reference currently ships six passing author scenarios and reports eight missing; adding
examples must not hide that qualification gap or weaken Core's invariant checks.

Generated integration recipe payloads and `dist/` are build outputs. Edit root recipes and source
files; do not maintain a second authored recipe copy. Document compatibility and whether a change
requires feed rebinding. Tests consume installed public Core APIs; no sibling paths, workspace
Core aliases, private loaders or copied Core parsers belong here.

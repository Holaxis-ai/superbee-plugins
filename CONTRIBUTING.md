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

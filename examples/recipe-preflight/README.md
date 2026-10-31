# Local recipe-author preflight example

Prepare evidence for the **existing public Core checker** with one command. Authors
still choose the recipes and state what their consumer needs. The adapter reads
local bytes and computes digests, observations and a complete convention inventory;
it does not infer requirements or implement compatibility semantics.

This is optional recipe-author tooling, outside every recipe payload. It is not
required to install or use Deep Research; that recipe supplies one example plan. It
supports **OKF 0.2 folders and definitions-only convention/reference recipes**.
Views, Connectors, remote placement, dependency fetching, installation, migration
and instance validation are outside its scope. Existing Core remains the semantic
owner; no new platform API is required.

## Run

From this repository's reviewed checkout, explicitly install the example's pinned
public dependency. This is separate from recipe installation:

```sh
npm ci --prefix examples/recipe-preflight --ignore-scripts --no-audit --no-fund
node examples/recipe-preflight/check.mjs \
  --plan examples/recipe-preflight/place-plan.json \
  --bundle /absolute/path/to/a/selected/bundle
```

The supplied plan describes the core plus the Place Comparison example. Run it
against a bundle where you deliberately installed those definitions. Running
against a different bundle should report missing or divergent evidence; the
adapter does not repair it. It requires explicit paths and performs no ambient
bundle discovery or provider access. Recipe paths are relative to the plan file.

Exit codes: **0 valid**, **2 refused**, **3 partial**, **1 collection/input failure**.
All structural verdicts and issue guidance come from
`@superbee/core@0.2.0-pre.41`, export `@superbee/core/recipe-set-preflight`.
A publisher label in the plan is an assertion, not publisher authentication.

`--evidence /absolute/path/to/an/absent-file.json` optionally retains full supplied
input and the report. It is create-only and must be outside the chosen bundle and
recipe roots. It contains recipe and installed definition bytes; choose its
location and audience deliberately. Default output is a report on stdout and
creates no files. Neither mode changes installed definitions or instance data.

## Author the small plan

Copy `place-plan.json` and edit:

- `recipes`: selected local folders, unique keys, asserted publisher labels and
  explicit `base`/`extension` roles. Identities/releases come from Core-parsed
  manifests; exact recipe bytes supply the artifact digests.
- `consumers`: an ID, the owning recipe key and explicit Core requirements. Name
  required provider/type/fields and declared link targets. Every needed target type
  also needs an explicit requirement so its local endpoint is observed. The example
  includes Research Source for Observation's `drawn from` target.

The adapter creates local endpoints for those requirements. It leaves unsupported
operators to Core, which returns partial rather than inventing semantics. Empty
requirements do not prove compatibility. It does not insert `requires`/`composes`
into manifests, resolve versions or provide inheritance. Duplicate type names in
**unselected** local conventions are included, rather than hidden by filtering the
inventory to recipe-owned definitions.

## Evidence and collection limits

Two complete collections of the selected plan, recipes, bundle index,
`conventions/` and `references/` must match before checking. This detects changes
between the sampled passes; it is not an atomic snapshot, a lock, hostile-writer
isolation or a future-state guarantee. UTF-8 text is decoded without stripping a leading BOM. Physical byte changes
therefore change the supplied snapshot; Core still owns structural identity rules
and may consider an encoding-only difference structurally equivalent. Each pass
is bounded to 2,000 files/16 MiB,
with 1 MiB per file. Encountered symlinks and non-regular files are refused.
Only installed definition folders are read, never instance folders. A local
folder snapshot says nothing about a live hosted authority or current access.

Core's `valid` means only that the declared structural checks over supplied
snapshots passed. It does not certify field values, actual record relationships,
research truth, publisher identity, permissions, runtime usability, safe migration
or completeness of external consumers. A locally customized selected definition
can be useful while correctly failing exact-release conformance; this adapter
preserves it.

## Verify and compare

```sh
npm exec -- node --test scripts/recipe-preflight.test.mjs
```

The consumer test copies the example outside this checkout, installs its locked
public dependencies and public CLI `0.4.4-pre.9` in isolated temporary state. It
checks complete evidence, missing base/empty folder, competing unselected type,
wrong field, missing target requirement, unsupported semantics, local drift,
BOM preservation, symlink/size controls, unknown plan keys, output protection and unchanged authored
bytes. No sibling Core checkout is imported.

The earlier handwritten experiment needed JavaScript to collect artifacts,
identify installed definitions, compute pins, assemble local observations and
placement inventory, build descriptors/endpoints, and invoke Core. This adapter
moves that reusable plumbing behind one command; the four requirements and their
meaning still require author judgment. Plan/evidence byte counts and passing cases
show reduced bespoke plumbing, **not measured human time saved, reasoning quality
or superiority over a manual checklist**. Keep a manual checklist available for
small one-off studies. Do not expand this into a solver without a separate need.

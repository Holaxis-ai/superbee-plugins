# Deep, Deep Research

An experimental research core with **four Kinds and defined relationships**, plus
workflow references and three fictional journeys. Installation is inert. The
examples are separate data and an explicitly invoked starter, never recipe payload.

## Start with one example

From a reviewed checkout of this repository, use the public CLI qualified by this
contribution, `superbee@0.4.4-pre.9`, and Node 22.14 or newer. Install that CLI through
your normal package workflow if absent. Check its actual identity:

```sh
superbee version --json
superbee recipe validate ./recipes/deep-research --json
node examples/deep-research/create-example.mjs \
  --case house-history --bundle /tmp/my-fictional-house-study
```

Choose an **absent** destination outside existing bundles. The starter explicitly
creates a new local bundle, installs the core and selected example extension, then
creates fictional records through native `new`. It refuses an existing destination.
It does not adopt, migrate, modify Filkins, capture a provider, run a benchmark,
conduct an interview, register an integration or publish anything. It stops after a
failure and reports completed records; inspect a partial destination instead of
retrying the starter there. Use a different absent path deliberately if needed.

An explicit `--cli /absolute/path/to/superbee` selects another executable; do not
substitute an unreviewed program. Successful syntax validation is not compatibility
qualification for another CLI version. There is no npm integration or runtime
registration requirement for this data-only recipe.

Create the other independent cases using `--case technical` and `--case interview`
with different absent bundle directories.

## Inspect connections and answer a later question

```sh
superbee query --type 'Research Question' --dir /tmp/my-fictional-house-study --json
superbee doc read research-questions/lantern-move --dir /tmp/my-fictional-house-study --json
superbee link show research-claims/lantern-current --dir /tmp/my-fictional-house-study --json
superbee link show research-observations/lantern-pointer --text 'drawn from' \
  --dir /tmp/my-fictional-house-study --json
superbee status --dir /tmp/my-fictional-house-study --json
```

| Case | Later question | Expected bounded answer |
| --- | --- | --- |
| house-history | Was the cottage relocated, and what should be obtained next? | The index supplies D12/4, not a move. The uninspected deed is linked as needed. Its transcript shares the original's independence group. Three Place Comparisons organize candidate identities without asserting them. |
| technical | Is the candidate faster generally; what if one support is withdrawn? | Small-input A and B support a limited statement; large-input C counters the earlier generalization. Review a withdrawn path, retain independent B, and do not infer release authorization. |
| interview | Did a preference authorize product policy? | Supplied notes support what was attributed to Delta. The selected approval excerpt is bounded negative evidence, not proof that no approval exists anywhere. Decision authority remains unresolved. |

These examples demonstrate faithful record/relationship recovery. They **do not
measure agent reasoning quality, prove advantage over organized prose, or qualify
full scientific, systematic-review or production-research workloads**. Data is
invented; there are no private bundle excerpts, real asset paths or customer facts.

## Install the core for your own study

```sh
superbee init --create-only --recipe none --dir /tmp/my-new-research/.superbee
superbee recipe add ./recipes/deep-research --actor openai/codex --dir /tmp/my-new-research/.superbee
superbee new 'Research Source' --help --dir /tmp/my-new-research/.superbee
superbee new 'Research Question' --help --dir /tmp/my-new-research/.superbee
```

Keep the study folder separate from the bundle root:

```text
my-new-research/
  .superbee/       # authoritative typed records and installed definitions
  evidence/        # permissible original assets and derivatives
  SYNTHESIS.md     # short human entrypoint, linking canonical records
```

`--dir` selects the bundle root itself; it does not append `.superbee`. Temporary
Markdown bodies, capture notes and other drafts inside that root can be indexed
as documents. Stage them outside it (for example in an OS temporary directory).
When passing `--body-file`, use the documented body sections and an explicit actor
appropriate to your writer. Do not rerun a create-only starter to update a study.

Use actual evidence and body sections as described in the installed references.
Re-add is idempotent; upgrades use native `recipe evolve` preview and exact-token
apply after reviewing existing content. This contribution does not supply a
migration command or claim ownership protection against arbitrary other writers.

**Existing bundles:** inspect their conventions and consumers first. In particular,
the existing House and Place History recipe also defines Research Question; do not
install this core over it and mistake drift for a migration. No working research
bundle was migrated by this contribution.

## Extend without inheritance

The small [place-history template](extensions/place-history/recipe.md) owns only
Place Comparison and a reference. Install it explicitly after the core:

```sh
superbee recipe add ./examples/deep-research/extensions/place-history \
  --dir /tmp/my-new-research/.superbee
superbee new 'Place Comparison' --help --dir /tmp/my-new-research/.superbee
```

Copy that directory, change its identity/path and domain fields, and keep core
Claims/Observations authoritative. The house example supplies three fictional
instances. No `requires`, `composes`, inheritance or automatic dependency resolver
is used. Native installation does not itself prove external prerequisite Kinds
exist: install in the documented order and test representative linked instances.

Questions can stand alone. Put small attempts in their body instead of multiplying
records. A sourced catalog fact can stay on its domain record. Optional Attempt,
Run, capture, identity, decision and reader companions are future work justified
by actual consumers, not mandatory layers in this release.

## Verify the contribution

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm exec -- node --test scripts/deep-research.test.mjs
```

The focused consumer test installs exact public `superbee@0.4.4-pre.9` into an
owned temporary tool directory; it does not replace a global tool. Alternatively
set `DEEP_RESEARCH_CLI` to an explicit executable of that exact public version.
It exercises fresh bundles outside the repository, inert installation, repeats,
three example graphs, disjoint extension/base preservation, retrieval and negative
shape/link controls. No executable adapter or provider access is part of the test.

The examples are deliberately small. A real next investigation should assess new
question recovery, citation relevance, repeat-work avoidance and maintenance cost
against ordinary organized notes. Semantic validity still requires research review.

## Check a selected local extension combination

The optional [local preflight author example](preflight/README.md) collects explicit
local definition snapshots for the existing public Core structural checker. It
keeps consumer requirements authored, creates no research instances and is never
run by recipe installation. Its dependency setup and scope are separate.

## Retrieve the full basis

Start with the short synthesis, then follow the Question's answer, the Claim's
support/challenge/dependency links, and each Observation's source and locator.
`superbee doc read <id> --offset 0 --dir <bundle> --json` returns the full body;
the default may be a clearly marked preview. Use `superbee status` for structural
checks, not a guessed `check` command. Neither command verifies research truth.

A Source that says bytes were retained must locate them: record the exact path,
its base (study root, bundle root or Source document), and which representation
was inspected. Keep an original and its extracted text distinguishable. A path or
hash locates/checks bytes; it does not authenticate a publisher or a conclusion.
Different independence-group names likewise do not prove independent evidence.

# Comparison findings from retained evidence

Use one [inert recipe](../../recipes/comparison-review) for a discrepancy, expected result,
revision-bound evidence and a bounded decision. These camera and benchmark examples are entirely
synthetic. The HTML diagrams are invented; no Blender render or benchmark was executed to produce
them. The decisions below belong to `process:comparison-review-example`, not a human reviewer.

This prepared checkout targets CLI `superbee@0.4.3-pre.22` and Core `@superbee/core@0.2.0-pre.33`.
Run public installation only after both targets are published and exact archives are qualified. The [repository setup](../../README.md#develop-and-verify) supplies public Core for focused
tests. No adapter build, tool registration, native media or provider access is needed for this
recipe. The existing [local snapshot examples](../local-snapshots) own the camera/benchmark facts
and the wrapper; these examples add no source parser, evidence exporter or new runtime.

## Install only the model

From this repository root, choose a disposable bundle and an explicit process actor:

```sh
EXAMPLE_ROOT=$(mktemp -d)
BUNDLE="$EXAMPLE_ROOT/.superbee"
export SUPERBEE_ACTOR=process:comparison-review-example
superbee version --json
superbee init --create-only --recipe none --dir "$BUNDLE"
superbee recipe add "$PWD/recipes/comparison-review" --dir "$BUNDLE"
superbee new "Comparison Finding" --help --dir "$BUNDLE"
```

Installation writes one convention and one operating reference, with no instance, Artifact or
source state. Read `references/comparison-review` in the bundle. Existing definitions are not
silently overwritten. No Artifact convention is required by `artifact create`.

## Camera: capture basis, record a finding, then refresh

Copy the existing example-owned camera model and its deliberately linked target, plus the one
existing Signal prerequisite for shared snapshot reconciliation:

```sh
mkdir -p "$BUNDLE/sources" "$BUNDLE/camera-observations"
cp examples/local-snapshots/conventions/camera-observation.md "$BUNDLE/conventions/"
cp examples/local-snapshots/sources/camera.md "$BUNDLE/sources/"
cp examples/local-snapshots/camera-observations/front.md "$BUNDLE/camera-observations/"
cp recipes/source-feeds/conventions/signal.md "$BUNDLE/conventions/"
superbee source snapshot bind sources/camera --dir "$BUNDLE"
superbee source snapshot bind sources/camera --accept BINDING_DIGEST --dir "$BUNDLE"
superbee source snapshot run sources/camera --snapshot "$PWD/examples/local-snapshots/camera/snapshot-g1.json" --dir "$BUNDLE"
superbee source snapshot run sources/camera --snapshot "$PWD/examples/local-snapshots/camera/snapshot-g1.json" --accept INPUT_DIGEST --dir "$BUNDLE"
superbee artifact create "$PWD/examples/comparison-review/camera-g1.html" --title "Camera schematic g1" --dir "$BUNDLE"
```

Use each actual preview digest, never the placeholder spelling. Record the Artifact command's
returned `id`, `entry` and `entry_version`. Pull the retained blob, then inspect it:

```sh
superbee pull --doc-key ARTIFACT_ENTRY --out "$EXAMPLE_ROOT/camera-retained.html" --dir "$BUNDLE"
cp examples/comparison-review/camera-finding.md "$EXAMPLE_ROOT/camera-body.md"
```

Edit only that ordinary body copy: replace `{{artifact_id}}`, `{{artifact_entry}}` and
`{{artifact_entry_version}}` with the actual Artifact receipt. Replace `{{generation}}` with 1,
`{{snapshot_sha256}}` with the exact snapshot SHA256 from input preview, `{{observed_x}}` with 35
and `{{offset}}` with 3. These placeholders are authoring instructions, not executable recipe code.
No unresolved placeholder is an evidence claim. Coordinates, offsets and the marker's ±1 uncertainty
are in diagram units on a 64-unit coordinate system. Both SVGs display at 320 CSS px, a 5× enlargement:
one diagram unit spans 5 CSS px, and the g1 offset of 3 diagram units appears as 15 CSS px. These
are not screen/device-pixel measurements and say nothing about real geometry or dimensional accuracy.

```sh
superbee new "Comparison Finding" comparison-findings/camera-g1 --title "Synthetic marker offset" --progress_status open --assignee process:comparison-review-example --body-file "$EXAMPLE_ROOT/camera-body.md" --dir "$BUNDLE"
superbee link show comparison-findings/camera-g1 --text evidence --dir "$BUNDLE"
superbee doc read comparison-findings/camera-g1 --field head_version --dir "$BUNDLE"
superbee doc update comparison-findings/camera-g1 --progress_status resolved --resolution "Synthetic process disposition: investigate the illustrated offset only; no human acceptance." --decided_at 2026-10-20T12:00:00Z --expected-version HEAD_VERSION_FROM_READ --dir "$BUNDLE"
```

The version guard refuses a racing update. `resolved` describes this discrepancy at the recorded
basis, not acceptance of a model or permission to run tools. A later modification is still possible;
terminal values are query/display metadata, not an immutable log or authorization boundary.

For a second synthetic capture, derive a small ordinary g2 file from the existing camera fixture:

```sh
node --input-type=module - "$EXAMPLE_ROOT/camera-g2.json" <<'JS'
import {readFileSync, writeFileSync} from 'node:fs';
const next = JSON.parse(readFileSync('examples/local-snapshots/camera/snapshot-g1.json', 'utf8'));
next.generation = 2;
next.records[0].camera.camera = 'Synthetic revised camera';
next.records[0].camera.lensMm = 55;
writeFileSync(process.argv[2], JSON.stringify(next));
JS
superbee source snapshot run sources/camera --snapshot "$EXAMPLE_ROOT/camera-g2.json" --dir "$BUNDLE"
superbee source snapshot run sources/camera --snapshot "$EXAMPLE_ROOT/camera-g2.json" --accept NEW_INPUT_DIGEST --dir "$BUNDLE"
superbee doc read camera-observations/front --dir "$BUNDLE"
superbee doc read comparison-findings/camera-g1 --dir "$BUNDLE"
superbee source snapshot check "$EXAMPLE_ROOT/camera-g2.json" --inputs-file "$PWD/examples/local-snapshots/camera/inputs.json" --settings-file "$PWD/examples/local-snapshots/camera/original-settings.json"
```

This g2 is manually authored data, not a new tool capture. Its deliberately unchanged original
descriptor does not prove any capture or past consumption. The source-backed label/lens update
while the old finding, decision, basis table and Artifact bytes stay pinned. The original human notes on the camera observation also survive. The unchanged
originals compare `current` relative to the descriptor's caller_asserted basis. Select a changed
original copy in an explicit map to obtain `stale`, or a missing original to obtain `unverifiable`;
neither check rewrites a finding. Keep original paths outside bundles/private state.

Create an Artifact from `camera-g2.html`, copy `camera-finding.md` to a new ordinary body file, and
fill its new Artifact receipt/generation 2/exact g2 SHA256. Use marker 32 and offset 0 in diagram units. Create
`comparison-findings/camera-g2` with that body and `progress_status: open`, then link:

```sh
superbee link add comparison-findings/camera-g2 comparison-findings/camera-g1 --text supersedes --dir "$BUNDLE"
superbee list --type "Comparison Finding" --dir "$BUNDLE"
superbee status --dir "$BUNDLE"
```

An actual later Blender run instead follows the existing operation's explicit binding/export
flow and wrapper. Never substitute the synthetic diagram for native evidence, restamp a terminal
decision to new digests, or infer a prior tool consumed originals just because hashes now match.

## Benchmark: same model, different source facts

Use a second disposable bundle with the same recipe. Copy the existing Benchmark Result convention,
`sources/benchmark.md`, `benchmark-results/search.md` and the existing Signal convention, following
the [nested benchmark journey](../local-snapshots/README.md#nested-benchmark-consumer). Bind and ingest
its exact g1. Publish `examples/comparison-review/benchmark.html` through `artifact create` and pull
its returned entry. Copy `benchmark-finding.md` to an ordinary body file and fill the actual Artifact
receipt, generation 1, exact g1 SHA256 and p95 12.5. Create/inspect/decide a Comparison Finding using
the same typed commands and process actor as above.

The invented review budget is 12 ms. g1=12.5 and g2=13 ms differ by +0.5 ms (+4% relative to g1).
This is fixture arithmetic, not a statistically established regression, repeatability result or real
service requirement. Measurements/uncertainty stay in the body; source-owned `p95_ms`, `passed` and
`suites` remain unchanged by the person's interpretation.

Preview/accept exact g2 and read both result and finding: the result updates, the old decision/basis
and Artifact remain pinned. Use the existing explicit workload map for applicability:

```sh
superbee source snapshot check examples/local-snapshots/benchmark/snapshot-g2.json --inputs-file examples/local-snapshots/benchmark/inputs.json
```

Select a changed or missing workload in a new ordinary map to see stale/unverifiable. A later
judgment uses a new explicit capture basis. The absent filter case remains a source missing/Signal
concern; it does not become latency zero or an automatically generated human finding.

## Focused verification

```sh
npm exec -- node --test scripts/comparison-review.test.mjs
```

The single focused proof installs public CLI22 once into an isolated workspace and exercises both
consumers with public Core33. The existing `SUPERBEE_CLI_TARBALL` override can select exact CLI22
qualification bytes. The proof checks inert recipe installation/re-add, actual Artifact create/pull,
valid records, invalid enum/section/datetime refusal, stale CAS, source refresh isolation,
current/stale/unverifiable and a newly pinned successor. It uses existing verification helpers and
cleans its scratch workspace. It does not run Blender, compare private media, rerun the adapter
qualification matrix or claim that table contents/terminal immutability are engine-enforced.

# Local snapshot examples

Two synthetic producers use one finite snapshot contract: an explicitly selected saved-camera
export and a nested benchmark suite. Snapshots are data. Ingestion maps facts into deliberately
linked documents through the existing record overlay; new source records do not create targets.
The supplied target bodies contain human notes outside the source-owned fields.

## Prerequisites and checks

This prepared checkout uses the snapshot command family and `op run --export-output` with Core
`0.2.0-pre.33` and CLI `0.4.3-pre.22`. Publication and exact native-archive qualification
for these prepared targets remain pending; the prior Core32/CLI21 qualification does not transfer.
CLI `0.4.3-pre.20` alone does not provide these commands. Follow the root README's exact public
installation or explicit archive override. These checked-in fixtures remain synthetic; running the
commands is a new explicit action, not evidence that a tool already produced these values.
This directory is an example, with no plugin registration or executable package. The existing
Signal convention is a prerequisite of the shared record-overlay owner, including empty runs;
install that one existing definition deliberately in the disposable bundle as shown below.

The wrapper imports only Node builtins and the existing public Core settings canonicalizer. From
the repository root, use Node 26.8.2 and the root README's dependency setup:

```sh
npm ci
npm install --no-save --package-lock=false --ignore-scripts @superbee/core@0.2.0-pre.33
node --test examples/local-snapshots/wrap-camera.test.mjs
```

The standalone Core33 installation supplies the existing `@superbee/core/site-capabilities`
`canonicalJson` owner used by the wrapper. Wrapper checks do not qualify CLI22 ingestion or prove
historical tool consumption. Core is an existing optional peer, so `npm ci` alone does not install
it. No build or typecheck is needed for these `.mjs` examples. The focused checks exercise the wrapper, not a copied
snapshot validator. Public Core's decoder, binder and freshness assessor remain authoritative.

All checked-in values are invented. The scene/reference text files are hashable stand-ins, not
valid Blender/image inputs. No fixture is evidence of an actual render or benchmark execution.

## Camera export and wrapper

Retain the original operation run and its Artifact evidence. During a deliberately authorized
Blender comparison, select the declared JSON role for ordinary export:

```sh
superbee op run local.blender.compare-view.v1 --local --binding YOUR_BINDING \
  --input-file YOUR_ORIGINAL_RUN_INPUT_JSON --export-output camera=YOUR_ABSENT_CAMERA_JSON \
  --dir YOUR_BUNDLE
```

Follow that operation's existing binding, settings and execution authorization flow. Export does
not read an arbitrary private output, rerun a retained operation, or replace the retained evidence.
Do not give the wrapper a private host manifest or a path inside private operation state. It reads
only the explicitly exported camera JSON, original invocation settings JSON and explicitly selected
original files. The wrapper executes no Blender or benchmark tool and mutates no bundle.

Run the synthetic wrapper from the repository root, choosing a fresh output path:

```sh
node examples/local-snapshots/wrap-camera.mjs \
  --camera-file examples/local-snapshots/camera/exported-camera.json \
  --settings-file examples/local-snapshots/camera/original-settings.json \
  --inputs-file examples/local-snapshots/camera/inputs.json \
  --key shot-front-001 --resource urn:example:camera-study --generation 1 \
  --out /tmp/camera-snapshot-g1.json
```

The result matches [`camera/snapshot-g1.json`](camera/snapshot-g1.json) byte for byte. An existing
output refuses rather than being overwritten. A caller chooses the stable key, resource and
positive safe integer generation. There is no automatic counter. Camera rename or export-file
relocation retains `shot-front-001`; `camera.camera` is only its display label. A later actual run
uses its own exported JSON, original invocation settings and selected originals with an explicitly
greater generation. The wrapper does not infer that those files were consumed by an earlier run.

The closed v1 envelope is shaped as follows:

```json
{
  "v": 1,
  "resource": "urn:example:camera-study",
  "generation": 1,
  "complete": false,
  "records": [{"key": "shot-front-001", "camera": {"camera": "Front Camera", "lensMm": 50}}],
  "evidence": {
    "v": 1,
    "association": "caller_asserted",
    "inputs": [{"id": "scene", "sha256": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]
  }
}
```

This abbreviated illustration omits most camera fields. The actual wrapper preserves the entire
exported object, including `matrixWorld`, and adds `settings_digest` using the public canonical JSON
owner on the **original invocation settings**. The declaration maps only supported scalar fields:
camera label, lens, frame, units and scale. Matrix and size remain in the snapshot as evidence;
they are not flattened into unsupported document fields. A selected camera is always partial,
so other absent cameras or assemblies never count as missing.

## Explicit evidence basis

The caller's selection file has this closed shape:

```json
{
  "inputs": {"scene": "/explicit/original-scene.blend", "reference": "/explicit/original-reference.png"},
  "required_identities": {"blender": "/explicit/reviewed-blender-binary"}
}
```

`required_identities` is optional. Its logical IDs form a namespace separate from `inputs`; the
same label may occur once in each. Paths are interpreted relative to the invoking working directory
unless absolute. They occur only in this caller-supplied selection file, never in evidence rows.
No value inside an incoming snapshot selects a file. Settings values are data and are never
followed as paths. The original exported camera object is retained verbatim as JSON data, so use
only the intended synthetic or deliberately reviewed export.

The wrapper accepts 1–16 original inputs, at most 16 required identities, logical labels up to 128
characters, 64 MiB per selected byte file, and 2 MiB per JSON input/output. JSON depth is bounded to
32 and nonfinite numbers refuse. Its deliberately narrow resource spelling is a bounded URN using
letters, digits, colons, dots, underscores and hyphens. Files must be ordinary, singly linked files;
final symlinks refuse. These producer checks are not a replacement for Core admission or the CLI's
private-state, bundle-store and file-boundary checks.

Hashes computed now describe the bytes selected **now**. They do not prove that an earlier tool
consumed them. Evidence is explicitly `caller_asserted`; the later native qualification must
independently compare these identities against the original host manifest without feeding that
manifest to the public consumer. Camera/output hashes cannot replace original input hashes. The
exact snapshot byte hash, generation, mapped content digest, original input hashes and settings
digest each have different meanings. Camera `blenderVersion` is informational; only explicitly
listed `required_identities` participate in applicability comparison.

For the synthetic camera, observe the declared basis without changing a bundle:

```sh
superbee source snapshot check examples/local-snapshots/camera/snapshot-g1.json \
  --inputs-file examples/local-snapshots/camera/inputs.json \
  --settings-file examples/local-snapshots/camera/original-settings.json
```

Equal original inputs, settings and any required identities yield `current` relative to this
declared basis. A known mismatch yields `stale`, retaining unknown rows. Missing or uncheckable
dimensions yield `unverifiable` when no mismatch is known. An absent/empty original input basis
cannot establish currentness; this wrapper requires at least one input. Omit `--settings-file`
for a snapshot expecting settings and the result is unverifiable. Compare a changed original
through an explicit selection map to see stale; compare a missing original to see unknown. Never
rewrite the historical snapshot to make an old capture appear current. This assessment is not
authentication, human verification or a claim of full environment reproducibility.

## Disposable linked-document journey

Create a disposable local bundle and copy these ordinary authored documents into it. Execute from the repository root:

```sh
EXAMPLE_ROOT=$(mktemp -d)
BUNDLE="$EXAMPLE_ROOT/.superbee"
superbee init --create-only --recipe none --dir "$BUNDLE"
cp -R examples/local-snapshots/conventions examples/local-snapshots/sources \
  examples/local-snapshots/camera-observations examples/local-snapshots/benchmark-results "$BUNDLE/"
cp recipes/source-feeds/conventions/signal.md "$BUNDLE/conventions/signal.md"
superbee status --dir "$BUNDLE"
superbee source snapshot bind sources/camera --dir "$BUNDLE"
```

Review the binding digest and explicitly accept it, then preview the exact input:

```sh
superbee source snapshot bind sources/camera --accept BINDING_DIGEST --dir "$BUNDLE"
superbee source snapshot run sources/camera \
  --snapshot examples/local-snapshots/camera/snapshot-g1.json --dir "$BUNDLE"
superbee source snapshot run sources/camera \
  --snapshot examples/local-snapshots/camera/snapshot-g1.json --accept INPUT_PREVIEW_DIGEST --dir "$BUNDLE"
```

The default run is `input_preview`, `effects_planned:false`, `applied:false`: it admits input and
policy without predicting target effects. The accepted run revalidates exact bytes, declaration,
binding and private state. Actual target changes can still be held by ownership conflicts or CAS.
The target [`camera-observations/front.md`](camera-observations/front.md) was deliberately authored
with resource+external ID. Ingestion can fill its empty owned fields and preserves its human body.
Editing an owned field by hand instead raises the existing ownership conflict. Other unlinked
records do not automatically become documents. The reused Signal definition declares a typed
feed link only for `Source Feed`; these source documents are `Reference`, so the actual source
Kind is passed through and no mismatched typed feed link is emitted. Signals retain the provider
identity. A bundle may declare its own Signal link vocabulary for its actual source Kind.
Installing a network Source Feed convention or inventing a URL is unnecessary.

Equal generation and identical exact bytes replay without fresh missing counts. Equal generation
with changed bytes refuses; lower generation refuses. A greater generation is a new observation
even if mapped values repeat. Once history exists, a changed resource, mapping or complete scope
requires a deliberately new source document/state key; preserve the old evidence and binding.

## Nested benchmark consumer

[`sources/benchmark.md`](sources/benchmark.md) uses the same contract with dotted paths such as
`result.metrics.latency.p95_ms` and the string list `result.metadata.suites`. It owns no Blender
concepts. Both benchmark snapshots assert `complete:true` and the exact declaration scope
`tiny-suite-v1`. That completeness concerns only these enumerated cases.

Bind and accept `sources/benchmark` as above, then preview/accept `benchmark/snapshot-g1.json` and
`benchmark/snapshot-g2.json` in order, obtaining a new input digest for each. The deliberately linked
`benchmark-results/search` retains `case-search-001` while generation 2 changes its display label
and timing. Its human note survives. The second initially unlinked case is absent from generation 2;
one new complete observation increments its missing count once, a replay increments zero times,
and another new complete absence reaches the declared threshold of 2. Disappearance raises review
signals and never deletes target documents. The list reordering represents the same set under the
existing mapper. No benchmark-specific reconciliation engine is introduced.

The benchmark workload basis can be checked independently:

```sh
superbee source snapshot check examples/local-snapshots/benchmark/snapshot-g2.json \
  --inputs-file examples/local-snapshots/benchmark/inputs.json
```

This fixture declares no settings or tool identity requirement. It makes no claim about dimensions
outside its descriptor. Wrapper test success alone does not establish native export or ingestion
qualification. Prior
native qualification retains its own source/archive identities; these fixtures claim no real
benchmark execution. The [comparison-review examples](../comparison-review) show how human findings
and decisions can cite an exact Artifact/capture basis without changing these source mappings.

# Blender saved-camera comparison

One trusted local operation, `local.blender.compare-view.v1`, maps to the existing
`SiteCapability` shape `blender_compare_view`. The repository folder is the distribution
unit; npm publication is disabled. Build the reviewed pinned checkout before registration.
The manifest declares one self-contained entry and two finite UTF-8 Python assets. Discovery
reads metadata without importing the module or probing tools. This checkout pins Core
exactly `0.2.0-pre.39`, helper contract 1.

This checkout targets the local-operation host in prerelease CLI `0.4.4-pre.4` with
exact Core `0.2.0-pre.39`. The earlier Core34 checkout with stable CLI `0.4.3` passed installed
GitHub/comparison consumer qualification. Those historical results do not establish this
checkout's native Blender render or video-host qualification.
Use the reviewed checkout and exact matching published or retained native artifacts documented at repository root.
Video mode additionally requires the reviewed host support for explicit tool
`versionFlag: "-version"`; qualify the exact CLI artifact for that support before installing
video bindings. A CLI version number alone does not qualify video host behavior. The GitHub
integration's CLI baseline is independent.

The earlier checkout `0752fb1ca4374b09049c7e7adbd9990d943f8eae` pins Blender to Core27;
its GitHub adapter uses Core28/CLI18. CLI18 does not provide this local host.
Use the root README's reviewed Git checkout/build procedure, then pass your existing local
bundle as `YOUR_BUNDLE` (the repository directory alone is not a bundle):

```sh
superbee op register "$PWD/integrations/blender" --local --dir YOUR_BUNDLE
```

Review the proposal, then repeat that command with `--accept PROPOSAL_DIGEST`. Updated entry,
assets or implementation/schema require accepting the new generation and deliberately
rebinding. Existing bindings are never silently upgraded.

## Closed image/video choices

| Mode | Exact settings | Exact captured resource roles | Native tool handles |
| --- | --- | --- | --- |
| Prepared image | `camera,width,height,samples,unitSystem,scaleLength` | `scene,reference` | `python,blender` |
| Video | same six plus `referenceKind: "video",referenceTimeSeconds` | `scene,video` | `python,blender,ffprobe,ffmpeg` |

Partial video settings, an unknown mode, and extra/mismatched resource roles refuse before
any tool call. Python requires Pillow available under isolated `-I`. Dimensions are 16–1600
pixels, Cycles CPU samples 1–128, and selected units must match the saved scene. In video
bindings use the exact tool shape `{ "path": "/absolute/reviewed/ffmpeg", "versionFlag": "-version" }`
and likewise for `ffprobe`; retain ordinary native executable path strings for `python` and
`blender`. The host validates and pins tool identity, versions and selected flags. The adapter
cannot inspect the host's tool registry; an absent required handle refuses when invoked.

The host owns copied-input hashes, supervision, interruption, deadlines, logs and aggregate
input/output limits. This adapter never spawns media tools through Python, uses ambient tool
lookup, or escalates the chosen resource profile. Each execute deliberately invokes one
comparison; never run this action through Core's twice-run read checker.

## Video timestamps and bounds

Start with a self-contained MP4/MOV file. Both media passes force the MOV demuxer with file-only
protocols, disabled external data/absolute references, and the same explicit actual stream
index. The first non-attached-picture video stream is selected. Other formats, interlacing,
cropping metadata, non-square pixels, changing dimensions and display rotation metadata are
refused. Export an upright standalone video first; no silent autorotation occurs.

`referenceTimeSeconds` is elapsed presentation time from the **first decoded frame**, not raw
PTS zero. ffprobe enumerates integer `frame.pts` and the positive rational stream timebase.
The nearest presentation timestamp wins; duplicate timestamps and equal-distance ties choose
the first decoded index. Requested time must lie between zero and the last decoded frame's
elapsed time. Missing, unordered or incomplete timestamps refuse; nominal FPS and best-effort
substitutes are never used as raw PTS.

Extraction decodes the same copied video from the start, maps the selected stream, selects the
exact decoded index, preserves timestamps and emits one PNG. A uniquely labelled showinfo
observation must agree with probe selection using raw integer ticks and rational timebases.
A rounded `pts_time` string cannot establish agreement. The small selection receipt records
source hash/logical reference, origin, requested/actual/error seconds as exact rational values,
raw decimal-string ticks, stream/index, frame count and coded/output geometry. Approximate
seconds are display fields. The receipt is retained, included in `comparison.json` and shown
in the self-contained HTML, because returned capability metadata alone is not durable evidence.

Probe JSON is checked at 8 MiB **before reading/parsing**, then limited to 100000 frames after
that bounded parse. Frame geometry is limited to 16 million pixels. Native acquisition remains
under the host's aggregate output/file/deadline limits; 8 MiB is not an instantaneous write
ceiling. Errors, oversized or truncated enumeration and disagreement refuse while the host
retains partial files. No automatic retry or fallback is provided.

Prepared images retain explicitly unavailable original video lineage. EXIF orientation is
applied to images; full frames are uniformly resized with at most 0.2% aspect-rounding tolerance.
Cropping, stretching and registration are refused. Pixel differences include lighting/staging
and do not establish dimensions, model accuracy or human acceptance.

## Scene closure and review

Blender starts with factory defaults and automatic script execution disabled. The capture
script refuses linked libraries, scripts, drivers, unpacked images/fonts, external media/caches,
simulations, runtime geometry modifiers, compositing and sequence dependencies. Export evaluated,
packed geometry first. Checks run on the copied scene before rendering. Original scenes are
never saved; no domain lights or hidden architecture are introduced. This is supported-use
validation for trusted local code with ambient authority, not an OS sandbox.

The self-contained review reuses side-by-side, opacity overlay, wipe, explicit-start blink,
cyan/magenta edges, difference and fit/100/200/300% zoom. Controls support keyboard use and wrap
on narrow screens; zoom scrolls inside a bounded viewport. Blink stops on mode/page changes
and is disabled by reduced-motion preference. Static full-frame images remain visible if
scripts cannot run. CSP admits only the exact trusted script hash and embedded data images;
network, frames, forms, workers, objects and base URL changes are disallowed. No machine paths,
raw argv/logs or camera-coordinate payload are embedded. Notes, landmarks and downloads are
outside this slice; the existing Artifact sandbox is unchanged.

Execution/ordinary HTML export and Artifact publication remain separate existing operations.
Keep retained evidence and explicit receipt IDs; do not rerun a render to repair publication.
Only adopted, installed capture/compare wrappers can later be replaced after parity proof.
The old pilot's unrelated semantic/geometry/shot/review-set consumers remain independently owned;
this change deletes no private dispatcher or history.

## Validation

Run `npm ci`, install exact Core39 (or a retained local preparation archive for
maintainer checks) as documented at repository root, then `npm run build`,
`npm run typecheck` and `npm test --workspace integrations/blender`. Set `SUPERBEE_TEST_PYTHON`
to an isolated Python with Pillow when necessary. Native synthetic media tests require ffmpeg
and ffprobe (local 9.0.2; Ubuntu 24.04 CI targets its distro 6.1 family), and validate actual selected pixels plus integer PTS, VFR,
nonzero origin, tie behavior, multiple streams and conservative rotation refusal. Local evidence uses Python 3.12.12/Pillow 12.1.0; native CI must establish the declared distro compatibility. They use a
synthetic Blender port double; actual installed-host/render/browser qualification follows
independent review. CI provisions isolated Python 3.12 with Pillow 11.3.0, records actual tool versions, and requires the native tests without silent skips. Native binding still pins the actual executable digests/versions; distribution libraries and rendered pixels are not claimed bit reproducible. No private files or generated media are packaged as fixtures.

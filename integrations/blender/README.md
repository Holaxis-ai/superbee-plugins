# Blender saved-camera comparison

One trusted local operation, `local.blender.compare-view.v1`, mapped to the existing
`SiteCapability` shape `blender_compare_view`. The repository folder is the distribution
unit; npm publication is disabled. Build the reviewed pinned checkout before registration.
The manifest declares one self-contained entry and two finite UTF-8 Python assets.
Discovery reads metadata without importing the module or probing tools.

This proposed checkout pins Core `0.2.0-pre.29` and requires the matching local-operation host
in CLI `0.4.3-pre.19`. These are compatibility targets, not a registry publication claim.
Use the root README's reviewed Git checkout and build procedure after the exact releases are
available. The earlier checkout `0752fb1ca4374b09049c7e7adbd9990d943f8eae` pins Blender to
Core27; its GitHub adapter uses Core28/CLI18. Published CLI18 does not provide this local host.
Before publication, maintainers install the exact retained Core29 candidate tarball and qualify
the operation with the retained CLI19 candidate archive; no local paths enter committed metadata.
After building, `superbee op --local register "$PWD/integrations/blender"` previews the local
proposal. Review and explicitly accept its digest with `--accept PROPOSAL_DIGEST`; tool/resource
binding and each invocation require their own explicit selections.

The CLI host supplies captured `scene` and `reference` resources and pinned `blender` and
`python` tool handles. Python must have Pillow installed. Settings are exactly `camera`,
`width`, `height`, `samples`, `unitSystem`, `scaleLength`. Dimensions are 16–1600 pixels,
Cycles CPU samples 1–128. Units must match the saved scene. The host owns the process tree,
deadline, logs, copied-input hashes, tool identities, output limits and run manifest.
Each execute deliberately invokes one comparison; it is not a read fixture and must not
be run through Core's twice-run read checker.

Only a packed scene and an already decoded reference image are supported. Blender starts
with factory defaults and automatic script execution disabled. The trusted capture script
refuses linked libraries, scripts, drivers, unpacked images/fonts, external media/caches,
simulations, geometry-node/runtime modifiers, compositing and sequence dependencies.
Export evaluated, packed geometry first when the source has these features. Closure checks
run after opening the copied scene with scripts disabled and before rendering. This is
supported-use validation for trusted local code, not an OS sandbox. Original scenes are
never saved. The current selected scene and saved camera are used; no domain lights or
hidden architecture are introduced.

The reference is a selected full image; its original video PTS and extraction lineage are
explicitly unavailable. Video capture/preparation is a remaining dependency and the private
pilot dispatcher has not been retired. EXIF orientation is applied, then full frames are
uniformly resized with at most 0.2% aspect-rounding tolerance. Cropping, stretching and
registration are refused. The report embeds selected images and makes no network requests.
Pixel/edge differences are diagnostics and do not prove dimensions, source agreement or
human acceptance. Render pixels can vary across tool/platform versions.

Run `npm ci`, install the exact public Core named by the manifest as documented at repository
root, then `npm run build`, `npm run typecheck` and `npm test --workspace integrations/blender`.
Focused tests use a fake host port plus actual synthetic image processing. Live Blender
qualification belongs after independent review; no private files or generated media are
packaged as fixtures. Host availability, cancellation and publication are separate concerns.

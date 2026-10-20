# @superbee/integration-github

Independently versioned GitHub repository issue adapter for Superbee, with the generic
`source-feeds` foundation and `work-items` recipes. The recipes are generated from the repository's
canonical `recipes` inputs; the generic Work Item convention also supports other trackers.

```js
import {restJsonProfile, nextLinkTarget} from '@superbee/core/source-profiles';
import {unsupportedContent} from '@superbee/core/source-engine';
import {createSourceProfile} from './dist/profile.mjs';
const profile = createSourceProfile(Object.freeze({restJsonProfile, nextLinkTarget, unsupportedContent}));
```

Within this checkout, the metadata root and `./profile` exports expose the same standalone factory, normalization and coverage
utilities. `normalizeGithubIssue(issue, parameters, helpers)` accepts the host's
`unsupportedContent` helper. `./recipes` exports `recipeFiles(id)`, which returns detached
`RecipeFile[]` for `source-feeds` or `work-items`; parse and install both through Core's public
recipe APIs. The manifest also lists inert on-disk recipe directories for CLI installation.
Install `source-feeds` before `work-items`. Installing recipes does not register executable code,
bind a feed, grant a credential or contact GitHub.

The `superbeeIntegration` contract-1 metadata identifies the single `dist/profile.mjs` module
and exact compatible Core version. It has no runtime imports, executable sidecars, install hook
or required runtime dependencies. Core 0.2.0-pre.26 is an optional exact peer for public types and host composition.
Developers and programmatic callers explicitly install that Core artifact before building or using
the adapter; it is not a mandatory development or runtime dependency. See [PROFILE.md](PROFILE.md)
for normalization, paging and completeness behavior.

Use the [pinned repository checkout and build steps](../../README.md#install-the-github-integration-from-source),
then run `superbee source plugin register "$PWD/integrations/github"` from the repository root
and accept the concrete proposal digest. This registers the built folder directly.
`superbee source plugin list` reports active integration and profile metadata. Install accepted
recipe bytes with `superbee recipe add github:source-feeds`, followed by
`superbee recipe add github:work-items`, then explicitly bind and run the feed. For author
validation and fixture tests, use this folder's generated recipe and fixture directories.
A plugin upgrade requires registration and feed rebinding; rebinding to a changed implementation
resets prior observation and accepted overlay state, so the next run reacquires it.

Registration is an explicit trust decision about the selected local bytes. A package name and
local digest do not authenticate npm or Holaxis origin. Approved code runs in the CLI process
with ambient process access; the injected helpers and guarded transport are not a sandbox.
Registration snapshots and pins selected bytes; a later checkout or rebuild does not update that snapshot.
Untrusted community extensions require the separate isolation boundary.

Loader identity: `@superbee/integration-github`, source `Holaxis-ai/superbee-plugins`, directory
`integrations/github`. Its private `package.json` retains compatibility and build metadata.
Integration npm publication is disabled and `prepublishOnly` refuses it. There is no integration
registry bootstrap or publisher configuration to complete. Local packed-artifact tests only check
portability; the supported acquisition route is a reviewed full Git commit and direct folder
registration.

`fixtures/author/fixture.json` is an honest recorded subset for `source test`. Its six scenarios
cover auth/server/rate-limit failures, incomplete paging, resume and a hostile cursor. The report
still lists eight missing required scenarios: malformed content, disappearance, owned conflicts,
unmapped/null fields, missing identity, redirects and undeclared hosts. The strict provider
normalizer rejects malformed identity before generic mapping, so this subset is not full author
qualification. Separate focused tests exercise normalization, overlay ownership and foreign paging.

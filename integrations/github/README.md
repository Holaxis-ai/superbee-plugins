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
or required runtime dependencies. Core 0.2.0-pre.28 is an optional exact peer for public types and host composition.
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

## Recorded author qualification

After building and explicitly registering this folder with a matching Core28 CLI (published
`superbee@0.4.3-pre.18`), run from the repository root:

```sh
superbee source test ./integrations/github/recipes/work-items --fixture ./integrations/github/fixtures/author --json
```

`fixtures/author/fixture.json` contains 16 synthetic scenarios and exact, committed expectations
for receipts, requests, cursors, changes and findings. It covers all 14 existing public Core
qualification categories without changing or exempting any harness rule. The packaged proof runs
the same command with the exact packed integration and published CLI outside the checkout, with
an isolated home and no provider credentials. It also proves that a wrong expectation and a
missing required category fail.

The native provider and generic mapper enforce different boundaries. The GitHub normalizer
rejects absent `node_id` and null `title` as unsupported content, with no page committed. Separate
`identity.native-absent` and `fields.native-null` scenarios preserve that behavior. A whitespace-only
`node_id` reaches the generic mapper, which treats a blank identity as missing and skips the record
with `IDENTITY_MISSING`; a whitespace-only required title produces `VALUE_MISSING` while keeping
the previous title. These are actual existing mapper rules, not aliases for provider rejection.
Optional null values clear previously observed close facts. An unknown state keeps the previous
mapped category, while a human title edit survives a provider update and raises a conflict Signal.

Expected normalized fields, removal/retention choices and change digests follow the declarative
mapping; the fixture does not learn expectations from a qualification run. Core's invariant checks
add independent requirements for disappearance thresholds, incomplete/resumed observations,
ownership conflict Signals and host refusal. No live GitHub access, catalog admission, managed
execution or integration npm publication is established by these recorded results.

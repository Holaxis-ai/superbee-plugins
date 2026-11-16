# Decision + Deep Research qualified authoring pilot

This local pilot prepares the real Decision and Deep Research recipes as an
explicitly bound set, then proves that ordinary installed tools can use their
expanded artifacts alongside historical bare records. It performs no publication,
live migration, hosted adoption or automated research.

The canonical authored definitions remain in `recipes/decision` and
`recipes/deep-research`. `qualification.json` supplies stable namespaces and exact
external bindings. Generated folders and the preparation receipt are separate
staging artifacts, never a second authored copy. The root recipe index continues
to describe the unexpanded recipes; no qualified release is listed there.

## Concepts and exact bindings

| Concept | Role |
| --- | --- |
| Decision Question | Normative choice, criteria and uncertainties |
| Decision Option | Candidate action; evidence does not select it automatically |
| Decision | Attributable commitment, separate from authorization or execution |
| Research Source | Identifiable input and inspection limits |
| Research Observation | Located account of inspected material |
| Research Claim | Scoped proposition, evidence and reasoning |
| Research Question | Epistemic uncertainty and next investigation |
| Task | Existing work item; this pilot neither declares nor migrates it |

Decision uses namespace `github.com/holaxis-ai/superbee-plugins/decision`.
Deep Research uses `github.com/holaxis-ai/superbee-plugins/deep-research`.
Append `/` and the exact source Kind name to obtain a stored selector, such as
`github.com/holaxis-ai/superbee-plugins/decision/Decision`. Friendly titles remain
labels, not aliases. These namespaces are stable claimed identities, not proof of
publisher ownership or download addresses. A repository rename does not rename
existing Kinds.

The configuration binds Decision's `Research Claim` and `Research Question`
targets to those exact source Kinds in the selected Deep Research recipe. Its
`Task` target binds to the exact existing `Task` declared in the explicitly supplied
bundle. Internal relationships bind to their own selected recipe. Preparation
refuses missing bindings or an absent Task declaration; it does not fetch or
install prerequisites. The receipt captures the observed Task definition/version,
which is evidence at preparation time, not a future lock.

Record prefixes remain `decisions/`, `decision-questions/`, `decision-options/`
and the four existing `research-*` prefixes. Definitions and static References
receive disjoint generated placement. Equal record IDs can still collide; ordinary
create-only writes remain authoritative. Existing bare Decision records retain
their original type and bytes.

## Prepare from an installed candidate

The reviewed qualifier producer is commit
`578c8a0dac515f769148f10ca7404085e2588f44` of Superbee. Its candidate archive reports
version `0.4.6-pre.7`, the same version string as the older published CLI, so check
`version --json` for `identity.source.commit`, `source.dirty: false` and
`artifact.channel: npm-package`. A version string alone does not select the
qualifier. Use an installed archive, not a sibling checkout import.

From this repository, select an absent disposable bundle location and the
installed candidate executable:

```sh
QUALIFIER=/absolute/path/to/installed/superbee/dist/superbee.mjs
PILOT_BUNDLE=/absolute/path/to/absent-disposable-bundle

node "$QUALIFIER" version --json
node "$QUALIFIER" init --create-only --recipe work-tracking --dir "$PILOT_BUNDLE"
node "$QUALIFIER" recipe qualify \
  examples/decision-research-qualified/qualification.json \
  --dir "$PILOT_BUNDLE" > /absolute/path/to/preparation.json
```

Require successful exit and a complete JSON envelope before consuming it. The
qualifier writes no output directories; `--out` is unsupported. The envelope
contains `files` with relative paths and UTF-8 bytes, plus a separate `receipt`.
An author packaging step must materialize those files in a fresh staging root,
check containment and retain the receipt separately. This pilot supplies only a
bounded test adapter using a private temporary tree, not a production materializer.

Only the expanded folders go to ordinary installers. From the materialized root,
the receipt's ordinary `recipe add ./deep-research` then `recipe add ./decision`
commands install the selected definitions into an explicitly chosen disposable
bundle that declares Task. Always add `--dir` and an actor for that intended bundle.
Do not install the canonical bare directories as a substitute for these artifacts.

Prose, code examples, query strings and frontmatter Markdown are not rewritten.
Their bare examples remain descriptions of the unexpanded recipes. Read the
receipt and use exact selectors in qualified records and consumers. Installing
these new identities neither adopts unstamped definitions nor migrates records.

## Reproduce the artifact proof

Install the public Core dependency using the repository README's setup. Set
`QUALIFIED_RECIPE_CLI` to the installed candidate, and optionally set
`QUALIFIED_RECIPE_CONSUMER_CLI` to the older published `superbee@0.4.6-pre.7`
executable (default: `superbee` on PATH):

```sh
QUALIFIED_RECIPE_CLI=/absolute/path/to/candidate/dist/superbee.mjs \
QUALIFIED_RECIPE_CONSUMER_CLI=/absolute/path/to/published/dist/superbee.mjs \
node --test scripts/decision-research-qualified.test.mjs
```

Set `QUALIFIED_RECIPE_KEEP_EVIDENCE=1` to retain the synthetic temporary tree;
the test prints its location. It includes `preparation.json`, tool identities,
expanded folders and the verified fixture index. The default removes the tree.

Without the explicit candidate path this integration proof reports a clear skip;
it is mandatory evidence for this pilot. Both executables must report clean
npm-package identities; the consumer must be the older artifact. The test copies
and installs generated artifacts outside the repository in an isolated environment.
It checks:

- Repeatable preparation, unchanged sources/prerequisite bundle, seven exact
  selectors, retained paths and explicit binding mappings.
- Ordinary validation and index/cookbook resolution through installed public Core,
  computing both digests over expanded bytes, followed by published-CLI installation.
- A synthetic source -> observation -> claim -> option -> decision -> Task graph,
  research/decision questions, exact queries and unchanged legacy bytes.
- Ordinary wrong-target relationship lint and create-only collision refusal.
- No successful inventory for missing Task, missing bindings or unsupported View
  input (including the unchanged home-maintenance source).
- Regeneration with an optional field, stable identities/placement, ordinary
  token-bound evolution without record changes, and incompatible-change refusal.

The temporary fixture index uses generated ownership IDs as its recipe IDs and
folder names, with synthetic publisher metadata. It is not published or copied
into the root catalog. Existing catalog generation and immutability checks remain:

```sh
node scripts/build-recipe-index.mjs --check
node scripts/build-recipe-index.mjs --compare origin/main
```

## Limits and review gate

Ordinary installation and evolution retain per-artifact writes and their existing
conflict checks; this does not promise atomic cookbook installation. A relationship
mismatch is ordinary lint, not strict edge rejection. Synthetic claims do not prove
real-world truth, approval or authority. The preparer supports Conventions and
static References; it refuses Views and other unsupported assets without changing
the ordinary engine's View support. Mike's compatibility note described the proposed home-maintenance 0.1.2 View; the
actual upstream source at this pilot baseline is 0.1.4. Its View and index bytes
are preserved.

Full recipes with References are proved locally. No deployed hosted compatibility,
namespace migration, release or publication is inferred. Independent exact-SHA
Review precedes adversarial QA, followed by fresh opposite-harness correctness and
skeptic review. Maintainers retain PR, merge and release authority.

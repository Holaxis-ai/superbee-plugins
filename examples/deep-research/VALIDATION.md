# Initial qualification — October 31, 2026

Status: experimental candidate, not a published release or evidence of real-use
advantage. Existing research bundles were not migrated.

The focused consumer proof installs the exact public npm CLI `0.4.4-pre.9`
(reported producer `1e69c138ca0965ca44f4620bab9fbdb753e3e3c9`, clean npm-package
identity) in an owned temporary directory. Its subprocesses use the repository's
isolated-environment helper and leave global CLI configuration untouched.

Run from the reviewed checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm exec -- node --test scripts/deep-research.test.mjs
superbee recipe validate ./recipes/deep-research --json
superbee recipe validate ./examples/deep-research/extensions/place-history --json
git diff --check
```

The consumer test has five subtests plus the parent test:

1. Copied portable payload installs four conventions and three References, no
   instances; repeat installation is unchanged. The extension preserves base
   bytes, and re-add preserves a local customization while reporting drift.
2. House evidence traversal reaches the needed, uninspected deed, preserves the
   superseded hypothesis, and connects three domain comparisons to one assessment.
3. Technical traversal retrieves scoped independent support, contrary evidence
   and a reasoning dependency. An explicit support withdrawal preserves the
   independent path and records unreviewed state; no automatic truth cascade occurs.
4. Interview records retain source assertion, bounded negative and unresolved
   authority separately.
5. Existing-target, enclosing-bundle, non-bundle-directory, invalid-case and invalid-enum refusals preserve authored data. Wrong target
   types are refused or detectable by native lint. A supported-shaped claim with
   no support edge remains possible, explicitly demonstrating the semantic limit.

Both recipe validators report success. The clean example graphs have no malformed,
unresolved, orphan, link-type or conformance issues before deliberate negative
controls. JavaScript syntax checks and whitespace checks are also part of the local
review. Fixtures total 29 invented records across three independent case bundles.

These are deterministic consumer checks, not a measured agent study, evidence of
source authenticity, provider capture, interview accuracy, benchmark execution,
full scientific support, cross-version compatibility, complete downstream-impact
discovery or publication approval. No executable provider integration was changed;
the unrelated integration test matrix is outside this contribution's qualification.

A subsequent bounded real composition study and a fresh-agent environmental
science investigation exercised the unchanged four-type core. They are consumer
observations, not a controlled comparison against organized notes. Optional readers,
attempt/run/capture companions and any actual historical/civic migration still
require their own consumer-driven scope.

## Independent review corrections

Review of the initial candidate caught two mixed researcher conclusions mislabeled
as source assertions. They are now inferences; the interview example has a separate
literal source-assertion Claim and an explicit dependency. Review also identified
inherited JavaScript property names as invalid starter cases; an own-key check now
rejects them before initialization. The consumer suite adds those cases and native
refusals for enclosing bundles and occupied non-bundle destinations.

## Fresh-agent onboarding observation

A history-free agent started from the user-facing README and investigated an
unrelated environmental-science question with actual sources. It used 12 research
records (five Sources, four Observations, two Claims, one Question) plus seven
installed definitions, with no additional Kind. A separate reader recovered the
answer, positive counterevidence, extrapolation limits and an inaccessible follow-up
from the structured evidence alone. That took 21 CLI invocations and 14 full
document reads; the short narrative was 261 words. Neither number establishes
superiority, time savings, independent human ease or exhaustive research quality.

Observed friction led to guidance-only changes in `0.1.0-pre.2`: the own-study
example now explicitly uses a `.superbee` child, keeps draft Markdown outside the
indexed root, locates retained assets from each Source with a path base, explains
full-body reads, and warns that distinct independence labels are not corroboration.
The original run and initial missing asset locator were frozen before a post-run
repair. The second reader then located both retained assets, verified hashes and
checked one locator against a derivative. This is byte/derivative checking, not
visual verification, authenticated provenance or universal evidence correctness.

No raw research corpus, source excerpts or private local paths from that study are
shipped in the recipe. The existing consumer suites pass 14/14 on the guidance
candidate. A read-only native evolution preview from an unchanged pre.1 install
reports ready with zero blockers; no existing research bundle was upgraded.

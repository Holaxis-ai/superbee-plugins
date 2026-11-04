# Resume a software change from its actual evidence

Use the existing Task and Context Note Kinds with one new [Change Review](../../recipes/software-delivery).
A later agent can recover ownership, acceptance, current source revision, applicable assessment,
remaining blocker and next action. A technical recommendation is separate from human permission and
from actual integration or delivery. No provider, workflow runner or credentials are required.

This example is fictional. It creates real **local Git commits** and executes a tiny local smoke check;
it creates no GitHub PR, remote merge, release or deployment. Two named process actors demonstrate
coordination; actor strings do not authenticate identity or prove independent reasoning.

## Session one: leave a recoverable checkpoint

Requires Git, a supported Node 22.14+/24/26 runtime, and the exact public CLI qualified here,
`superbee@0.4.4-pre.14` (clean npm-package source `da215d8610a39974bc39a195ad87f769c4d87560`).
From a reviewed checkout, use an isolated tool directory and an **absent** example destination:

```sh
RUN=$(mktemp -d)
npm install --prefix "$RUN/tools" superbee@0.4.4-pre.14 --ignore-scripts --no-audit --no-fund --package-lock=false
CLI="$RUN/tools/node_modules/superbee/dist/superbee.mjs"
node examples/software-delivery/create-example.mjs --out "$RUN/example" --cli "$CLI"
BUNDLE="$RUN/example/bundle"
SOURCE="$RUN/example/source"
```

The explicit starter initializes a new bundle, installs `context-notes`, `work-tracking` and the
software recipe in order, and creates one Task, one review and one Context Note. It refuses an
occupied destination. On a failure it reports and retains partial output for inspection; do not
retry into it. It never chooses a catalogued/live bundle or changes global tools or agent setup.

At commit A, the label function fails for numeric input. Review A records finding F1 and the actual
failed smoke command at A. The builder then commits a fix B, leaving the old review and handoff note
at A to represent an interruption. The Task is still owned and active; no integration has occurred.
The JSON receipt names both actual commits. A marker or digest alone is not proof a review occurred.

## Session two: inspect before repeating work

Start with the current source and complete records, not just the old note:

```sh
git -C "$SOURCE" log --oneline -3
git -C "$SOURCE" status --short
node "$CLI" doc read tasks/label-input --offset 0 --json --dir "$BUNDLE"
node "$CLI" link show tasks/label-input --dir "$BUNDLE"
node "$CLI" doc read change-reviews/label-a --offset 0 --json --dir "$BUNDLE"
node "$CLI" doc read context-notes/label-handoff --offset 0 --json --dir "$BUNDLE"
```

Recover six things: the builder owns the work; acceptance requires a local merge **and a smoke check
at its actual integration commit**; source B is current; review A only assesses A; F1 needs current
assessment; the next step is to inspect/check B rather than blindly redo its committed fix. No
automatic stale-review detector or completion gate supplies that judgment.

Inspect the small source, run its check at B, then record a new bounded assessment:

```sh
cat "$SOURCE/label.mjs" "$SOURCE/check.mjs"
REVIEWED_REVISION=$(git -C "$SOURCE" rev-parse HEAD)
(cd "$SOURCE" && node check.mjs)
cat > "$RUN/review-b.md" <<EOF_BODY
# Scope
The complete fictional source at $REVIEWED_REVISION; only the two stated inputs.

# Findings
F1 is resolved by explicit conversion before trimming.

# Evidence
Inspected label.mjs and ran node check.mjs at $REVIEWED_REVISION: exit 0.
This is a local smoke check, not CI. No integration has occurred.

# Limits
Other values and real-provider behavior were not assessed. This is a technical recommendation.

[reviews](../tasks/label-input.md)

[supersedes](../change-reviews/label-a.md)
EOF_BODY
node "$CLI" new 'Change Review' change-reviews/label-b --title 'The stated inputs pass at B' --target 'fictional label example/source' --revision "$REVIEWED_REVISION" --question 'Do the two stated inputs produce their required labels?' --verdict acceptable --reviewer process:fictional-reviewer --body-file "$RUN/review-b.md" --actor process:fictional-reviewer --dir "$BUNDLE"
```

Review A stays readable at its original revision. `supersedes` connects the assessments; it does not
automatically erase a finding or authorize a merge. The short old note remains a checkpoint until
explicitly reconciled. For a real change, choose evidence appropriate to its scope; this recipe does
not require tests for every trivial edit or prescribe a repository's review/approval process.

## Distinguish integration from completed acceptance

The following is an explicitly local fictional integration, not a provider receipt:

```sh
git -C "$SOURCE" switch main
git -C "$SOURCE" -c user.name='Fictional Example' -c user.email=example@example.invalid -c commit.gpgsign=false merge --no-ff fix-label -m 'Synthetic local feature integration'
INTEGRATION_REVISION=$(git -C "$SOURCE" rev-parse HEAD)
node "$CLI" list --type Task --open --dir "$BUNDLE"
```

The Task remains in progress: the agreed integration check has not run. Review B's source commit is
also distinct from the new merge commit. Capture the Task body and version together, then record
what actually happened:

```sh
node "$CLI" doc read tasks/label-input --body-out "$RUN/task-body.md" --json --dir "$BUNDLE" > "$RUN/task-read.json"
TASK_VERSION=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version' "$RUN/task-read.json")
cat >> "$RUN/task-body.md" <<EOF_BODY

# Integration receipt
Actual local Git merge $INTEGRATION_REVISION includes source $REVIEWED_REVISION.
[Technical assessment B](../change-reviews/label-b.md) applies to the source revision.
No GitHub PR was created or merged. The integration check is still outstanding.
EOF_BODY
node "$CLI" doc update tasks/label-input --body-file "$RUN/task-body.md" --expected-version "$TASK_VERSION" --actor process:fictional-builder --dir "$BUNDLE"
(cd "$SOURCE" && node check.mjs)
```

After that check actually passes, confirm the integration commit is unchanged and record acceptance.
Run these commands only after the preceding check succeeds; stop and reconcile a failed command,
changed source or stale write. Read each body and its version together:

```sh
test "$(git -C "$SOURCE" rev-parse HEAD)" = "$INTEGRATION_REVISION"
node "$CLI" doc read tasks/label-input --body-out "$RUN/task-body.md" --json --dir "$BUNDLE" > "$RUN/task-read.json"
TASK_VERSION=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version' "$RUN/task-read.json")
cat >> "$RUN/task-body.md" <<EOF_BODY

# Accepted evidence
Ran node check.mjs at integration $INTEGRATION_REVISION: exit 0.
The actual local merge and integration smoke acceptance are both met.
EOF_BODY
node "$CLI" doc update tasks/label-input --body-file "$RUN/task-body.md" --progress_status done --expected-version "$TASK_VERSION" --actor process:fictional-builder --dir "$BUNDLE"
node "$CLI" doc read context-notes/label-handoff --body-out "$RUN/note-body.md" --json --dir "$BUNDLE" > "$RUN/note-read.json"
NOTE_VERSION=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version' "$RUN/note-read.json")
cat > "$RUN/note-body.md" <<EOF_BODY
# Summary
[Task](../tasks/label-input.md) acceptance is complete: source $REVIEWED_REVISION
was assessed in [review B](../change-reviews/label-b.md), then merged locally as
$INTEGRATION_REVISION and smoke checked there. [Review A](../change-reviews/label-a.md)
retains the earlier failed assessment. No provider PR, human approval, release or deployment is implied.
EOF_BODY
node "$CLI" doc update context-notes/label-handoff --body-file "$RUN/note-body.md" --expected-version "$NOTE_VERSION" --actor process:fictional-builder --dir "$BUNDLE"
node "$CLI" list --type Task --open --dir "$BUNDLE"
node "$CLI" status --dir "$BUNDLE"
```

For real work, record the actual PR merge receipt when that is part of acceptance. Source merge
still leaves work active when acceptance also requires published consumer compatibility or another
observed outcome. Do not mark done from a green check, review verdict or copied example receipt.

## Same-store claims and repeat use

The starter claimed its Task with an observed `head_version`. Another write against that old token
is refused. This is an exact-store CAS, not global exclusivity: two unsynchronized Git checkouts may
both accept an old claim. Reconcile normal sync and current ownership before acting there. Never
blindly retry or take over another owner's work. There is no new claim verb, distributed lease,
review lock, schema migration or automatic policy enforcement.

For a new real project, install the three recipes explicitly as shown in the
[operating reference](../../recipes/software-delivery/references/software-delivery.md), create only
your own useful Task, and adapt its acceptance. Inspect existing Kinds before any existing-bundle
installation. Re-add reports drift and preserves authored conventions; it does not upgrade them.
The built-in recipe catalog does not auto-discover this path-installed contribution.

## Focused qualification

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm exec -- node --test scripts/software-delivery.test.mjs
```

The focused proof uses the repository's existing isolation helpers and installs the exact public CLI
outside the checkout. It checks inert/repeat installation, builtin preservation, reference collision,
stale same-store claim, invalid assessment shapes, A→B preservation, actual local merge provenance,
and active-until-accepted completion. It cleans its fictional scratch bundle. Native source CI also
runs this proof. It does not establish agent speed, superiority over organized notes, authenticated
review, source truth or production adoption. A fresh reader can separately attempt the six-question
recovery above; a deterministic subprocess test is not that reasoning study.

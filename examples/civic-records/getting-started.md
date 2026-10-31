# From supplied meeting files to cited research

This is a local/private, two-document journey for a command-line operator or agent. You will install
both recipes, register selected revisions, prepare supplied page text, import it, query it and
repeat safely. Nothing here publishes to hosted Superbee or Here & Main. Full source text can
contain personal information: keep your real input files, receipts and research bundle private.

The included two meetings are **synthetic**. Their PDF files have a PDF header solely to exercise
the supplied-file boundary; they are not valid rendered PDFs or official records. Their text is
invented. Passing this journey proves the documented interfaces join together, not PDF conversion,
OCR completeness, official source authenticity, complete archive coverage or legal conclusions.

## 1. Acquire the code and isolated tools

Select a reviewed full 40-character commit, inspect its code and verify the checkout. The repository
[setup](../../README.md#install-the-github-integration-from-source) explains compatibility: this
journey uses public Core `0.2.0-pre.41`, CLI `0.4.4-pre.6`, and Node `26.8.2`. Do not substitute
`latest`, a sibling Core checkout or an unreviewed moving branch. Operation registration is a
separate decision to trust ambient local JavaScript; installing a recipe is inert.

```sh
git clone https://github.com/Holaxis-ai/superbee-plugins.git
cd superbee-plugins
git checkout --detach REVIEWED_FULL_COMMIT_SHA
git rev-parse HEAD
git status --short
node --version
npm ci
npm install --no-save --package-lock=false --ignore-scripts @superbee/core@0.2.0-pre.41
npm run build --workspace integrations/civic-records
```

Use an owned temporary directory for the CLI, state and example research. This does not replace a
global CLI. The `civic` function isolates only these subprocesses; it is not an OS sandbox.

```sh
RUN=$(mktemp -d /tmp/civic-supplied.XXXXXX)
RUN=$(cd "$RUN" && pwd -P)
mkdir "$RUN/home" "$RUN/tool" "$RUN/evidence"
civic() {
  env HOME="$RUN/home" USERPROFILE="$RUN/home" XDG_CONFIG_HOME="$RUN/home" \
    XDG_STATE_HOME="$RUN/home" npm_config_cache="$RUN/home/npm-cache" "$@"
}
civic npm install --prefix "$RUN/tool" --ignore-scripts --no-audit --no-fund \
  --package-lock=false superbee@0.4.4-pre.6
CLI="$RUN/tool/node_modules/.bin/superbee"
sb() { civic "$CLI" "$@"; }
plan() { civic node examples/civic-records/plan-supplied.mjs --cli "$CLI" --bundle "$RUN/bundle" "$@"; }
sb version --json
```

Inspect actual version identity: `0.4.4-pre.6`, clean npm package, producer
`688d62a2e1395a6ca7dde52f08e0caf97b643d60`. Source acquisition/build and recipe installation do
not automatically approve executable operation bytes. The supplied-text operation does not need
a converter or a CLI upgrade; newer tool-probe support would not prove conversion ran here.

## 2. Install the model and create a source

```sh
sb init --create-only --recipe none --dir "$RUN/bundle" --json
sb recipe validate ./recipes/civic-records --json
sb recipe validate ./recipes/civic-research --json
sb recipe add ./recipes/civic-records --dir "$RUN/bundle" --json
sb recipe add ./recipes/civic-research --dir "$RUN/bundle" --json
sb new 'Civic Source' synthetic-council --title 'Synthetic Council' \
  --jurisdiction_key synthetic-town --jurisdiction_name 'Synthetic Town' \
  --body_name 'Synthetic Council' --provider synthetic-files \
  --registry_url https://example.org/records/ --coverage sample --capture_mode manual-pilot \
  --actor process:civic-supplied-example --dir "$RUN/bundle" --json
```

Expect native `new:written` and the Source id `civic-sources/synthetic-council`. These commands
validate/install definitions; they do not claim the separate recipe-set structural preflight ran.
For an existing customized bundle, stop and inspect its definitions and native `recipe evolve`
proposal separately. The planner does not install or evolve anything.

## 3. Generate the repeated input files

Copy only the synthetic input files into private evidence. Run the planner once per selected
meeting, supplying dates and classifications deliberately. For real city summaries use `other`,
not `minutes`; the filename does not establish approval or meeting type. Extraction status is an
explicit caller assertion, not inferred from supplying a text file.

```sh
cp examples/civic-records/fixtures/meeting-* "$RUN/evidence/"
plan --source-id civic-sources/synthetic-council \
  --pdf "$RUN/evidence/meeting-one.pdf" --text "$RUN/evidence/meeting-one.txt" \
  --document-id meeting-one --source-url https://example.org/records/meeting-one.pdf \
  --captured-at 2026-01-03T00:00:00.000Z --meeting-date 2026-01-02 \
  --title 'Synthetic meeting one' --record-kind other --session-kind regular \
  --extraction-status text-extracted --page-count 1 \
  --extraction-label 'Synthetic supplied text; no converter ran' --out-dir "$RUN/one" > "$RUN/one-plan.json"
plan --source-id civic-sources/synthetic-council \
  --pdf "$RUN/evidence/meeting-two.pdf" --text "$RUN/evidence/meeting-two.txt" \
  --document-id meeting-two --source-url https://example.org/records/meeting-two.pdf \
  --captured-at 2026-01-17T00:00:00.000Z --meeting-date 2026-01-16 \
  --title 'Synthetic meeting two' --record-kind other --session-kind regular \
  --extraction-status text-extracted --page-count 1 \
  --extraction-label 'Synthetic supplied text; no converter ran' --out-dir "$RUN/two" > "$RUN/two-plan.json"
```

Expect `complete:true`, `bundleWrites:0`, two distinct `recordId` values, and JSON paths. Inspect
each directory's `captures.json`, `basis.json`, `resources.json`, `supplied-evidence.json`.
The helper reuses the registrar's immutable identity, reads the existing Source and Kind, derives
byte hashes/counts and records their native versions. It does not run the next steps.

Limits: one PDF <=8MiB and text <=256KiB per invocation; ordinary single-link files; fatal UTF-8
validation. Page count and association remain caller assertions. A PDF header is not PDF validity;
formfeeds and text thresholds do not prove complete OCR/transcription. New output directories and
run-input files must be absent, outside the selected bundle and `~/.superbee-state`, with ordinary
existing parents. Output files are mode0600 and directories mode0700. Filesystem/version guards
observe changes but are not a transaction or sandbox. A partial output failure reports only emitted
files; inspect them and select another absent directory. Never silently overwrite or rerun the
planner to invent a new capture/freshness clock.

## 4. Register immutable source revisions

For `one`, then `two`, preview and inspect before applying the same selection:

```sh
civic node examples/civic-records/register-captured.mjs --cli "$CLI" \
  --bundle "$RUN/bundle" --manifest "$RUN/one/captures.json" --actor process:civic-supplied-example
# Inspect would-create and its record id, then explicitly apply:
civic node examples/civic-records/register-captured.mjs --cli "$CLI" \
  --bundle "$RUN/bundle" --manifest "$RUN/one/captures.json" --actor process:civic-supplied-example --apply
```

Repeat those two commands with `two/captures.json`. Expect one created record each. Preserve the
returned native version and exact record id; inspect it with `sb doc read RECORD_ID --offset 0
--max-bytes 983040 --dir "$RUN/bundle" --json`. Original bytes with changed mapped metadata conflict;
a later retry must preserve paths, `capturedAt` and assertions. No source freshness or approval is
inferred. Omitted archive entries do not imply deletion or exhaustive coverage.

## 5. Trust, bind and run preparation explicitly

```sh
sb op register "$PWD/integrations/civic-records" --local --dir "$RUN/bundle" --json
# Inspect exact built code/effects and returned digest. Accept only after your review:
sb op register "$PWD/integrations/civic-records" --local --accept REVIEWED_REGISTRATION_DIGEST \
  --dir "$RUN/bundle" --json
sb op bind local.civic.prepare-text.v1 --local --resources-file "$RUN/one/resources.json" \
  --dir "$RUN/bundle" --json
# Inspect files, tool-free effects, output root and returned digest. Then accept:
sb op bind local.civic.prepare-text.v1 --local --resources-file "$RUN/one/resources.json" \
  --accept REVIEWED_BINDING_DIGEST --dir "$RUN/bundle" --json > "$RUN/one/bound.json"
plan --from-binding "$RUN/one/bound.json" --run-input "$RUN/one/run-input.json"
sb op run local.civic.prepare-text.v1 --local --binding ACTUAL_RETURNED_BINDING_ID \
  --input-file "$RUN/one/run-input.json" \
  --export-output "prepared=$RUN/one/operation-output/prepared.json" --dir "$RUN/bundle" --json
```

`REVIEWED_*` and `ACTUAL_RETURNED_BINDING_ID` are intentionally not automatic. Inspect actual native
results at each boundary. The from-binding mode copies the accepted receipt's `expectedInputs`
unchanged; it neither guesses native hashes nor authenticates the supplied receipt. Native run
still admits the actual binding/inputs. Expect both `status:succeeded` **and**
`outputExport.status:exported`; a successful run with failed export is not a usable prepared file.
The export must be absent and within the selected operation output root. `synthetic-v1` is the
existing profile name, not a claim that future caller-supplied real files are synthetic.

Repeat binding, receipt transformation and run for `two`. Inspect both prepared JSON files:
`extractionAssociation:caller_asserted`, `extractorExecution:not_observed`, original wording and
page boundaries remain. The operation performed no PDF conversion or bundle document write.

## 6. Import and inspect text

```sh
civic node examples/civic-records/import-prepared.mjs --cli "$CLI" --bundle "$RUN/bundle" \
  --prepared "$RUN/one/operation-output/prepared.json" --derived-at 2026-01-03T00:00:00.000Z \
  --actor process:civic-supplied-example
# Inspect would-create, then apply the same immutable export and derivation time:
civic node examples/civic-records/import-prepared.mjs --cli "$CLI" --bundle "$RUN/bundle" \
  --prepared "$RUN/one/operation-output/prepared.json" --derived-at 2026-01-03T00:00:00.000Z \
  --actor process:civic-supplied-example --apply
```

Repeat for `two`, with its own fixed derivation time. Expect one Text each, readback-confirmed native
versions and unchanged caller provenance. Read complete Texts using their returned ids. Do not
paste full raw minutes into a public issue or treat native Kind validity as source truth.

## 7. Research, query and repeat

Inspect the generated plan JSON and installed conventions. These explicit research writes are
operator interpretation, separate from file preparation. The following groups a synthetic topic,
retains two source assertions and proposes a connection; no legal approval is inferred. Extract
only the returned ids from the saved planner results:

```sh
ONE_RECORD=$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).recordId)' "$RUN/one-plan.json")
TWO_RECORD=$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).recordId)' "$RUN/two-plan.json")
printf '[record evidence](../%s.md)\n' "$ONE_RECORD" > "$RUN/matter.md"
sb new 'Civic Matter' bluebird --title 'Synthetic Bluebird project' \
  --jurisdiction_key synthetic-town --matter_kind capital-project --identity_status proposed \
  --identity_basis 'Both supplied synthetic accounts name Bluebird.' \
  --scope_note 'Synthetic example; identity and scope unresolved.' --body-file "$RUN/matter.md" \
  --actor process:civic-supplied-example --dir "$RUN/bundle" --json
printf '[about](../civic-matters/bluebird.md)\n\n[supported by](../%s.md)\n' "$ONE_RECORD" > "$RUN/observation-one.md"
sb new 'Civic Observation' bluebird-one --title 'First account reports discussion' \
  --jurisdiction_key synthetic-town --matter_id civic-matters/bluebird --claim_mode source-assertion \
  --statement 'The supplied first account says Bluebird was discussed without a decision.' \
  --evidence_id "$ONE_RECORD" --evidence_locator 'Supplied page 1' --date_scope meeting-date \
  --verification_state unreviewed --asserted_date 2026-01-02 --body-file "$RUN/observation-one.md" \
  --actor process:civic-supplied-example --dir "$RUN/bundle" --json
printf '[about](../civic-matters/bluebird.md)\n\n[supported by](../%s.md)\n' "$TWO_RECORD" > "$RUN/observation-two.md"
sb new 'Civic Observation' bluebird-two --title 'Second account reports a condition' \
  --jurisdiction_key synthetic-town --matter_id civic-matters/bluebird --claim_mode source-assertion \
  --statement 'The supplied second account says the Bluebird allocation remains conditional.' \
  --evidence_id "$TWO_RECORD" --evidence_locator 'Supplied page 1' --date_scope meeting-date \
  --verification_state unreviewed --asserted_date 2026-01-16 --body-file "$RUN/observation-two.md" \
  --actor process:civic-supplied-example --dir "$RUN/bundle" --json
printf '[subject](../civic-observations/bluebird-two.md)\n\n[object](../civic-observations/bluebird-one.md)\n' > "$RUN/connection.md"
sb new 'Civic Connection' bluebird-follow-up --title 'Proposed synthetic follow-up' \
  --jurisdiction_key synthetic-town --subject_id civic-observations/bluebird-two \
  --object_id civic-observations/bluebird-one --relation_type follows-up \
  --identity_scope_status unresolved --review_status proposed --rationale 'Shared synthetic topic only.' \
  --verification_needed 'Compare full records and scope before accepting.' --body-file "$RUN/connection.md" \
  --actor process:civic-supplied-example --dir "$RUN/bundle" --json
printf '[supported by](../%s.md)\n' "$TWO_RECORD" > "$RUN/finding.md"
sb new 'Civic Finding' bluebird-lead --title 'Check the conditional Bluebird allocation' \
  --jurisdiction_key synthetic-town --action_date 2026-01-16 --action_status reported \
  --topic 'Synthetic Bluebird project' --evidence_page 1 --evidence_locator 'Supplied page 1' \
  --editorial_status needs-verification --freshness_status unknown \
  --resident_relevance 'Synthetic example only.' --verification_needed 'Check approval and newer evidence.' \
  --body-file "$RUN/finding.md" --actor process:civic-supplied-example --dir "$RUN/bundle" --json
```

The [research reference](../../recipes/civic-research/references/civic-research.md) explains the
field semantics. A Kind checks shape; these assertions remain unreviewed. No interpretation or
publisher handoff is automatically generated by the planner, and no local status authorizes
Here & Main publication.

```sh
sb query --type 'Civic Record' --limit 0 --dir "$RUN/bundle" --json
sb query --type 'Civic Text' --limit 0 --dir "$RUN/bundle" --json
sb search Lantern --type 'Civic Text' --dir "$RUN/bundle" --json
sb doc read ACTUAL_LANTERN_TEXT_ID --offset 0 --max-bytes 983040 --dir "$RUN/bundle" --json
sb status --dir "$RUN/bundle" --json
```

Expect two Records and two Texts. Lantern is absent from the Bluebird research lead, demonstrating
why retaining full text is useful. Query snippets can truncate; use complete native reads to inspect
passages. No semantic recall, legal correctness or complete municipal monitoring is claimed.

Repeat the original registrar and importer `--apply` commands: expect zero creations, `up-to-date`
and the same native versions. Do not regenerate capture or derivation times. Repeat prepare to a
**different absent path inside the same operation-output directory**, then compare exported bytes.
Repeating a strict `new` refuses rather than replaces existing data. Changed bound bytes refuse;
inspect/rebind deliberately, never automatically retry a write or invent a sync journal.

For a ready joined synthetic proof after the build, run `npm exec -- node --test
scripts/civic-onboarding-consumer.test.mjs`. It drives public installed CLI interfaces and refusal
controls; it does not qualify real capture, conversion, editorial correctness or hosted publication.

## Real source acquisition and missing evidence

Replace only the explicitly selected source and semantic inputs after inspecting an official
archive. Discovery/capture/conversion stay external; honor robots and access controls, stop on
unsupported formats/oversize or unavailable evidence. Preserve capture-tool receipts when it
actually runs: command, start/end, exit, original/final URL, response status/headers, retained byte
count/digest, and converter command/version/results. Ordinary curl can retain headers with
`--dump-header` and report final URL/status with `--write-out`; enforce bounds and absent private
destinations in that capture tool. Redirect authority and provider access policy belong there.
Never reconstruct missing HTTP receipts retroactively.

`supplied-evidence.json` is deliberately **not** a network capture receipt: it observes supplied
local bytes and labels URL/time/meeting metadata as assertions; HTTP and converter observations
remain `not_observed`. It does not prove official origin. Keep real HTTP receipts alongside it,
not inside new invented Kind fields. An existing archive snapshot may omit newer meetings; record
selected-only/unknown-tail coverage and verify current primary sources before public guidance.

## Cleanup and troubleshooting

Before removing your owned example directory, unregister its accepted operation with `sb op
unregister civic-records --local --dir "$RUN/bundle" --json`. Retain private evidence/bundle if
needed; remove only the exact disposable installation/home you created. No sync or publication is
part of cleanup. Registration elsewhere and global tools remain untouched.

- `CIVIC_PLAN_DESTINATION_EXISTS`: preserve original plan; repeat downstream commands, or choose
  another absent output directory deliberately. Do not overwrite evidence.
- `CIVIC_PLAN_BINDING_RECEIPT`: save the actual complete accepted binding JSON, not a proposal,
  prose or guessed hashes. No receipt proves its own authenticity.
- `CIVIC_LOCAL_ONLY`: this example refuses Git/hosted homes; no adoption or fallback.
- `CIVIC_PREREQUISITE_CHANGED`/mapped-field conflict: inspect current native versions and human edits.
  Stop; no automatic rebase, overwrite or retry.
- Low text/page mismatch: inspect retained PDF/text; treat as a review/refusal signal, not an OCR
  quality detector. No scanned-PDF extraction is provided.
- Unknown create acknowledgement/export failure: stop and inspect the actual receipt/readback.
  Local create-only reruns use original selections; this does not qualify uncertain hosted writes.

# Civic records packaging/use experiments

For first use, follow the [complete supplied-file walkthrough](getting-started.md). The
`plan-supplied.mjs` helper generates repeated JSON inputs from explicit metadata and checked local
bytes; it performs no capture, conversion, trust acceptance, bundle write or publication.


These examples are synthetic. Never commit actual residents' minutes, local bundle paths, private
exports or local evidence into this repository. Model instances belong in the selected research
bundle; this directory contains only reusable instructions and synthetic consumer tests.

## Hypotheses and evidence

| Question | Experiment | Success means | Does not establish |
| --- | --- | --- | --- |
| Can the model travel? | Install the canonical recipe into a fresh bundle; author two synthetic municipalities/providers | Same definitions, separate identities and citations | Correctness of a live provider adapter |
| Can processing be a real plugin? | Build standalone package; use public CLI register, bind, run and JSON export | Native exact-input/effect path works outside the repo | A converter ran or eCode360 authorized crawling |
| Can we avoid repeated AI work? | Run twice with the same finite input set | Byte-equal application output; no network/AI calls | No new native invocation/evidence storage cost |
| Do we preserve nuance? | Supplied text includes proposed, conditional and adopted items | Exact words/page boundaries remain; no inferred approval | Correct independent interpretation |
| Can we learn from real use? | Apply the reviewed operation to deliberately captured official local records; ask questions absent from initial summaries | Useful page citations and measured effort/gaps | Production editorial approval or comprehensive monitoring |

## Initial learning backlog

1. Extraction provenance: captured PDF and text are associated by the caller. Decide whether actual
bound converter execution earns its complexity; measure the existing version-probe mismatch.
2. New/changed documents: discovery, immutable revision creation, derivative import and partial
failures are not implemented by this local operation. Reuse native CLI/Core boundaries rather than
introducing another sync engine.
3. Quality: test real tables, draft watermarks, stamps, attachments and scanned pages. Low-text
refusal is a triage signal, not an OCR-quality detector or completeness proof.
4. Querying: compare full-page keyword search against curated findings and specific real questions.
Keep the existing local search prototype outside this operation until repeatable use justifies a
separate reusable contract. No search engine is copied into the adapter.
5. Packaging ergonomics: recipe acquisition and operation registration are separate explicit steps.
Assess this through a clean consumer, without adding a new installer/framework prematurely.
6. Storage/privacy: measure Markdown size, revisions and capture duration. Raw minutes can contain
personal information; keep private evidence and public editorial projections separate.
7. Promotion: only after repeatable useful results, propose provider discovery or reviewed import.
No automatic Here & Main publishing, scheduled job or managed activation is part of this draft.

The development Task retains actual run receipts, failures, effort and follow-up decisions. A
passing synthetic case is not recorded as a real municipal capture. Experiments should be cheap
to repeat or discard and should leave official source bytes and editorial decisions intact.

## Register deliberately supplied PDF revisions

`register-captured.mjs` supplies the missing step before text preparation: register immutable
Civic Records for 1–10 explicitly supplied local PDFs against an **existing** Civic Source and
installed Civic Record Kind. It uses installed public Core `0.2.0-pre.41` for body/Kind semantics
and an explicit trusted native CLI (qualified with `0.4.4-pre.6`); follow the root dependency setup.
It creates no Sources, performs no discovery/download/conversion, and installs no source plugin,
recipe upgrade, schedule, finding or publication.

```sh
node examples/civic-records/register-captured.mjs \
  --cli /explicit/installed/superbee \
  --bundle /absolute/private/local-bundle \
  --manifest /absolute/private/captures.json \
  --actor process:civic-capture-pilot
# Inspect the read-only proposal, then repeat the exact selection with --apply.
```

The closed UTF-8 manifest is at most 64KiB. Its exact top-level keys are `schema`, `sourceId`,
`captureBasis`, `coverage` and `entries`:

```json
{
  "schema": "civic-captured-records/v1",
  "sourceId": "civic-sources/synthetic-council",
  "captureBasis": "operator-supplied-files",
  "coverage": "selected-only-unknown-tail",
  "entries": [{
    "documentId": "1001",
    "pdfFile": "/absolute/private/evidence/synthetic-1001.pdf",
    "pdfSha256": "<actual lowercase 64-hex SHA256>",
    "sourceUrl": "https://ecode360.com/ZZ0001/document/1001.pdf",
    "capturedAt": "2026-01-03T00:00:00.000Z",
    "title": "Synthetic council minutes",
    "bodyName": "Synthetic Council",
    "meetingDate": "2026-01-02",
    "recordKind": "minutes",
    "sessionKind": "regular",
    "extractionStatus": "text-extracted",
    "pageCount": 1
  }]
}
```

Only `sourceLabel`, `secondaryDateRaw` and `statusNote` may additionally appear on entries.
The PDF must be an ordinary single-link local file of at most 8MiB with PDF magic and a matching
digest. Magic does not validate PDF structure. The URL must share the selected Source registry's
HTTPS origin. For `ecode360`, the exact `/JURISDICTION/document/ID.pdf` path must match the
Source's `provider_jurisdiction_id` and decimal document id, without query. The Source supplies
jurisdiction; `bodyName` must match its body. Capture time, page count, extraction status and
meeting metadata are caller assertions. No converter execution is claimed. Approval defaults to
`unknown`; this caller takes no approval or supersession inputs. A local evidence path is a
pointer to checked supplied bytes, not immutable custody or proof of official origin.

Record ids use `civic-records/capture-v1-` followed by SHA256 of the UTF-8, newline-joined tuple
`civic-capture-v1`, Source id, jurisdiction key, provider document id, PDF SHA256, with no trailing
newline. Same URL with changed PDF bytes creates another immutable revision; prior records and
links are untouched. Same source/document/bytes reuse the id. **Keep the original `capturedAt`,
file path and mapped metadata fixed on retry.** A new observation time or changed metadata for the
same bytes conflicts; it does not silently rewrite history or mint a revision. This namespace
does not globally deduplicate historical/manual record ids: inspect existing records before
registering old captures, and retain their ids for existing derivatives.

The caller validates all entries and the selected installed Kind before writing. Native strict
`new` is each document's expected-absent boundary. Complete native readback compares mapped fields
and the body normalized by public Core; extra human fields survive, mapped human edits conflict.
The physical local root and Source/Kind versions are checked around writes, without claiming an
OS capability or transaction across documents. Git/hosted homes refuse. A batch can partially
commit; errors retain actual outcomes and stop, including uncertain acknowledgements. Rerun the
same manifest with the real CLI to distinguish matching committed records from absent/conflicting
ones. No custom journal, automatic retry, overwrite, delete or sync is implemented.

Use the returned Record id and exact source/PDF metadata as the basis of the existing explicit
`prepare-text.v1` selection, then import that export as below. This caller does not run either step.
Discovery coverage stays unknown beyond the selected files; an omitted file never means deletion,
source freshness or an exhaustive archive. Browser-assisted selection is compatible with this
boundary, while lazy archive hydration remains outside the caller's capabilities.

## Local importer experiment

`import-prepared.mjs` is a separate caller/orchestrator, **not** a registered local operation,
source engine or new storage API. It imports at most ten `civic-prepared-text/v1` JSON exports
into an explicitly selected **local** research bundle, whose Civic Records recipe and exact
Civic Record revisions already exist. It neither installs/evolves recipes nor creates sources,
source records, findings or publication requests. Hosted and Git homes are refused. Local/private
labels are not an access-control mechanism; full minutes may contain personal details.

```sh
node examples/civic-records/import-prepared.mjs \
  --cli /explicit/installed/superbee \
  --bundle /absolute/private/research-bundle \
  --actor process:civic-import-pilot \
  --derived-at 2026-01-03T00:00:00.000Z \
  --prepared /absolute/private/prepared.json
# Inspect the read-only proposal, then repeat the exact selection with --apply.
```

Use the chosen record-derivation/materialization time, explicitly supplied as canonical UTC
milliseconds, for `derived-at`; it must remain fixed on retries, not become a new freshness
clock. It is caller metadata, not an assertion of converter execution or its missing timestamp. Tests qualify installed public CLI `0.4.4-pre.6`,
Core41; the operation's exact compatibility pin remains unchanged. The importer invokes an explicit
trusted CLI executable with argv, no shell. No hosted credential lookup or sync is requested.

Input is a bounded standalone export, not a native receipt or an authenticated extraction. It retains
`caller_asserted` association and `not_observed` converter execution. Matching the existing source
record's jurisdiction/provider key/PDF digest/URL/page count is required; it does not verify the
original PDF or independently validate the transcript. Base recipe0.4.0-pre.1 declares explicit `formatter_version`, `input_text_sha256`,
`extraction_association` and `extractor_execution` fields; importer projectionv2 requires those
declarations before preview/apply and writes them through native commands. `extraction_version`
remains a compatible legacy label. The caller label stays explicitly asserted in `extraction_note`.
Historical records and their provenance are not rewritten. Projectionv2 uses its own immutable
identity namespace: it never silently upgrades an existing import-v1 record. An old bundle must
inspect/apply its additive native recipe-evolve plan first; there is no install/evolution fallback.

The importer checks all inputs and target records before any write, then uses native strict
`new` as each document's atomic expected-absent boundary. A domain-specific framed identity includes
source Record id, PDF/text/Markdown digests and caller label. New input/output revisions get new ids;
same identity with different expected fields/body conflicts. This is a civic mapping, not a portable
Core canonicalization or general cache. Native readback supplies parsed fields and complete body;
no second frontmatter parser or equality normalizer is implemented. Supported output is already
newline-canonical; noncanonical bodies refuse rather than inventing a competing normalizer.

Unchanged means the target's native read matches every mapped authored field and exact body.
Extra human-owned fields and server stamps are preserved. An edited mapped field or body refuses;
there is no overwrite, rebase, delete or CAS update mode. Source/Kind versions are checked again
at the write boundary and source version after creation. The selected physical directory device/inode
is checked before each write boundary, refusing an observed same-path root replacement. This is
not an OS capability or an atomic directory transaction. Those checks do not create a transaction
across documents. Strict Kind validation still occurs inside the native create. A batch can make
partial progress; its receipt preserves actual outcomes and never claims batch atomicity.

If a create response is absent, malformed, timed out or refused, execution stops. After interruption,
rerun the same selection: target-native readback distinguishes matching already-created content
from a missing document or conflicting edit. No custom journal, request id or automatic write retry
is added. This recovery is appropriate only to local atomic create-only documents; it does **not**
qualify uncertain hosted writes. Hosted adoption must reuse the existing durable client journal or
checkout sync/receipt protocols and establish current admission and fresh remote confirmation.

## Base plus research extension

The base `recipes/civic-records` v0.4.0-pre.1 keeps the historical Source/Record/Text/Finding
Kinds and adds generic Civic Evidence for non-meeting sources. A webpage need not invent a meeting
date/session. Evidence distinguishes retained tool representations from original response bytes;
publication/event/meeting/observation/effective dates remain separate. The base retains legacy
Finding for compatibility; moving it to an editorial recipe would need an explicit ownership and
migration decision, not another authored copy.

`recipes/civic-research` v0.1.0-pre.1 owns three disjoint Kinds: Civic Matter, Civic Observation
and Civic Connection. Matters record identity basis and scope; observations separate source
assertions, interpretations and open questions; proposed connections preserve both endpoints and
unresolved enactment identity. No source adapter, AI execution or publishing authority is installed.
Document hyperlinks remain ordinary typed/body links; they do not become support between claims.
Use coarse dates such as a season in statement text and leave asserted_date absent until a real
calendar day is known. Kind enums check shape, not source truth, chronology or citation relevance.

The existing public `@superbee/core/recipe-set-preflight` contract accepts a finite caller-selected
base/add-on artifact set, consumer requirements and complete declared placement snapshots.
[`research-consumer.json`](research-consumer.json) declares this example reader's fields/links;
`scripts/civic-research-consumer.test.mjs` constructs both explicitly labeled proposed fixtures and
actual native installed snapshots using public Core codecs/lifecycle functions. It demonstrates:
missing-base and Kind-collision refusal; preserved human base customization; unknown external
consumers; no-op repeat install; native enum/date refusal; and explicit additive evolution.
It does not introduce an adapter parser or another compatibility engine.

There is no automatic dependency resolver or recipe inheritance: manifest requires/composes/seeds
keys are reserved and not applied. A preflight valid result covers only the declared structural
input and leaves external consumers unknown. Requirements cover declared fields/links, not
arbitrary enum/type predicates; unsupported operators stay partial. It grants no write, hosted
access or execution authority. Convention stamps identify the last writer; same-Kind additive
cross-recipe evolution can transfer a stamp, so they are not an ownership security lock. This
extension avoids that coupling rather than redeclaring base Kinds.

From a reviewed full checkout, validate both recipe directories, inspect the structural selection,
then install explicitly into your selected research bundle:

```sh
superbee recipe validate ./recipes/civic-records --json
superbee recipe validate ./recipes/civic-research --json
superbee recipe add ./recipes/civic-records --dir /explicit/private/research-bundle
superbee recipe add ./recipes/civic-research --dir /explicit/private/research-bundle
```

For an existing base, inspect `superbee recipe evolve ./recipes/civic-records --dir <bundle> --json`.
If it reports missing definitions, ordinary recipe add creates only missing assets and preserves
existing definitions, then re-plan evolve. Apply only the current returned token after inspecting
changes and affected instances. The prototype does not auto-apply upgrades. A customized base can
stay intact while the disjoint add-on installs; matching structural compatibility is still a separate
question and may correctly refuse on observed local adaptation.

Resident-facing use reuses the existing Civic Finding editorial/freshness fields plus the add-on's
handoff reference. Source adapters, research relationships and Here & Main contribution/review/release
remain distinct interfaces. No new editorial Kind or publication permission was invented for a demo.


## Explicit private hosted staging

`stage-hosted.mjs` is a separate **stage-only** civic caller, not a switch that removes the existing local callers' guards. It consumes the same finite capture manifests/prepared exports, an already-bound hosted checkout and an explicit expected host/workspace/bundle/principal. It uses native complete reads, current Kind validation and strict create-only writes; it never calls sync, publishes, adopts a folder, creates a grant or stores credentials. Native reads can refresh the working copy through its existing authenticated authority.

Use a reviewed full checkout and public Core41/CLI0.4.4-pre.10 with Node26.8.2 for this additional caller. A fresh full recipe skeleton can be built locally before approved native hosted publication. Existing bundles require explicit reviewed additive recipe evolution; this caller never upgrades their model. Recipe0.5.0-pre.1 preserves historical `local-private-research` values and adds `private-research` as intended audience only, not access control or a confidentiality guarantee.

```sh
node examples/civic-records/stage-hosted.mjs capture \
  --cli /explicit/trusted/superbee --bundle /absolute/bound/private-checkout \
  --expected-host https://selected-workspace.example \
  --expected-workspace EXACT_NATIVE_WORKSPACE --expected-bundle EXACT_NATIVE_BUNDLE \
  --expected-principal EXACT_NATIVE_PRINCIPAL --actor process:civic-hosted-import \
  --manifest /absolute/private/captures.json
# Inspect would-stage, then explicitly repeat the same selection with --apply.
node examples/civic-records/stage-hosted.mjs text \
  --cli /explicit/trusted/superbee --bundle /absolute/bound/private-checkout \
  --expected-host https://selected-workspace.example \
  --expected-workspace EXACT_NATIVE_WORKSPACE --expected-bundle EXACT_NATIVE_BUNDLE \
  --expected-principal EXACT_NATIVE_PRINCIPAL --actor process:civic-hosted-import \
  --derived-at 2026-01-03T00:00:00.000Z --prepared /absolute/private/prepared.json
```

Read the actual `bundle locate --dir <checkout> --json` receipt for exact expected values; an informational checkout marker is not authority. A wrong binding, local/Git/unbound copy, observed root replacement, missing or changed Source/Record/Kind, incomplete read or mapped human edit refuses. Explicitly selected inputs/paths/times stay fixed on repeat. Extra human fields are preserved. Capture uses the existing unchanged capture-v1 projection/ID; text uses `civic-texts/import-hosted-v1-` plus SHA256 of the newline-joined tuple `civic-hosted-import-v1`, RecordID, PDF/text/Markdown digests, extraction label, `private-research` (no trailing newline). The fixed derivation time is mapped content, not an automatic freshness clock. Input processing scope and caller_asserted/not_observed extraction provenance remain explicit; historical import-v2 derivatives are not rewritten or globally deduplicated.

Every result reports `hostedConfirmed:0` and `needsNativeSync:true`. `staged-local` means only native local acknowledgement/readback; `locally-matching` may be unsent and never proves a hosted no-op. A batch may leave partial local staging. An uncertain/refused acknowledgement stops without retry; use the native checkout's normal sync/outcome protocol before reconsidering work. Do not invent request identities, automatically resolve conflicts, accept deletes or take matching files as proof of remote commit.

The operator—not this caller—first settles any existing native sync outcomes, then stages, invokes ordinary native sync and checks its complete genuine terminal v2 rows/counts. Conflict/held/refused/unknown/paused outcomes remain unresolved; a zero native exit without the expected terminal evidence is insufficient. Independently reacquire the same hosted bundle into a new native checkout and compare authored content and versions. Never copy/move/adopt bound folders to manufacture fresh readback. Only that joined evidence can report confirmed hosted content. Repeats need zero new stages/commits and stable independently observed versions.

PDF/blob custody is separate: a capture's local evidence_path is deliberately not rewritten. Use existing native ordinary-file promote and fresh blob readback, then retain a private manifest linking RecordID/blob key/SHA256. Recipe installation, stage output or private audience labels do not prove raw evidence is durably retrievable or grant publication. This caller is not a scheduler, managed hosted plugin admission, converter or Here & Main publisher. Synthetic hosted-selection doubles qualify caller behavior only; root-owned actual native receipts remain necessary for any live claim.

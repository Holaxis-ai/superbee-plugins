# Civic records packaging/use experiments

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
original PDF or independently validate the transcript. Formatter identity occupies `extraction_version`;
`extraction_note` explicitly carries the caller label, supplied-text digest and absent execution
observation. Existing historical texts and Kind definitions are not rewritten or reinterpreted.
This exposes a model limitation to revisit before a broader importer: formatter and actual extractor
identities deserve distinct explicit fields, not implicit upgrades of old provenance.

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

# Captured listing discovery and native PDF extraction

These explicit local capabilities are reusable across municipalities. They do not fetch URLs,
schedule work, write bundle records or publish. A caller supplies captured bytes through native
resource admission; the trusted host still owns transport policy, tool identity, credentials,
resource capture, invocation limits and output export. Recipe installation remains inert.

Build the reviewed integration with the root README's ordinary dependencies. The build bundles
its pinned parse5 HTML parser, so standalone registration needs only `package.json` and
`dist/operation.mjs`; no sibling checkout or runtime npm installation is required. Register the
new exact code digest through `superbee op register ... --local`. Existing accepted snapshots
remain unchanged; explicitly register and bind the new version to use these capabilities.

Core helper remains `0.2.0-pre.41`. PDF extraction is qualified with public CLI `0.4.4-pre.11`.
Its tool binder supports explicit `-v` plus `stderr` version selection; old CLI releases that lack
that selection must refuse, rather than fall back to an unbound executable. The original
`local.civic.prepare-text.v1` remains compatible with its earlier supported CLI.

## Discover candidates from captured HTML

Operation: `local.civic.discover-pdfs.v1`. Bind exactly `listing` and `basis`, with `tools:{}`.
The listing is captured UTF-8 HTML, at most 1MiB. The basis is a captured JSON file:

```json
{"v":1,"registryUrl":"https://ecode360.com/ZZ0001/documents/Minutes",
 "documentPathPrefix":"/ZZ0001/document/","maxDocuments":10}
```

This synthetic example illustrates the eCode360 path convention; neither that provider nor a
municipality is hardcoded. Another source selects its own HTTPS origin and document directory.
Only actual anchor hrefs to PDFs under that origin/directory become candidates. HTML base tags
cannot change scope. Script/comment/template strings are not links. Candidate query strings,
fragments, credential-bearing URLs and cross-origin document links refuse. Labels are raw listing
labels, never inferred meeting dates, approvals or authenticated document titles.

Use the native bind preview, inspect its captured hashes, then explicitly accept its digest.
Execute with `{"expectedInputs":{...},"settings":{}}` and export role `discovery` through the
existing `--export-output discovery=/ordinary/absent/discovery.json` mechanism.

The result names the listing SHA256, exact candidate URLs, observed count and truncation flag.
URLs are sorted and deduplicated deterministically. `maxDocuments` is 1–100. Coverage always stays
`selected-only-unknown-tail`: an empty initial page may be a JS/loading shell, not an empty archive.
No disappearance/removal, complete year coverage, network observation or official authenticity is
inferred. The caller's admitted transport decides whether/how to acquire a selected PDF; this
plugin never enumerates numeric IDs or invents unobserved links.

## Extract an explicitly captured PDF

Operation: `local.civic.extract-pdf.v1`. Bind exactly `pdf` and `basis`. The PDF is at most 8MiB.
The extraction basis contains caller assertions only:

```json
{"v":1,"jurisdictionKey":"synthetic-town","documentId":"123",
 "recordId":"civic-records/synthetic-123",
 "sourceUrl":"https://ecode360.com/ZZ0001/document/123.pdf"}
```

Explicitly bind a provisioned native Poppler executable through the public tool contract:

```json
{"resources":{"pdf":{"path":"/absolute/captured.pdf","logicalRef":"selected/pdf"},
 "basis":{"path":"/absolute/basis.json","logicalRef":"selected/basis"}},
 "tools":{"pdftotext":{"path":"/absolute/native/pdftotext",
 "versionFlag":"-v","versionChannel":"stderr"}},
 "outputRoot":"/absolute/ordinary/output","profile":"synthetic-v1"}
```

Inspect and accept registration/binding previews; run with exact `expectedInputs` and empty
settings. The plugin calls only the bound handle with fixed `-layout -enc UTF-8` arguments. It
never spawns a process directly or accepts caller argv/executable paths. Native admission owns
executable hash/version checks and runtime limits. Tool failure, diagnostics, changed inputs,
malformed UTF-8, over 256KiB text, over 250 pages or a page below 40 non-whitespace characters
refuse. Scanned/low-text material requires separate review/OCR; there is no automatic fallback.
A valid text extraction is not visual transcription verification.

Export the single JSON role `extraction` using native output export. It includes the complete
UTF-8 `text` with Poppler layout and page delimiters, original/text digests, page count, actual
native invocation ID and `observed_native_tool_call`. Retain the native invocation manifest too:
it contains the admitted executable hash/version. Plugin JSON alone does not authenticate a tool,
source publisher or author. A successful extraction records what ran, not an approved interpretation.

## Compose with the existing importer

Native output export currently accepts exactly one JSON role per invocation; it does not export
`text/plain`. The raw `text` role remains part of the validated invocation manifest. A caller can
materialize the exported JSON's `text` as UTF-8 and verify its `textSha256` before using it.

The exported text can feed the existing captured-text formatter and finite create-only importer;
no second writer or sync journal is introduced. Keep the extraction JSON and native manifest as
separate execution evidence. Existing `civic-prepared-text/v1` deliberately does not authenticate
that evidence: its PDF/text relationship remains `caller_asserted`, and its converter field remains
`not_observed` by that formatter. Do not silently upgrade old Civic Text records, rewrite their
provenance or pass an extraction JSON to an importer expecting the prepared-text contract. A future
admitted observed-provenance projection requires an explicit recipe/import contract extension.

H&M's source selection, cadence, Signal mapping, editorial decisions and public publishing stay
outside the plugin. A host workflow can invoke these capabilities after its own transport and
machine-access admission; installing this source does not enable managed execution. Hosted sync
and independent readback remain separate from local staging. npm publication remains disabled.

## eCode360 public document-list projection

Some official eCode360 pages populate documents after loading: the initial HTML can contain
categories without PDF anchors. `local.civic.discover-ecode360.v1` handles the captured structured
response used by that official UI. It does not fetch an API, claim a sanctioned bulk service or
invent document IDs. The caller must first observe the exact request and obey its admitted
transport/robots policy. A refused page/API cannot be retried through a different reader.

Bind `listing` (captured JSON, at most 4MiB/10000 rows) and `basis`, with no tools:

```json
{"v":1,"registryUrl":"https://ecode360.com/ZZ0001/documents/Minutes",
 "listingUrl":"https://ecode360.com/api/ZZ0001/pub-doc/type/12",
 "jurisdictionCode":"ZZ0001","typeTitle":"Minutes","typeId":12,
 "categoryId":34,"year":2030,"maxDocuments":2}
```

These are synthetic instance values. Another municipality and document type supply their own
observed identifiers/title; the recipe has no Fairport defaults. The captured type/customer and
selected category must match. Only explicit public, uncorrupted `DOCUMENT` records with original
and served PDF extensions, no external URL, and a valid provider date in the selected year (date role remains unknown)
are projected. Private/unknown visibility, undated records, other formats and linked external files
are deliberately excluded. No approval, creator identity, contacts or document interpretation is
projected. Category/type titles and dates remain provider metadata, not independent verification.

Candidates use only IDs actually present in the captured response and the observed provider PDF
URL form. They are ordered by date (newest first) with a stable ID tie-break, deduplicated, and
bounded to 1–100. Inconsistent duplicates refuse. Export the checked JSON role `discovery` through
the native command. Coverage stays `selected-only-unknown-tail`, including empty results; response
counts/filter options are not an archive completeness or deletion guarantee. Native source/resource
identity and separate host HTTP receipts remain necessary; projected JSON is not authentication.

## Prepare undated Civic Evidence

`local.civic.prepare-evidence.v1` is a separate captured-input operation for sources whose meeting
date is not established. It uses the existing `Civic Evidence` Kind; it does not loosen Civic
Record/Civic Text requirements or migrate old records. Bind `pdf`, `text` and `basis`, no tools:

```json
{"v":1,"jurisdictionKey":"synthetic-town","documentId":"123",
 "sourceId":"civic-sources/synthetic-council","sourceUrl":"https://example.org/123.pdf",
 "title":"Synthetic supplied source","documentKind":"other",
 "pdfSha256":"<64 lowercase hex>","textSha256":"<64 lowercase hex>","expectedPages":1}
```

The supplied PDF/text association is a caller assertion. This formatter observes no converter,
HTTP fetch, approval or date. Keep actual native extraction/HTTP receipts separately. Meeting dates
and claimed execution proof are not accepted settings. The shared page formatter preserves full
source wording and escapes literal fences; scanned/short/partial/malformed text and oversized
representations refuse without OCR or truncation. Existing dated formatter-v1 output remains
byte-equal; the separate Evidence format has its own identity.

Export JSON role `evidence`. It proposes original-byte metadata and complete page-linked Markdown,
with stable source/provider/original/representation identities. No clock, local path, invocation or
human interpretation is part of those identities. It makes no record/blob writes. A prepared link
to a retained original becomes valid only after the caller's admitted native custody step below.

## Stage undated evidence after native original custody

Undated staging requires public CLI `0.4.4-pre.11` for actual stored-MIME readback; earlier
clients must refuse. The full reviewed Git checkout supplies `examples/civic-records/stage-evidence.mjs`, reusing public
Core Kind validation and native CLI only. Its admitted target is one explicit original bound hosted
checkout. The caller first retains the original at the prepared `evidence/source-bytes/<sha256>.pdf` key
with ordinary native `promote`, and records its actual acknowledgement. Hosted promotion requires
the original file at that canonical checkout path; never move/copy/adopt the checkout binding.
The stager itself does not retain bytes, sync or publish, and does not create a journal or retry.

```sh
node examples/civic-records/stage-evidence.mjs \
  --cli /absolute/provisioned/superbee --bundle /absolute/bound/research \
  --expected-host https://workspace.example --expected-workspace synthetic-workspace \
  --expected-bundle synthetic-research --expected-principal person:synthetic \
  --actor process:civic-example --prepared /absolute/export/evidence.json \
  --observed-at 2030-01-02T00:00:00.000Z --expected-blob-version 'sha256:<original-sha256>'
```

These synthetic scope values are not grants. Inspect the preview, then append `--apply` for local
create-only staging. The stager verifies actual host blob bytes, stored PDF MIME and the exact
native version through `pull --from-host`; local filename MIME is insufficient. An unknown or
refused host read stops. Source/Kind versions and physical checkout identity are checked around
writes. There is no exactly-once or transaction guarantee across the blob and documents.

Known genuine Record/Text originals must be reused in their dated lane. The original tuple
(jurisdiction/provider document/URL/PDF digest) is the reuse guard; renaming or removing a helper
link in a human-edited Record body does not make that original eligible for duplicate Evidence. An existing differently
named Evidence representation for the same source/original requires reuse or owning disposition,
not silent duplicate creation. The bounded current snapshot lookup refuses above 200 known heads
per relevant Kind; it is not an exhaustive history/tombstone or concurrent-writer guarantee.
Existing semantic matches preserve the first valid observation and native version; other mapped
metadata/body edits conflict. New-create acknowledgements and complete readback stay exact for
every field. Partial/uncertain outcomes stop and remain unconfirmed, with no automatic retry.

Normal native sync and independent complete fresh research/blob readback still precede any Signal
claiming retained research. Machine authentication, scope, current serving, sync/recovery and quota
qualification are separate from local consumer doubles. Private labels and JSON hashes are not
ACLs or authentication. H&M must use a distinct explicit Evidence-to-Signal adapter and the reviewed
same-run handoff; never disguise Evidence as a Civic Record or weaken attended principal checks.

The original-byte key follows the existing pilot custody convention, shared across sources.
Existing originals keep their keys and bytes; this extension does not introduce a second blob
namespace or migrate historical files.

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
and served PDF extensions, no external URL, and a valid declared meeting date in the selected year
are projected. Private/unknown visibility, undated records, other formats and linked external files
are deliberately excluded. No approval, creator identity, contacts or document interpretation is
projected. Category/type titles and dates remain provider metadata, not independent verification.

Candidates use only IDs actually present in the captured response and the observed provider PDF
URL form. They are ordered by date (newest first) with a stable ID tie-break, deduplicated, and
bounded to 1–100. Inconsistent duplicates refuse. Export the checked JSON role `discovery` through
the native command. Coverage stays `selected-only-unknown-tail`, including empty results; response
counts/filter options are not an archive completeness or deletion guarantee. Native source/resource
identity and separate host HTTP receipts remain necessary; projected JSON is not authentication.

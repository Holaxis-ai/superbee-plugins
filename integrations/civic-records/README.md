# Civic records: experimental captured-text plugin

Status: explicit captured-input processing, not an admitted eCode360 crawler or public publisher.
[Captured listing discovery and native PDF extraction](CAPTURE.md) add two separately bound local
capabilities. The existing supplied-text operation below retains its original contract. The canonical
[`Civic Records` recipe](../../recipes/civic-records) is source-neutral and municipality-neutral.
The local operation `local.civic.prepare-text.v1` prepares page-linked Markdown from a deliberately
selected PDF, its supplied extracted text, and a closed association basis. It creates no records,
fetches no provider, executes no converter and makes no approval or official-authenticity claim.

This is an actual native local-operation package, not a `SourceProfile` disguised as one. The
source engine observes and overlays deliberately linked targets; it is not a full-document mirror
or record creator. Keep Core's parser, snapshot admission, transport, credentials and reconciliation
out of this repository's adapter. Source discovery/conversion remain separate work. A separate [local importer experiment](../../examples/civic-records/README.md#local-importer-experiment) now projects prepared exports through native create-only commands; the registered operation itself still performs no bundle writes.

## Compatibility and acquisition

Public Core helper `0.2.0-pre.41`; executable CLI `0.4.4-pre.6`, source
`688d62a2e1395a6ca7dde52f08e0caf97b643d60`; Node `26.8.2` for the repository toolchain.
Acquire a reviewed full Git commit, perform the root README's ordinary dependency setup, then:

```sh
npm run build --workspace integrations/civic-records
npm run typecheck --workspace integrations/civic-records
npm test --workspace integrations/civic-records
superbee recipe validate ./recipes/civic-records --json
superbee recipe add ./recipes/civic-records --dir /explicit/research-bundle
superbee op register /absolute/reviewed/integrations/civic-records --local --dir /explicit/research-bundle
```

Recipe installation is inert. Operation registration previews a digest; inspect its exact code
and effects before explicitly accepting that digest. The operation package is standalone after
build: `package.json` plus `dist/operation.mjs` suffice for native registration. The recipe remains
canonical at repository root, installed separately from that reviewed checkout; local-operation
registration does not add source-plugin recipe aliases. Code is trusted with ambient process
authority, not an OS sandbox. Nothing is globally enabled by this contribution. npm publication is
blocked; maintainers own merge/release and any managed admission.

## Closed inputs and effects

Bind exactly three finite resource roles: `pdf`, `text`, `basis`; no tools (`tools:{}`). Select an
existing ordinary outputRoot outside the bundle/private state and profile `synthetic-v1`. Native
host bounds are 16MiB aggregate input, 32MiB outputs and 30 seconds; adapter bounds are 8MiB PDF,
256KiB UTF-8 text and 16KiB basis. Native captured-resource hashes and the basis's PDF/text hashes
must agree. Symbols/hardlinks, malformed UTF-8, extra fields, wrong page count and low-text pages
refuse. The adapter checks a PDF magic prefix, not its complete structure or rendered content.

The basis contains exactly:

```json
{"v":1,"jurisdictionKey":"synthetic-municipality","documentId":"minutes-01",
 "recordId":"civic-records/synthetic-minutes-01","sourceUrl":"https://example.org/records/01.pdf",
 "pdfSha256":"<64 lowercase hex>","textSha256":"<64 lowercase hex>",
 "expectedPages":2,"extractionLabel":"caller-supplied layout text"}
```

The PDF/text association and extraction label are explicitly **caller assertions**. Hashes prove
which bytes were supplied, not that the text was extracted from that PDF or that a converter ran.
Output says `extractionAssociation:caller_asserted` and `extractorExecution:not_observed`.
Scanned words, drawings/signatures and OCR completeness are not established by page-count checks.

Bind with `superbee op bind local.civic.prepare-text.v1 --local --resources-file <json> --dir <bundle>`;
inspect/accept its exact digest. Execute with
`{"expectedInputs":{<native preview hashes>},"settings":{}}`. Use
`--export-output prepared=/ordinary/absent/prepared.json` to export exactly the checked JSON role.
The result includes deterministic Markdown, source/body hashes, page count, original URL and
local/private scope. The same captured inputs produce byte-equal application output, while native
execution evidence remains a separate invocation. No clock-based freshness or AI insight is added.

The adapter preserves source wording, qualifiers and table alignment in escaped-length text fences.
It does not interpret votes, invent project entities, redact personal data, infer approval or write
back into the bundle. Full source text may contain personal information: use private research,
then review relevant excerpts separately for any publication. Normal editorial/release controls
remain with the publisher.

## Experiment through use

Start with a synthetic install/registration/bind/export consumer, then deliberately captured real
local records whose data never enters this public repository. Search for something absent from an
initial summary; compare page-level text and rendered originals. Track failures and effort, not
just document counts. See [the experiment plan](../../examples/civic-records/README.md).

Poppler's explicit `-v`/stderr binding is now supported by the public CLI and exercised by the
new extraction capability. See [CAPTURE.md](CAPTURE.md) for finite inputs, native execution evidence,
refusals and composition with the existing formatter/importer. Provider fetching and managed
execution still require the caller's existing transport and authority.

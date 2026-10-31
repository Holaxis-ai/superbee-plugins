---
type: "Reference"
title: "Deterministic complete minutes prototype"
---
# Deterministic complete minutes prototype

The Civic Text layer extends Source -> Record -> Finding with a separate complete-text derivative. A record identifies official evidence and approval context; its text derivative preserves all extractable content. Findings cite that evidence and remain separate.

The local prototype consumes a recorded capture manifest and original PDF files. It does not crawl, fetch providers, grant source access, run OCR or create a schedule. It checks source scope, exact URLs, PDF byte hashes, declared page counts, extraction software version and full native reads before using the result. Original PDFs remain archived evidence outside the bundle. A future online acquisition adapter remains separate work.

Use pdftotext -layout. Keep original page order, page anchors and every extracted character except normalized line endings; Markdown text fences retain columns rather than guessing tables. Retain source typos and watermarks. This is complete extracted text, not a promise to capture drawings, signatures or scanned image-only words. Empty/low-text pages, replacement characters and extraction failures refuse before new bundle writes, requiring visual review/OCR.

Identity includes exact source record id and extraction-version digest. Same source bytes/version/body is a native no-op: no conversion, new text record or refresh of its derived_at. A changed source needs its own Civic Record revision first; a changed extractor creates a new derivative. Existing generated text with unexpected body/hash is refused, never overwritten. Partial multi-document success remains visible in native records; retry joins exact identities.

Native CLI strict create-only writes and version-bound complete reads are the storage interface. Every derivative links its record and source. Existing record approval fields and AI insights are untouched. Tests distinguish byte-change revisions, duplicate no-ops, tampering, source mismatch, large-body reads and full-text queries that were not in the curated insights.

Full minutes include public commenters and sometimes home addresses. Unlike the earlier curated-only index, full-text local search includes those original words. Keep this research bundle and its search database local/private; do not automatically export this layer to a public guide. Query receipts expose only excerpts needed for a question. No claim of personal-data redaction is made for complete source text.

## Packaged experiment boundary

The repository's integrations/civic-records local operation is narrower than the original external PDF-conversion prototype: it consumes captured PDF + supplied extracted text + basis and exports prepared Markdown as JSON. No converter execution, document discovery, bundle mutation, search or automatic insight extraction happens inside this plugin. PDF/text association is caller_asserted and extractor execution is not_observed. This is deliberately weaker provenance than a separately observed conversion. See the integration README and synthetic consumer experiment; do not infer one from the other.


## Explicit hosted staging

The base recipe0.5.0-pre.1 adds private-research as intended audience metadata, not an ACL, grant or confidentiality proof. Preserve historical local-private-research values unchanged. The supplied-text operation still emits its local-private-research processing contract, caller_asserted association and not_observed converter execution.

The separate civic hosted staging caller maps an explicitly selected prepared export into the private-research audience under a distinct import-hosted-v1 immutable identity. It stages through native strict create/read verbs in an already-bound selected checkout; local matching or staging is never remote commitment. The operator uses ordinary native sync/original-outcome reconciliation and independent fresh hosted readback. Existing local callers retain local-only guards and IDs.

Original PDF evidence custody is a separate native ordinary-file promotion/readback step. A captured Record's evidence_path remains its original local pointer, not proof another host reader can retrieve it. Retain a private manifest linking RecordID, blob key and exact digest only after real native blob confirmation. Do not silently rewrite a capture-v1 record's mapped fields to claim custody.

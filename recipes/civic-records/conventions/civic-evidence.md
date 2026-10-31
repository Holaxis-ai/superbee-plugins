---
type: "Convention"
title: "Civic Evidence"
governs: "Civic Evidence"
path: "civic-evidence/"
description: "A retained representation or bounded observation of a civic source that need not have a meeting date."
fields: {"required": ["title", "jurisdiction_key", "source_url", "document_kind", "observed_at", "capture_status", "capture_format", "capture_note"], "optional": ["publisher_name", "document_date", "representation_sha256", "original_content_sha256", "media_type", "evidence_path"], "values": {"document_kind": ["minutes", "agenda", "resolution", "budget", "plan", "presentation", "project-page", "news", "code-history", "transcript", "other"], "capture_status": ["captured", "partial", "metadata-only", "unavailable"], "capture_format": ["provider-bytes", "tool-rendered-text", "metadata-only"]}, "types": {"source_url": "https-url", "observed_at": "datetime", "document_date": "date"}, "descriptions": {"observed_at": "When this bounded representation was observed, never an adoption, effective or meeting date.", "capture_note": "State actual representation scope, omissions and access failures. Tool-rendered text is not original provider bytes; missing or oversized reads do not establish missing documents.", "representation_sha256": "Exact retained representation digest. A multi-source tool snapshot needs a source-specific locator; this is not necessarily the original page/PDF digest.", "original_content_sha256": "Set only for actually captured original response bytes. Omit when unknown; do not substitute a rendered-text digest.", "document_date": "Explicit source document/publication date only; leave unknown dates absent. Assertion/event dates belong to observations."}}
links: {"from source": "Civic Source"}
---
# Civic Evidence

A source representation is evidence for what was inspected. Official source status, complete capture, faithful interpretation and publication authority remain separate claims. Existing dated minutes keep their Civic Record identity; do not duplicate them just to satisfy an extension.

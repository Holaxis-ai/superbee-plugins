---
type: "Convention"
title: "Civic Text"
governs: "Civic Text"
path: "civic-texts/"
description: "Complete deterministic Markdown extracted from one exact official PDF revision; local/private research evidence, separate from interpretation."
fields: {"required": ["title", "jurisdiction_key", "source_record_id", "source_url", "source_content_sha256", "extraction_version", "text_sha256", "page_count", "derived_at", "access_scope"], "optional": ["extraction_note"], "values": {"access_scope": ["local-private-research"]}, "types": {"source_url": "https-url", "page_count": "integer", "derived_at": "datetime"}, "descriptions": {"source_content_sha256": "Exact original PDF digest; source bytes changing creates a new revision, never overwrites prior text.", "extraction_version": "Extractor binary/version and formatting contract. Formatting changes create a distinct derivative.", "text_sha256": "SHA256 of the exact complete Markdown body, including page anchors and evidence links.", "access_scope": "Full official minutes can contain personal details. This derivative is for local/private research; publication requires separate relevant excerpts and review."}}
links: {"extracted from": "Civic Record", "from source": "Civic Source"}
---
# Civic Text

Preserve every page of the extraction. Layout-preserving fenced text is deliberate Markdown: it retains tables and qualifiers without inventing structure. No AI cleanup or inferred facts. See the deterministic text reference.

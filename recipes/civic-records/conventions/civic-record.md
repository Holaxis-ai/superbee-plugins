---
type: "Convention"
title: "Civic Record"
governs: "Civic Record"
path: "civic-records/"
description: "An immutable observed revision of an official civic document, retaining independent dates and source provenance."
fields: {"required": ["title", "jurisdiction_key", "body_name", "meeting_date", "record_kind", "session_kind", "provider_document_id", "source_url", "content_sha256", "observed_at", "approval_status", "extraction_status", "page_count"], "optional": ["source_label", "provider_secondary_date_raw", "approval_date", "meeting_key", "evidence_path", "source_status_note"], "values": {"record_kind": ["minutes", "agenda", "resolution", "notice", "transcript", "other"], "session_kind": ["regular", "work-session", "special", "unknown"], "approval_status": ["unknown", "draft", "approved", "superseded"], "extraction_status": ["text-extracted", "ocr-needs-review", "failed"]}, "types": {"meeting_date": "date", "source_url": "https-url", "observed_at": "datetime", "approval_date": "date", "page_count": "integer"}, "descriptions": {"approval_status": "Published minutes are not automatically approved. Require explicit approval evidence, preserve draft markings and link the approving record.", "content_sha256": "SHA256 of original response bytes, lowercase hex. Same URL with new bytes is a new revision; never overwrite an old revision.", "provider_secondary_date_raw": "Preserve an unlabeled listing date without asserting posted, modified or approved semantics.", "meeting_date": "Date the body met, distinct from listing date, capture time, approval date and effective date."}}
links: {"from source": "Civic Source", "supersedes": "Civic Record", "approval evidence": "Civic Record"}
---
# Civic Record

Use the fields and relationship descriptions at write time. Source capture and editorial handoff follow the installed references. Schema validation checks shape; citation correctness, evidence quality and publication authority still need review.

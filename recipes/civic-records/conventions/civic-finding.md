---
type: "Convention"
title: "Civic Finding"
governs: "Civic Finding"
path: "civic-findings/"
description: "An unpublished, evidence-linked action or issue and its potential usefulness to residents."
fields: {"required": ["title", "jurisdiction_key", "action_date", "action_status", "topic", "evidence_page", "evidence_locator", "editorial_status", "freshness_status", "resident_relevance", "verification_needed"], "optional": ["condition", "expires_on", "target_kind", "suggested_stage", "source_url"], "values": {"action_status": ["discussed", "proposed", "approved", "conditionally-approved", "adopted", "reported", "completed", "unclear"], "editorial_status": ["research-lead", "needs-verification", "ready-for-editor", "rejected", "handed-off"], "freshness_status": ["historical", "current-verified", "expired", "unknown"]}, "types": {"action_date": "date", "evidence_page": "integer", "expires_on": "date", "source_url": "https-url"}, "descriptions": {"action_status": "Describe only what the cited passage establishes; discussion is not adoption, budget approval is not completion.", "editorial_status": "Research workflow only. Even ready-for-editor or handed-off does not authorize or attest publication.", "verification_needed": "Specific missing evidence or newer decisions to check before a useful public update; unknown must stay explicit.", "resident_relevance": "Why someone living in or visiting this jurisdiction might care. Omit private commenters and home addresses.", "suggested_stage": "Optional publisher-specific mapping hint, never a source fact or automatic promotion rule."}}
links: {"supported by": "Civic Record", "supersedes": "Civic Finding"}
---
# Civic Finding

Use the fields and relationship descriptions at write time. Source capture and editorial handoff follow the installed references. Schema validation checks shape; citation correctness, evidence quality and publication authority still need review.

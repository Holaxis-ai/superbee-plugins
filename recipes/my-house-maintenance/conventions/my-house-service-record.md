---
type: "Convention"
title: "My House Service Record"
governs: "My House Service Record"
path: "my-house/services/"
description: "A reported occurrence of work, not merely a checked Task or desired outcome."
links: {"home": "My House Home", "space": "My House Space", "asset": "My House Asset", "plan": "My House Maintenance Plan", "corrects": "My House Service Record", "performed at home": "My House Home", "performed in space": "My House Space"}
link_descriptions: {"home": "One primary subject; must match linked Plan before a qualifying conclusion.", "space": "One primary subject; must match linked Plan before a qualifying conclusion.", "asset": "One primary subject; must match linked Plan before a qualifying conclusion.", "plan": "Zero-or-one Plan. Subject agreement and procedure satisfaction are consumer checks.", "corrects": "Corrected assessment of the same occurrence, not a new completion; branches/cycles remain unresolved.", "performed at home": "Historical occurrence location captured from evidence, not later Asset placement.", "performed in space": "Historical occurrence location; at most one across both occurrence-location labels is a domain rule."}
fields: {"required": ["title"], "optional": ["work_performed", "occurred_on", "occurred_at", "occurrence_note", "result", "plan_result", "reported_by", "basis", "source_event_key"], "types": {"occurred_on": "date", "occurred_at": "datetime"}, "values": {"result": ["completed", "partial", "failed", "not_performed", "unknown"], "plan_result": ["satisfied", "partial", "not_satisfied", "unknown"], "basis": ["reported", "observed", "imported", "unknown"]}, "descriptions": {"title": "What was actually reported; never invent completion from Task state.", "work_performed": "Actual work; nonempty text needed before deriving a qualifying-completion conclusion.", "occurred_on": "Date-only occurrence when known. At most one of occurred_on/occurred_at is a domain rule.", "occurred_at": "Occurrence instant with explicit offset when known, not upload time.", "occurrence_note": "Preserve uncertainty; missing dates cannot establish a dated latest completion.", "result": "Completed work is distinct from satisfying the linked Plan procedure.", "plan_result": "Explicit relation to the linked Plan procedure; inspection does not automatically satisfy replacement.", "reported_by": "Reported actor/source, not authenticated approval.", "basis": "Occurrence provenance summary, not proof every value or physical outcome is verified.", "source_event_key": "Stable provider-scoped key when supplied; not a title/date-generated deduplication key."}}
---
# My House Service Record

Read the [operating contract](../references/my-house-maintenance-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

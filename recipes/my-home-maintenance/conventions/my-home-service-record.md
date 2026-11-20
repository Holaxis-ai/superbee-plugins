---
type: "Convention"
title: "My Home Service Record"
governs: "My Home Service Record"
path: "my-home/services/"
description: "Work that was actually done on the home, a room or a thing, such as a repair, an inspection or a service visit; one per visit or job. Upkeep still to do is a Maintenance Plan; what it cost is a Money Record."
links: {"home": "My Home Home", "space": "My Home Space", "asset": "My Home Asset", "plan": "My Home Maintenance Plan", "corrects": "My Home Service Record", "performed at home": "My Home Home", "performed in space": "My Home Space"}
link_descriptions: {"home": "One primary subject; must match linked Plan before a qualifying conclusion.", "space": "One primary subject; must match linked Plan before a qualifying conclusion.", "asset": "One primary subject; must match linked Plan before a qualifying conclusion.", "plan": "Zero-or-one Plan. Subject agreement and procedure satisfaction are consumer checks.", "corrects": "Corrected assessment of the same occurrence, not a new completion; document correction_reason. Branches/cycles or conflicting known source event keys remain unresolved.", "performed at home": "Historical occurrence location captured from evidence, not later Asset placement.", "performed in space": "Historical occurrence location; at most one across both occurrence-location labels is a domain rule."}
fields: {"required": ["title"], "optional": ["work_performed", "occurred_on", "occurred_at", "occurrence_note", "result", "plan_result", "reported_by", "basis", "source_event_key", "correction_reason"], "types": {"occurred_on": "date", "occurred_at": "datetime"}, "values": {"result": ["completed", "partial", "failed", "not_performed", "unknown"], "plan_result": ["satisfied", "partial", "not_satisfied", "unknown"], "basis": ["reported", "observed", "imported", "unknown"]}, "descriptions": {"title": "What was done, as reported.", "work_performed": "The work done.", "occurred_on": "Date done, if known; this or occurred_at, not both.", "occurred_at": "Time done, with offset, if known; not upload time.", "occurrence_note": "What is uncertain about when or how.", "result": "How the work turned out; separate from plan_result.", "plan_result": "Whether it did what the linked Plan calls for.", "reported_by": "Who reported it; not an approval.", "basis": "How the facts were learned, overall.", "source_event_key": "The source's own id for this visit, if given.", "correction_reason": "Why this corrects an earlier record of the same visit."}}
---
# My Home Service Record

Read the [operating contract](../references/my-home-maintenance-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

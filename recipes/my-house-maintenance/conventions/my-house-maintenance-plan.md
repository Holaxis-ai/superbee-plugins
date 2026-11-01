---
type: "Convention"
title: "My House Maintenance Plan"
governs: "My House Maintenance Plan"
path: "my-house/maintenance/"
description: "An intended procedure and explicitly recorded next date, distinct from actual work."
links: {"home": "My House Home", "space": "My House Space", "asset": "My House Asset"}
link_descriptions: {"home": "Exactly one primary subject across home/space/asset is a domain eligibility rule.", "space": "Exactly one primary subject across home/space/asset is a domain eligibility rule.", "asset": "Exactly one primary subject across home/space/asset is a domain eligibility rule."}
fields: {"required": ["title"], "optional": ["procedure", "plan_status", "schedule_mode", "next_due_on", "schedule_timezone", "schedule_basis", "schedule_text", "override_due_on", "override_basis"], "types": {"next_due_on": "date", "override_due_on": "date"}, "values": {"plan_status": ["enabled", "paused", "retired", "unknown"], "schedule_mode": ["manual_date", "calendar", "after_service", "usage", "condition", "compound", "unknown"]}, "descriptions": {"title": "Procedure name; no service or schedule execution happens on creation.", "procedure": "Intended work. Required for a qualifying-completion conclusion; changing its meaning creates a new Plan.", "plan_status": "Missing/unknown is not enabled. This is coordination state, not evidence of maintenance.", "schedule_mode": "First-slice reader supports manual_date display only; preserve unsupported criteria without computing them.", "next_due_on": "Explicitly recorded date; no service-relative advance or clock-time implication.", "schedule_timezone": "IANA timezone needed before classifying today/past/future; otherwise display the date without that classification.", "schedule_basis": "Source recommendation or owner-selected date and limits; missing basis stays unspecified.", "schedule_text": "Preserve compound/calendar/usage wording and source without treating it as executed logic.", "override_due_on": "Use only with nonempty override_basis. An incomplete supplied override is unresolved, never silent fallback.", "override_basis": "Reason for this manual override; require the paired date before displaying an effective override."}}
---
# My House Maintenance Plan

Read the [operating contract](../references/my-house-maintenance-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

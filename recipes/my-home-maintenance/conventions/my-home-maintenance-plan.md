---
type: "Convention"
title: "Maintenance Plan"
governs: "My Home Maintenance Plan"
path: "my-home/maintenance/"
description: "Upkeep intended for a home, once or repeatedly, such as servicing the furnace each fall, and when it is next due; make one only for upkeep someone wants to keep up with. Work already done is a Service Record; a job to track costs for is a Project."
links: {"home": "My Home Home", "space": "My Home Space", "asset": "My Home Asset"}
link_descriptions: {"home": "Exactly one primary subject across home/space/asset is a domain eligibility rule.", "space": "Exactly one primary subject across home/space/asset is a domain eligibility rule.", "asset": "Exactly one primary subject across home/space/asset is a domain eligibility rule."}
fields: {"required": ["title"], "optional": ["procedure", "plan_status", "schedule_mode", "next_due_on", "schedule_timezone", "schedule_basis", "schedule_text", "override_due_on", "override_basis"], "types": {"next_due_on": "date", "override_due_on": "date"}, "values": {"plan_status": ["enabled", "paused", "retired", "unknown"], "schedule_mode": ["manual_date", "calendar", "after_service", "usage", "condition", "compound", "unknown"]}, "descriptions": {"title": "Name of the upkeep.", "procedure": "The work to do; if its meaning changes, make a new Plan.", "plan_status": "enabled when the person gives a due date; missing is not enabled.", "schedule_mode": "manual_date when the person gives one due date; others are kept, not computed.", "next_due_on": "Due date as given; never computed.", "schedule_timezone": "IANA time zone; else the Home's.", "schedule_basis": "Where the schedule came from, such as the maker's advice.", "schedule_text": "The schedule in the source's words; kept, not run.", "override_due_on": "Manual due date replacing next_due_on; needs override_basis.", "override_basis": "Why the due date was overridden."}}
---
# My Home Maintenance Plan

Read the [operating contract](../references/my-home-maintenance-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

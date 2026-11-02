---
type: "Convention"
title: "My Home Home"
governs: "My Home Home"
path: "my-home/homes/"
description: "One dwelling or explicitly bounded property context."
fields: {"required": ["title"], "optional": ["record_status", "reviewed_at", "basis", "home_category", "occupancy_role", "timezone", "address"], "types": {"reviewed_at": "datetime"}, "values": {"record_status": ["active", "archived", "unknown"], "basis": ["reported", "observed", "measured", "imported", "unknown"]}, "descriptions": {"title": "Display name; changing it does not rename the immutable document path.", "record_status": "Record visibility/context, not physical condition or permission.", "reviewed_at": "Actual review instant when known; omit rather than inventing it.", "basis": "Summary only; preserve per-value evidence and uncertainty separately.", "occupancy_role": "Reported owner/renter/other context, never permission to act.", "timezone": "IANA timezone when known; no timezone is inferred from address or machine settings.", "address": "Optional private location; not identity or permission. Avoid disclosing it unnecessarily."}}
---
# My Home Home

Read the [operating contract](../references/my-home-core-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

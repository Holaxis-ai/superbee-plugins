---
type: "Convention"
title: "My House Space"
governs: "My House Space"
path: "my-house/spaces/"
description: "One real indoor, outdoor or shared area within one Home."
links: {"home": "My House Home", "within": "My House Space"}
link_descriptions: {"home": "Domain rule: exactly one Home before a unique-home conclusion. Not enforced cardinality.", "within": "Optional parent Space; same Home and acyclic containment are consumer checks."}
fields: {"required": ["title"], "optional": ["record_status", "reviewed_at", "basis", "space_category", "access_note"], "types": {"reviewed_at": "datetime"}, "values": {"record_status": ["active", "archived", "unknown"], "basis": ["reported", "observed", "measured", "imported", "unknown"]}, "descriptions": {"title": "Display name; changing it does not rename the immutable document path.", "record_status": "Record visibility/context, not physical condition or permission.", "reviewed_at": "Actual review instant when known; omit rather than inventing it.", "basis": "Summary only; preserve per-value evidence and uncertainty separately."}}
---
# My House Space

Read the [operating contract](../references/my-house-core-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

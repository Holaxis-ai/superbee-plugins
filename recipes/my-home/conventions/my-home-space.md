---
type: "Convention"
title: "My Home Space"
governs: "My Home Space"
path: "my-home/spaces/"
description: "A room or area of one home, indoors or out, such as the kitchen, garage or yard; make one when something is kept, done or planned there. A thing in it is an Asset; a fact about the whole home belongs on the Home."
links: {"home": "My Home Home", "within": "My Home Space"}
link_descriptions: {"home": "Domain rule: exactly one Home before a unique-home conclusion. Not enforced cardinality.", "within": "Optional parent Space; same Home and acyclic containment are consumer checks."}
fields: {"required": ["title"], "optional": ["record_status", "reviewed_at", "basis", "space_category", "access_note"], "types": {"reviewed_at": "datetime"}, "values": {"record_status": ["active", "archived", "unknown"], "basis": ["reported", "observed", "measured", "imported", "unknown"]}, "descriptions": {"record_status": "Current or archived; not the condition of the thing.", "reviewed_at": "When last checked, if known.", "basis": "How the facts were learned, overall.", "space_category": "Type, such as bedroom, garage or yard."}}
---
# My Home Space

Read the [operating contract](../references/my-home-core-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

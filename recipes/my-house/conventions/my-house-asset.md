---
type: "Convention"
title: "My House Asset"
governs: "My House Asset"
path: "my-house/assets/"
description: "One physical item, installed component, finish area or deliberately grouped system."
links: {"at home": "My House Home", "located in": "My House Space", "part of": "My House Asset", "serves": "My House Space"}
link_descriptions: {"at home": "Home-level current placement; mutually exclusive with located in by domain rule.", "located in": "Current Space placement; at most one current placement across both labels is a consumer rule.", "part of": "Physical/system composition, not location; acyclicity is a consumer rule.", "serves": "Functional coverage, not physical placement; may cover several Spaces."}
fields: {"required": ["title"], "optional": ["record_status", "reviewed_at", "basis", "asset_category", "mobility", "lifecycle", "manufacturer", "model", "serial_number", "responsibility", "placement_status"], "types": {"reviewed_at": "datetime"}, "values": {"record_status": ["active", "archived", "unknown"], "basis": ["reported", "observed", "measured", "imported", "unknown"], "mobility": ["movable", "installed", "not_applicable", "unknown"], "placement_status": ["recorded", "offsite", "unknown"]}, "descriptions": {"title": "Display name; changing it does not rename the immutable document path.", "record_status": "Record visibility/context, not physical condition or permission.", "reviewed_at": "Actual review instant when known; omit rather than inventing it.", "basis": "Summary only; preserve per-value evidence and uncertainty separately.", "asset_category": "Open category. A distributed system is a group, not a single movable unit.", "mobility": "Use not_applicable for a deliberately grouped/distributed system. No ownership or installation approval inferred.", "lifecycle": "Reported physical disposition, not workflow approval. Preserve old unit identity after replacement.", "serial_number": "Optional supplied identifier; vendor/model/provider scope matters, and missing is unknown.", "responsibility": "Reported coordination responsibility, not permission or competence.", "placement_status": "Distinguishes recorded, offsite and unknown location. Does not create or enforce a placement link."}}
---
# My House Asset

Read the [operating contract](../references/my-house-core-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

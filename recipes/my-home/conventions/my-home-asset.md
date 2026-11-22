---
type: "Convention"
title: "Asset"
governs: "My Home Asset"
path: "my-home/assets/"
description: "A physical thing in a home that may be looked after, repaired, replaced or paid for: an appliance, a fixture, a finish such as flooring or siding, or a whole system such as heating or cooling. A plain fact about the home, such as its size or age, belongs on the Home. Something only quoted or considered is not an Asset yet; it goes in a Project, or its quote in a Money Record."
links: {"at home": "My Home Home", "located in": "My Home Space", "part of": "My Home Asset", "serves": "My Home Space"}
link_descriptions: {"at home": "Home-level current placement; mutually exclusive with located in by domain rule.", "located in": "Current Space placement; at most one current placement across both labels is a consumer rule.", "part of": "Physical/system composition, not location; acyclicity is a consumer rule.", "serves": "Functional coverage, not physical placement; may cover several Spaces."}
fields: {"required": ["title"], "optional": ["record_status", "reviewed_at", "basis", "asset_category", "mobility", "lifecycle", "manufacturer", "model", "serial_number", "responsibility", "placement_status"], "types": {"reviewed_at": "datetime"}, "values": {"record_status": ["active", "archived", "unknown"], "basis": ["reported", "observed", "measured", "imported", "unknown"], "mobility": ["movable", "installed", "not_applicable", "unknown"], "placement_status": ["recorded", "offsite", "unknown"]}, "descriptions": {"record_status": "Current or archived; not condition.", "reviewed_at": "When last checked, if known.", "basis": "How the facts were learned, overall.", "asset_category": "Type, such as appliance, fixture, finish or system.", "mobility": "installed or movable; not_applicable for a whole system.", "lifecycle": "As reported, such as in use or removed; a replacement is a new Asset.", "serial_number": "As given.", "responsibility": "Who looks after it, such as owner or landlord; not permission.", "placement_status": "Whether its place is recorded, offsite or unknown."}}
---
# My Home Asset

Read the [operating contract](../references/my-home-core-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

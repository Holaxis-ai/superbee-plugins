---
type: "Convention"
title: "Civic Source"
governs: "Civic Source"
path: "civic-sources/"
description: "A jurisdiction and public-body scoped official source; source-provider details live in instances."
fields: {"required": ["title", "jurisdiction_key", "jurisdiction_name", "body_name", "provider", "registry_url", "coverage", "capture_mode"], "optional": ["provider_jurisdiction_id", "timezone", "last_observed_at", "latest_meeting_date_observed", "notes"], "values": {"coverage": ["sample", "partial", "complete"], "capture_mode": ["manual-pilot", "operator-run", "managed"]}, "types": {"registry_url": "https-url", "last_observed_at": "datetime", "latest_meeting_date_observed": "date"}, "descriptions": {"coverage": "Only complete after an exhaustive bounded listing with all tails examined. A sample or failed read never proves absence.", "jurisdiction_key": "Stable application-neutral municipality identifier; include state/country to avoid name collisions.", "capture_mode": "Records actual operation. Installing this recipe never activates polling or provider access."}}
links: {}
---
# Civic Source

Use the fields and relationship descriptions at write time. Source capture and editorial handoff follow the installed references. Schema validation checks shape; citation correctness, evidence quality and publication authority still need review.

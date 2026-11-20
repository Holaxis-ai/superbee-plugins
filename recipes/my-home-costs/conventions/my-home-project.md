---
type: "Convention"
title: "My Home Project"
governs: "My Home Project"
path: "my-home/projects/"
description: "A job on the home this person wants to do or is doing, such as a new roof or a kitchen remodel, with its quotes and costs; make one only for work they name. Its amounts are Money Records; upkeep that repeats is a Maintenance Plan."
links: {"home": "My Home Home", "space": "My Home Space", "asset": "My Home Asset"}
link_descriptions: {"home": "Exactly one direct stable Home before a Home-level financial report. Space/Asset links do not derive historic Home.", "space": "Contextual work area, not another allocation or financial scope.", "asset": "Contextual existing physical item; quotations/proposed products are not acquired Assets."}
fields: {"required": ["title"], "optional": ["scope_note", "project_status", "responsibility"], "values": {"project_status": ["proposed", "active", "completed", "paused", "canceled", "unknown"]}, "descriptions": {"title": "Name of the job.", "scope_note": "What the job includes and leaves out.", "project_status": "Where it stands, as reported; not approval to buy or pay.", "responsibility": "Who is coordinating it; not authority."}}
---
# My Home Project

Read the [operating contract](../references/my-home-money-v1.md) before deriving conclusions.
Native declarations check supported values on participating writes; relationship cardinality,
evidence quality and cross-record meaning remain domain checks, not universal write constraints.

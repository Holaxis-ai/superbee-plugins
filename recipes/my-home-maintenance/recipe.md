---
type: "Recipe"
id: "my-home-maintenance"
title: "My Home Maintenance"
version: "0.1.2"
summary: "Separate maintenance intentions from reported service occurrences."
offer: "Plan upkeep and log each repair or service visit, so you know what was done and what is due."
content_policy: "definitions-only"
references: ["references/my-home-maintenance-v1.md"]
pages: [{"registry": "views-registry/my-home-whats-due.md", "entry": "views/my-home-maintenance/whats-due.html"}]
---
# My Home Maintenance

Install My Home core first, then this recipe explicitly. Installs two Kinds, an operating reference and a read-only "What's due" View, not reminders, recurring jobs or actual service records. Native dates/enums do not make the domain rules unavoidable through other writers.

Use the existing recipe-set structural preflight for a selected composition. Manifest dependency resolution is not assumed. Examples and executable qualification remain outside the recipe payload.

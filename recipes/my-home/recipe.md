---
type: "Recipe"
id: "my-home"
title: "My Home"
version: "0.3.1"
summary: "Stable Home, Space and Asset identities without an exhaustive inventory, a home's basic facts and records fetched from outside sources."
offer: "Set up your home, its rooms and the things in them, so everything else has a place to attach."
content_policy: "definitions-only"
references: ["references/my-home-core-v1.md"]
---
# My Home

Installs four disjoint Kinds and one operating reference: Home, with optional fields for its basic facts such as year built, size, rooms and flood zone; Space; Asset; and Source Record for a record fetched from an outside public source. Start with one useful Home or Asset; installing creates no records, addresses, model, tasks, credentials or execution. Optional maintenance and costs recipes link into these Kinds rather than redefining them.

Use the existing recipe-set structural preflight for a selected composition. Manifest dependency resolution is not assumed. Examples and executable qualification remain outside the recipe payload.

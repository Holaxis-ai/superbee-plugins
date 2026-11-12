---
type: Recipe
id: resource
title: Resource
version: "0.1.0"
summary: External resource pointers with descriptive metadata and resource-to-resource relationships.
content_policy: definitions-only
references:
  - references/resource.md
---
# Resource

Installs one Resource convention and its usage reference. No other recipe is required.
Installation creates no resource instances and performs no provider access, downloads,
synchronization or permission changes. Synthetic examples live outside this recipe.

**Before installing into any existing bundle**, inspect its conventions and Resource
instances. The first convention by document ID wins when multiple conventions govern
`Resource`. Installation can succeed with a `KIND_DUPLICATE_GOVERNS` warning while
either ignoring this recipe's convention or changing the schema governing existing
records, even when no files are overwritten. Do not proceed on a conflict without
an explicit adoption plan. See the [usage reference](references/resource.md).

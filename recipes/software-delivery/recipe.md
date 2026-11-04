---
type: Recipe
id: software-delivery
title: Software Delivery
version: "0.1.0"
summary: Exact-revision technical reviews and a resumable software-delivery procedure.
content_policy: definitions-only
references:
  - references/software-delivery.md
---
# Software Delivery

Installs one Change Review convention and an operating reference. Explicitly install the existing
`work-tracking` and `context-notes` recipes first. This manifest does not install dependencies.

Installation creates no work, review findings, source repository, provider connection, checks,
reviewer assignment or authorization. The separately invoked synthetic example shows how a later
agent can recover current work and distinguish an old assessment from a changed source revision.

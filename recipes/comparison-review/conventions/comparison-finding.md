---
type: Convention
title: Comparison Finding
governs: Comparison Finding
path: comparison-findings/
description: A human-authored discrepancy against an explicit expectation and exact captured evidence.
links:
  evidence: Artifact
  supersedes: Comparison Finding
link_descriptions:
  evidence: An existing Artifact; record its entry and entry_version in the Evidence section.
  supersedes: An earlier finding whose assessment this newly pinned comparison replaces.
fields:
  required: [title, progress_status]
  optional: [assignee, resolution, decided_at]
  types:
    decided_at: datetime
  values:
    progress_status: [open, in_review, resolved, dismissed]
  terminal:
    progress_status: [resolved, dismissed]
  descriptions:
    title: The discrepancy or comparison question in ordinary language.
    progress_status: Disposition of this discrepancy at its recorded basis, not overall acceptance.
    assignee: The person or agent coordinating investigation; not permission or authenticated identity.
    resolution: The bounded conclusion and any next action, with its limitations.
    decided_at: When the recorded disposition was made, as an explicit ISO 8601 instant.
sections: [Observation, Expected result, Evidence, Decision]
---
# Comparison Finding

Record measurements, units, uncertainty and interpretation in the body. The Evidence heading is
required; the contents of its basis table are author assertions, not a validated evidence envelope.
Resolved and dismissed are terminal for queries/display, not immutable records. Read the installed
[comparison review procedure](../references/comparison-review.md) before applying a prior decision
to later evidence.

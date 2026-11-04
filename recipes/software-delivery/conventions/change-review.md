---
type: Convention
title: Change Review
governs: Change Review
path: change-reviews/
description: A bounded technical assessment of one explicitly identified source revision and question.
fields:
  required: [title, target, revision, question, verdict]
  optional: [reviewer]
  values:
    verdict: [acceptable, changes_requested, needs_evidence]
  descriptions:
    title: The change and bounded assessment in ordinary language.
    target: The repository or change whose source was inspected; identify it sufficiently to find again.
    revision: The exact immutable source commit assessed, not a moving branch name or this document's head_version. Native field validation does not verify the commit.
    question: The concrete technical judgment this assessment answers within its recorded scope.
    verdict: A technical recommendation within the recorded question and scope; never merge, release, deployment or human authorization.
    reviewer: The person or process reporting the assessment; self-reported attribution, not authenticated identity or independent-review proof.
links:
  reviews: Task
  supersedes: Change Review
link_descriptions:
  reviews: The Task whose source work this assessment examines; work acceptance remains on the Task.
  supersedes: An earlier assessment replaced by this separately recorded review; preserve its original revision, findings and evidence.
sections: [Scope, Findings, Evidence, Limits]
---
# Change Review

Keep the assessed source revision distinct from any revision on which checks actually ran and from
an eventual integration commit. State those bases in Evidence. If evidence is missing, use
`needs_evidence` and name what would settle the question. An acceptable result is bounded by Scope
and Limits; it is not proof that all defects are absent or that repository policy permits a merge.

A later source change needs a new applicability assessment. Preserve old review records and create
a linked successor when re-review occurs; terminal immutability and automatic staleness detection
are not enforced by this convention. Read the [operating reference](../references/software-delivery.md).

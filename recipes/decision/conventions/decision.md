---
type: Convention
title: Decision
governs: Decision
path: decisions/
description: An attributable choice with rationale, scope, authority and explicit follow-up.
fields:
  required: [title, decision_status]
  optional: [description, topic, decider, decision_date, decision_scope, authority_basis, revisit_when]
  types:
    decision_date: date
  values:
    decision_status: [proposed, recorded, superseded, withdrawn]
  terminal:
    decision_status: [superseded, withdrawn]
  descriptions:
    title: Concisely state the choice; distinguish a proposed course from a recorded commitment.
    decision_status: Proposed is not authority; recorded is a claim of a decision, not independent proof of approval.
    topic: Short legacy-compatible subject label, if useful for established consumers.
    decider: Attributed decision-maker or accountable body; self-report does not authenticate that person or grant permission.
    decision_date: Calendar date the decision was actually reached, not when this record was edited.
    decision_scope: Where and when the choice applies; changes outside scope require a fresh decision.
    authority_basis: What authorizes this choice within the relevant organization or process, with verification limits.
    revisit_when: Evidence, result, time or condition that would require re-evaluation.
links:
  resolves question: Decision Question
  selects: Decision Option
  supported by: Research Claim
  follow-up: Task
  review task: Task
  superseded decision: Decision
link_descriptions:
  resolves question: The bounded choice answered by this record; use its derived backlink from the Question instead of a duplicate inverse link.
  selects: The chosen alternative; a proposal may identify a preferred option without creating authorization.
  supported by: A scoped supporting Research Claim, not proof that the person named as decider approved the choice.
  follow-up: Implementation or other work resulting from this decision; completion is tracked on Task, not inferred here.
  review task: A later check of consequences, assumptions or continuing applicability.
  superseded decision: An earlier decision replaced in an explicitly stated scope; retain both records and their provenance.
sections: [Decision, Rationale]
---
# Decision

State the choice and the question it answers. Distinguish proposed advice from
a decision actually taken. A recorded decision needs an explicit decision-maker,
date, scope and authority basis in the record even though optional schema fields
permit draft proposals. Attribution is not authenticated authorization.

# Rationale

Explain options, criteria, evidence and assumptions that supported the choice,
including significant objections and rejected alternatives. Link to reusable
Decision Options, Decision Questions and Research Claims where applicable. Link pre-decision
investigation Tasks from the Decision Question with `investigated by`; avoid
storing a second copy of the same relation on Decision.

Preserve the original record when superseded; create a newer Decision with a
superseded decision link. A Decision can create follow-up Tasks, but its
recorded status does not mean those Tasks are completed or external actions
have been authorized or executed.

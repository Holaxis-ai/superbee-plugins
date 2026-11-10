---
type: Convention
title: Decision Question
governs: Decision Question
path: decision-questions/
description: A bounded choice needing deliberation, with its question, criteria and open uncertainties.
fields:
  required: [title, progress_status]
  optional: [decision_owner, decision_scope, revisit_when]
  values:
    progress_status: [open, investigating, ready, resolved, deferred, canceled]
  terminal:
    progress_status: [resolved, canceled]
  descriptions:
    title: Name the choice to be made, not a presumed answer.
    progress_status: Logical Kind field; in OKF v0.2 record frontmatter as superbee_progress_status (CLI --progress_status). Resolved requires a recorded Decision, not completed implementation.
    decision_owner: Person or group coordinating the decision process, not necessarily authorized to make the choice.
    decision_scope: Systems, people, timeframe or constraints within which the choice applies.
    revisit_when: Concrete trigger for revisiting a deferred or earlier question.
links:
  considers: Option
  needs research: Research Question
  investigated by: Task
  depends on question: Decision Question
link_descriptions:
  considers: An alternative under evaluation; an Option can be linked from multiple Questions when genuinely reusable.
  needs research: An epistemic question whose answer matters to the choice; requires the separate deep-research recipe.
  investigated by: A pre-decision work item, using the separately installed built-in Task Kind.
  depends on question: Another choice that must be resolved first; not a task-execution dependency.
sections: [Question, Criteria]
---
# Decision Question

The Question is a normative choice (what should we do?), not a claim that the
answer is known. Under Criteria record goals, constraints, trade-offs, and how
options will be assessed. In the Criteria section, distinguish required
constraints from preferences, explain the threshold or priority of each
criterion, and name what evidence would assess it. Prefer a small table or
numbered list with stable criterion names; avoid invented scoring precision.
Options may assess these same criteria in their Proposal bodies, and the
Decision's Rationale should explain the consequential trade-offs. The Decision's
`resolves question` link supplies the backlink to this Question; do not add a
second reciprocal edge. In OKF v0.2, set `superbee_progress_status` in record
frontmatter, not the logical `progress_status` Kind field name. Record
assumptions, disputes, missing evidence and next steps as needed. Research Question represents an
epistemic unknown; Task represents intended work. Neither is redefined here.

Resolved records preserve their deliberation; later changes belong in a new
Decision, explicitly linked as superseding the earlier one.

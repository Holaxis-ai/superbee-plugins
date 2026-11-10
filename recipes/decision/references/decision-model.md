---
type: Reference
title: Decision model and workflow composition
---
# Decision model and workflow composition

This recipe draws on issue/position/argument models such as IBIS, Questions–Options–
Criteria (QOC), and architectural decision records. It is a small portable
convention, not a complete decision ontology, approval engine or executable
workflow. Keep commitments, investigation and execution distinct.

## Three optional levels of structure

| Kind | Represents | What it does not imply |
| --- | --- | --- |
| Decision Question | A normative question, alternatives, criteria and unresolved work | A choice has been authorized |
| Option | One possible course of action and its trade-offs | That the option has been selected |
| Decision | A proposed or recorded choice, reason, scope and attributable authority | Work was completed, or that identity/authorization was independently verified |

A simple decision can use a single Decision with its question, alternatives
and criteria in the body. Add a Decision Question when deliberation lasts across
sessions, people or alternatives. Add Options when they need separate
evaluation, relationships or reuse. Do not create a document for every sentence,
argument or criterion. Criteria normally belong in the Question's Criteria section;
only introduce a reusable Criterion Kind in a separately justified extension.

## Relationships and intended directions

- Decision Question --considers--> Option
- Decision Question --needs research--> Research Question (optional deep-research)
- Decision Question --investigated by--> Task (optional built-in work-tracking)
- Decision --resolves question--> Decision Question
- Decision --selects--> Option
- Decision --supported by--> Research Claim (optional deep-research)
- Decision --follow-up / review task--> Task
- Decision --superseded decision--> earlier Decision
- Option --supported by / challenged by--> Research Claim
- Option --tested by--> Task

Link labels above are exact Kind declarations. They become typed relationships
when a target Kind and document are present; merely declaring a target type does
not install its recipe. Store links in ordinary Markdown, e.g. from a decision
to an option as `[selects](../options/queue.md)` (literal example, not a
link to an installed record). The target must be
the intended actual document, not an invented placeholder. A graph shows
relationships, but does not cause a task to run or an approval to occur.

## Optional recipe composition

Install the companions independently when needed:

~~~sh
superbee recipe add work-tracking --dir /absolute/path/to/selected-bundle
superbee recipe add /absolute/path/to/reviewed-superbee-plugins/recipes/deep-research --dir /absolute/path/to/selected-bundle
superbee recipe add /absolute/path/to/reviewed-superbee-plugins/recipes/decision --dir /absolute/path/to/selected-bundle
~~~

These are examples, not a dependency resolution mechanism. The recipe parser
currently does not execute manifest requires/composes, and this recipe declares
neither. The built-in Task remains the only Task convention; Research Question,
Research Claim, Research Observation and Research Source remain governed by the
separate deep-research recipe. A Research Question asks what is true or knowable;
a Decision Question asks what we should do. A Task is intended work, not an Activity
receipt proving that work occurred.

Reuse source evidence instead of duplicating it in Decision. For significant
choices, link to reviewed scoped Research Claims and trace those to located
Observations and Sources through the research model. Record counterevidence
and missing information. The Decision's Rationale explains how this evidence,
the criteria, risks and assumptions led to the commitment. A claim being
supported is not equivalent to a human having made or approved a decision.

## Lifecycle for one decision

1. Frame the choice in a Question, or directly in a small Decision. Specify scope,
   owner, criteria, assumptions and the threshold for deciding.
2. Propose alternatives and compare them explicitly. Keep unchosen or ruled-out
   options visible rather than rewriting history.
3. Use Research Questions and Tasks when a genuine knowledge gap requires
   investigation. Research may reopen the original question or reveal another.
4. Record a Decision only after checking the organization's real authority
   and what was agreed. Use decision_status: proposed for unapproved advice;
   use recorded only for an actually made choice. Name decider, date, scope,
   authority basis, and evidence, with their limitations.
5. Create follow-up Tasks for implementation and review. Progress and acceptance
   live on those Tasks; a recorded decision cannot mark them done.
6. Observe outcomes in the relevant source/Task/research artifacts. If an
   assumption or authority changes, create a new Decision linking
   superseded decision to the earlier one, and state the scope of replacement.

This is a pattern, not a forced linear orchestration. A Question can link
investigation Tasks that generate more evidence; implementing a Decision can
surface a new Question. Recursion, scheduling, approval, task claiming and execution
remain outside these definitions.

## Authority and durable history

The fields decider and authority_basis are recorded assertions, not
authenticated identities, signatures, permissions or consent gates. An agent
recommendation must not be promoted to a human commitment without evidence
that the human actually decided. The status recorded does not grant authority
to send messages, spend money, change production systems or release work.
Neither a Task nor a Decision substitutes for the relevant host's permissions.

Preserve prior decisions and their original evidence. Update a record to
correct transcription or record a lifecycle change, but use a new linked
Decision for a substantively different commitment. Keep actual observed
results separate from anticipated consequences. Native validation verifies
declared structure and some links; it cannot prove reasoning or authorization.

See adopting-existing-decisions for schema conflicts and migration boundaries.

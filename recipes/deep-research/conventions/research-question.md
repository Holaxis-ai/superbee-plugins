---
type: Convention
title: Research Question
governs: Research Question
path: research-questions/
description: A persistent uncertainty with bounded prior attempts and a useful next test.
fields:
  required: [title, progress_status, next_action]
  optional: [outcome, revisit_when]
  values:
    progress_status: [open, investigating, blocked, answered, inconclusive, parked]
  terminal:
    progress_status: [answered, parked]
  descriptions:
    progress_status: Workflow state, independent of linked claim truth. A completed download does not answer the question.
    next_action: The smallest useful investigation, its expected evidence and what result would change understanding; exploratory qualitative work need not use binary falsification.
    outcome: Bounded answer or limits, including contradictory and incomplete evidence. Not found in a search is not proof of absence.
    revisit_when: A concrete change of evidence, access, scope or method that would justify repeating a prior attempt.
links:
  investigates: Research Claim
  consulted: Research Source
  needs source: Research Source
  found observation: Research Observation
  answered by: Research Claim
link_descriptions:
  investigates: A proposed explanation or claim this question tests; questions may also stand alone.
  consulted: Source actually consulted in the recorded bounded attempt; use needs source for identified inputs not yet inspected.
  needs source: An identified input still needed for the next test; this is not a consulted or inspected source.
  found observation: A useful located observation from an attempt; no new document is required for every negative search.
  answered by: The scoped answer to this question; requires reasoning, not just a successful tool response.
sections: [Question and alternatives, Attempts and coverage, Current interpretation, Next test]
---
# Research Question

Keep small attempts here: when, where, query/method, scope actually examined,
outcome, limits and repeat trigger. An optional Attempt companion becomes useful
when attempts need independent retrieval or reuse. Do not turn every task or
editorial choice into a Research Question.

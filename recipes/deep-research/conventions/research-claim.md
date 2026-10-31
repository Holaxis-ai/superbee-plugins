---
type: Convention
title: Research Claim
governs: Research Claim
path: research-claims/
description: A scoped proposition with explicit evidence, reasoning and review disposition.
fields:
  required: [title, statement, scope, assertion_mode, evidence_state, review_state]
  optional: [reviewed_on, review_note]
  types:
    reviewed_on: date
  values:
    assertion_mode: [source_assertion, inference, hypothesis]
    evidence_state: [unassessed, supported, contested, refuted, superseded]
    review_state: [unreviewed, reviewed]
  descriptions:
    statement: The proposition being assessed; keep the literal observation in its own record.
    scope: Applicable subject, conditions, time, scenario or stage in ordinary language. Do not generalize beyond it.
    assertion_mode: source_assertion means the inspected input makes this statement, not that the event occurred; inference and hypothesis remain researcher reasoning.
    evidence_state: Assessment for this scoped proposition, not statistical confidence, native verification, human authority or publication permission.
    review_state: Whether someone recorded substantive research review; reviewed is an author assertion, not authenticated human approval.
    review_note: Who or what reviewed the basis, what changed and important unresolved limitations.
links:
  supported by: Research Observation
  challenged by: Research Observation
  depends on claim: Research Claim
  supersedes claim: Research Claim
link_descriptions:
  supported by: Evidence bearing on this exact proposition; explain relevance and independence in Reasoning.
  challenged by: Contrary evidence to assess in scope; this link alone does not prove a contradiction.
  depends on claim: A stated reasoning dependency. Changes require review, not automatic falsification of every dependent claim.
  supersedes claim: A revised assessment replacing an earlier claim in an explicitly stated scope. Retain both and explain why.
sections: [Assertion and scope, Evidence, Reasoning and alternatives, Review]
---
# Research Claim

There is no universal numerical confidence score or automated truth promotion.
Support, challenge and dependency edges remain distinct. A superseded support path
does not erase other independent evidence. Use a decision companion for actual
decisions: evidence of someone's remark is not authorization to implement it.

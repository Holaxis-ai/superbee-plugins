---
type: Convention
title: Place Comparison
governs: Place Comparison
path: place-comparisons/
description: Domain context for a candidate place correspondence, linked to canonical reasoning.
fields:
  required: [title, left_label, right_label, question]
  optional: [geometry_note]
  descriptions:
    left_label: Literal label of one described place; a label is not identity.
    right_label: Literal label of the other described place; similarity does not establish equivalence.
    question: The specific correspondence being tested; conclusions stay in the linked Research Claim.
    geometry_note: Actual method and limitations of the comparison; no fabricated coordinate precision.
links:
  assessed by: Research Claim
  compares observation: Research Observation
sections: [Comparison, Evidence links, Limits]
---
# Place Comparison

A domain record can organize names and geometry without copying claim truth or
review state. Link its canonical assessment and observations using the exact labels.
The host must supply the separately installed Research Claim and Observation Kinds.

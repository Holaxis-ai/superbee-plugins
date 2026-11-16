---
type: Reference
title: Deep Research model and relationship contract
---
# Deep Research model and relationship contract

Version 0.1 is an experimental vocabulary and method, not a claim of universal
research coverage. Four Kinds are enough to begin; the body carries rich reasoning.

| Record | Responsibility | Does not establish |
| --- | --- | --- |
| Research Source | Identity and inspected representation/scope of an input | Authority, authenticity, complete acquisition or independence |
| Research Observation | What was actually inspected at a precise locator | That its content happened in the world |
| Research Claim | A scoped proposition and assessed reasoning | A human decision, publication permission or a universal probability |
| Research Question | Persistent uncertainty, attempts, current frontier | A task queue or automatic research process |

## Defined relationships

| From | Exact link text | To | Interpretation |
| --- | --- | --- | --- |
| Source | derived from | Source | Known provenance; not independent corroboration |
| Observation | drawn from | Source | Exact inspected input |
| Observation | supersedes observation | Observation | Corrected reading with rationale |
| Claim | supported by | Observation | Relevant evidence, assessed in scope |
| Claim | challenged by | Observation | Potential contrary evidence, still requiring interpretation |
| Claim | depends on claim | Claim | Explicit reasoning dependency |
| Claim | supersedes claim | Claim | Revised interpretation in a stated scope |
| Question | investigates | Claim | Explanation or proposition being tested |
| Question | consulted | Source | Actually examined input in a bounded attempt |
| Question | needs source | Source | Identified input still needed; not an inspected source |
| Question | found observation | Observation | Useful evidence from the attempt |
| Question | answered by | Claim | A scoped answer, not merely task completion |

Write relationships as ordinary Markdown links with these exact labels. Native
`link show` supplies both directions; there is no second graph stored in JSON.
The `depends on claim` and `supersedes claim` labels are deliberately specific so
they do not imply Task dependencies or another domain's replacement policy.

## What validation means

Kinds validate declared fields, values, sections and typed edges. They do not
require an evidence edge to exist, establish semantic relevance, prove that a
locator is accurate, enforce independence, detect every stale conclusion or
authenticate who reviewed a record. Missing support/locators need research review.
The synthetic consumer tests prove only their enumerated cases and CLI behavior.

Review state is separate from Superbee's native verification/trust metadata.
Unknown dates stay unknown. A local path or hash is not proof of source origin.
Copies, screenshots and OCR from one input do not become independent witnesses.

## Start small

A sourced catalog attribute can remain on its domain record. A short negative
search belongs in a Question's Attempts section. A narrative synthesis can be an
ordinary document linking canonical claims. Create another record only when its
identity, retrieval, reuse or correction earns the cost.

## Packaging boundary

The core owns only these four conventions and these uniquely named references.
It installs no examples, executable checkers, sources, agents, Views or integrations.
An example starter invoked separately can create an explicitly selected synthetic
bundle. That operation is not part of recipe installation.

---
type: Reference
title: Review a comparison against its captured evidence
---
# Review a comparison

A Comparison Finding records an observed discrepancy, an explicit expectation and a bounded
judgment. Use it when measurements and reasoning need to survive a conversation. Existing Signal
records retain source-change/conflict attention. A named human approval request belongs in the
existing Review/Review Request workflow; do not infer approval from a finding's assignee or state.

1. Select retained self-contained HTML deliberately and use `superbee artifact create` to create a
   real Artifact. Pull its `entry` through `superbee pull` to inspect the retained bytes. Preserve
   original inputs/settings and snapshots separately. No capture or execution happens on recipe
   install or finding creation.
2. Create a Comparison Finding through `superbee new "Comparison Finding"`. Include all four
   headings and an Evidence basis table. Use a typed `evidence` link to the actual Artifact record.
3. State expected versus observed, measurement method/region/frame, units, uncertainty and the
   source of any tolerance. Qualitative observations are valid; missing measurements are unknown,
   never zero. Render appearance or pixel similarity does not establish dimensions or model accuracy.
4. When applicability to current inputs matters, run existing `source snapshot check` against
   explicitly selected originals and original invocation settings. Record current/stale/unverifiable
   with its scope. Hashes observed now and caller_asserted associations do not prove past consumption.
5. Read the finding's `head_version`, then record an attributed decision using `doc update` with
   `--expected-version`, `--resolution` and `--decided_at`. A racing edit refuses through ordinary
   CAS. Resolved means this discrepancy was dispositioned at this basis; it grants no execution,
   release approval or overall model acceptance. Only an actual human review establishes human
   acceptance; a `human:` actor string does not authenticate one.
6. A source refresh must leave the old evidence, human body and decision pinned. Before applying a
   terminal decision to later inputs, inspect applicability and create a new finding at the new
   basis; use `supersedes` when it replaces the earlier assessment. An open finding can be explicitly
   reassessed. Do not restamp an old terminal decision with a new digest or call it newly current.

## Evidence basis

Record at least Artifact ID, `entry` and exact returned `entry_version`, plus an `evidence` link.
An Artifact title or mutable link alone does not pin bytes. An optional Artifact document
`head_version` identifies the inspected record; it is distinct from the blob's `entry_version`.
A workflow-only Artifact update does not itself change those retained output bytes.

For snapshot-derived comparisons, also record source resource, external ID, capture generation and
exact snapshot SHA256. Cite the source-backed document for navigation; its latest title/head or
mapped content digest cannot replace capture identity. Record relevant original input/settings/tool
identities from existing evidence, with unknown dimensions explicit. Do not copy private host
manifests, machine paths, raw tool logs or invented run IDs into a finding. Evidence citations do not
authorize private-state or bundle-store paths as snapshot/check inputs.

Use ordinary citations to Camera Observation, Benchmark Result, Signal or Review Request records.
This recipe declares only `evidence: Artifact` and `supersedes: Comparison Finding`; it neither
changes those other conventions nor requires a network Source Feed recipe.

## What is enforced

Existing Kind validation checks required fields, enum values, datetime spelling and section
presence on strict authoring. It does not check table completeness, digest correctness, units,
tolerances, cross-document version equality or conditional decision fields. The convention does not
lock terminal documents, automatically mark/reopen stale findings, authenticate a reviewer, or
preserve bytes forever. Versioned writes, links and existing storage support the procedure; they do
not turn this guidance into a new provenance or verdict engine.

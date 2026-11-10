---
type: Reference
title: Adopting Decision in an existing bundle
---
# Adopting Decision in an existing bundle

Do not assume that a bundle's already-declared Decision means exactly the
same thing as this recipe. Even identical names can carry different authority
rules, required fields, enums, link labels, readers and historical instances.

## Current native behavior

- A recipe is a folder of inert definitions. recipe validate checks its own
  structure without changing a bundle.
- recipe add installs missing convention IDs with create-only writes. It does
  not overwrite a same-ID existing convention, and can report source_differs,
  partially applied and recipe ownership differences. Distinct convention
  IDs governing the same type can produce duplicate-governs warnings; the
  registry's first-by-ID declaration wins, not a semantic merge.
- recipe evolve is a separate inspected, state-bound, largely additive change
  to recipe definitions. It can report blockers for changed bodies, non-additive
  declarations, foreign ownership, incompatible instances or link types. Even
  a successful evolution does not rewrite historical Decision instances or
  rename their fields or relationships.
- kind field can edit selected field declarations, and guarded document edits
  can change an individual document. Neither is a general semantic Kind
  normalization or historical-record migration.
- Optional structural recipe-set preflight can compare supplied provider,
  consumer and placement evidence; it does not acquire that evidence or apply
  migrations. A passing structural check is not proof of semantic equivalence.

## Inspect before installing

On the selected existing bundle, inspect its live registry, convention,
instances, links, dependent recipes, queries and Views. With a reviewed
Superbee CLI and an explicit selected bundle, useful read-only probes include:

~~~sh
superbee kinds --json --dir /absolute/path/to/bundle
superbee doc read conventions/decision --json --dir /absolute/path/to/bundle
superbee list --type Decision --limit 0 --json --dir /absolute/path/to/bundle
superbee status --json --dir /absolute/path/to/bundle
superbee recipe validate /absolute/path/to/reviewed-superbee-plugins/recipes/decision --json
~~~

If the actual convention uses another ID, read that ID instead. Review
existing source fields and observed values, not just the declared type name.
Do not run recipe add merely as a conflict detector: it may correctly install
the recipe's *other* missing Kinds before reporting Decision drift.

## Plan an explicit semantic mapping

For each existing field and typed link, decide whether it is equivalent,
narrower, broader, ambiguous, or has no counterpart. Example questions:

| Existing concept | Proposed portable destination | Review required |
| --- | --- | --- |
| dated recorded choice | Decision, decision_status: recorded | Was a choice actually made, or merely documented? |
| proposed or pending choice | Decision, decision_status: proposed | Never infer acceptance from a meeting summary |
| question resolved | Decision Question + resolves question link | Is this a normative choice, a Research Question or a local Question Kind? |
| legacy/source pointers | original provenance plus links | Preserve exact source identity and citation semantics |
| implementation follow-ups | built-in Task with follow-up link | Are these intended tasks, or observed completed actions? |
| earlier replaced decision | superseded decision link | Which portion of the prior commitment is superseded? |

Do not drop a legacy-specific field merely because the generic recipe does
not declare it. Some older consumers may require it. An explicit adapter or
local extension can preserve a narrower vocabulary while others consume the
portable conceptual subset. Avoid dual authoritative copies of a decision
with silently diverging statuses.

## Adoption choices

**Keep a local Decision Kind.** Safest when a bundle's existing convention
has meaningful semantics or many consumers. Adopt the new Question and Option
concepts only after checking typed-link interoperability; maintain a
documented mapping to the generic Decision semantics without pretending the
recipe owns the local Decision definition.

**Evolve in place deliberately.** If authorized owners want the shared model,
rehearse against a disposable snapshot. Preserve original IDs, record bodies,
provenance and any legacy fields needed by consumers. Map statuses, decision
authority and relationships one by one. Validate all representative documents
and graph consumers against the proposed convention, and obtain approval
before version-guarded writes. Native recipe evolve can assist only with the
subset of safe declaration changes it actually permits; instance changes are
a separate explicit migration.

**Create a separately named versioned Kind.** When semantics are incompatible,
a new type may be less dangerous than changing existing Decision meanings.
Do this only with a reviewed migration and reader plan; an alternative name
does not automatically bridge records or backlinks.

In every path, compare status, conformance, link-type violations, query/View
behavior and source provenance before and after on an isolated copy. Account
for concurrent authors, existing sync and historical consumers. Never
delete the former Decision Kind or bulk-retype its records as a shortcut.
Preserve snapshots, record an explicit mapping and reconciliation plan,
and refuse lossy/unreviewed conversions. This recipe ships no migration
script and does not alter any existing project or business-plan bundle.

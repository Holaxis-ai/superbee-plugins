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
  partially applied and recipe ownership differences. **This is not a
  semantic no-op:** if a different convention ID already governs a type, adding
  this recipe may silently change which schema governs existing records.
  Duplicate-governs is only a warning; the command can still report added and
  exit successfully. The registry's first-by-ID declaration wins, not the
  oldest, most specific or most recently installed. For example,
  conventions/decision sorts before conventions/project-decision, so the
  recipe's Decision definition would take precedence over the pre-existing
  project Decision Kind. Existing instances may immediately acquire
  conformance problems, although no document was overwritten.
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

## Required pre-install check for existing bundles

**Do not run `recipe add` in an existing bundle until you inspect the
governing conventions and existing instances.** All three recipe type names
are potential collision points: `Decision`, `Decision Question`, and
`Decision Option`. The scoped `Decision Option` name intentionally reduces
(but cannot eliminate) collision risk before qualified Kind identities exist.

With the selected bundle and a reviewed Superbee CLI, use read-only commands:

~~~sh
superbee kinds --json --dir /absolute/path/to/bundle
superbee list --type Convention --prefix conventions/ --limit 0 --json --dir /absolute/path/to/bundle
superbee list --type Decision --limit 0 --json --dir /absolute/path/to/bundle
superbee list --type "Decision Question" --limit 0 --json --dir /absolute/path/to/bundle
superbee list --type "Decision Option" --limit 0 --json --dir /absolute/path/to/bundle
superbee status --json --dir /absolute/path/to/bundle
superbee recipe validate /absolute/path/to/reviewed-superbee-plugins/recipes/decision --json
~~~

Inspect the full `Convention` inventory, not just the effective Kind registry:
the registry reports only the winner when two conventions govern the same
type. Read every existing convention whose `governs` matches one of those
names (for example `superbee doc read conventions/decision --json`) and
review its instance fields, links, consumers, queries and Views.

If **any** of these types already has a different convention, or if instances
of an as-yet-undeclared type already exist, **stop**. Decide explicitly
whether to keep the local Kind, adapt it, or map records through an
approved migration; do not treat a successful `recipe add` as compatibility
approval. Do not run `recipe add` merely as a conflict probe: it may install
other Kinds first, and a different-ID collision can change active semantics.
A clean check at one moment also does not lock out concurrent writers.
The recipe has no automatic all-or-nothing collision guard; Core would need
a preflight/installation refusal to enforce this invariant for all callers.
This underlying Core issue is tracked at
https://github.com/Holaxis-ai/superbee/issues/700.

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
has meaningful semantics or many consumers. Adopt the new Decision Question and Decision Option
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

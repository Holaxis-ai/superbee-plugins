---
type: Reference
title: Adopting Decision in an existing bundle
---
# Adopting Decision in an existing bundle

The current Kind is
`github.com/holaxis-ai/superbee-plugins/decision/Decision`. Its companions use the
same namespace followed by Decision Question and Decision Option. Research links
name exact Kinds under `github.com/holaxis-ai/superbee-plugins/deep-research`;
Task remains the existing bare Kind. Titles are labels, never aliases.

These qualified definitions can coexist with historical bare Decision records.
Installation does not rewrite historical Decision instances, adopt unstamped
conventions or authenticate a recorded decision. Existing consumers continue to
query their exact old types. The recipe folder is the single authored source and
ordinary installer input; no preparation or conversion is needed by consumers.

## Pre-install check

Inventory the selected bundle before installation or any planned adoption:

```sh
superbee kinds --json --dir /absolute/path/to/bundle
superbee list --type Convention --prefix conventions/ --limit 0 --json --dir /absolute/path/to/bundle
superbee list --type Decision --limit 0 --json --dir /absolute/path/to/bundle
superbee list --type "github.com/holaxis-ai/superbee-plugins/decision/Decision" --limit 0 --json --dir /absolute/path/to/bundle
superbee status --json --dir /absolute/path/to/bundle
```

Read every relevant convention, including locally named definitions such as
`conventions/project-decision`, and their consumers. Convention filenames do not
establish Kind identity: `governs` does. A duplicate exact `governs` can change the
active schema through first-by-ID selection even when installation overwrites no
file. The qualified recipe separates bare identities, but it does not prevent a
second author from declaring the same qualified identity elsewhere.

`recipe add` uses create-only writes and leaves occupied definition IDs unchanged.
A successful install alone is not a migration or compatibility verdict. Inspect
its receipt and any source drift. `recipe evolve` separately plans additive
changes, validates current instances and requires the exact apply token. Neither
command migrates instance types or rewrites consumers.

## Existing decisions and consumers

Keep a local Decision Kind when its semantics or consumers matter. New qualified
records can coexist without making old records conform to the new schema. A bare
`list --type Decision` remains an exact bare query; it does not include qualified
records. Update a consumer only after deciding whether it should read old records,
new records or explicitly query both. Do not infer that matching titles mean the
same fields, relationships, authority or lifecycle.

Before a separately approved migration, record affected IDs, fields, links, views,
queries and examples; map information loss and rehearse on a disposable copy.
Distinguish a proposed option from an attributable recorded choice and from an
implementation Task. Attribution is not authenticated permission. Preserve
historical evidence and explain supersession instead of silently replacing it.

Do not delete the former Decision Kind or bulk-retype its records as a shortcut.
The new namespace itself grants no migration, deployment or publication authority.

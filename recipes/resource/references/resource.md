---
type: Reference
title: Using Resource records
---
# Using Resource records

A Resource is a pointer with context. Its contents remain at the external URL; its bundle
record makes it discoverable and linkable. Use the [Resource convention](../conventions/resource.md)
for field guidance. Only title and url are required. No body headings are required.

## Identity and description

Keep the bundle document ID, external URL and optional provider-native external_id distinct.
A Google Doc can use resource_type document and provider google-drive. The same provider can
hold many resource types. Neither titles nor URLs are uniqueness keys enforced by this recipe.
Before creating a duplicate, look for an existing record; update that record when the same
resource moves. Provider plus external_id is an optional identity hint, not an automatic match.

Use a descriptive URL for opening the resource, not credentials or an expiring signed download.
URL and MIME fields are descriptive text without explicit native field types; the recipe
does not validate URL syntax or MIME registration. This permits non-HTTPS resource
schemes without adding a custom validator. Opening or fetching a URL remains a separate
action governed by the caller's tools and permissions.

## Relationships and collections

Both relationships target another Resource. A folder or collection is itself a Resource with
resource_type folder or collection and its own URL; no separate Collection Kind is needed.
A purely local grouping without a URL is outside this pointer recipe's scope.

From a member record, add a link labeled `part of` to the container record. Use
a link labeled `related to` for an association. These are ordinary directed bundle links.
The recipe creates neither inverse edges nor transitive closure and does not enforce cardinality,
cycle detection or remote folder membership. Avoid self-membership and containment cycles.

A standalone Resource without incoming or outgoing bundle links appears under `orphans`
in `superbee status`. That is expected for a standalone pointer, not an invalid Resource;
its external URL does not connect it to the bundle graph. Add meaningful bundle links
when useful rather than inventing relationships to clear the diagnostic.

A future `derived from` relationship would describe provenance, such as a PDF exported from a
Google Doc. A future `supersedes` relationship would describe replacement. Neither requires a
Collection Kind; neither is declared in this version.

## Evidence and adoption

Registration does not mean the material was fetched, inspected, verified or synchronized.
Use the separate Research Source model when inspection scope and evidence provenance matter;
this recipe neither depends on nor redefines it. Local record timestamps are not external
content modification dates. Stored metadata never grants provider access.

Before installing into an existing bundle, inspect its Kinds for an existing Resource declaration.
Resolve a conflicting declaration explicitly before adoption: a second convention for the same
Kind can affect existing instances even without overwriting their files. The first convention
by document ID wins. Installation can succeed with a `KIND_DUPLICATE_GOVERNS` warning:
an earlier existing convention leaves this recipe ignored; a later one lets this recipe
take over, potentially making existing records nonconforming. This recipe performs no
migration. Review any existing Resource records before adopting its required fields.

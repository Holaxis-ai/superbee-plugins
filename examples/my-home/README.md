# My Home: fictional consumer qualification

This example exercises three inert recipes: [`my-home`](../../recipes/my-home/recipe.md),
[`my-home-maintenance`](../../recipes/my-home-maintenance/recipe.md) and
[`my-home-costs`](../../recipes/my-home-costs/recipe.md). Together they declare Home, Space,
Asset, Source Record, Maintenance Plan, Service Record, Project and Money Record. Installing them creates no
household inventory, model binding, scheduler, vendor contact, bank connection or payment.

Start with a Home and one useful item or job. Rooms, equipment and detailed history can be added
when needed. The fictional renter needs no full inventory or address. Financial alternatives
need no Option/Decision hierarchy: separate quotes already preserve the offers.

The first recipe release is `0.1.0`. Its pre-merge name was changed consistently to `my-home`,
including namespaced Kind labels, document paths and consumer requirements. Home remains the
same dwelling concept; no live installation or data migration is implied by this source rename.
Release `0.1.1` rewrites each Kind description and adds an `offer` sentence in plain words for
people choosing a recipe. Fields, links and the operating contracts are unchanged; the precise
definitions stay in each recipe's reference.
Maintenance release `0.1.2` adds a read-only "What's due" View: overdue and upcoming Plans and
recent service visits, following the maintenance reference. Kinds and fields are unchanged; the
reference gains a short section on what the View shows.

Core release `0.2.0` adds a Source Record Kind under `source-records/`: a record fetched from an
outside public source, with its source, inputs and fetch time as fields and the record itself as a
JSON code block in the body. Existing Kinds and fields are unchanged; the core reference gains a
short section on how to read one.

Core release `0.3.0` gives Home optional fields for a home's basic facts: year built, living and
lot area each with a unit, bedrooms, bathrooms, floors, units, county, school district (a name,
never a rating) and flood map details. No Kind, Kind name or link changes. Every Kind description
now says in plain words what belongs, when to make one and where the nearest thing that does not
belong goes, and field descriptions are shorter while keeping the rules a writer needs, such as a
Money Record amount that is never negative, with a credit or refund told by its kind; maintenance `0.1.6` and costs `0.1.2` carry the
same rewrite with no field changes. The core reference says that where a fact came from goes in
the standard `sources` field and the fields to confirm in `superbee_to_check`. The fixture's
owner Home carries these facts, cites the fictional Source Record and lists fields to check.

Core release `0.3.1`, maintenance `0.1.7` and costs `0.1.3` give each Kind a plain display title:
Home, Space, Asset, Maintenance Plan, Service Record, Project and Money Record; Source Record
already had one. Only the `title` of each Kind's definition changes. Each Kind's `governs` type,
such as `My Home Asset`, its links, fields, paths and body are unchanged, so existing records keep
their type and need no migration. A bundle installed from an earlier release keeps its old titles:
`recipe evolve` does not replace an installed title, so set each title by hand, then run
`recipe evolve` to record the new release.

Core release `0.3.2` changes one sentence of the Source Record description: it no longer says
that facts without a field elsewhere stay in the fetched record. A writer may keep a useful fact on
the record it describes, in a field or in the body. No field, link or path changes.

Core release `0.3.3` and costs `0.1.4` drop the same instruction from two more sentences: a past
sale or tax assessment is still never a Money Record, but nothing says it must stay only in the
fetched record. No field, link or path changes.

## Run the executable example

From a reviewed checkout with its locked development dependencies installed:

```sh
npm exec -- node --test scripts/my-home-consumer.test.mjs
```

The test acquires public CLI `0.4.4-pre.9` and Core `0.2.0-pre.41` into a disposable workspace
with an isolated home. It copies the recipe artifacts, uses their normal validation/installation
and strict authoring paths, and removes the fictional bundle afterward. It never selects a
catalogued or live bundle. The test also uses the existing public recipe-set preflight contract
with the explicit [`consumer.json`](consumer.json) requirements; no dependency solver is added.

[`fixture.json`](fixture.json) is synthetic source data, not recipe payload. `reader.mjs` is a
pure read-only reference consumer of parsed documents and public Core links/types. It is not
installed by a recipe or registered as a validator. Its assessed conclusions and test mutations
demonstrate the operating contract; they do not make its domain checks universal write rules.
Future apps can implement the same contract and run these fixtures, rather than importing this
example as a new production service. This reader assesses the explicitly supplied snapshot only;
`asOf` historical cutoffs are rejected. Historical effective revisions and as-known reports need
a separately qualified consumer and retained snapshots, not filtering the latest replacement.

## What the journeys establish

- An actual reported service differs from a plan or checked task. Qualifying work must match the
  Plan subject/procedure and explicit result. Unknown dates stay unknown; incomplete overrides
  are unresolved rather than silently discarded. Historical service location is independent of
  current Asset placement.
- Quotes, budgets, authorized order values, invoice liabilities and cash paid are parallel views,
  never addends in one spend total. Quote preference does not authorize an order.
- Two competing quotes lead to one recorded order, an evidenced order revision and an invoice.
  Partial/final payments remain separate actual events. A correction of a mistyped final amount
  replaces the representation, not the cash event. Credits adjust billed cost; refunds adjust
  reported cash and need explicit allocation effect for invoice balances.
- Header amounts enter totals once. Line breakdowns, contextual service/vendor citations and
  superseded representations are not additional spending. Unallocated deposits/shared expenses
  do not silently pay another invoice or populate every Project subtotal.

## Currency and precision

[`currency-policy.json`](currency-policy.json) pins a reviewed **three-currency subset**: USD scale 2,
JPY scale 0 and KWD scale 3. It records the official SIX ISO 4217 List One source, publication
date, retrieval date and the SHA-256 of the complete XML retrieved for qualification. The JSON is
a derived selection, not that XML. No table is fetched during installation or reading. Other or
historic currencies remain source-text capture until a deliberately reviewed policy supports them.

Store header `amount_minor` as a native safe integer with explicit currency, scale and policy.
Zero is valid. Native integer validation does not enforce nonnegativity, correct currency scale
or conditional completeness; the reference consumer checks those before calculations. It uses
exact integer arithmetic and emits minor-unit decimal strings, not floating point money. Never
infer two decimal places or reuse a payment provider's special API denomination. Preserve original
source amount text; do not round unrepresentable source prices silently.

Source: [SIX currency lists](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html).
Provider examples corroborate the distinct scales and document provider-specific exceptions:
[Stripe](https://docs.stripe.com/currencies), [Adyen](https://docs.adyen.com/development-resources/currency-codes/).

## Integrity boundaries and optional growth

Native Kind declarations cover required fields, supported scalar types/enums and sections on
participating write paths. Relationship cardinality, economic meaning, evidence relevance,
currency policy, allocation and correction-chain consistency remain read-time domain checks.
Raw imports/file edits and other writers can bypass the reference reader. Reports name the
assessed scope and expose excluded/unresolved facts; no verified bank balance, legal liability,
professional acceptance or physical truth is inferred.

Before selecting an existing bundle, inspect its Kinds/customizations and explicitly choose its
privacy boundary. `recipe add` preserves differing definitions and reports drift. Use the
current `recipe evolve` preview for eligible changes; never treat a repeat add as an upgrade.
Keep data and definitions when ceasing an extension. Scoped declaration retirement is not an
instance migration or deletion cascade. No recipe is applied to existing household data by this
example.

Advanced Options/Decisions, decorating, manuals/warranties, histories, energy, detailed allocation
and 3D bindings can later use disjoint extension Kinds. They must reuse core physical identity,
Project and Money Record authority; they do not overwrite amounts into another inventory or
copy source-owned geometry. There is no prerequisite new Core constraint engine.

# My House: fictional consumer qualification

This example exercises three inert recipes: [`my-house`](../../recipes/my-house/recipe.md),
[`my-house-maintenance`](../../recipes/my-house-maintenance/recipe.md) and
[`my-house-costs`](../../recipes/my-house-costs/recipe.md). Together they declare Home, Space,
Asset, Maintenance Plan, Service Record, Project and Money Record. Installing them creates no
household inventory, model binding, scheduler, vendor contact, bank connection or payment.

Start with a Home and one useful item or job. Rooms, equipment and detailed history can be added
when needed. The fictional renter needs no full inventory or address. Financial alternatives
need no Option/Decision hierarchy: separate quotes already preserve the offers.

## Run the executable example

From a reviewed checkout with its locked development dependencies installed:

```sh
npm exec -- node --test scripts/my-house-consumer.test.mjs
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
example as a new production service.

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

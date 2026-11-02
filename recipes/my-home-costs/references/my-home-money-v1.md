---
type: Reference
title: My Home money operating contract v1
---
# My Home money operating contract v1

Select My Home core first. This recipe brings Project and Money Record; no maintenance, Vendor,
Receipt or planning Kind is required. A quote can be captured immediately. Later planning must
reuse Project and this monetary authority rather than add competing conventions or amounts.

## Distinct monetary views

One Money Record represents one amount-bearing fact, document or replacement snapshot.
record_kind is required; unknown allows unclassified capture excluded from totals.

| record_kind | Meaning |
| --- | --- |
| budget | Current owner-stated limit for an exact scope/currency; historical snapshots are not summed |
| estimate | Preliminary expectation with source/uncertainty, not liability or cash |
| quote | Supplier offer at a stated scope/revision; compare alternatives rather than add them |
| commitment | Reported authorized order/intention with who and basis; not proof of supplier acceptance or legal liability |
| invoice | Amount billed, independently of payment |
| payment | Reported actual outgoing cash, not a planned transfer or instruction |
| credit | Documented supplier reduction to an invoice, not cash returned |
| refund | Reported actual cash returned against a payment, not automatically an invoice credit |

Compare scope, tax, delivery, exclusions, allowances and validity as well as quote price.
selection: preferred creates no commitment. A commitment conclusion requires reported authorization
with authorized_by/authorization_basis; retain supplier-acceptance limitations. Saving any record
cannot book work, agree a contract or execute a transfer.

Project stores scope/status/responsibility, not duplicate budget amounts. Home financial reporting
needs exactly one direct stable Project home link; space/asset links are contextual. Current
Asset placement cannot move a historical job to another Home.

## Amount precision and policy

The header is nonnegative safe-integer amount_minor plus uppercase currency and explicit integer
currency_scale: major units equal amount_minor times 10 to the negative scale. Zero is valid;
credit/refund role determines sign. No scale is inferred as 2. Native integer validation does not
verify positivity or currency denomination.

currency_basis names an explicitly selected reviewed policy/source version. The example policy
`my-home-currency-v1-six-2026-09-17` supports its documented subset only: USD scale2, JPY scale0,
KWD scale3, sourced from the SIX list published 2026-09-17. Another policy needs deliberate source
and reader qualification. Installation/read never chooses, fetches or updates policy.

The maintained reference is [SIX ISO 4217 currency/minor-unit lists](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html).
Unknown/historical codes or unavailable minor-unit semantics stay source-text capture until
supported. Provider API denominations may differ; do not adopt their exceptions universally.

Preserve source_amount_text. Convert decimal sources exactly, not binary float times100, and
never silently round excess precision. Keep subminor unit prices in source text while an evidenced
payable total becomes the header. Use exact integer arithmetic with checked intermediates/results
or reviewed arbitrary precision; never return unsafe rounded JavaScript numbers. Mixed currencies
or unverified scales stay separate/unresolved, without automatic FX or a bank balance.

## Native shape versus domain eligibility

Native fields.types covers header amount/scale integers and effective_on/due_on/valid_until dates;
enums cover record_kind, entry_status, allocation_status, tax_basis, selection and refund effect.
Participating strict writes check supplied native values. Raw/import/file paths can differ.

Only eligible recorded facts contribute to a conclusion. recorded is an author assertion, not
verified bank settlement. Draft/disputed/unknown/unclassified facts are visibly excluded; void
needs a reason and cannot erase real cash. Missing required reporting facts or a relevant
unresolved family prevents an unqualified total, not a quiet zero. Native checks do not enforce
conditional completeness, positive amounts, nested lines, relation counts, source truth,
uniqueness or allocation. Readers assess domain rules over an explicit ID/version set.

Effective dates are actual issue/authorization/payment/refund dates when known, not upload dates.
Absent quote expiry is unknown, not unlimited. Undated facts stay separate from dated cutoffs.
“As known then” needs retained versions/snapshots; latest corrected data alone cannot reconstruct it.

## Relationships and evidence

Use exactly one primary reporting scope across project, home and asset for an eligible total.
related asset is context, not extra allocation. incurred for home preserves historical attribution;
conflict with stable Project Home makes the affected report unresolved.

based on preserves monetary lineage; bills commitment connects invoice/order; settles invoice
allocates a payment; credits invoice reduces billed cost; refunds payment links cash returned.
Native vocabulary targets Money Record; role/currency/scope agreement remains domain validation.
The basic path supports at most one invoice per payment/credit and one refunded payment per
refund. Unsupported patterns stay unallocated for affected balances, never copied in full.

Service, supplier/contact and retained file/Artifact/Home Document links are ordinary citations:
navigation/evidence, not typed prerequisites or additional allocations. Preserve supplier/document
identity, revision/page locator and date. Name similarity never merges vendors; source_fact_key
only has its explicit source scope. Potential duplicate invoices/payments need review, not a sum
just because document paths differ. Do not copy amounts into Service/Asset/Project as extra spend.

## Breakdowns, payments and report scope

Optional line_items rows have unique-in-record line_id, description, signed safe-integer
amount_minor and inclusion (included/excluded/optional/allowance), inheriting header currency/scale.
Quantity/unit-price source text can stay uncomputed. Included rows reconcile to the header before
claiming a complete breakdown; clearly incomplete detail does not invalidate an evidenced header.
Rows never add to aggregate amounts on top of the header.

Each partial/final payment is a separate actual fact allocated to its invoice. Payment does not
rewrite invoice total. A deposit can count in gross paid without an invoice, but stays unallocated
for invoice balances. Multi-invoice batching needs later allocation support. A shared multi-project
fact has primary Home scope, shared_unallocated and ordinary Project citations: count once at Home
and exclude from unsupported Project subtotals.

Project reports select exact primary Project scope. Home roll-up membership is the assessed
snapshot's (a) direct Home facts; (b) Project facts with one direct stable home; (c) Asset facts with
explicit incurred for home. Never use current Asset/Space placement. Deduplicate effective fact
families across paths; missing/conflicting attribution stays excluded. Home and Project budgets
may overlap: show separately rather than automatically adding them.

## Corrections, revisions and totals

Preserve source/history with versioned CAS writes. corrects/revises are zero-or-one and mutually
exclusive on replacement. An evidence-backed correction fixes the same fact's erroneous amount,
role/currency/scale/scope and requires revision_reason plus full affected-dependent revalidation.
A new transaction, currency exchange or allocation is not a correction. revises replaces a
snapshot in the same budget/offer/order/invoice family and established role/currency/scope; never
merge successive cash events. Budget/order snapshots replace the old family member; independent
orders add. Quotes are separate offers unless source evidence establishes revision. Branches,
cycles or unexplained identity changes leave the affected family unresolved.

Count one effective record per unambiguous family. Distinct invoices, partial payments, credits
and refunds are separate facts, not superseding links to hide old data. Correcting a mistyped
payment is not another payment; a real refund cannot be hidden by reducing the original payment.

Report assessed snapshot/IDs, date scope, currency and exclusions:

- Budget: one current snapshot for that exact scope; no alternative/historical sums.
- Committed: current recorded authorized order value, not unpaid commitment.
- Net invoiced: invoice headers minus applicable credits.
- Gross paid/refunded/net cash spent: reported actual payments, actual refunds, and their
  difference. Quotes/budgets/orders/invoices are not added to cash spent.
- Per-invoice outstanding: applicable net invoice minus payments explicitly allocated to that
  invoice, plus refunds explicitly reversing those allocations. Flag negative results as possible
  overpayment/credit rather than clamp them.

refund_allocation_effect is reverses_payment_allocation, does_not_reverse (for example evidenced
goodwill rebate), or unknown. Unknown withholds affected invoice balances while valid reported
cash flow can remain visible. Credit alone does not show returned cash; refund alone does not
reduce invoiced cost. An unrelated deposit cannot reduce another invoice balance. Budget less net
spent is cash comparison, not free-to-spend headroom while orders remain.

The fictional reader journey must cover competing quotes, order amendment, invoice, partial/final
payment, corrected capture, credit and refund. Include zero/two/three-decimal, duplicate/fork,
unallocated deposit, shared scope and malformed value cases. Installed definitions run no reader
and grant no universal integrity guarantee. No bank integration, automated payment, tax/interest/
depreciation system, scheduler, model execution or private household data belongs to this slice.

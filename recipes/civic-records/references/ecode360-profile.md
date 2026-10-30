---
type: "Reference"
title: "eCode360 manual capture profile"
---
# eCode360 manual capture profile

Provider-specific guidance layered under the source-neutral Civic Records recipe. This is an inert manual profile, not a registered executable Connector or validated source-engine integration.

Instance configuration: registry URL, provider jurisdiction code, exact body/category, year window and explicit document URLs discovered in that listing. Never hardcode a municipality in the recipe.

Typical public paths are /{jurisdiction_code}/documents/Minutes and /{jurisdiction_code}/document/{document_id}.pdf. Treat observed URLs as evidence, not permission to enumerate numeric ids. Limit a pilot to explicitly discovered links. Verify final response stays on the allowed HTTPS host and same jurisdiction/document path; refuse redirects outside scope. Use response size and timeout bounds.

The listing can hydrate asynchronously and lazy-load years. Its initial HTML may contain only categories. Browser examination can discover records omitted by a plain fetch, and an unexamined loading section means incomplete coverage. Two dates can appear: a labeled meeting date and an unlabeled secondary date. Preserve the latter verbatim until provider documentation confirms semantics.

Use selectable PDF text first and record whether OCR was needed. An eCode category is not proof minutes are approved. An explicit later approval motion is separate evidence. A filename/title may use a date format different from the meeting heading; retain discrepancies.

No official bulk API, automatic source-engine adapter, completeness guarantee or scraping permission beyond the examined reads is established by this profile. A future adapter must be separately implemented, tested on changed/missing/partial responses and reviewed before binding.


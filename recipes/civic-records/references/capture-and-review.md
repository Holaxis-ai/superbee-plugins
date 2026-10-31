---
type: "Reference"
title: "Civic capture and review contract"
---
# Civic capture and review contract

1. Bind a Civic Source to an exact jurisdiction, public body and official listing. A source provider is configuration, never embedded in Kind names. Keep an inventory of examined scope and unexamined pages/tails; sample coverage stays sample.
2. Reuse public native text. Save original bytes and per-page text in a local evidence store with URL, response status, selected non-sensitive headers, UTC observation time and SHA256. Never store cookies or credential headers. Respect robots and access restrictions; errors do not prove absence.
3. Record identity is source key + provider document id + full content digest. A date alone is not identity. Logical meeting key also includes body, date and session. Same URL/hash is a no-op; changed bytes append a revision. Link supersession only after comparing the same provider id. Missing from one listing is not deletion.
4. Keep meeting, publication, approval, effective and observation dates distinct. Missing or unlabeled dates remain unknown. Preserve source contradictions explicitly. Do not infer unanimous vote counts from silence or assume every board member attended.
5. Extract selectable text before OCR. Preserve page boundaries and visible section headings. Compare important passages to rendered pages. OCR or malformed documents require review before extracting facts. Deterministic checks are not independent editorial review.
6. Findings cite record revision, page, heading and source URL. Paraphrase only necessary civic information; citizen home addresses, unrelated personal details and vehicle ids stay out of searchable findings or public copy. Raw official originals stay in the local evidence store during this pilot.
7. A repeated observation without changes is not a new meeting or a new editorial fact. Re-fetch on explicit runs only. Compare hashes; cache text by digest. A silent/failed source never freshens records.
8. Read-only research records do not prove comprehensive monitoring or a production integration. Installing this recipe creates no connector, source binding, schedule, credential, notification or publication.


---
type: "Recipe"
id: "civic-records"
title: "Civic Records"
version: "0.5.0-pre.1"
summary: "Source-neutral, municipality-neutral civic record evidence and unpublished resident-impact findings."
content_policy: "definitions-only"
references: ["references/capture-and-review.md", "references/ecode360-profile.md", "references/editorial-handoff.md", "references/deterministic-text.md"]
---
# Civic Records

Pilot schema derived from three official minutes. Reuse by creating a source instance for the jurisdiction, not editing definitions. No jurisdiction instances, credentials, executable profiles, timers or site publication are installed. Public access remains provider-controlled.

Stable concepts are source, immutable record revision and evidence-linked finding. A finding is an unpublished research lead, never a public Civic Update. See the references for identity, revision, completeness and publication boundaries.

The optional Civic Text layer stores the complete deterministic Markdown extraction of one record revision, independently of AI findings. Full research text can contain personal information; keep the research bundle local/private.

Non-meeting source representations use Civic Evidence without invented meeting dates. The separately installed civic-research recipe adds matters, observations and proposed connections; it does not take ownership of base definitions. Legacy Civic Finding stays here for existing consumers.

The additive private-research Civic Text audience value supports explicitly staged hosted research derivatives. Historical local-private-research values and identities stay unchanged. Neither value grants access or proves confidentiality.

---
type: "Convention"
title: "Civic Observation"
governs: "Civic Observation"
path: "civic-observations/"
description: "A source assertion, interpretation or question with a precise evidence locator and independent date semantics."
fields: {"required": ["title", "jurisdiction_key", "matter_id", "claim_mode", "statement", "evidence_id", "evidence_locator", "date_scope", "verification_state"], "optional": ["asserted_date", "verification_needed"], "values": {"claim_mode": ["source-assertion", "interpretation", "open-question"], "date_scope": ["meeting-date", "reported-event-date", "publication-date", "forecast", "unknown"], "verification_state": ["unreviewed", "supported-as-source-assertion", "unresolved", "rejected"]}, "types": {"asserted_date": "date"}, "descriptions": {"claim_mode": "Separate what a source asserts from a researcher inference or unanswered question. Source-backed does not automatically mean true/current.", "evidence_locator": "Page/section/line or retained-representation locator sufficient to inspect the actual passage.", "date_scope": "The date role of this assertion; never collapse meeting, publication, observation, codification-through, adoption and effective dates. State finer distinctions in the statement/body.", "verification_state": "Supported-as-source-assertion confirms only that the inspected source makes this assertion, not that an event occurred or that the source was legally authoritative.", "verification_needed": "Specific missing document, identity link, approval or newer confirmation. Absence from a partial sample is not evidence of absence."}}
links: {"about": "Civic Matter", "supported by": "Civic Record", "web evidence": "Civic Evidence"}
---
# Civic Observation

The evidence_id must resolve to the linked base Civic Record or Civic Evidence. Recipe validation checks shape; evidence relevance and truth require inspection/review, not an enum.

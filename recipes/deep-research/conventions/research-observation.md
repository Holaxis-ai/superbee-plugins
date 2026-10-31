---
type: Convention
title: Research Observation
governs: Research Observation
path: research-observations/
description: A located account of what was actually examined, separate from an inference.
fields:
  required: [title, observation, locator, inspection_mode]
  optional: [observed_on, method_note, limitations]
  types:
    observed_on: date
  values:
    inspection_mode: [source_text, source_image, supplied_transcript, extracted_text, search_snippet, dataset, execution_output, other]
  descriptions:
    observation: What the inspected material says or shows, without silently converting an assertion into an event or decision.
    locator: Page, section, timestamp, row, output key or other precise location within the linked Source; distinguish printed and viewer numbering.
    inspection_mode: The representation actually inspected; a supplied transcript or snippet is not inspection of an underlying recording or document.
    method_note: How the observation was made; use a method/run companion when execution identity and reproducibility need separate records.
    limitations: Material omissions, extraction uncertainty or scope restrictions; unknown is not a negative observation.
links:
  drawn from: Research Source
  supersedes observation: Research Observation
link_descriptions:
  drawn from: The exact Source inspected. Write this link explicitly; schema validity alone does not prove its presence or relevance.
  supersedes observation: A corrected observation of the same bounded material; retain the earlier account and explain the correction.
sections: [Observation, Evidence and method, Limits]
---
# Research Observation

Normally one observation has one `drawn from` Source link. Split observations when
different inputs or locators would otherwise be obscured. This is a workflow rule,
not an automatic cardinality constraint. A source statement can be faithfully
observed while its real-world content remains false or unverified.

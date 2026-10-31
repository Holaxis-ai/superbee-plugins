---
type: Convention
title: Research Source
governs: Research Source
path: research-sources/
description: An identifiable research input with explicit inspection and access limits.
fields:
  required: [title, citation, inspection_state]
  optional: [source_url, source_date, accessed_on, inspection_scope, acquisition_state, representation, independence_group, rights_note]
  types:
    source_url: https-url
    accessed_on: date
  values:
    inspection_state: [referenced, inspected, unavailable]
    acquisition_state: [identified, requested, partial, obtained]
  descriptions:
    citation: Identify the input, edition or revision sufficiently to locate it again; a URL is optional. If local bytes are retained, record their exact path and its base in Inspection and access so a later reader can find them from this Source alone.
    inspection_state: What this study actually examined, not the source's authority, completeness or truth.
    inspection_scope: Exact portion or representation inspected and material omissions. An inspected snippet does not make the underlying document inspected.
    acquisition_state: Acquisition of the selected representation, independent of substantive review or answering a question.
    representation: Actual medium examined, such as original response bytes, screenshot, supplied transcript or dataset revision; never invent custody or capture.
    independence_group: Shared origin of copies or derivatives; multiple URLs do not establish independent corroboration. Different labels also do not prove independence; identify known overlap and state unresolved lineage without inventing derivation edges.
    source_date: Source date or revision label; distinguish event, publication and capture dates in the body.
    rights_note: Recorded use limitations; public accessibility does not establish permission to republish.
links:
  derived from: Research Source
link_descriptions:
  derived from: The identified parent input; a derivative is not an additional independent witness.
sections: [Identity and scope, Inspection and access, Limits]
---
# Research Source

A paper, interview, dataset, archival item, software artifact or other research input.
One record identifies a selected input/representation, not every revision ever issued.
If several captures or transformations matter, use a separately designed companion.
Do not manufacture a Source merely to attach a confidence score to an agent's prose.

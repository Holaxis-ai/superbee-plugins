---
type: Reference
title: Selected saved camera observations
resource: urn:example:camera-study
target_kind: Camera Observation
identity:
  id: "{key}"
fields:
  title: camera.camera
  lens_mm: camera.lensMm
  frame: camera.frame
  unit_system: camera.unitSystem
  scale_length: camera.scaleLength
owned_fields: [title, lens_mm, frame, unit_system, scale_length]
auto_apply: [new, changed]
needs_review: [disappeared]
missing_threshold: 2
completeness: partial
---
# Selected saved camera observations

This source observes one explicitly selected export. It does not enumerate every camera or
assembly. The stable key is chosen by the caller; the camera name is a mapped display fact.

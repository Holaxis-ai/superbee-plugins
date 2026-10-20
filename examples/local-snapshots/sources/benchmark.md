---
type: Reference
title: Tiny benchmark suite observations
resource: urn:example:benchmark-suite
target_kind: Benchmark Result
identity:
  id: "{key}"
fields:
  title: result.label
  p95_ms: result.metrics.latency.p95_ms
  passed: result.metrics.checks.passed
  suites: result.metadata.suites
owned_fields: [title, p95_ms, passed, suites]
auto_apply: [new, changed]
needs_review: [disappeared]
missing_threshold: 2
completeness: complete
scope: tiny-suite-v1
---
# Tiny benchmark suite observations

Only cases in the explicitly declared tiny-suite-v1 scope are enumerated. Completion has no
meaning for other suites, runs, machines or resources.

---
type: Convention
title: Benchmark Result
governs: Benchmark Result
path: benchmark-results/
fields:
  required: [title]
  optional: [p95_ms, passed, suites]
  types:
    p95_ms: number
    passed: integer
    suites: string-list
---
# Benchmark Result

One synthetic benchmark case with ordinary human notes in its body.

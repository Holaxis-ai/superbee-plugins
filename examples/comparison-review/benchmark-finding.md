# Observation

Synthetic `case-search-001` reports p95={{p95_ms}} ms for the existing tiny workload. This is
fixture data, not a performance experiment. The method is comparison of a declared p95 scalar;
repeatability and statistical uncertainty were not measured.

# Expected result

The illustrative review budget is 12 ms, chosen for this example only. Existing g1=12.5 ms and
g2=13 ms differ by 0.5 ms (+4% relative to g1); neither establishes statistical significance or
a real service requirement. Absence of another case is not latency zero.

# Evidence

[evidence](../{{artifact_id}}.md)

| Basis | Recorded identity |
| --- | --- |
| Artifact ID | `{{artifact_id}}` |
| Artifact entry | `{{artifact_entry}}` |
| Artifact entry_version | `{{artifact_entry_version}}` |
| Source resource | `urn:example:benchmark-suite` |
| External ID | `case-search-001` |
| Capture generation | {{generation}} |
| Exact snapshot SHA256 | `{{snapshot_sha256}}` |
| Workload SHA256 | `sha256:621d847c3b0729b8b53885f3b569a90898be9a3ed4f9ff1fd5a24c7d8df6e53d` |
| Association | caller_asserted; synthetic fixture, no real benchmark run |

The [result](../benchmark-results/search.md) and [source](../sources/benchmark.md) can advance
without rewriting this finding. The declared workload identity is the applicability basis;
output bytes alone cannot establish currentness.

# Decision

Initially open for the synthetic process actor to investigate this illustrative budget exceedance.
The current disposition is recorded in progress_status, resolution and decided_at. Any resolution is limited to this fixture and evidence basis; it is not a human performance
acceptance or permission to run tools.

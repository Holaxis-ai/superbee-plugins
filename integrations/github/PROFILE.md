# GitHub issues source profile

`createSourceProfile(helpers)` from `@superbee/integration-github/profile` composes the
first-party REST profile with the host's public Core helpers. Its spec is the
Connector source, including a pinned request declaration; it shares `rest-json` request execution
and the source engine's transport, provider scope, budgets, commit/replay and machine state.

Profile version 2 supports two existing Core paging modes. Both use GET `https://api.github.com/repos/{owner}/{repo}/issues`, `items: ""`,
`query.state: all`, and `complete: always`. Identity resource is
`https://github.com/{owner}/{repo}`.

The canonical Connector version 2 uses an authored `bound-get` read policy and Core
`page-number` paging: exactly `page`, `per_page`, size 1–100 (canonical size 100), with
`sort: updated` and `direction: asc`. It declares only Issues and metadata read minima and
GitHub header-provider authority. Core validates the policy, binds its repository scope, renders
requests and owns cursor validation and exhaustion. A full raw provider page requires another
page even when normalization excludes pull requests; a short raw page ends traversal. Link
headers do not steer numeric paging. Static paging parameters, other filters, watermarks and
request bodies are refused. The host must supply explicit approval of the exact inspected
policy digest; this adapter neither synthesizes a policy nor approves it.

Legacy `link-header` declarations retain their existing behavior, including optional
`updated_at` watermark through `since` and fixed static `per_page`. They are not rewritten into
an explicit bound-read policy.

Provider normalization owns projections and pull-request exclusion; request transforms and skip
rules are refused. No credentials, network globals or writes live in the profile.

The profile checks each row's `repository_url` against the bound repository, then projects the
reviewed scalar paths, `labels[].name`, and `github:`-prefixed `assignees[].login`. Lists are sorted
and deduplicated. It synthesizes repository/key/state_key/close_reason; the singular assignee,
source body and navigation URLs are not presented. Unknown provider fields are not copied.
`normalizeGithubIssue`, `GITHUB_FIELD_COVERAGE`, and `uncoveredGithubFields` are shared with fixtures.

In legacy Link mode, GitHub commonly returns numeric `/repositories/{id}/issues` Link targets without repository id
metadata in issue rows. The profile never requests that numeric path or treats its id as identity.
It reuses only the paging query against the original named bound repository, which must pass the
engine's existing query guard. Every next page needs a positive safe integer `page` or one opaque `after` cursor (both may
be present). The provider request guard bounds `after` to one nonempty printable ASCII value
of at most 2048 decoded characters; it is retained as query data. Explicit page size stays fixed. Foreign hosts and unrelated paths are refused by the existing guard.
The stored cursor contains the bound named path. This does not authorize repository transfers.

A resumed run restarts the listing in either mode because page positions are unstable across runs. Only a
fresh complete-mode traversal can claim a complete observation; incremental and resumed runs do
not establish absence. Conditional 304, malformed JSON/rows/links and interrupted pages cannot
claim completeness. Committed pages retain the engine's replay semantics.

Recorded fixtures follow the official [repository issues response](https://docs.github.com/en/rest/issues/issues#list-repository-issues)
and [REST pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)
(reference checked 2026-10-19, including documented REST Link `before`/`after` pagination; only
forward `after` is admitted for this profile, API version 2026-03-10). Values are invented. These fixtures establish
offline profile behavior; they do not establish live-provider, installed-CLI, credential or release proof.

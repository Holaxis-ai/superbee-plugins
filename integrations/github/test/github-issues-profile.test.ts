import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {bindSourceFeed, inspectSourceReadPolicy, parseConnectorDoc, type Connector, type ConnectorRequest} from "@superbee/core/connectors";
import {buildKindRegistry} from "@superbee/core/kinds";
import {fetchIdentity, MemoryMachineState, observeSource, type PageCommit} from "@superbee/core/source-engine";
import {githubIssuesProfile, normalizeGithubIssue, uncoveredGithubFields} from "./profile.js";
import {peerTransport, ScriptedPeer, type PeerRequest, type PeerResponse} from "@superbee/core/source-harness";

// https://docs.github.com/en/rest/issues/issues#list-repository-issues
// https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api
const fixture = JSON.parse(await readFile(new URL("../fixtures/repository-issues.json", import.meta.url), "utf8"));
const issues = fixture.issues as Array<Record<string, any>>;
const parameters = {owner: "example-org", repo: "widgets"};
const request = (): ConnectorRequest => ({host: "api.github.com", method: "GET", path: "/repos/{owner}/{repo}/issues", query: {state: "all", sort: "updated", direction: "asc", per_page: 100}, headers: {accept: "application/vnd.github+json", "x-github-api-version": "2026-03-10"}, items: "", paging: {kind: "link-header"}, complete: "always"});
const registry = buildKindRegistry([{id: "conventions/issue", body: "", frontmatter: {type: "Convention", title: "Issue", governs: "Issue", path: "issues/", fields: {required: ["title"], optional: ["state", "labels", "assignees"], types: {labels: "string-list", assignees: "string-list"}}}}], [], {okfVersion: "0.2"});
function connector(): Connector {
  const parsed = parseConnectorDoc({id: "connectors/github", body: "", frontmatter: {type: "Connector", title: "GitHub", auth: {kind: "token", provider: "github"}, domains: [], record_sources: [{name: "issues", profile: "github-issues", target_kind: "Issue", identity: {resource: "https://github.com/{owner}/{repo}", id: "{node_id}"}, fields: {title: "title", state: "state_key"}, completeness: "complete", request: request()}]}}, {kinds: registry});
  assert.ok(parsed.ok, JSON.stringify(parsed)); return parsed.connector;
}
function world(answer: (input: PeerRequest) => PeerResponse, state = new MemoryMachineState()) {
  const c = connector();
  const bound = bindSourceFeed(c, {id: "source-feeds/github", frontmatter: {type: "Source Feed", connector: c.id, source: "issues", url: "https://github.com/example-org/widgets", owned_fields: ["title", "state"], auto_apply: ["new", "changed"], missing_threshold: 1}}, registry, {okfVersion: "0.2"});
  const peer = new ScriptedPeer(answer);
  const commits: PageCommit[] = [];
  return {c, bound, peer, state, commits, run: (extra: Record<string, unknown> = {}) => observeSource({connector: c, bound, profile: githubIssuesProfile, spec: c.sources[0], transport: peerTransport(peer), state, identity: fetchIdentity("GitHubProfileTest/1 (+https://example.org/test)")!, mode: "complete", now: () => new Date("2026-10-19T00:00:00Z"), commit: async page => {commits.push(page);}, ...extra})};
}
const json = (rows: unknown, headers: Record<string, string> = {}): PeerResponse => ({status: 200, body: JSON.stringify(rows), headers});
const next = (path = "/repos/example-org/widgets/issues", page = 2) => `<https://api.github.com${path}?state=all&sort=updated&direction=asc&per_page=100&page=${page}>; rel="next"`;

test("public GitHub profile projects the official issue shape through one normalizer", () => {
  assert.equal(githubIssuesProfile.id, "github-issues");
  assert.equal(fixture.provenance.apiVersion, "2026-03-10");
  for (const issue of issues) assert.deepEqual(uncoveredGithubFields(issue), []);
  const row = normalizeGithubIssue(issues[0]!, parameters)!;
  assert.deepEqual(row.labels, ["bug", "help wanted"]);
  assert.deepEqual(row.assignees, ["github:octocat", "github:zebra"]);
  assert.equal(row.key, "example-org/widgets#42");
  assert.equal(row.close_reason, null);
  assert.equal(row.type_name, "Bug");
  for (const key of ["id", "body", "url", "user", "milestone", "comments_url"]) assert.equal(Object.hasOwn(row, key), false);
  const closed = normalizeGithubIssue({...issues[0], state: "closed", state_reason: "duplicate"}, parameters)!;
  assert.equal(closed.state_key, "closed:duplicate"); assert.equal(closed.close_reason, "duplicate");
  assert.equal(normalizeGithubIssue({...issues[0], pull_request: {}}, parameters), null);
  assert.deepEqual(normalizeGithubIssue({...issues[0], labels: [], assignees: [], assignee: {login: "ignored"}}, parameters)!.assignees, []);
});

test("malformed native lists and repository mismatch fail rather than clearing fields", () => {
  for (const edit of [{repository_url: "https://api.github.com/repos/other/widgets"}, {labels: [{}]}, {assignees: [{name: "wrong"}]}, {labels: null}, {number: 1.5}, {state_reason: {}}, {node_id: null}]) {
    assert.throws(() => normalizeGithubIssue({...issues[0], ...edit}, parameters));
  }
});

test("profile refuses filters, transforms and different repository listing shapes before transport", async () => {
  for (const edit of [(r: any) => r.query.state = "open", (r: any) => r.query.labels = "bug", (r: any) => r.fields = {title: {const: "wrong"}}, (r: any) => r.skip = [{path: "state", present: true}], (r: any) => r.path = "/repos/{owner}/{repo}/pulls", (r: any) => r.paging = {kind: "none"}]) {
    const h = world(() => json([])); edit(h.c.sources[0]!.request);
    assert.equal(githubIssuesProfile.validateSpec(h.c.sources[0]).ok, false);
    assert.notEqual((await h.run()).outcome, "observed"); assert.deepEqual(h.peer.received, []);
  }
});

test("complete paged observation excludes PRs and never exposes ignored fields", async () => {
  const h = world(input => new URL(input.url).searchParams.has("page") ? json([issues[1]]) : json([issues[0], {...issues[0], pull_request: {}}], {link: next()}));
  const result = await h.run();
  assert.equal(result.outcome, "observed"); assert.equal(result.pages, 2); assert.equal(result.pass.complete, true);
  assert.equal(result.changes.new, 2); assert.equal(result.profile_diagnostics[0]?.code, "PULL_REQUEST_SKIPPED");
  assert.equal(h.commits[0]!.records[issues[0]!.node_id]!.fields.title, issues[0]!.title);
});

for (const target of ["https://evil.example/issues", "https://api.github.com/repos/other/widgets/issues"]) test(`paging cannot broaden bound resource: ${target}`, async () => {
  const h = world(() => json([issues[0]], {link: `<${target}?state=all&sort=updated&direction=asc&per_page=100&page=2>; rel="next"`}));
  const result = await h.run(); assert.equal(result.outcome, "refused"); assert.equal(result.pass.complete, false); assert.equal(h.peer.received.length, 1);
});

test("numeric provider links reuse only paging against the original bound repository", async () => {
  for (const numericId of [123, 999]) {
    const h = world(input => new URL(input.url).searchParams.has("page") ? json([issues[1]]) : json([issues[0]], {link: next(`/repositories/${numericId}/issues`)}));
    const result = await h.run(); assert.equal(result.outcome, "observed"); assert.equal(result.pass.complete, true);
    assert.ok(h.peer.received.every(input => new URL(input.url).pathname === "/repos/example-org/widgets/issues"));
    assert.equal(h.peer.received.length, 2);
  }
});

test("numeric link translation preserves query guards and rejects malformed page numbers", async () => {
  for (const link of [next("/repositories/123/issues").replace("state=all", "state=open"), next("/repositories/123/issues").replace("page=2", "page=0"), next("/repositories/123/issues").replace("page=2", "page=2&page=3"), next("/repositories/123/issues").replace("per_page=100", "per_page=1"), next().replace("page=2", "page=0")]) {
    const h = world(() => json([issues[0]], {link})); const result = await h.run();
    assert.notEqual(result.outcome, "observed"); assert.equal(result.pass.complete, false); assert.equal(h.peer.received.length, 1);
  }
});

test("interrupted Link paging restarts and incremental observation never counts absence", async () => {
  const h = world(input => new URL(input.url).searchParams.has("page") ? {status: 429, body: ""} : json([issues[0]], {link: next("/repositories/123/issues")}));
  const first = await h.run(); assert.equal(first.outcome, "deferred"); assert.equal(first.pages, 1); assert.equal(first.pass.complete, false);
  assert.ok(!JSON.stringify(first.cursor).includes("/repositories/"));
  const resumed = world(() => json([]), h.state);
  const result = await resumed.run({mode: "incremental"});
  assert.equal(result.pass.resumed, true); assert.equal(result.pass.complete, false); assert.equal(result.changes.disappeared, 0);
  assert.equal(new URL(resumed.peer.received[0]!.url).searchParams.has("page"), false);
});

test("failed commit replays the pending normalized change before requesting another page", async () => {
  const h = world(() => json([issues[0]]));
  const first = await h.run({commit: async () => ({retry: [issues[0]!.node_id]})}); assert.equal(first.pending, 1);
  let replayed = false;
  const second = await h.run({mode: "incremental", commit: async (page: PageCommit) => {if (page.replay) {replayed = true; assert.equal(page.records[issues[0]!.node_id]!.fields.title, issues[0]!.title);}}});
  assert.equal(second.outcome, "observed"); assert.equal(replayed, true); assert.equal(second.pending, 0);
});

const pagingFixture = JSON.parse(await readFile(new URL("../fixtures/paging.json", import.meta.url), "utf8"));
for (const withPage of [true, false]) test(`observed GitHub opaque after Link stays bound and preserves cursor (page=${withPage})`, async () => {
  const link = new URL(pagingFixture.next);
  if (!withPage) link.searchParams.delete("page");
  const h = world(input => new URL(input.url).searchParams.has("after") ? json([issues[1]]) : json([issues[0]], {link: `<${link.href}>; rel="next"`}));
  const result = await h.run();
  assert.equal(result.outcome, "observed"); assert.equal(result.pages, 2); assert.equal(result.pass.complete, true);
  const second = new URL(h.peer.received[1]!.url);
  assert.equal(second.origin, "https://api.github.com"); assert.equal(second.pathname, "/repos/example-org/widgets/issues");
  assert.equal(second.searchParams.get("after"), new URL(pagingFixture.next).searchParams.get("after"));
  assert.equal(second.searchParams.get("state"), "all"); assert.equal(second.searchParams.get("per_page"), "100");
});

for (const token of ["a&state=open/{owner}#?", "x".repeat(2048)]) test(`opaque cursor remains a bounded query value (${token.length} chars)`, async () => {
  const link = new URL(pagingFixture.next); link.searchParams.set("after", token);
  const h = world(input => new URL(input.url).searchParams.has("after") ? json([]) : json([issues[0]], {link: `<${link.href}>; rel="next"`}));
  const result = await h.run(); assert.equal(result.outcome, "observed");
  const second = new URL(h.peer.received[1]!.url);
  assert.equal(second.pathname, "/repos/example-org/widgets/issues"); assert.equal(second.searchParams.get("state"), "all");
  assert.equal(second.searchParams.get("after"), token); assert.equal(second.searchParams.getAll("state").length, 1);
});

for (const [name, edit] of [
  ["oversized cursor", (url: URL) => url.searchParams.set("after", "x".repeat(2049))],
  ["duplicate cursor", (url: URL) => url.searchParams.append("after", "second")],
  ["empty cursor", (url: URL) => url.searchParams.set("after", "")],
  ["cursor control", (url: URL) => url.searchParams.set("after", "x\ny")],
  ["changed filter", (url: URL) => url.searchParams.set("state", "open")],
  ["foreign repository", (url: URL) => {url.pathname = "/repos/other/widgets/issues";}],
  ["foreign host", (url: URL) => {url.hostname = "other.example";}],
] as const) test(`observed cursor Link refuses ${name} without a second request`, async () => {
  const link = new URL(pagingFixture.next); edit(link);
  const h = world(() => json([issues[0]], {link: `<${link.href}>; rel="next"`}));
  const result = await h.run(); assert.notEqual(result.outcome, "observed"); assert.equal(result.pass.complete, false);
  assert.equal(h.peer.received.length, 1); assert.equal(result.changes.disappeared, 0);
});

test("interrupted opaque Link pass never persists numeric authority and resumes from the bound first page", async () => {
  const h = world(input => new URL(input.url).searchParams.has("after") ? {status: 429, body: ""} : json([issues[0]], {link: `<${pagingFixture.next}>; rel="next"`}));
  const first = await h.run(); assert.equal(first.outcome, "deferred"); assert.equal(first.pages, 1);
  assert.ok(!JSON.stringify(first.cursor).includes("/repositories/")); assert.ok(JSON.stringify(first.cursor).includes("after="));
  const resumed = world(() => json([]), h.state); const second = await resumed.run({mode: "incremental"});
  assert.equal(second.pass.resumed, true); assert.equal(second.pass.complete, false); assert.equal(second.changes.disappeared, 0);
  assert.equal(new URL(resumed.peer.received[0]!.url).searchParams.has("after"), false);
});

/** Explicit test declaration; approval is supplied by the test, never by the adapter. */
function reviewedPageRequest(): ConnectorRequest {
  return {...request(), query: {state: "all", sort: "updated", direction: "asc"},
    paging: {kind: "page-number", page_param: "page", size_param: "per_page", size: 100},
    read_policy: {contract: 1, kind: "bound-get", bindings: {owner: "segment", repo: "segment"},
      required_permissions: {issues: "read", metadata: "read"}, header_provider: "github"}};
}
function pageWorld(answer: (input: PeerRequest) => PeerResponse, state = new MemoryMachineState()) {
  const h = world(answer, state);
  h.c.sources[0]!.request = reviewedPageRequest();
  const approval = {contract: 1 as const, digest: inspectSourceReadPolicy(h.c, h.bound).digest};
  return {...h, approval, run: (extra: Record<string, unknown> = {}) => h.run({readPolicyApproval: approval, ...extra})};
}

test("explicit Issues page-number policy executes through public Core without Link navigation", async () => {
  const h = pageWorld(() => json([issues[0]], {link: next("/repositories/999/issues")}));
  assert.equal(githubIssuesProfile.validateSpec(h.c.sources[0]).ok, true);
  const result = await h.run();
  assert.equal(result.outcome, "observed", JSON.stringify(result));
  assert.equal(result.pages, 1); assert.equal(result.pass.complete, true); assert.equal(h.peer.received.length, 1);
  const url = new URL(h.peer.received[0]!.url);
  assert.equal(url.pathname, "/repos/example-org/widgets/issues");
  assert.deepEqual([...url.searchParams].sort(), [["direction", "asc"], ["page", "1"], ["per_page", "100"], ["sort", "updated"], ["state", "all"]]);
});

test("numeric exhaustion counts the raw provider page before pull-request exclusion", async () => {
  const full = Array.from({length: 100}, (_, i) => i === 0 ? issues[0] : {...issues[0], pull_request: {}});
  const h = pageWorld(input => new URL(input.url).searchParams.get("page") === "1" ? json(full) : json([]));
  const result = await h.run();
  assert.equal(result.outcome, "observed", JSON.stringify(result)); assert.equal(result.pages, 2);
  assert.equal(result.pass.complete, true); assert.equal(result.changes.new, 1);
  assert.deepEqual(h.peer.received.map(row => new URL(row.url).searchParams.get("page")), ["1", "2"]);
  assert.equal(result.profile_diagnostics.find(row => row.code === "PULL_REQUEST_SKIPPED")?.count, 99);
});

for (const [name, edit] of [
  ["missing policy", (r: ConnectorRequest) => delete r.read_policy],
  ["other page parameter", (r: ConnectorRequest) => r.paging!.page_param = "after"],
  ["other size parameter", (r: ConnectorRequest) => r.paging!.size_param = "limit"],
  ["oversized page", (r: ConnectorRequest) => r.paging!.size = 101],
  ["fractional page size", (r: ConnectorRequest) => r.paging!.size = 1.5],
  ["source-supplied page", (r: ConnectorRequest) => r.query!.page = 1],
  ["source-supplied size", (r: ConnectorRequest) => r.query!.per_page = 100],
  ["opaque cursor", (r: ConnectorRequest) => r.query!.after = "cursor"],
  ["arbitrary filter", (r: ConnectorRequest) => r.query!.labels = "bug"],
  ["different sort", (r: ConnectorRequest) => r.query!.sort = "created"],
  ["different direction", (r: ConnectorRequest) => r.query!.direction = "desc"],
  ["missing minimum", (r: ConnectorRequest) => delete r.read_policy!.required_permissions!.metadata],
  ["other permission", (r: ConnectorRequest) => r.read_policy!.required_permissions!.contents = "read"],
  ["body", (r: ConnectorRequest) => r.body = {}],
  ["watermark", (r: ConnectorRequest) => r.watermark = {field: "updated_at", param: "since", overlap_seconds: 0}],
] as const) test(`explicit numeric profile rejects ${name} through existing validation`, async () => {
  const h = pageWorld(() => json([])); edit(h.c.sources[0]!.request!);
  assert.equal(githubIssuesProfile.validateSpec(h.c.sources[0]).ok, false);
  assert.notEqual((await h.run()).outcome, "observed"); assert.equal(h.peer.received.length, 0);
});

for (const approval of [undefined, {contract: 1, digest: `sha256:${"0".repeat(64)}`}]) test(`explicit numeric policy refuses ${approval ? "stale" : "absent"} approval before callbacks`, async () => {
  const h = pageWorld(() => json([])); let callbacks = 0;
  const fail = () => { callbacks++; throw new Error("must not enter profile"); };
  const result = await h.run({readPolicyApproval: approval, profile: {...githubIssuesProfile, validateSpec: fail, hostsFor: fail, observe: fail}});
  assert.equal(result.reason, "read_policy_unapproved"); assert.equal(callbacks, 0); assert.equal(h.peer.received.length, 0);
});

for (const edit of [
  (r: ConnectorRequest) => r.headers!["x-github-api-version"] = "2022-11-28",
  (r: ConnectorRequest) => r.paging!.size = 30,
  (r: ConnectorRequest) => r.path = "/repos/{owner}/{repo}/pulls",
]) test("authored policy changes require the original exact scope to be reviewed again", async () => {
  const h = pageWorld(() => json([])); edit(h.c.sources[0]!.request!);
  assert.notEqual(inspectSourceReadPolicy(h.c, h.bound).digest, h.approval.digest);
  assert.equal((await h.run()).reason, "read_policy_unapproved"); assert.equal(h.peer.received.length, 0);
});

for (const [name, url, headers, method] of [
  ["extra cursor", "https://api.github.com/repos/example-org/widgets/issues?state=all&sort=updated&direction=asc&per_page=100&page=1&after=x", undefined, undefined],
  ["duplicate page", "https://api.github.com/repos/example-org/widgets/issues?state=all&sort=updated&direction=asc&per_page=100&page=1&page=2", undefined, undefined],
  ["zero page", "https://api.github.com/repos/example-org/widgets/issues?state=all&sort=updated&direction=asc&per_page=100&page=0", undefined, undefined],
  ["other repository", "https://api.github.com/repos/other/widgets/issues?state=all&sort=updated&direction=asc&per_page=100&page=1", undefined, undefined],
  ["numeric provider alias", "https://api.github.com/repositories/999/issues?state=all&sort=updated&direction=asc&per_page=100&page=1", undefined, undefined],
  ["changed header", undefined, {accept: "text/html", "x-github-api-version": "2026-03-10"}, undefined],
  ["extra header", undefined, {accept: "application/vnd.github+json", "x-github-api-version": "2026-03-10", "x-extra": "x"}, undefined],
  ["POST", undefined, undefined, "POST"],
] as const) test(`actual public guard refuses ${name} despite permissive caller hooks`, async () => {
  const h = pageWorld(() => json([]));
  const result = await h.run({profile: {...githubIssuesProfile, async observe({transport}: any) {
    await transport.request({url: url ?? "https://api.github.com/repos/example-org/widgets/issues?state=all&sort=updated&direction=asc&per_page=100&page=1",
      headers: headers ?? {accept: "application/vnd.github+json", "x-github-api-version": "2026-03-10"}, ...(method ? {method} : {})});
    return {records: [], nextCursor: null, more: false, complete: false};
  }}, rules: {url: () => true, header: () => true, post: () => true}});
  assert.equal(result.outcome, "refused"); assert.equal(h.peer.received.length, 0);
});

test("numeric interruption restarts through Core page one without counting absence", async () => {
  const rows = Array.from({length: 100}, () => issues[0]);
  const h = pageWorld(input => new URL(input.url).searchParams.get("page") === "1" ? json(rows) : {status: 429, body: ""});
  const first = await h.run(); assert.equal(first.outcome, "deferred"); assert.equal(first.pages, 1);
  assert.deepEqual(first.cursor, {page: 2, since: ""}); assert.equal(first.pass.complete, false);
  const resumed = pageWorld(() => json([]), h.state), next = await resumed.run({mode: "incremental"});
  assert.equal(next.pass.resumed, true); assert.equal(next.pass.complete, false); assert.equal(next.changes.disappeared, 0);
  assert.equal(new URL(resumed.peer.received[0]!.url).searchParams.get("page"), "1");
});

for (const response of [{status: 304, body: ""}, {status: 200, body: "{"}, {status: 200, body: "null"}]) test("numeric invalid/conditional pages never claim completeness", async () => {
  const h = pageWorld(() => response), result = await h.run();
  assert.equal(result.pass.complete, false); assert.equal(result.changes.disappeared, 0);
});

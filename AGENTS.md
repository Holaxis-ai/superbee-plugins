# Agent entrypoint

Read CONTRIBUTING.md before changes. Coordinate project work through the maintainer-selected
Superbee Development bundle; do not initialize a replacement board or guess a workspace.

Keep provider adapters and declarative recipes here. Reuse public Superbee APIs; never copy the
engine, parser, transport policy or credential custody from Core or hosted. Package tests must
work against installed public artifacts without sibling checkout imports.

Builders own scoped changes, focused evidence and a commit. The orchestrator owns board sync,
integration and feature-branch pushes. Independent exact-head review precedes adversarial QA for
loading, permissions, concurrency and release mechanics. Maintainers own PR merges and releases;
do not infer npm publication or deployment authority from source implementation approval.

Never print credentials, run npm publication mutations without explicit authorization, approve a
human consent/2FA gate, or put private provider data in fixtures. Keep examples synthetic.

## Qualified Decision and Research pilot

Before creating Decision or Research records, read the current pilot status below.
The pilot may be on hold; installation alone does not authorize new records.

When the pilot is active, for new Superbee-plugins decisions in Development use `github.com/holaxis-ai/superbee-plugins/decision/Decision`. The bare
`Decision` type is historical in this pilot; do not create new plugin decisions
with it or retype old records. Titles are display labels, not type aliases.

Before authoring, read `tasks/decision-research-live-pilot` and
`context-notes/decision-research-live-pilot-20261116` through the Superbee CLI in
the selected bundle. They own the current pilot status and stop conditions. Use
`superbee kinds` to inspect required fields and exact selectors. For example:

```sh
superbee list --type 'github.com/holaxis-ai/superbee-plugins/decision/Decision' --dir <selected-bundle>
```

The Decision Question and Decision Option types use that same `decision/`
namespace. Research Source, Research Observation, Research Claim and Research
Question use `github.com/holaxis-ai/superbee-plugins/deep-research/`. Task stays
`Task`. Use fresh descriptive `plugins-pilot-` slugs and strict `superbee new`;
ordinary folder names do not select a Kind. Follow each declared relationship's
exact target type. Cite historical bare records without relabeling them as
qualified typed targets.

This rule is scoped to this project's approved pilot in Development. It does not
select a default for other projects, bundles or third-party Decision Kinds.

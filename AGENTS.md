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

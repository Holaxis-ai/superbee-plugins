# Decision recipe: synthetic composed example

This example is entirely fictional. It contains one Decision Case, two
Decision Options, one recorded Decision, and two built-in Tasks. A completed
investigation and an open implementation task remain distinct. No actual
provider service, authenticated approval or automated execution is claimed.

The six standalone Markdown records in `records/` are example instances,
**not** recipe payload. Installing `recipes/decision` creates none of them.

## Reproduce in a fresh local bundle

From a reviewed checkout with a compatible installed Superbee CLI, choose
an **absent** location outside all current bundles. This is explicitly
invoked local example work, not something the recipe executes:

```sh
REPO=/absolute/path/to/reviewed-superbee-plugins
BUNDLE=/absolute/path/to/absent-example-bundle

superbee init --create-only --recipe none --dir "$BUNDLE"
superbee recipe add work-tracking --actor process:decision-example --dir "$BUNDLE"
superbee recipe add "$REPO/recipes/decision" --actor process:decision-example --dir "$BUNDLE"

for relative in \
  decision-options/service-a.md \
  decision-options/service-b.md \
  tasks/test-service-a.md \
  tasks/configure-service-a.md \
  decision-cases/notifications.md \
  decisions/select-service-a.md; do
  superbee promote "$REPO/examples/decision/records/$relative" \
    --doc-key "$relative" --actor process:decision-example --dir "$BUNDLE"
done

superbee kinds --json --dir "$BUNDLE"
superbee status --json --dir "$BUNDLE"
superbee link show decisions/select-service-a --text "follow-up" --json --dir "$BUNDLE"
```

Do not target an existing business-plan bundle or occupied root. The
example uses the OKF v0.2 `superbee_progress_status` spelling. If the
selected CLI refuses a command, diagnose compatibility rather than
bypassing the model by overwriting files.

## What this demonstrates

- A Case links both alternatives, a fictional investigation Task, and
  the Decision that resolves the stated scope.
- The Decision links its selected Option and a separate `todo` Task
  for implementation. The `done` investigation Task is only an
  invented example, not real vendor verification.
- The rejected option remains discoverable for future reconsideration.
- The Decision's named decider and authority basis are claims in a
  synthetic record, not proof of permission or consent.
- The Recipe defines no Task or Research Kind and does not automatically
  invoke another Recipe or execute work.

The structural test `scripts/decision.test.mjs` checks the definitions
and fictional link graph. With `DECISION_CLI` set to a reviewed installed
Superbee executable it additionally runs native recipe parsing.
This example does not demonstrate semantic validity, real decision-making
outcomes or general Kind migration. For existing bundles, consult
`recipes/decision/references/adopting-existing-decisions.md`.

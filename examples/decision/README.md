# Decision recipe: synthetic composed example

This example is entirely fictional. It contains one Decision Question, two
Decision Options, one recorded Decision, and two built-in Tasks. A completed
investigation and an open implementation task remain distinct. No actual
provider service, authenticated approval or automated execution is claimed.

Stored Decision types use `github.com/holaxis-ai/superbee-plugins/decision/`
followed by the friendly Kind title; Task remains the built-in exact type.

The six standalone Markdown records in `records/` are example instances,
**not** recipe payload. Installing `recipes/ns-10fe0c6e18c73ef84d3a025b4fda1a80fd97e7f950e7a949cbe607884f3026d3` creates none of them.

## Reproduce in a fresh local bundle

From a reviewed checkout with a compatible installed Superbee CLI, choose
an **absent** location outside all current bundles. This is explicitly
invoked local example work, not something the recipe executes:

```sh
REPO=/absolute/path/to/reviewed-superbee-plugins
BUNDLE=/absolute/path/to/absent-example-bundle

superbee init --create-only --recipe none --dir "$BUNDLE"
superbee recipe add work-tracking --actor process:decision-example --dir "$BUNDLE"
superbee recipe add "$REPO/recipes/ns-10fe0c6e18c73ef84d3a025b4fda1a80fd97e7f950e7a949cbe607884f3026d3" --actor process:decision-example --dir "$BUNDLE"

for relative in \
  decision-options/service-a.md \
  decision-options/service-b.md \
  tasks/test-service-a.md \
  tasks/configure-service-a.md \
  decision-questions/notifications.md \
  decisions/select-service-a.md; do
  SUPERBEE_ACTOR=process:decision-example superbee promote "$REPO/examples/decision/records/$relative" \
    --doc-key "$relative" --strict --dir "$BUNDLE"
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

- A Decision Question links both alternatives and its investigation Task.
  The Decision links to the Question through `resolves question`; the
  reverse relationship is found through backlinks, not another stored edge.
- The Decision links its selected Decision Option and a separate `todo` Task
  for implementation. The `done` investigation Task is only an
  invented example, not real vendor verification.
- The rejected option remains discoverable for future reconsideration.
- The Decision's named decider and authority basis are claims in a
  synthetic record, not proof of permission or consent.
- The Recipe defines no Task or Research Kind and does not automatically
  invoke another Recipe or execute work.

The structural test `scripts/decision.test.mjs` checks the definitions
and fictional link graph. Run it through `npm exec -- node --test scripts/decision.test.mjs`;
it installs public `superbee@0.4.4-pre.9` into a temporary tool directory unless
`DECISION_CLI` explicitly selects a reviewed executable. It validates the recipe, installs it in a disposable
bundle, and checks that the example adds no unresolved links or Kind violations.
This example does not demonstrate semantic validity, real decision-making
outcomes or general Kind migration. For existing bundles, consult
`recipes/ns-10fe0c6e18c73ef84d3a025b4fda1a80fd97e7f950e7a949cbe607884f3026d3/references/ns-10fe0c6e18c73ef84d3a025b4fda1a80fd97e7f950e7a949cbe607884f3026d3/adopting-existing-decisions.md`.

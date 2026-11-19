---
type: Recipe
id: holaxis-decision
title: Decision Making
version: 0.1.2
summary: >-
  Explicit choices, alternatives and deliberation with research and task
  companions.
offer: 'Record a choice, compare alternatives and retain its rationale and follow-up.'
content_policy: definitions-only
references:
  - >-
    references/holaxis-decision/decision-model.md
  - >-
    references/holaxis-decision/adopting-existing-decisions.md
---
# Decision Making

Three small Kinds: Decision Question (the question and criteria), Decision Option
(the alternatives), and Decision (the attributable commitment). A small
decision can stand alone. A substantial deliberation can use a Question and
separately reusable Decision Options.

This is a definitions-only recipe. It installs no decisions, evidence, tasks,
actors, permissions, executions or automations. It does not own the built-in
Task Kind or the separately installed deep-research Kinds. Their relationships
are optional composition points; installing this recipe does not install them.

The distributed recipe uses exact qualified selectors under
`github.com/holaxis-ai/superbee-plugins/decision`; its title is not an alias.
Install this qualified recipe folder, after the selected Deep Research recipe and
an existing Task Kind. Existing bare Decision records are not migrated or adopted.
See the adoption reference before changing established consumers.

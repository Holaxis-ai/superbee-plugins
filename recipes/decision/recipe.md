---
type: Recipe
id: decision
title: Decision Making
version: "0.1.0"
summary: Explicit choices, alternatives and deliberation with research and task companions.
content_policy: definitions-only
references:
  - references/decision-model.md
  - references/adopting-existing-decisions.md
---
# Decision Making

Three small Kinds: Decision Question (the question and criteria), Option
(the alternatives), and Decision (the attributable commitment). A small
decision can stand alone. A substantial deliberation can use a Question and
separately reusable Options.

This is a definitions-only recipe. It installs no decisions, evidence, tasks,
actors, permissions, executions or automations. It does not own the built-in
Task Kind or the separately installed deep-research Kinds. Their relationships
are optional composition points; installing this recipe does not install them.

**Before installing into any existing bundle**, inspect all conventions and
instances for `Decision`, `Decision Question`, and `Option` using the
read-only steps in `adopting-existing-decisions.md`. Even when no document
is overwritten, a duplicate `governs` declaration can switch the active
schema because the first convention by ID wins. Do not proceed on a conflict
without an approved adoption plan.

Read the operating model for authority and workflow boundaries.

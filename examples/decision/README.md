# Decision recipe: synthetic composition example

This is a fictional planning case, not an approved policy or completed work.
The recipe's definitions install no instances. The records below are suggested
examples to create intentionally in a disposable bundle after installing the
reviewed recipe and its optional companions.

## A choice and two alternatives

**Case:** Should a fictional organization send routine event notifications
through Provider A or Provider B?

**Criteria:** Appropriate privacy controls; reliable delivery; affordable
usage; operability with the team's present skills. Compare actual terms,
not assumed capabilities.

**Options:** Provider A and Provider B are candidate `Decision Option`
documents. Their benefits, risks and unknowns are recorded separately.
Link both from `Decision Case` using `considers`.

**Research:** A `Research Question` asks whether Provider A meets the
specified residency requirement. An `investigated by` Task asks an agent
to obtain the current vendor terms. The Question is not answered until
those inputs are actually examined. These Kinds come from `deep-research`
and built-in `work-tracking`, respectively.

**Proposed decision:** A `Decision` with `decision_status: proposed`
can recommend Provider A, explicitly noting unresolved compliance.
It must not assert that an authorized person selected A.

**Recorded decision:** Only after the authorized fictional decision-maker
actually chooses can a separate or updated record state
`decision_status: recorded` with `decider`, `decision_date`,
`decision_scope`, `authority_basis`, evidence, and rationale. Link the
record to its Case using `resolves case`, and to the chosen Option with
`selects`. A Task to configure the chosen provider may be linked with
`follow-up`; it remains open until separately completed.

**Revision:** If the provider changes terms, open a new Case if further
deliberation is needed. Record a new Decision linking
`superseded decision` to the earlier Decision. Do not rewrite the old
choice or infer that existing configuration has been reversed.

## Compose without inheritance

The four built-in and extension layers remain distinct:
`Decision Case`, `Decision Option`, `Decision` (this recipe);
`Research Question`, `Research Claim`, `Research Observation`,
`Research Source` (deep-research); `Task` (work-tracking). No
`Activity` or `Evidence` Kind is implicitly added. This recipe
is not a workflow engine or a cross-recipe dependency installer.

Suggested checks on a disposable selected bundle:

~~~sh
superbee recipe validate ./recipes/decision --json
superbee kinds --json --dir /absolute/path/to/bundle
superbee status --json --dir /absolute/path/to/bundle
~~~

See the main recipe's adoption reference before trying the recipe against
an existing bundle with a custom Decision Kind. This example contains no
real company, provider, person, source assertion or authorization.

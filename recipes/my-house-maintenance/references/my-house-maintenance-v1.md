---
type: Reference
title: My House maintenance operating contract v1
---
# My House maintenance operating contract v1

Select My House core before this recipe. A Plan expresses intended work; a Service records what
someone reports actually occurred. Installation runs no reminder or job. A Task checkbox alone
is not evidence a filter was replaced or a contractor attended.

## Capture and subjects

Only title is required on either Kind. Unknown optional facts stay absent. Supplied dates,
instants and listed enum values use native validation on participating writes. The remaining
rules are consumer assessments, not universal storage constraints.

Plan stores procedure, plan_status, schedule_mode, next_due_on, schedule_timezone, schedule_basis,
schedule_text and optional override_due_on/override_basis. Service stores work_performed,
occurred_on or occurred_at, occurrence_note, result, plan_result, reported_by, basis and optional
source_event_key. Read stored fields and typed links through public APIs; no conversion step is
hidden in installation.

Before a derived answer, Plan and Service each need exactly one primary subject across home,
space and asset. A linked Service must explicitly target the same subject as its Plan. plan and
corrects are each zero-or-one. Missing/mismatched/ambiguous subjects stay unresolved even if
native validation reports no warning. Never infer links from titles.

performed at home or performed in space records historical occurrence location from evidence;
at most one is meaningful. Current Asset placement cannot relocate an older service. Offsite
servicing may remain prose without inventing a Home for a repair shop. Unknown site stays unknown.

## Qualifying completion and correction

“Latest qualifying completion for this Plan within these inspected records” requires nonempty
Plan procedure, matching subjects, explicit plan link, and a Service with nonempty work_performed,
result: completed and plan_result: satisfied. Inspection, cleaning, repair and replacement are
different procedures; any work on an Asset does not satisfy all its Plans. A changed procedure
meaning creates a new Plan rather than retargeting old history. reported_by/basis is attribution,
not authenticated acceptance or independent verification.

occurred_on preserves date precision; occurred_at requires an offset. At most one is a domain
rule. An undated report remains “completion reported; date unknown,” but cannot establish a dated
latest completion or advance arithmetic. Date-only and instant evidence keep original precision;
overlapping/uncertain ordering or suspect future dates must not be resolved by guessing.

corrects records a replacement assessment of the same occurrence, not another completion. Keep
earlier accounts and reasons. Only a single unambiguous correction family supports an answer;
branches/cycles, incompatible identity or unexplained attribution changes withhold it. A scoped
source_event_key aids duplicate review; title/date similarity alone cannot establish equivalence.

## Next explicitly recorded date

The first slice displays manual_date only. For plan_status: enabled:

1. Use override_due_on only with both a valid date and nonempty override_basis. Show the reason and
   original recommendation.
2. If either override field exists but is invalid/incomplete, show unresolved override. Never
   silently fall back to next_due_on.
3. Only when both override fields are absent, display valid next_due_on if supplied.

Missing/unknown/paused/retired status is not enabled. No date advances from Service completion,
no is_due field is persisted, and no clock-time is implied. An IANA timezone is needed before
classifying today/past/future; without it just display the date. Missing basis stays unspecified,
not invented manufacturer advice.

Calendar, after_service, usage, condition and compound criteria remain source wording until a
capable consumer supports them. “Annually or N hours, whichever comes first” is not simple
calendar recurrence. A manual override does not replace that recommendation. Do not invent
universal appliance intervals or convert calendar recurrence to completion-relative schedules.

## Answer and execution boundaries

Retrieve Plan and relevant Services with IDs/versions and assess the stated scope. Incomplete or
changing retrieval supports “latest in inspected records” or unresolved, never an absolute
last-service claim. Include basis, source links and excluded/undated reports. Readers without the
domain capability still display records instead of inventing calculations.

A later reminder requires its own authorized scheduler binding, timezone and delivery. A to-do
completion cannot automatically report physical work. No Plan authorizes landlord-equipment
alteration, purchase, communication, model edits or construction. Preserve the source and scope
of any professional assessment; responsibility and enum state do not imply competence or approval.

The reference reader requires nonempty `correction_reason` before a corrected Service can replace
an occurrence in a derived answer. A conflict between known `source_event_key` values remains
unresolved: a real later service is a separate occurrence, not a correction. Unknown-key identity
still depends on the stated reason/evidence; this field does not authenticate physical truth.

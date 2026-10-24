# Retained verification-report observation

One trusted local operation, `local.verification.observe-tlc.v1`, validates a retained
report from the verification repository's `check_retry_protocol.py` against a deliberately selected
basis and captured current files. It exports a finite snapshot for Core's existing source overlay.
It never executes TLC, proves a statement, authenticates a historical invocation, or discharges a
proof obligation. A claimed PASS must include the complete ordered plan; failed prefix reports retain an explicitly partial observation. Unsupported report formats refuse. Current source-file differences are
reported as mismatches while original reported hashes remain the evidence basis.

This is the first bounded proof-evidence integration, not a general prover adapter. It makes actual
report identities and stale-input observations reusable without manually transcribing run facts.
A future substantial proof target can introduce another reviewed report format. No network,
credentials, ambient tool discovery, bundle mutation, provider activation or npm publication occurs.
The adapter is trusted Node code with ambient authority, not sandboxed code.

## Compatibility and installation

Requires public executable CLI `0.4.4-pre.4`, Core helper `0.2.0-pre.39`, local-operation contract1.
Acquire/review a full Git commit, install declared development tools per repository README, build
`npm run build --workspace integrations/verification`, and preview:

```
superbee op register /absolute/reviewed/integrations/verification --local --dir /explicit/bundle
```

Review the exact bytes/effects and accept the native proposal digest. Installation imports no code;
registration and binding are explicit. Changed code or bindings require new consent. Discovery
uses inert manifest data; a fresh supervised process imports the selected generation on execution.
No snapshot declaration or target is silently created.

## Finite inputs and output

Bind the closed roles `report`, `basis`, `tlc`, plus exactly one role `input0` through `input23`
for each checked input. No tools are needed (`tools:{}`). Use `synthetic-v1` and an existing ordinary
outputRoot outside the bundle/private state. All roles are copied/pinned by the native host;
additional roles, symbolic links or changed captured bytes refuse. Original report/basis are JSON
(up to2MiB/64KiB); each checked input up to2MiB, cumulative checked inputs8MiB; jar up to8MiB.
Host aggregate16MiB/file/deadline bounds still apply. No file path is read from report/basis data.

The independent caller-selected basis contains exactly:

```
{"v":1,"runKey":"stable-run-key","artifactRevision":"<40 lowercase hex>",
 "sourceRevision":"<40 lowercase hex>","tlcSha256":"<64 lowercase hex>",
 "checkedInputs":[{"name":"model.tla","role":"input0","sha256":"<64 lowercase hex>"}],
 "expectedRuns":[{"variant":"safe","expectedError":null}]}
```

Each original checked-input name and hash must match the native report exactly; each expected
variant/error must match, with no extra/duplicate/reordered runs. Failed prefix observations explicitly record expected and observed counts. A claimed PASS requires consistent
successful native receipts and unchanged original input flags; expected negative controls require
nonzero exit and their exact declared diagnostic. These are report consistency checks, not a second
TLC evaluator. The selected archive bytes must match the reported TLC identity. Names, status,
source check flag and runtime data in the report remain historical assertions.

Execute with input `{"expectedInputs":{<native preview role hashes>},"settings":{"generation":1}}`
and export `--export-output snapshot=/ordinary/absent-output.json`. A new generation is explicitly
chosen by the caller. The returned record has stable key runKey and a `verification` projection:
reported_status, input_match, report_digest, artifact_revision, source_revision, variant_count, expected_variant_count, report_completion, reported_source_check and
association. No authoritative verdict, statement, assignment or discharge fields are produced.
Java/OS identity and historical checker consumption are not independently established by this
adapter. Matching selected files is narrower than proving that an earlier tool consumed them.

The envelope uses the public Core snapshot format and `association:caller_asserted`. Original
checked-input hashes and selected TLC archive identity form its declared applicability basis.
No checker-settings attestation is invented. Core's decoder/binder/admission/freshness and overlay
remain the authority for ingestion/replay/generation/conflicts. The adapter copies none of them.
Only deliberately linked existing targets receive provider-owned observation fields. Keep human
proof decisions outside those fields; an imported reported_pass never automatically discharges.

## Validation

Use repository-pinned Node26.8.2 and explicitly installed public Core39 as documented at root.
Run affected build, typecheck and `npm test --workspace integrations/verification`. Unit tests use
synthetic report/jar/model bytes and Core's actual decoder. Run
`npm exec -- node --test scripts/verification-consumer.test.mjs` for the separate native consumer
qualification: it installs the published pinned CLI in an isolated home (or the explicit
`SUPERBEE_CLI_TARBALL` retained archive), checks exact version/source and unchanged archive bytes, and registers a standalone
built copy, exercises captured inputs and export, ingests/replays through Core, checks freshness
and verifies that existing human verdict/title/body survive. Both suites use synthetic inputs;
neither executes TLC or establishes a new proof. Actual retained-report adoption needs independently
reviewed adapter bytes, a deliberately selected original basis and explicit native binding.

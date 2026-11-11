# LinkLab 1.0 — release candidate

A complete implementation for a private, authenticated URL-shortener workspace, with original application code and an inspectable AI-assisted build process.

## Included

Working dashboard, creation/redirect/revocation APIs, expiration, atomic audit writes, creation idempotency, owner isolation, parameterized SQL, durable API quotas, safe body parsing, privacy-conscious aggregate analytics, isolated reliability checks, schema/migration history, automated tests, OpenAPI, CI and operational documentation.

## Verified in this build

- Strict TypeScript and lint checks pass with zero lint warnings.
- Formatting checks pass.
- 33 automated tests pass against real in-memory SQLite and the HTTP handler.
- The application builds as a production Worker with browser assets.
- The final whole-lockfile advisory scan reports zero known vulnerabilities.
- Local D1 migrations apply successfully; schema generation reports no pending schema change.
- Browser walkthrough verifies synthetic account sign-in, create, destination redirect, stored record, revocation/version increment, and the 410 page.
- All five reliability scenarios pass through the browser against local D1, with temporary-fixture cleanup.

Detailed results and limitations are in `docs/evidence/VALIDATION.md`.

## Remaining release responsibilities

Private hosting and automated checks do not establish a public production SLA. Before public use: verify the actual gateway's header sanitization and access policy; conduct representative cloud load tests and a restore rehearsal; select/configure alerts and retention scheduling; evaluate malicious-link abuse controls; run independent security/accessibility review; and obtain the engineer's sign-off.

No such human approval, penetration test, full mobile-device test matrix, hosted capacity measurement, backup exercise, or monitoring configuration is claimed here. The provided CI workflow and dependency update policy still need to be enabled in the destination GitHub repository if used.

## Local-only benchmark

The benchmark exercises 10,000 service resolutions on in-memory SQLite after warmup, verifies the returned resource, and fails if local p95 exceeds 10 ms or total measured resolution time exceeds 20,000 ms. These deliberately loose bounds detect gross regressions; changing them requires a documented reason. It does not include HTTP/network/authentication/hosted database latency and must not be cited as public service throughput. Raw output is retained in the evidence directory.

## Framework build notes

The current supported toolchain emits upstream source-map and chunking notices during the production build. The build succeeds; these notices are not suppressed. They affect debugging/chunk layout and should be followed as framework maintenance, not described as application test failures.

## Submission evidence completion

The submission guide, execution plan, engineering summary, decision register, prompt/task records and demo procedure are now part of the review packet. `npm run verify:submission` records the complete gate set under `docs/evidence/runs/latest/`. `npm run evidence:check` verifies the saved input hashes. See the generated report for current results rather than extrapolating historical measurements. Candidate review, actual approval and timeline attestation remain pending.

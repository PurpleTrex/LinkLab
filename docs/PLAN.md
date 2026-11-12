# Requirement and execution plan

## Normalized problem

Build a small, reviewable URL-shortener service from scratch. It must create and resolve links, provide basic analytics, handle reliability failures, and demonstrate an additive change to an existing baseline. The submission must explain how AI assisted the work and where the engineer remains accountable.

The assignment does not prescribe a framework, a distributed architecture, an AI chatbot in the UI, public anonymous access, or a specific analytics unit. The current implementation chooses TypeScript, a Fetch API Worker, a relational database, and a React interface. These are implementation choices, not claimed assignment mandates.

## Scope and assumptions

- Management is authenticated and owner-scoped. This release also gates hosted redirects through private access.
- Destinations must be public HTTPS URLs under a bounded input policy. The service does not fetch their contents.
- Reliability includes collision safety, retry behavior, mutation/audit atomicity, lifecycle checks, and analytics failure isolation.
- Popularity means recorded GET redirect responses during today and six prior UTC dates; repeats and bots count, HEAD does not.
- The product UI contains operational controls; AI development evidence belongs in the review packet.
- The baseline is a tested service and schema, not a historical complete deployed application.

## Task dependencies and acceptance

T01 → T02 → T03 → T04 → T05 → T06. T07 validates T02–T06; T08 presents the same service; T09 packages and verifies all artifacts.

| Task | Work and dependencies                                             | Acceptance criteria                                                                                                                                  | Evidence                                               |
| ---- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| T01  | Normalize requirements and assumptions                            | Explicit scope, ambiguities, ownership and non-goals                                                                                                 | This plan; D01–D07; three scenario documents           |
| T02  | Define domain/schema and baseline service; depends on T01         | Unique aliases; owner-scoped keys; creation and audit commit atomically                                                                              | Baseline commit; greenfield tests                      |
| T03  | Add lifecycle fields and revocation; depends on T02               | Existing rows survive; no-expiry keys still replay; expired retries remain idempotent; stale writes rejected                                         | Migration 0001; lifecycle, rollback, legacy-hash tests |
| T04  | Expose bounded HTTP API; depends on T02–T03                       | Ownership, Origin, body bounds, structured errors and no-store redirects                                                                             | HTTP tests; OpenAPI; security model                    |
| T05  | Resolve analytics ambiguity; depends on T01–T04                   | UTC buckets; owner isolation; no unsupported unique-person claims; failed metrics do not break redirects                                             | Analytics tests; scenario 3                            |
| T06  | Provide operational interface and diagnostics; depends on T04–T05 | Real loading/error/empty states; isolated checks clean up; usable mobile layout                                                                      | Local browser record; five diagnostic tests            |
| T07  | Analyze dependencies and run checks; depends on T02–T06           | Types, lint, format, tests, audit, bounded local performance and build pass                                                                          | Verification manifest and command logs                 |
| T08  | Apply corporate visual revision; depends on T06                   | Link-first navigation; remove promotional/AI UI copy; preserve API/security behavior                                                                 | UI revision commit; recorded desktop/mobile QA         |
| T09  | Close submission evidence gaps; depends on T01–T08                | Requirements mapped; provenance accurate; AI assistance summarized; stale references fixed; review checklist actionable; source package reproducible | This revision; verification report; submission ZIP     |

T01–T08 describe prior implementation as reconstructed from committed artifacts and the retained conversation. T09 and the verification tooling are current work, recorded as performed. Neither column asserts the candidate personally reviewed or approved a task.

## Change control

The assistant may prepare source, tests, documentation and private release candidates under the user's requests. Human-only decisions remain explicit in REVIEW-SIGNOFF.md. Deployment exposure, irreversible migration/retention changes and acceptance of business semantics require an informed owner decision. This revision does not change data, exposure, identity policy or retention scheduling.

## Stop conditions

A failing gate blocks publication of this revision until resolved or explicitly documented as blocked. A missing secret or external account cannot be replaced with an invented configuration. Failed test evidence is retained for the current run. Automated checks supplement, but do not replace, the candidate review recorded in REVIEW-SIGNOFF.md.

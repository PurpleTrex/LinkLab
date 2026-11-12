# Final engineering summary

## Outcome

LinkLab is an original URL-shortener implementation with a runnable private dashboard, versioned APIs, relational storage, aggregate analytics, and five isolated reliability checks. The project owner reviewed the deliverables and approved submission as a private prototype; public production release remains unapproved.

## Approach and rationale

A modular monolith keeps the consistency boundary small. Domain validation, SQL repository, application service, HTTP routing, analytics and UI are separate modules. SQL uniqueness and transactional batches decide races; the interface does not attempt to implement consistency itself. The [plan](PLAN.md) provides task dependencies and acceptance criteria.

The baseline service was committed before lifecycle work. An additive migration introduces expiration/revocation while preserving old links and creation-key fingerprints. Ambiguous analytics requirements are normalized into documented counting, ownership, time-window and failure rules. The three [scenario records](SUBMISSION.md#deliverable-index) connect these changes to tests.

## Artifacts

- Typed application and Worker source, React interface and responsive corporate theme.
- SQL schema and ordered migrations; machine-readable OpenAPI.
- Unit/service/HTTP tests using actual SQLite statements and rollback failures.
- Architecture, decision register, threat model, operations runbook and demonstration procedure.
- Preserved source history; bounded AI task records and an AI assistance summary.
- Verification command producing exit codes, logs, environment versions and input-file hashes.

## Validation

`npm run verify:submission` runs strict analysis, lint, formatting, the complete test suite with coverage, dependency audit, the local performance gate, and a production build. See [latest machine report](evidence/runs/latest/manifest.json) and [validation scope](evidence/VALIDATION.md). The report's hashes bind results to the tested files even when verification precedes the final evidence commit. A nonzero gate exits unsuccessfully; a failure is not relabeled as a pass.

Existing browser evidence covers the core lifecycle and diagnostics; the latest visual revision was reviewed at desktop and a 390-pixel mobile frame. This evidence revision changes documents and development checks, not product UI or service behavior, so those browser claims remain dated prior observations.

## Risks and trade-offs

| Choice                           | Benefit                                                    | Limitation / mitigation                                                                         |
| -------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| One relational store             | Transactional link/audit consistency                       | Hot links can concentrate reads/writes; hosted load measurement required before capacity claims |
| 302 and no-store                 | Fresh expiration/revocation checks                         | Every redirect needs a read; dependency failure returns a controlled error                      |
| Best-effort background analytics | Metrics failure cannot block redirects                     | Counts may be lost; unsuitable for billing or unique-person reporting                           |
| Private identity gateway         | Reuses authentication and limits audience                  | Not an anonymous public shortener; gateway header trust must be verified for another deployment |
| Permanent alias reservation      | Previously shared URLs cannot be reassigned                | Retention and erasure remain an operator decision                                               |
| Local timing gate                | Detects gross service regressions and incorrect resolution | Excludes HTTP, network, hosted D1, multi-region contention and SLA measurements                 |

## Assumptions and limitations

The [decision register](DECISIONS.md) records the implemented defaults accepted for assignment submission in [the review record](REVIEW-SIGNOFF.md). CI configuration is provided but is not claimed to have run on a destination GitHub repository. Monitoring, backup rehearsal, public abuse controls, retention scheduling and independent assurance remain public-release responsibilities. No production customer data was used in test fixtures.

AI assisted with implementation, debugging, refactoring, tests, documentation, and review preparation. Task-level records are linked to artifacts. The project owner reports spending two days on the assignment; exact dates were not supplied and are not inferred from Git timestamps.

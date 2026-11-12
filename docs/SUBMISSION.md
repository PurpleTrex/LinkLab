# Assignment submission guide

Start here, then read the [engineering summary](ENGINEERING-SUMMARY.md), [execution plan](PLAN.md), and [AI evidence index](evidence/AI-EXECUTION.md). The application is LinkLab, a URL-shortener prototype with a private hosted deployment. This packet supports review; it does not assert the candidate's personal approval.

## Requirements and evidence

The mapping below paraphrases the supplied two-page _Assignment AI-Proficient Software Engineer.pdf_. The original assignment remains the authority. “Implemented” describes artifacts; the project owner's review and approval are recorded in REVIEW-SIGNOFF.md.

| Requirement                                                                         | Implementation / evidence                                                                                                                        | Status and boundary                                                                  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1. Interpret requirements and ambiguity                                             | [Plan](PLAN.md), [analytics scenario](scenarios/03-ambiguous.md), [decision register](DECISIONS.md)                                              | Implemented; assumptions accepted for this assignment submission                     |
| 2. Decompose tasks with dependencies                                                | [T01–T09 plan](PLAN.md), scenario task sequences                                                                                                 | Implemented; distinguishes existing work from this evidence revision                 |
| 3. Reason about brownfield impact                                                   | [Lifecycle change](scenarios/02-brownfield.md), `drizzle/0001_sticky_marvel_zombies.sql`, compatibility tests                                    | Implemented; baseline commit is preserved in Git                                     |
| 4. AI-assisted execution across engineering activities                              | [AI assistance summary](evidence/AI-ASSISTANCE.md), [task records](evidence/TASK-RECORDS.md), [change provenance](evidence/CHANGE-PROVENANCE.md) | AI-assisted work is summarized and mapped to artifacts; candidate review is recorded |
| 4. Analysis, lint, tests, security and performance gates                            | `npm run verify:submission`, `.github/workflows/ci.yml`, generated `docs/evidence/runs/latest/`                                                  | Executable gates; local performance limits are not a hosted capacity claim           |
| 4. Secure AI use and consequential-change approval                                  | [Security](SECURITY.md), [review record](REVIEW-SIGNOFF.md), [decisions](DECISIONS.md)                                                           | Submission approval recorded; public production changes require separate review      |
| 5. Code, APIs, schema, tests and clean design                                       | `src/`, `worker/`, `app/`, `db/`, `drizzle/`, `tests/`, [OpenAPI](openapi.json)                                                                  | Implemented; framework and application boundaries documented                         |
| 6. Risks, failure scenarios and guardrails                                          | [Architecture](ARCHITECTURE.md), [security](SECURITY.md), [operations](OPERATIONS.md), [validation](evidence/VALIDATION.md)                      | Implemented; deployment-level assurance is bounded explicitly                        |
| 7. Engineer-led oversight and approval                                              | [Human review checklist](REVIEW-SIGNOFF.md)                                                                                                      | Candidate approved submission; personal rerun/demo are not claimed                   |
| 8. Final summary: rationale, artifacts, risks, validation, assumptions, limitations | [Engineering summary](ENGINEERING-SUMMARY.md)                                                                                                    | Reviewed and approved for assignment submission                                      |

## Deliverable index

| Deliverable                                     | Where to find it                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Runnable end-to-end prototype                   | [README setup](../README.md#run-locally), application source, private hosted URL in README          |
| Architecture, tools, control flow and decisions | [Architecture](ARCHITECTURE.md), [decisions](DECISIONS.md), [dependencies](DEPENDENCIES.md)         |
| Greenfield scenario                             | [Scenario 1](scenarios/01-greenfield.md), baseline commit, `tests/greenfield.test.ts`               |
| Brownfield scenario                             | [Scenario 2](scenarios/02-brownfield.md), additive migration and regression tests                   |
| Ambiguous scenario                              | [Scenario 3](scenarios/03-ambiguous.md), counting definitions and boundary tests                    |
| Testing approach, limitations and trade-offs    | [Validation](evidence/VALIDATION.md), [release](RELEASE.md), generated verification report          |
| Reviewable source evolution                     | [Provenance](evidence/CHANGE-PROVENANCE.md), `source-history.bundle` in the downloadable submission |
| Demonstration                                   | [Demo procedure](DEMO.md)                                                                           |

## Remaining work

The project owner approved this private prototype for assignment submission and reports spending two days on the assignment. Exact dates were not supplied. The recorded verification was run by the assistant; the reviewer did not report a new interactive browser demonstration. The hosted app remains owner-private, and evaluator access must be arranged separately if needed.

No infrastructure load test, independent security review, backup rehearsal, or hosted CI run is presented as completed. Those remain public-release readiness work; they do not block the assignment prototype.

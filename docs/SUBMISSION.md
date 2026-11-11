# Assignment submission guide

Start here, then read the [engineering summary](ENGINEERING-SUMMARY.md), [execution plan](PLAN.md), and [AI evidence index](evidence/AI-EXECUTION.md). The application is LinkLab, a URL-shortener prototype with a private hosted deployment. This packet supports review; it does not assert the candidate's personal approval.

## Requirements and evidence

The mapping below paraphrases the supplied two-page _Assignment AI-Proficient Software Engineer.pdf_. The original assignment remains the authority. “Implemented” describes artifacts, not human acceptance.

| Requirement                                                                         | Implementation / evidence                                                                                                                | Status and boundary                                                                                 |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1. Interpret requirements and ambiguity                                             | [Plan](PLAN.md), [analytics scenario](scenarios/03-ambiguous.md), [decision register](DECISIONS.md)                                      | Implemented; business assumptions await candidate acceptance                                        |
| 2. Decompose tasks with dependencies                                                | [T01–T09 plan](PLAN.md), scenario task sequences                                                                                         | Implemented; distinguishes existing work from this evidence revision                                |
| 3. Reason about brownfield impact                                                   | [Lifecycle change](scenarios/02-brownfield.md), `drizzle/0001_sticky_marvel_zombies.sql`, compatibility tests                            | Implemented; baseline commit is preserved in Git                                                    |
| 4. AI-assisted execution across engineering activities                              | [Task records](evidence/TASK-RECORDS.md), [prompt record](evidence/PROMPT-RECORD.md), [change provenance](evidence/CHANGE-PROVENANCE.md) | Evidence prepared; initial raw assistant prompts were not retained; human review cannot be inferred |
| 4. Analysis, lint, tests, security and performance gates                            | `npm run verify:submission`, `.github/workflows/ci.yml`, generated `docs/evidence/runs/latest/`                                          | Executable gates; local performance limits are not a hosted capacity claim                          |
| 4. Secure AI use and consequential-change approval                                  | [Security](SECURITY.md), [review record](REVIEW-SIGNOFF.md), [decisions](DECISIONS.md)                                                   | Controls/documentation implemented; actual engineer approval pending                                |
| 5. Code, APIs, schema, tests and clean design                                       | `src/`, `worker/`, `app/`, `db/`, `drizzle/`, `tests/`, [OpenAPI](openapi.json)                                                          | Implemented; framework and application boundaries documented                                        |
| 6. Risks, failure scenarios and guardrails                                          | [Architecture](ARCHITECTURE.md), [security](SECURITY.md), [operations](OPERATIONS.md), [validation](evidence/VALIDATION.md)              | Implemented; deployment-level assurance is bounded explicitly                                       |
| 7. Engineer-led oversight and approval                                              | [Human review checklist](REVIEW-SIGNOFF.md)                                                                                              | Requires candidate action; no approval is fabricated                                                |
| 8. Final summary: rationale, artifacts, risks, validation, assumptions, limitations | [Engineering summary](ENGINEERING-SUMMARY.md)                                                                                            | Prepared for candidate review                                                                       |

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

## Remaining candidate work

1. Review the code and the actual diffs, rerun verification locally, and record findings in [REVIEW-SIGNOFF.md](REVIEW-SIGNOFF.md).
2. Accept or revise D01–D07 in the [decision register](DECISIONS.md); approve any consequential deployment/migration policy only after review.
3. Complete a demonstration and decide how the reviewer will access it. The hosted app remains owner-private; the source can run locally without a cloud account. No sharing change is made by this packet.
4. Describe your actual time spent and AI involvement accurately. The assignment describes a 2–3 day exercise. The assistant implementation was produced within a build session; documentation does not convert it into a multi-day, engineer-led history. If necessary, clarify that timing with the evaluator.

No infrastructure load test, independent security review, backup rehearsal, or hosted CI run is presented as completed. Those are public-release readiness matters documented in RELEASE.md; the assignment asks for a working prototype treated with production-grade engineering discipline.

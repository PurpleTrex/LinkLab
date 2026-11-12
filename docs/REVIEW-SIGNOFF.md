# Candidate review and sign-off

## Review record

- **Reviewer:** Project owner (name not supplied)
- **Review date:** November 12, 2026 (America/Chicago)
- **Reviewed Git HEAD:** `8e18c92394c5de3d04ffa951bbba4aaba6b252e8`
- **Review scope:** Assignment requirements and the five submitted deliverables, including the current working-tree documentation and verification updates.
- **Time spent:** Two days, as reported by the project owner. Exact start and end dates were not supplied.
- **AI involvement:** AI assistance was used during implementation, debugging, refactoring, test development, documentation, and review preparation. The project owner reviewed the assignment and deliverables and accepts responsibility for the submitted work.
- **Assignment disposition:** **Approved for assignment submission as a private URL-shortener prototype.** This approval does not authorize a public production launch.

The code and deliverables remain uncommitted working-tree changes at the time of this record; the Git HEAD above is the base revision, not a commit containing those changes.

## Review checklist

- [x] Reviewed the assignment and all five required deliverables.
- [x] Reviewed the requirement mapping, assumptions, and stated limits.
- [x] Accepted the implemented prototype decisions D01–D07 for this assignment submission, subject to the limits below.
- [x] Reviewed the available validation evidence and its scope.
- [x] Reported the actual two-day assignment duration; no dates or activities have been invented.
- [ ] Personally reran the verification commands. The recorded run below was performed by the assistant.
- [ ] Personally completed the full interactive browser demonstration. A prior browser walkthrough is documented, but this reviewer did not report a new walkthrough here.

## Validation evidence reviewed

On November 11, 2026, the assistant ran `npm run verify:submission` on Windows with Node v24.14.0. All eight gates passed: typecheck, lint, format, coverage tests (33 passed), dependency audit (zero advisories reported), performance, performance-failure control, and production build. `npm run evidence:check` passed. Both local D1 migrations applied, the local app page returned HTTP 200, and `/healthz` returned `{"status":"ok"}`. Details and logs are in `docs/evidence/runs/latest/manifest.json`.

The local benchmark is not a hosted capacity test. No remote D1 deployment, restore rehearsal, public gateway validation, or public traffic test is claimed here.

## Findings and decisions

| Area                        | Candidate disposition            | Rationale and accepted boundary                                                                                                                                                |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Assignment deliverables     | Accept for submission            | The runnable prototype, architecture, three scenarios, setup, and testing/limitations materials are present.                                                                   |
| Data model and migration    | Accept                           | The lifecycle migration is additive and has compatibility and rollback tests. Destructive data changes require a separate review.                                              |
| Identity and audience       | Accept for the private prototype | The app relies on its trusted hosting identity boundary. A public or separate deployment requires independent gateway validation.                                              |
| Analytics                   | Accept for product insight       | Counts are recorded GET redirects by UTC day; repeats and bots count, HEAD does not. Best-effort writes can undercount; these metrics are not billing or unique-person counts. |
| Alias retention and privacy | Accept for this submission       | Aliases remain reserved; no visitor IP, user-agent, referrer, or tracking cookie is stored. Retention and erasure remain operator decisions.                                   |
| Production exposure         | Not approved                     | Public capacity, abuse protection, monitoring, backup restoration, and independent security/accessibility review have not been demonstrated.                                   |

## Submission approval

**Approved for assignment submission as a private prototype.** The candidate accepts the limitations above. Public production release remains unapproved until its deployment boundary and operational controls are independently verified.

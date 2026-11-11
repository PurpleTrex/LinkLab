# Prompt sources and current task brief

## Provenance rules

The excerpts below are literal user messages retained in this conversation. Their order is known; per-message wall-clock timestamps are not assigned here. They are instructions, not evidence of completed technical review. The assignment PDF supplied the technical/process requirements; it is not reproduced in the source package.

Earlier assistant internal task prompts are not available as an exact transcript. TASK-RECORDS.md reconstructs task context from committed artifacts and prior recorded findings, and labels those entries retrospective. No reconstructed prompt is described as a historical quotation.

## Preserved user instructions

| ID  | Literal instruction                                                                                                                                 | Effect on the work                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| P01 | “What's a unique way to do this?”                                                                                                                   | Original implementation concept                                                   |
| P02 | “Build a production level one. Using modern programming, security and development standards. Don't just grab online code make something organinal.” | Original business code; security and verification focus                           |
| P03 | “Change the front end. Make it look less ai generated and more like a modern app.”                                                                  | Interface revision requested                                                      |
| P04 | “Remove anything that is associated with ai like the every link accounted for make it look and feel more like an enterprise app.”                   | Product slogans and AI-related UI removed; assignment evidence retained in source |
| P05 | “Research how Charles Schwab websites look. Make it look more like their corporate theme.”                                                          | Public-site visual research and corporate styling                                 |
| P06 | “Does this follow the assignment exactly?”                                                                                                          | Requirement-to-artifact audit; gaps reported                                      |
| P07 | “Add everything that is missing besides what I need to manually do.”                                                                                | Current evidence completion; human review remains pending                         |

## Current assistant task brief — recorded before this revision's implementation

**Intent:** close the non-human submission gaps identified by the audit.

**Technical context:** current baseline `7c4fc9ad1dc03cfd352845d4693f7e3dd4448476`; original service baseline `38f7f37cbb3fd11316b86ee5bcc14be3b297f4c9`; TypeScript/React/Worker/D1 app; 33 recorded tests; private hosted release.

**Constraints:** retain the existing interface and service contracts; preserve private access; do not invent historical prompts, rejected human decisions, a multi-day timeline, or sign-off. Use existing full commit IDs instead of unavailable tag names. Keep credentials and customer data out of evidence and source packages.

**Acceptance criteria:** map all eight core requirements and all deliverables; document task sequencing; connect AI implementation/debugging/refactoring/tests/docs/review work to files, tests and source history; retain exact available user instructions; add explicit local performance gate and repeatable verification with logs/input hashes; correct stale documentation; create a source package with reviewable Git history. Separate candidate obligations from public-production hardening.

**Planned validation:** strict type/lint/format checks; full existing tests and coverage; dependency audit; bounded local benchmark; production build; history/bundle and archive inspection. Failures are corrected and rerun only as necessary; no passing result replaces human acceptance.

## Refinement record

Initial audit finding: evidence was scattered, the README linked to removed product content, and a baseline tag was referenced but not in the recovered repository. Refinement: provide an entry guide, acceptance mapping, exact commit references and a review procedure; preserve unavailable history as a limitation. The existing performance command only printed timings, so it is changed to assert correct results and reject gross regressions with explicit local-only bounds.

Fresh execution outcomes are recorded by `npm run verify:submission`; see the resulting manifest and logs rather than treating this plan as proof of execution.

# Validation evidence

Build session: November 9, 2026 (America/Chicago). Execution host may label raw artifacts November 10 UTC.

| Check                   | Observed result                                  | Scope                                                                                               |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`     | Pass                                             | Authored app/server/test code and included tool declarations                                        |
| `npm run lint`          | Pass, no warnings                                | ESLint including React hooks and TypeScript rules                                                   |
| `npm run format:check`  | Pass                                             | Authored app, components, domain, server, tests, docs and selected tools                            |
| `npm test`              | 33 passed, 0 failed                              | Domain, real SQL transactions/migrations, concurrency, HTTP, policy and lab checks                  |
| `npm run test:coverage` | 97.24% line, 90.67% branch, 96.00% function      | Instrumented server/domain/lab modules and test SQL adapter; excludes browser UI and Worker gateway |
| `npm run db:generate`   | No changes                                       | Authored schema matches committed migrations                                                        |
| Local D1 migrations     | Both applied                                     | Wrangler migration ledger; emulator only                                                            |
| Production build        | Pass                                             | Worker and static browser assets; upstream debug/source-map warnings remain                         |
| Dependency audit        | 0 known advisories across full resolved lockfile | Point-in-time npm registry advisory database, not proof of vulnerability absence                    |
| Browser flow            | Create → redirect → revoke → 410 passed          | Desktop Chromium, synthetic loopback account and local D1                                           |
| Browser reliability lab | Five scenarios passed                            | 3 collision, 3 retry, 2 expiry, 3 analytics failure, 4 destination assertions                       |

## Important test boundaries

The SQLite adapter executes actual statements, foreign keys, indexes, transactions and rollback. It is not a mocked repository. Its one connection serializes transactions; the separate browser lab also exercises the service through the D1 emulator. Neither demonstrates multi-region cloud capacity.

Automated HTTP tests supply synthetic trusted identity at the application boundary. They prove ownership enforcement inside the app; they do not prove that a separately configured public reverse proxy strips spoofed headers. Production must remain behind the supported identity dispatch.

Browser tests verified visible interaction, actual navigation to the requested synthetic destination, a persisted row, resource version 2 after revocation, and the 410 page. Clipboard interaction was exercised, but clipboard contents were not independently verified by the remote browser adapter. Actual device testing and a full keyboard/screen-reader audit remain pending.

The benchmark is a local implementation check only. Raw text output is included. No production traffic, real customer data, or remote load test was used.

## Regression evidence added during the build

- v1 non-expiring fingerprints still replay after the lifecycle migration.
- An exact retry after expiration returns the original resource; a new expired resource is rejected.
- Tied timestamps do not cause cursor-pagination loss.
- Failed audit inserts roll back both creation and revocation.
- A failed metrics sink preserves the redirect and emits a failure signal.

The source package includes a Git history bundle containing the tested greenfield service baseline and subsequent implementation. The history reflects this build session; it is not a fabricated multi-day development record.

## Corporate interface revision — November 10, 2026

Design research used the public pages at https://www.schwab.com/ and https://www.aboutschwab.com/. The implementation adapts their blue accents, white surfaces, restrained sans-serif typography, and horizontal navigation to the existing LinkLab application. The identity and code remain original; no Schwab logos, assets, financial products, or sign-in forms are included.

The product interface now opens on link management. Promotional copy and the engineering showcase were removed. Existing engineering evidence remains in the repository. Status filters, name/date sorting, loaded-data scope labels, and expandable diagnostic results were added. Zero-count chart bars now have zero height. Redirect error pages use the same visual theme and direct status messages.

Browser validation used a synthetic account and local D1 only. Verified link creation, copy feedback, directory search and reset, sort selection, all four navigation views, and five passing service checks. A 390-pixel iframe viewport was used to inspect mobile navigation, link rows, and the details dialog. This is responsive browser review, not physical device testing. The temporary viewport harness is excluded from the release.

The original 33-test suite, strict TypeScript checks, ESLint, and formatting checks were rerun for this revision. The unavailable-page assertion was updated for its new wording. No API, authorization, database, or rate-limit policies changed.

## Submission verification revision — November 10, 2026 (America/Chicago)

The current authoritative automated results are generated by `npm run verify:submission` in [runs/latest/manifest.json](runs/latest/manifest.json), with per-command logs and a SHA-256 input inventory. The runner records its base commit and whether changes were pending; the final source commit is supplied in the downloadable package. Run `npm run evidence:check` to verify the saved inventory against the checkout. Generated reports are excluded from their own hash inventory to avoid circularity.

This revision adds documentation, review preparation and development verification tooling. Existing product browser checks above remain earlier observations; no fresh browser pass is claimed for this documentation revision. The performance gate measures only in-memory service resolution, checks returned data, and enforces p95 <= 10 ms and total measured time <= 20,000 ms across 10,000 resolutions. These are regression guardrails, not user-facing latency objectives. The runner does not verify hosted alerting, backups, GitHub execution, physical devices or human approval.

The `performance-failure-control` step deliberately uses a tighter 0.00000001 ms p95 bound and requires the expected assertion and exit code 1. It passes only when a threshold violation is rejected, rather than accepting any arbitrary process failure. The normal performance step uses the documented 10 ms bound.

Evidence-integrity control: [tooling-controls.json](runs/tooling-controls.json) records a temporary README alteration being rejected by `evidence:check`, followed by successful verification after byte-for-byte restoration. The alteration was disposable local test input and is not in the submitted source. The control precedes final setup-documentation clarification; the final verifier run binds the final inputs.

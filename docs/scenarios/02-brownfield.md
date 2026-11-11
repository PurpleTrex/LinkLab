# Scenario 2 — evolve existing lifecycle behavior

**Change:** add expiration and revocation to the existing service without losing original links or invalidating existing creation keys.

Impacted paths: domain Link/CreateInput, request fingerprints, insert SQL, resolve service, public DTO, analytics lifecycle counts, migration/schema, API, UI status and tests.

Tasks:

1. Inspect the baseline types, fingerprint format, insert transaction and resolution path.
2. Append `expiresAt`, `revokedAt` and a constant-default `version` through migration 0001. Preserve migration 0000.
3. Treat old null lifecycle fields as active; check `now >= expiresAt`; give revocation precedence.
4. Add owner/version-scoped revocation plus atomic audit and an idempotent repeated-revoke result.
5. Preserve the original three-element fingerprint when no expiration is supplied.
6. Check idempotency before rejecting a newly invalid expiration, so an exact retry after expiry still returns the original resource.
7. Run migration, boundary, rollback, ownership, stale-version, legacy-fingerprint and expired-retry tests.

Actual review findings: initially appending `null` to every request fingerprint would have broken replay of v1 keys. Moving expiration validation ahead of the replay check would also have rejected legitimate retries after expiry. Both were corrected, and dedicated regression tests were added. These are actual build corrections, not invented human review events.

Rollout: additive schema first, then compatible code. Roll back code while retaining additive columns. Never run destructive down-migrations as an automatic rollback. Review the migration against a representative backup before a public rollout.

Task mapping: T03. Acceptance evidence is in `tests/service.test.ts`: migration preservation, lifecycle/version enforcement, creation/revocation rollback, expired-key replay and legacy fingerprint compatibility. `tests/http.test.ts` verifies the route-level lifecycle and response semantics. Baseline and completed release commits are identified in CHANGE-PROVENANCE.md; the intermediate faulty patch was not committed separately.

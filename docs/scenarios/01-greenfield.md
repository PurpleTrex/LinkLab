# Scenario 1 — establish a new service

**Requirement:** create short links and resolve them reliably, while keeping ownership and retried requests correct.

**Intent:** a small service with explicit input contracts and a database-backed source of truth. **Constraints:** original business code, bounded operations, no destination fetching, no copied shortener implementation. **Acceptance:** same alias cannot be claimed twice; a retry returns the same resource; different owners cannot manage one another's records; a failed audit write must not leave a link behind.

Tasks and dependencies:

1. Define domain input and public resource types, error codes, alias policy, and random generator.
2. Define relational schema with alias and owner/key uniqueness; depends on step 1.
3. Implement insert and audit transaction; depends on step 2.
4. Implement creation/replay/resolution service; depends on steps 1–3.
5. Exercise real SQL with a SQLite adapter and verify an initial working service; preserve the service baseline commit.
6. Add HTTP boundary and interface; these were completed after the service baseline.

Evidence: baseline commit `38f7f37cbb3fd11316b86ee5bcc14be3b297f4c9` records the service, initial schema, and two passing tests before lifecycle fields were added. It is a **service baseline**, not a claim that a complete historical web product existed. Final tests extend this foundation with concurrent creates, retries, injected audit failures, input policy, HTTP routes and ownership.

AI output accepted: original service/repository/domain modules. Revised during implementation: random alias helper cleanup, strict type errors, and client-side lint issues. Human review is pending.

Task mapping: T01–T02 in PLAN.md and TASK-RECORDS.md. Run `npm test` for the greenfield creation/replay/ownership assertions and `npm run verify:submission` for the full gate set. Review the exact historical files using CHANGE-PROVENANCE.md.

# Scenario 3 — define “popular links”

The high-level request for analytics leaves the unit, time window, identity model and failure semantics unspecified.

Questions an engineer would clarify:

- Do we mean redirect requests, unique people, or confirmed destination visits?
- Is “seven days” a rolling 168-hour interval or calendar buckets?
- Are bots, repeated opens and HEAD requests included?
- Is accuracy sufficient for product insight, or is this a billing ledger?
- What visitor information may be stored, and for how long?

**Working assumptions, not stakeholder-approved decisions:** rank by recorded successful GET redirect responses; include repeat requests and bots; exclude HEAD; use today and six previous UTC calendar dates; restrict results to the owner; no unique-person inference; accept undercount during telemetry failures. Destination arrival cannot be proven by a redirect service alone.

Decomposition: define semantics → choose `(linkId, day)` aggregate schema → atomic increment → owner-scoped queries and deterministic rank ordering → fill empty date buckets → expose clear labels → test window boundaries and owner isolation.

The UI and API expose these semantics rather than hiding them behind a misleading “unique clicks” label. There is no tracking cookie, visitor IP, referrer, or user-agent field. The runbook supplies aggregate retention maintenance; its scheduling remains an operational task.

Task mapping: T05; the project owner accepted D04 for this assignment prototype. Validation: `analytics uses exactly seven UTC dates and preserves owner boundaries` in `tests/service.test.ts`; GET/HEAD counting and failed analytics sink tests in `tests/http.test.ts`. `npm run verify:submission` captures their execution. This validates the selected semantics, not broader stakeholder agreement.

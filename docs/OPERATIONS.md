# Operations and release runbook

## Deployment boundary

The bundled deployment uses Sites with D1 binding `DB`. Source lives in its managed Git repository. Hosted migrations run before the new Worker is activated. The private audience remains unchanged. No production credentials are in source, docs or the downloadable package.

A separate Cloudflare account deployment is not turn-key: establish a verified identity gateway, disable direct Worker ingress, provision D1, and review audience/abuse policies first. The app trusts platform identity headers only within that boundary.

## Local migration procedure

`npm run db:migrate:local` applies ordered SQL through Wrangler's migration ledger, in the local emulator only. Repeating the command skips already applied migrations. The generated migration configuration is ignored under `.sites-runtime/`. Do not reuse it for production.

Before changing schema: run `npm run db:generate`, inspect generated SQL, commit SQL and metadata together, run migration preservation tests, and review the exact diff. Never edit an applied migration. Back up or export representative production data before risky changes. Rollback means revert compatible application code while leaving additive columns in place; destructive data rollback requires a separate reviewed plan.

## Signals

- `/healthz`: liveness only. No database call.
- `/api/v1/ready`: authenticated readiness; requires database and expected schema.
- `request.completed`: requestId, method, route category, status, durationMs.
- `request.failed`: requestId and generic failure category.
- `analytics.write_failed`: requestId; redirects remain available but metrics may undercount.

Application logs deliberately omit destinations, path aliases, owner identifiers, referrers and request bodies. Review platform/edge logging separately; application logging policy does not control every hosting log.

Before external traffic, configure alerts for sustained 5xx, readiness failures, analytics write failures, elevated 429, and database read/write quota growth. Alert thresholds and SLOs must be selected from measured traffic. No hosted alerting or on-call rotation is claimed by this package.

## Failure handling

| Symptom                      | Immediate action                                                              | Recovery                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| High 503 / readiness failure | Check DB binding, migration status and platform outage; correlate request IDs | Restore dependency or roll back compatible code; do not disable lifecycle checks               |
| Analytics write failures     | Treat dashboard counts as incomplete                                          | Repair write path; lost increments cannot be reconstructed from intentionally minimal app logs |
| 409 alias conflict           | Expected user-visible conflict                                                | Pick another alias; do not remove existing ownership                                           |
| 409 idempotency conflict     | Caller reused a key for different normalized content                          | Reuse original body or use a fresh key for a new intent                                        |
| 429                          | Check fixed-minute counters and abuse patterns                                | Wait Retry-After; investigate before raising quotas                                            |
| Stale lab fixtures           | Check cleanup failure and DB availability                                     | Run approved maintenance; reserved lab owners never redirect through the public resolver       |

## Retention

`scripts/maintenance.sql` proposes 90-day aggregate metrics, 365-day audit history, one-day stale rate counters and one-hour abandoned lab fixtures. Review policy before applying. Execute in bounded batches for large datasets. A daily scheduled job is **not configured** by this project. Normal links and creation keys remain reserved indefinitely to avoid alias reuse and replay ambiguity. User-data erasure is an operator process, not a hidden public endpoint.

## Recovery and rollback

1. Identify the release commit and observed failure; preserve request IDs and safe logs.
2. Check whether migrations applied, including after a failed deployment.
3. Roll back to a compatible Worker version. Do not assume schema changes rolled back automatically.
4. For data recovery, use the database provider's supported backup/restore facility under an approved runbook. Verify the intended restore point and affected records first.
5. Run readiness and synthetic create/redirect/revoke checks, then reopen traffic.

A real restore rehearsal and recovery objective are still required before public production use. Local benchmarks and test rollback triggers do not establish disaster-recovery readiness.

## CI and supply chain

The provided GitHub workflow is read-only, uses pinned action commit IDs, does not persist Git credentials, and runs install/type/lint/format/tests/audit/build. It does not deploy. Enforce required reviews and branch protection in your repository. Dependabot configuration is provided; it takes effect only on a GitHub repository with that feature enabled.

No secret-scanning service is configured in this private repository. Keep runtime variables in the hosting secret store; keep `.env.local` and `.dev.vars` untracked. Review every new dependency and generated migration. Fail high/critical advisory gates; assess lower-severity development-tool advisories explicitly.

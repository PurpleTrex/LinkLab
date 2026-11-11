# Security and threat model

## Assets and trust boundaries

Assets: destination URLs (which may themselves contain confidential query parameters), owner identity, link lifecycle, audit history, and availability. A short link is a locator, not a secret-access mechanism.

Trusted: the configured Sites authentication dispatch, application Worker code, D1 service and operator. Untrusted: every HTTP field/body/path, user-entered text and destination, and external websites. Local mock identity exists only in the development plugin on a loopback host/address; it is absent from production output.

## Controls implemented

| Threat                              | Control                                                                                                    | Verification                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Unauthorized resource access / IDOR | Identity required on every management route; SQL ownership filters; unauthorized IDs return 404            | HTTP tests for reads, analytics, deletion, and lists |
| CSRF                                | Exact Origin on every mutation; reject cross-site Fetch Metadata; JSON content type; no permissive CORS    | Cross-origin/unsupported-type tests                  |
| SQL injection                       | Prepared statements and typed bounds; no user interpolation into SQL                                       | SQL-like title round-trip test                       |
| Stored XSS                          | React text rendering; no HTML injection APIs; nonce script CSP; no external script sources                 | Browser inspection; source review                    |
| Oversized or malformed inputs       | Streamed 8 KiB body bound; URL/title/alias limits; strict allowed fields                                   | Chunked overflow, malformed JSON and input tests     |
| Unsafe destinations                 | HTTPS only, no credentials/custom port/IP literal/local suffix/same-origin target; hostname syntax checks  | Domain tests and live destination scenario           |
| SSRF                                | Service never fetches destination or resolves DNS                                                          | Code boundary review                                 |
| Alias/key races                     | Database unique constraints; atomic insert/audit batch                                                     | Concurrent request and rollback tests                |
| Forgotten revocation                | No redirect caching; lifecycle check on every resolution                                                   | HTTP lifecycle and boundary tests                    |
| Error or log disclosure             | Generic dependency failures, problem JSON, request IDs; URL/identity omitted from application logs         | Error and log tests                                  |
| Excessive API usage                 | Durable per-identity quotas: 120 management/min, 30 creation/min, 5 lab/min                                | Atomic limiter test                                  |
| Lab harms normal records            | Random reserved fixture owner; public resolver refuses lab owners; finally cleanup; predefined checks only | Scenario cleanup tests                               |
| Dependency compromise               | Exact direct versions, lockfile, audit command and CI gate, minimal dependency set                         | Recorded audit result                                |

HTML permits inline CSS because React chart heights and framework styles need it. Script execution uses per-response nonces; `object-src` and `base-uri` are disabled. JSON replies use `default-src 'none'`. The HTML allows framing only by itself and ChatGPT for the hosted preview. All responses set nosniff, no-referrer and HSTS; management and redirects are no-store.

## Deliberate limits

- Validation does not establish destination reputation. A public hostname can resolve to a private address or later host malicious content. Because no server fetch occurs, this does not become server-side SSRF, but a redirected browser still needs its own protection.
- No malware/reputation service, content moderation, anti-phishing interstitial, abuse-report workflow, organization membership policy, public registration or third-party API key issuance is included. The private access gate is part of this release's scope.
- App rate limits apply after authenticated identity. Anonymous redirects rely on the private gateway/platform; edge DDoS controls need separate verification before public release.
- Database administrators can alter records. The audit table is transactionally consistent, not an independently secured compliance ledger.
- Background metrics can be lost; do not use them for billing or regulated reporting.
- A database read outage returns 503 rather than resolving from a stale cache. This protects lifecycle correctness at the cost of availability.
- No independent penetration test, platform-header spoofing test, formal accessibility audit, or disaster-recovery rehearsal was performed in this environment.

## Secure AI use

Only the assignment, synthetic example domains and authored project code were used. Do not place production URLs, customer records, credentials or tokens into future prompts. Treat AI edits as untrusted changes until type checks, tests, review and relevant security checks pass. Do not let generated claims stand in for measurements or human approval.

Report a suspected vulnerability privately to the project owner. Include a minimal reproduction using synthetic data; avoid exposing actual destinations or credentials in public issues.

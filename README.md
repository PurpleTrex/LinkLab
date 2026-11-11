# LinkLab
<<<<<<< HEAD

An original URL service with a private dashboard, isolated reliability checks, and an inspectable engineering record. Built for the AI-proficient software engineering assignment.

**Release posture:** production-oriented implementation and private hosted release candidate. Automated verification is evidence, not a claim of independent certification, load capacity, or human approval. See [release readiness](docs/RELEASE.md) for the verified results and remaining operational work.

```sh
git clone source-history.bundle linklab-review
cd linklab-review
```

The bundle contains the same submitted source and its baseline history. Compare `git rev-parse HEAD` with `SOURCE-COMMIT.txt` in the extracted ZIP. If already working in the project repository, skip this step. The app itself can run from the extracted source, but source-hash/history verification requires a Git checkout.

Prerequisites: **Node.js 24.x**, npm, Git for verification/history review, and a current desktop browser. The backend uses a local D1 emulator; no cloud account or paid API key is needed for local development. Windows, macOS, and Linux are supported by the supplied development tools.

```sh
npm ci --ignore-scripts
npm run build
npm run db:migrate:local
npm run dev
```

Open the URL printed by the dev server (normally `http://localhost:5173`). Follow **Sign in to your workspace**. Loopback development uses a synthetic local account; it does not access a real ChatGPT account. The managed preview environment uses an explicit ignored `.env.local` switch for this same loopback-only simulator. **The simulator is not part of production builds.**

If using a managed environment, copy `.env.example` to `.env.local` to opt in to the test identity. Do not deploy Vite's development server.

```sh
npm run check                 # strict types, lint, format, tests
npm run test:coverage         # real SQLite integration + HTTP tests
npm run build                # production Worker + browser assets
npm run security:audit        # whole lockfile advisory check
npm run benchmark            # bounded local regression gate, not a cloud capacity claim
npm run verify:submission    # run all gates and save logs + source hashes
npm run evidence:check       # compare saved verification inputs to this checkout
```

The project uses exact direct dependency versions and a committed npm lockfile. Tests use Node 24's experimental TypeScript transformation and SQLite APIs; those features are test tooling, not the deployed runtime.

## What works

- Create a HTTPS short link with a generated or custom alias and optional expiration.
- Open an active link through `GET /s/{alias}`. `HEAD` resolves without incrementing analytics.
- Browse owner-scoped links using stable cursor pagination. Filter loaded links in the interface.
- Revoke a link with a version precondition; revoked aliases stay reserved.
- Inspect daily counts, seven-day rankings, and creation/revocation audit events.
- Run five isolated checks: alias collision, retry consistency, expiry boundary, analytics failure, and unsafe destinations.
- Inspect the API reference in the dashboard; engineering rationale and assignment evidence are in `docs/`.

The hosted workspace is **private**. Its redirects inherit the platform's access gate; these are not anonymous public short links. A public deployment is a separate release decision with abuse controls and gateway verification.

## Code map

| Location                   | Responsibility                                                      |
| -------------------------- | ------------------------------------------------------------------- |
| `app/`                     | Original React dashboard and responsive styling                     |
| `src/domain/`              | Input policy, lifecycle, public contracts, typed errors             |
| `src/server/http.ts`       | Versioned routes, identity enforcement, error mapping               |
| `src/server/service.ts`    | Creation/replay, collision handling, lifecycle                      |
| `src/server/repository.ts` | Parameterized SQL and atomic audit writes                           |
| `src/server/analytics.ts`  | Aggregate writes and bounded analytics queries                      |
| `src/server/security.ts`   | Body bounds, same-origin checks, rate limits, headers               |
| `src/lab/`                 | Real service checks with temporary isolated fixtures                |
| `db/schema.ts`, `drizzle/` | Schema and immutable, ordered migrations                            |
| `worker/index.ts`          | HTTP dispatch and nonce-based HTML security policy                  |
| `tests/`                   | Actual SQLite adapter, domain, migration and HTTP tests             |
| `docs/`                    | Architecture, threat model, API, operations, scenarios and evidence |

## Engineering contract

A custom alias is unique globally. The database arbitrates collisions. A random alias has 60 bits of randomness; five allocation attempts bound retries. Short codes are not authorization secrets.

An `Idempotency-Key` is required for creation. It is unique per owner and is retained with the link, including after revocation. An identical normalized request returns the original resource; a changed request returns 409. Non-expiring v1 fingerprints remain compatible with the lifecycle migration. Expiration validation happens after replay lookup so a retry of an expired resource still succeeds.

Creation and revocation commit together with their audit events. A failed audit insert rolls the mutation back. Revocation is a soft, permanent lifecycle operation, not physical deletion. A redirect already issued to a browser cannot be recalled.

Analytics are **best effort**. A background database write failure is logged and does not prevent the redirect. Counts include bots and repeated GETs, exclude HEAD, and do not prove the destination was visited. The display window is today plus six preceding UTC calendar dates. No IP address, user agent, referrer, cookie identifier, or unique-person estimate is stored.

## Review and deployment

Read [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), [operations](docs/OPERATIONS.md), and [the machine-readable API](docs/openapi.json). The three required assignment scenarios are in `docs/scenarios/`.

The hosting adapter expects Sites dispatch to authenticate visitors and supply trusted identity headers. **Never expose this Worker directly on a public `workers.dev` endpoint.** A standalone deployment requires a verified identity gateway and must strip untrusted incoming identity headers. An arbitrary reverse proxy is insufficient.

`docs/evidence/AI-EXECUTION.md` indexes preserved instructions, artifact-based retrospective records and current task evidence. No engineer approval or multi-day history is fabricated. The owner should review the code, run the checks, and fill in `docs/REVIEW-SIGNOFF.md` before representing the work as personally reviewed.

## Originality and dependencies

The application, domain rules, SQL, tests, visual design, and engineering documents were authored for this project. No third-party URL-shortener implementation was imported. Framework scaffolding and standard packages provide rendering, deployment, icons, schema generation, and development tools; their licenses remain applicable. Unused scaffold UI components and packages were removed. See [dependency notes](docs/DEPENDENCIES.md).
=======
A URL shortener lab. 
An original URL service with a private dashboard, isolated reliability checks, and an inspectable engineering record. Built for the AI-proficient software engineering assignment.
>>>>>>> ee827338e085b4eec03c392a0c9776532945c8ad

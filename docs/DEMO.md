# Reviewer demonstration

## Preparation

Follow README.md on Node 24. Start the local app and use the synthetic loopback sign-in. Use only `https://example.com/` destinations for this walkthrough. The hosted URL is owner-private; local demonstration avoids changing its audience.

Run `npm run verify:submission` before review. Open `docs/evidence/runs/latest/manifest.json`; inspect every gate and its log, the file hashes and the stated coverage limits.

## End-to-end walkthrough

1. Open **Links**, choose **Create link**, enter `https://example.com/resources`, title `Review demonstration`, and an unused alias such as `review-demo-001`.
2. Copy/open the short link; confirm the destination. Return to **Activity** and refresh. Explain that recorded GETs may be delayed, repeats count, and HEAD does not.
3. Search for the title and select **Active**. Open link details and inspect the creation and expiration fields.
4. For this disposable demonstration link only, use **Revoke link**, read the confirmation, and confirm. Open the short URL again: it should return the unavailable page (HTTP 410). Explain why its alias remains reserved.
5. Open **Diagnostics**, run all five checks once, and expand the results. A second immediate run can hit the documented five-check-per-minute limit; this is expected rate limiting.
6. Open **API reference** and connect the displayed contract to `docs/openapi.json` and the HTTP lifecycle test.

## Engineering discussion

| Scenario   | What to show                                                                         | Questions to explain in your own words                                                      |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Greenfield | Baseline commit, schema constraints, create/resolve service and initial tests        | Why does the database decide collisions? What does an idempotency key guarantee?            |
| Brownfield | Migration 0001, fingerprint compatibility and retry-after-expiration tests           | What survives migration? Why must replay lookup happen before new-expiration validation?    |
| Ambiguous  | Counting assumptions, daily aggregate SQL and seven-day boundary test                | What does a redirect count prove? Which decisions need stakeholder agreement?               |
| AI process | Prompt record, task records, source diffs, fresh gate logs and your completed review | What did AI author? What did you change or reject, and why? Which claims remain unverified? |

Record actual outcomes and any deviations in REVIEW-SIGNOFF.md. This is a demo procedure, not evidence that the candidate already performed it.

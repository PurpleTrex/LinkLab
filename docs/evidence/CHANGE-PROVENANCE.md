# Source provenance and review boundaries

The repository contains these actual commits. Dates can be inspected with Git; none are backdated or added to simulate a longer exercise.

| Commit                                     | Recorded content                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `38f7f37cbb3fd11316b86ee5bcc14be3b297f4c9` | Tested service/schema baseline; two initial tests before lifecycle extension                                                         |
| `21b7222cca73539d689959473dedd00b4197f09d` | Complete private application, lifecycle migration, analytics, API, tests and initial evidence                                        |
| `7c4fc9ad1dc03cfd352845d4693f7e3dd4448476` | Corporate interface revision and updated browser-validation notes                                                                    |
| Submission evidence revision               | The successor commit containing this file and verification reports; obtain its full ID with `git rev-parse HEAD` in the final bundle |

The old documentation named `greenfield-baseline`, but that tag was absent from the recovered repository. The durable reference is the existing full baseline commit above. This revision removes reliance on the unavailable tag rather than fabricating when it was created.

## Inspect the changes

```sh
git show --stat 38f7f37cbb3fd11316b86ee5bcc14be3b297f4c9
git diff 38f7f37cbb3fd11316b86ee5bcc14be3b297f4c9 21b7222cca73539d689959473dedd00b4197f09d -- src db drizzle tests
git diff 21b7222cca73539d689959473dedd00b4197f09d 7c4fc9ad1dc03cfd352845d4693f7e3dd4448476 -- app components public src/server/error-page.ts tests/http.test.ts
git diff 7c4fc9ad1dc03cfd352845d4693f7e3dd4448476 HEAD -- docs scripts package.json .github README.md
```

The first diff contains the brownfield additions alongside completion of the HTTP/UI layer. It is not portrayed as a series of separately approved pull requests. The migration and regression tests isolate the lifecycle change for review.

## Recover reviewable history from the submission archive

The archive contains `source-history.bundle` and `SOURCE-COMMIT.txt` alongside the source tree. The bundle includes reachable history of the submitted main branch, not local credentials, databases or environment files.

```sh
git clone source-history.bundle linklab-review
cd linklab-review
git log --oneline --all
```

Compare `git rev-parse HEAD` to SOURCE-COMMIT.txt. The verifier manifest records its pre-commit base plus per-file hashes; generated verification reports are excluded from their own hash set. `npm run evidence:check` compares that hash set against the current checkout. Hashes bind evidence to bytes, not to human approval.

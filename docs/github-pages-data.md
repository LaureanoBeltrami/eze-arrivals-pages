# Static data branch design

`sync-tams-data.yml` runs at minutes 2, 7, 12 through 57 of every UTC hour and can also be dispatched manually. Each run checks out the reviewed source, reads the current `data` branch in a separate worktree, and publishes only `public/data/arrivals.json` when canonical flight content changed.

The workflow never force-pushes. A rejected normal push is a safe failure: the existing JSON remains served. HTTP, malformed, invalid, empty-replacement, and stale-candidate failures also leave the data branch untouched. The workflow summary reports only counts and status, never raw flights or response bodies.

The document exposes three distinct timestamps: `lastSuccessfulSyncAt`, `lastFlightChangeAt`, and `lastFailedSyncAt`. A successful response with no flight change emits at most one heartbeat commit per hour, so the browser can distinguish a healthy unchanged board from stale data without creating a commit every five minutes. A failure publishes only its first transition; repeated failures remain in the Actions log until a later successful recovery clears the failure marker. The frontend retains the current board if a remote response is older by its successful-sync timestamp or fails.

## History policy

Do not compact in the regular sync workflow. Retain ordinary fast-forward commits on `data`; never use recurring force-pushes. If history needs compaction, create and validate a new epoch branch (for example `data-2027q1`) from a verified snapshot, preserve the old branch as a read-only rollback source, and deliberately change the frontend configuration in a reviewed release. This avoids replacing a live ref or deleting valid data accidentally.

## GitHub Raw caveats

GitHub Raw is a best-effort static origin, not a freshness SLA. Browsers may cache it, and GitHub Actions schedules can be delayed or dropped under load; scheduled workflows in public repositories can also be disabled after 60 days without repository activity. The frontend uses `cache: "no-cache"`, rejects an older `lastSuccessfulSyncAt`, keeps prior data on failure, and visibly marks old data stale. CORS must be validated against the exact public Raw URL before release; if it does not permit browser access, keep `VITE_ARRIVALS_JSON_URL` unset and deploy data with Pages instead.

For a Pages deployment sourced from the `data` branch, every data change requires a Pages deployment. That avoids cross-origin Raw reads but creates deploy churn and does not make the five-minute scheduler reliable. Neither option is a real-time data service.

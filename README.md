# EZE International Arrivals — GitHub Pages

Static FIDS board for EZE international arrivals. It is independent from the
legacy application and only contains a React/Vite frontend, the isolated TAMS
synchronizer, a manually dispatched Pages workflow, and a scheduled data-sync
workflow.

The committed `public/data/arrivals.json` is deliberately an empty example.
It contains no flight data and permits the board to build safely before the
first authorized synchronization.

## Local checks

```powershell
npm ci
npm run test:all
npm run typecheck
npm run build
```

`npm run build` uses `/eze-arrivals-pages/`, the GitHub Pages project path.
For a future custom domain, build with `PAGES_BASE=/` after that domain has
been configured in GitHub Pages.

## Manual workflows

1. In the GitHub repository, select **Settings → Pages → Source: GitHub Actions**.
2. Run **Deploy GitHub Pages** manually to publish the reviewed frontend.
3. **Synchronize TAMS snapshot to data branch** retains a server-side backup; the
   board reads the public TAMS API directly every 45 seconds (with that snapshot
   as its fallback), so it remains current if GitHub delays scheduled runs.
   minutes 2, 7, 12 through 57 UTC, and can also be dispatched manually. It
   writes only `public/data/arrivals.json` on the
   independent `data` branch, avoids force pushes, and retains the last valid
   snapshot when validation or the provider fails.

Pages reads the public `data` branch by default. To use a different public,
CORS-enabled JSON endpoint, configure the repository Actions variable
`ARRIVALS_JSON_URL` and manually run **Deploy GitHub Pages** again:

```powershell
ARRIVALS_JSON_URL=https://raw.githubusercontent.com/LaureanoBeltrami/eze-arrivals-pages/data/public/data/arrivals.json
```

The browser never contacts TAMS. It revalidates the published JSON every 45
seconds and uses its successful-sync timestamp to determine freshness. GitHub
Raw is a cacheable delivery endpoint, not a fixed-freshness guarantee; see
`docs/github-pages-data.md` before enabling automated updates.

## First publication (when authorized)

After the audit and after creating an empty public GitHub repository:

```powershell
git add .
git status
git commit -m "feat: add standalone GitHub Pages arrivals board"
git remote add origin https://github.com/LaureanoBeltrami/eze-arrivals-pages.git
git push -u origin main
```

GitHub Actions schedules are best-effort: they may be delayed or dropped under
load, and public-repository schedules can be disabled after prolonged
inactivity. GitHub Raw is cacheable and does not provide a freshness SLA; the
board therefore shows the last successful sync and stale-data state.

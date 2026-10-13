# EZE International Arrivals — GitHub Pages

Static FIDS board for EZE international arrivals. It is independent from the
legacy application and includes a Netlify central synchronizer: one scheduled
server-side refresh shared by every visitor.

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
3. On Netlify, **refresh-arrivals** runs every five minutes. It validates the
   two TAMS windows, stores one shared snapshot in Netlify Blobs, and preserves
   the last valid flights if the provider fails. **arrivals** exposes that saved
   snapshot to every visitor; it never contacts TAMS.

Pages reads the public `data` branch by default. To use a different public,
CORS-enabled JSON endpoint, configure the repository Actions variable
`ARRIVALS_JSON_URL` and manually run **Deploy GitHub Pages** again:

```powershell
ARRIVALS_JSON_URL=https://raw.githubusercontent.com/LaureanoBeltrami/eze-arrivals-pages/data/public/data/arrivals.json
```

The browser never contacts TAMS. It revalidates the shared snapshot every five
seconds and uses its successful-sync timestamp to determine freshness.

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

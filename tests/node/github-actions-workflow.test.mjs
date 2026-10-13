import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("data workflow schedules real guarded syncs safely and without force pushes", async () => {
    const workflow = await readFile(new URL("../../.github/workflows/sync-tams-data.yml", import.meta.url), "utf8");
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /schedule:[\s\S]*?cron: "2-57\/5 \* \* \* \*"/);
    assert.match(workflow, /^permissions:\s*\n\s+contents: write\s*$/m);
    assert.match(workflow, /concurrency:/);
    assert.match(workflow, /cancel-in-progress: false/);
    assert.match(workflow, /timeout-minutes: 3/);
    assert.match(workflow, /runs-on: ubuntu-24\.04/);
    assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
    assert.match(workflow, /actions\/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1/);
    assert.match(workflow, /node sync\/sync-tams\.mjs --live/);
    assert.match(workflow, /TAMS_SYNC_LIVE: "1"/);
    assert.match(workflow, /Report failure while retaining published flights/);
    assert.match(workflow, /push origin HEAD:data/);
    assert.doesNotMatch(workflow, /git\s+[^\n]*push\s+--force/i);
    assert.doesNotMatch(workflow, /secrets\./i);
});

test("Pages workflow remains manual and builds the project URL", async () => {
    const workflow = await readFile(new URL("../../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /^\s*schedule:/m);
    assert.match(workflow, /PAGES_BASE=\/eze-arrivals-pages\//);
    assert.match(workflow, /runs-on: ubuntu-24\.04/);
    assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
    assert.match(workflow, /actions\/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d/);
    assert.match(workflow, /actions\/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1/);
    assert.match(workflow, /actions\/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9/);
    assert.match(workflow, /actions\/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346/);
    assert.doesNotMatch(workflow, /secrets\./i);
});

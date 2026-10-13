import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("data workflow remains manual, serialized, credential-free and force-push-free", async () => {
    const workflow = await readFile(new URL("../../.github/workflows/sync-tams-data.yml", import.meta.url), "utf8");
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /^\s*schedule:/m);
    assert.match(workflow, /contents: write/);
    assert.match(workflow, /concurrency:/);
    assert.match(workflow, /cancel-in-progress: false/);
    assert.match(workflow, /timeout-minutes: 3/);
    assert.match(workflow, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/);
    assert.doesNotMatch(workflow, /git\s+[^\n]*push\s+--force/i);
    assert.doesNotMatch(workflow, /secrets\./i);
});

test("Pages workflow remains manual and builds the project URL", async () => {
    const workflow = await readFile(new URL("../../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /^\s*schedule:/m);
    assert.match(workflow, /PAGES_BASE=\/eze-arrivals-pages\//);
    assert.match(workflow, /actions\/deploy-pages@/);
    assert.doesNotMatch(workflow, /secrets\./i);
});

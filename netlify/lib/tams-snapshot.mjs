import { readFile } from "node:fs/promises";
import { markSyncFailure, synchronizeTams } from "../../sync/lib/github-pages-tams-sync.mjs";

const emptySnapshot = { schemaVersion: 1, lastUpdate: null, syncFailed: false, flights: [] };
let airportsPromise;

async function airports() {
    airportsPromise ??= readFile(new URL("../../sync/data/airports.json", import.meta.url), "utf8").then(JSON.parse);
    return airportsPromise;
}

/** Fetches and validates TAMS once. It never exposes an unvalidated provider response. */
export async function createTamsSnapshot(fetcher = fetch, previous = emptySnapshot) {
    try {
        const { document, report } = await synchronizeTams({
            fetcher,
            airports: await airports(),
            previous,
            now: new Date().toISOString(),
        });
        return { document, report, failed: false };
    } catch (error) {
        return {
            document: markSyncFailure(previous),
            report: null,
            failed: true,
            error: error instanceof Error ? error.message : "unknown TAMS error",
        };
    }
}

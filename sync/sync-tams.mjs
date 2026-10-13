import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { markSyncFailure, synchronizeTams } from "./lib/github-pages-tams-sync.mjs";
import { decideFailurePublication, decidePublication, safeMetrics } from "./lib/snapshot-publication.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const snapshotPath = resolve(process.env.SNAPSHOT_PATH ?? resolve(root, "public/data/arrivals.json"));
const airportsPath = resolve(root, "sync/data/airports.json");
async function readJson(path, fallback) { try { return JSON.parse(await readFile(path, "utf8")); } catch (error) { if (error?.code === "ENOENT") return fallback; throw error; } }
async function writeAtomically(path, value) { const temporary = `${path}.next`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, path); }

// Prevents accidental real provider traffic from a local command or copied workflow.
if (process.argv[2] !== "--live" || process.env.TAMS_SYNC_LIVE !== "1") throw new Error("Refusing network access. Use --live and TAMS_SYNC_LIVE=1 only after approval.");
const previous = await readJson(snapshotPath, { schemaVersion: 1, lastUpdate: null, syncFailed: false, flights: [] });
const airports = await readJson(airportsPath, {});
try {
    const { document, report } = await synchronizeTams({ fetcher: fetch, airports, previous });
    const decision = decidePublication(previous, document);
    if (decision.publish) await writeAtomically(snapshotPath, decision.document);
    console.log(JSON.stringify({ status: "synchronized", ...safeMetrics(report, decision) }));
} catch (error) {
    const failure = markSyncFailure(previous);
    const decision = decideFailurePublication(previous, failure);
    if (decision.publish) await writeAtomically(snapshotPath, decision.document);
    console.log(JSON.stringify({ status: "failed", ...safeMetrics(null, decision), error: error instanceof Error ? error.message : "unknown" }));
    process.exitCode = 1;
}

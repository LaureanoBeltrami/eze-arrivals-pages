import { getStore } from "@netlify/blobs";
import { createTamsSnapshot } from "../lib/tams-snapshot.mjs";

const store = () => getStore({ name: "eze-arrivals", consistency: "strong" });

export default async () => {
    const previous = await store().get("current", { type: "json", consistency: "strong" }) ?? {
        schemaVersion: 1, lastUpdate: null, syncFailed: false, flights: [],
    };
    const result = await createTamsSnapshot(fetch, previous);
    // A failed request preserves the last valid flights and records the failure time.
    await store().setJSON("current", result.document);
    if (result.failed) throw new Error(`TAMS refresh failed: ${result.error}`);
};

export const config = { schedule: "*/5 * * * *" };

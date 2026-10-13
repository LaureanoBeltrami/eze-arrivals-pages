import type { ArrivalsSnapshot } from "../lib/arrivalsSnapshot";
import { publicAsset } from "../lib/publicAsset";
import type { Flight } from "../types/flights";

export const STATIC_ARRIVALS_PATH = "data/arrivals.json";

export function staticArrivalsUrl(): URL {
    const configured = import.meta.env.VITE_ARRIVALS_JSON_URL;
    return new URL(configured || publicAsset(STATIC_ARRIVALS_PATH), globalThis.location.href);
}

export interface StaticArrivalsDocument {
    schemaVersion: 1;
    lastSuccessfulSyncAt?: string | null;
    lastFlightChangeAt?: string | null;
    lastFailedSyncAt?: string | null;
    /** Legacy stage-2 field, read only to migrate an existing empty snapshot. */
    lastUpdate?: string | null;
    syncFailed?: boolean;
    flights: Flight[];
}

export interface StaticArrivalsSnapshot extends ArrivalsSnapshot {
    lastSuccessfulSyncAt: string | null;
    lastFlightChangeAt: string | null;
    lastFailedSyncAt: string | null;
}

function isStaticArrivalsDocument(value: unknown): value is StaticArrivalsDocument {
    if (!value || typeof value !== "object") return false;
    const document = value as Partial<StaticArrivalsDocument>;
    return (
        document.schemaVersion === 1 &&
        Array.isArray(document.flights) &&
        (document.lastSuccessfulSyncAt === undefined || document.lastSuccessfulSyncAt === null || typeof document.lastSuccessfulSyncAt === "string") &&
        (document.lastFlightChangeAt === undefined || document.lastFlightChangeAt === null || typeof document.lastFlightChangeAt === "string") &&
        (document.lastFailedSyncAt === undefined || document.lastFailedSyncAt === null || typeof document.lastFailedSyncAt === "string") &&
        (document.lastUpdate === undefined || document.lastUpdate === null || typeof document.lastUpdate === "string") &&
        (document.syncFailed === undefined || typeof document.syncFailed === "boolean")
    );
}

export async function loadStaticArrivals(
    fetcher: typeof fetch = fetch,
    previousLastUpdate: string | null = null,
): Promise<StaticArrivalsSnapshot> {
    const response = await fetcher(staticArrivalsUrl(), {
        // Revalidate a cached GitHub Raw/Pages response instead of creating a new URL every 45s.
        cache: "no-cache",
        headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Static arrivals HTTP ${response.status}`);
    const document: unknown = await response.json();
    if (!isStaticArrivalsDocument(document)) {
        throw new Error("Invalid static arrivals document");
    }
    const lastSuccessfulSyncAt = document.lastSuccessfulSyncAt ?? document.lastUpdate ?? null;
    if (
        previousLastUpdate &&
        lastSuccessfulSyncAt &&
        Date.parse(lastSuccessfulSyncAt) < Date.parse(previousLastUpdate)
    ) {
        throw new Error("Stale static arrivals document");
    }
    return {
        flights: document.flights,
        serverTime: new Date().toISOString(),
        // Existing board utilities use lastUpdate as their freshness input.
        lastUpdate: lastSuccessfulSyncAt,
        lastSuccessfulSyncAt,
        lastFlightChangeAt: document.lastFlightChangeAt ?? document.lastUpdate ?? null,
        lastFailedSyncAt: document.lastFailedSyncAt ?? null,
        syncFailed: document.syncFailed ?? false,
    } satisfies StaticArrivalsSnapshot;
}

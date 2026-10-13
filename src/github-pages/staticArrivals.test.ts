// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { loadStaticArrivals, staticArrivalsUrl } from "./staticArrivals";

describe("static GitHub Pages arrivals source", () => {
    it("reads explicit synchronization metadata with a revalidating request", async () => {
        const fetcher = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                schemaVersion: 1,
                lastSuccessfulSyncAt: "2026-10-12T15:00:00Z",
                lastFlightChangeAt: "2026-10-12T14:40:00Z",
                lastFailedSyncAt: null,
                syncFailed: false,
                flights: [],
            }),
        });

        const snapshot = await loadStaticArrivals(fetcher);

        expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({
            href: "https://raw.githubusercontent.com/LaureanoBeltrami/eze-arrivals-pages/data/public/data/arrivals.json",
        }), {
            cache: "no-cache", headers: { Accept: "application/json" },
        });
        expect(snapshot.flights).toEqual([]);
        expect(snapshot.lastUpdate).toBe("2026-10-12T15:00:00Z");
        expect(snapshot.lastSuccessfulSyncAt).toBe("2026-10-12T15:00:00Z");
        expect(snapshot.lastFlightChangeAt).toBe("2026-10-12T14:40:00Z");
        expect(snapshot.syncFailed).toBe(false);
        expect(Number.isFinite(Date.parse(snapshot.serverTime))).toBe(true);
    });

    it("uses the isolated data branch by default", () => {
        expect(staticArrivalsUrl().href).toBe("https://raw.githubusercontent.com/LaureanoBeltrami/eze-arrivals-pages/data/public/data/arrivals.json");
    });

    it("rejects an invalid document instead of rendering untrusted data", async () => {
        await expect(
            loadStaticArrivals(
                vi.fn().mockResolvedValue({ ok: true, json: async () => ({ flights: [] }) }),
            ),
        ).rejects.toThrow("Invalid static arrivals document");
    });

    it("reports HTTP failures without falling back to a provider request", async () => {
        await expect(
            loadStaticArrivals(vi.fn().mockResolvedValue({ ok: false, status: 503 })),
        ).rejects.toThrow("Static arrivals HTTP 503");
    });

    it("rejects an older remote snapshot and keeps the current board intact", async () => {
        await expect(loadStaticArrivals(
            vi.fn().mockResolvedValue({ ok: true, json: async () => ({
                schemaVersion: 1, lastUpdate: "2026-10-12T14:00:00Z", flights: [],
            }) }),
            "2026-10-12T15:00:00Z",
        )).rejects.toThrow("Stale static arrivals document");
    });
});

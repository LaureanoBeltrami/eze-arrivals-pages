import { useCallback, useEffect, useRef, useState } from "react";
import { ARRIVALS_REFRESH_MS } from "../lib/arrivalsSnapshot";
import { loadStaticArrivals, type StaticArrivalsSnapshot } from "./staticArrivals";

// Netlify starts the shared job on each five-minute boundary.  Give it time to
// finish saving its snapshot before browser screens read it.
const SHARED_REFRESH_SETTLE_MS = 30_000;
const SHARED_REFRESH_RETRY_MS = 15_000;
const SHARED_REFRESH_RETRY_WINDOW_MS = 2 * 60_000;

function delayUntilSharedRefresh(): number {
    const nextBoundary = (Math.floor(Date.now() / ARRIVALS_REFRESH_MS) + 1) * ARRIVALS_REFRESH_MS;
    return Math.max(1_000, nextBoundary + SHARED_REFRESH_SETTLE_MS - Date.now());
}

/** Reads only the published JSON snapshot; it never calls the provider. */
export function useStaticArrivalsRefresh(
    onSnapshot: (snapshot: StaticArrivalsSnapshot) => void,
) {
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const busy = useRef(false);
    const lastSuccessfulUpdate = useRef<string | null>(null);

    const refresh = useCallback(async (): Promise<boolean> => {
        if (busy.current) return false;
        busy.current = true;
        setRefreshing(true);
        setMessage(null);
        try {
            const snapshot = await loadStaticArrivals(fetch, lastSuccessfulUpdate.current);
            const changed = snapshot.lastUpdate !== lastSuccessfulUpdate.current;
                lastSuccessfulUpdate.current = snapshot.lastUpdate;
                onSnapshot(snapshot);
            return changed;
        } catch {
            setMessage("No se pudieron actualizar los datos publicados.");
            return false;
        } finally {
            busy.current = false;
            setRefreshing(false);
        }
    }, [onSnapshot]);

    useEffect(() => {
        void refresh();
        let timer: number;
        const scheduleSharedRefresh = () => {
            timer = globalThis.window.setTimeout(async () => {
                const retryDeadline = Date.now() + SHARED_REFRESH_RETRY_WINDOW_MS;
                const readUntilChanged = async () => {
                    const changed = await refresh();
                    if (!changed && Date.now() < retryDeadline) {
                        timer = globalThis.window.setTimeout(() => void readUntilChanged(), SHARED_REFRESH_RETRY_MS);
                        return;
                    }
                    scheduleSharedRefresh();
                };
                await readUntilChanged();
            }, delayUntilSharedRefresh());
        };
        const refreshWhenVisible = () => {
            if (!document.hidden) void refresh();
        };
        const refreshOnFocus = () => void refresh();
        // Keep every screen aligned with the one shared server refresh rather
        // than five minutes after whichever second it happened to be opened.
        scheduleSharedRefresh();
        document.addEventListener("visibilitychange", refreshWhenVisible);
        globalThis.window.addEventListener("focus", refreshOnFocus);
        return () => {
            globalThis.window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
            globalThis.window.removeEventListener("focus", refreshOnFocus);
        };
    }, [refresh]);

    return { refresh, refreshing, message };
}

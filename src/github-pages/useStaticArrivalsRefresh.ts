import { useCallback, useEffect, useRef, useState } from "react";
import { ARRIVALS_REFRESH_MS } from "../lib/arrivalsSnapshot";
import { loadStaticArrivals, type StaticArrivalsSnapshot } from "./staticArrivals";

// Netlify starts the shared job on each five-minute boundary.  Give it time to
// finish saving its snapshot before browser screens read it.
const SHARED_REFRESH_SETTLE_MS = 45_000;

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

    const refresh = useCallback(() => {
        if (busy.current) return;
        busy.current = true;
        setRefreshing(true);
        setMessage(null);
        void loadStaticArrivals(fetch, lastSuccessfulUpdate.current)
            .then((snapshot) => {
                lastSuccessfulUpdate.current = snapshot.lastUpdate;
                onSnapshot(snapshot);
            })
            .catch(() => setMessage("No se pudieron actualizar los datos publicados."))
            .finally(() => {
                busy.current = false;
                setRefreshing(false);
            });
    }, [onSnapshot]);

    useEffect(() => {
        refresh();
        let timer: number;
        const scheduleSharedRefresh = () => {
            timer = globalThis.window.setTimeout(() => {
                refresh();
                scheduleSharedRefresh();
            }, delayUntilSharedRefresh());
        };
        const refreshWhenVisible = () => {
            if (!document.hidden) refresh();
        };
        // Keep every screen aligned with the one shared server refresh rather
        // than five minutes after whichever second it happened to be opened.
        scheduleSharedRefresh();
        document.addEventListener("visibilitychange", refreshWhenVisible);
        globalThis.window.addEventListener("focus", refresh);
        return () => {
            globalThis.window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
            globalThis.window.removeEventListener("focus", refresh);
        };
    }, [refresh]);

    return { refresh, refreshing, message };
}

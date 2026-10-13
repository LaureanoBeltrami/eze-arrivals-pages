import { useCallback, useEffect, useRef, useState } from "react";
import { ARRIVALS_REFRESH_MS } from "../lib/arrivalsSnapshot";
import { loadStaticArrivals, type StaticArrivalsSnapshot } from "./staticArrivals";

/** Reads only the published JSON snapshot; it never calls the provider. */
export function useStaticArrivalsRefresh(
    onSnapshot: (snapshot: StaticArrivalsSnapshot) => void,
) {
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const busy = useRef(false);
    const lastAttempt = useRef(0);
    const lastSuccessfulUpdate = useRef<string | null>(null);

    const refresh = useCallback(() => {
        if (busy.current || document.hidden) return;
        busy.current = true;
        lastAttempt.current = Date.now();
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
        const refreshIfDue = () => {
            if (Date.now() - lastAttempt.current >= ARRIVALS_REFRESH_MS) refresh();
        };
        // Do not re-check elapsed time here: a timer firing a few milliseconds
        // early would otherwise skip an entire five-minute cycle.
        const timer = globalThis.window.setInterval(refresh, ARRIVALS_REFRESH_MS);
        document.addEventListener("visibilitychange", refreshIfDue);
        return () => {
            globalThis.window.clearInterval(timer);
            document.removeEventListener("visibilitychange", refreshIfDue);
        };
    }, [refresh]);

    return { refresh, refreshing, message };
}

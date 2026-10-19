import { useEffect, useMemo, useState } from "react";
import AirportHeader from "../Components/Flights/AirportHeader";
import ArrivalsStats from "../Components/Flights/ArrivalsStats";
import FlightFilters from "../Components/Flights/FlightFilters";
import FlightSearch from "../Components/Flights/FlightSearch";
import FlightTable from "../Components/Flights/FlightTable";
import { arrivalsStats, isTerminalA } from "../lib/arrivalsDisplay";
import { filterFlights } from "../lib/flights";
import { time } from "../lib/flightTime";
import type { RelativeTimeFilter } from "../types/flights";
import { type StaticArrivalsSnapshot } from "./staticArrivals";
import { useStaticArrivalsRefresh } from "./useStaticArrivalsRefresh";
import VisasPage from "./VisasPage";

const STATIC_STALE_MS = 3 * 60 * 60 * 1000;
const emptySnapshot: StaticArrivalsSnapshot = {
    flights: [],
    serverTime: new Date().toISOString(),
    lastUpdate: null,
    lastSuccessfulSyncAt: null,
    lastFlightChangeAt: null,
    lastFailedSyncAt: null,
    syncFailed: false,
};

export default function GitHubPagesArrivals() {
    const [view, setView] = useState<"arrivals" | "visas">("arrivals");
    const [window, setWindow] = useState<Exclude<RelativeTimeFilter, null>>("now");
    const [search, setSearch] = useState("");
    const [snapshot, setSnapshot] = useState(emptySnapshot);
    const [now, setNow] = useState(() => Date.now());
    const { refresh, refreshing, message } = useStaticArrivalsRefresh(setSnapshot);

    useEffect(() => {
        const timer = globalThis.window.setInterval(() => setNow(Date.now()), 1_000);
        return () => globalThis.window.clearInterval(timer);
    }, []);

    const pool = useMemo(() => snapshot.flights.filter(isTerminalA), [snapshot.flights]);
    const visible = useMemo(() => filterFlights(pool, search, now, window), [pool, search, now, window]);
    const stats = useMemo(() => arrivalsStats(pool, now), [pool, now]);
    const fresh =
        !snapshot.syncFailed &&
        snapshot.lastSuccessfulSyncAt !== null &&
        now - Date.parse(snapshot.lastSuccessfulSyncAt) < STATIC_STALE_MS;
    const updateStatus = snapshot.syncFailed
        ? "ERROR DE ACTUALIZACIÓN"
        : fresh
          ? "DATOS ACTUALIZADOS"
          : "DATOS DESACTUALIZADOS";

    if (view === "visas") return <VisasPage now={now} onBack={() => setView("arrivals")} />;
    return (
        <div className="fids-page">
            <AirportHeader now={now} />
            <main className="fids-main">
                <ArrivalsStats {...stats} />
                <section className="arrivals-board" aria-label="Tablero de arribos de Terminal A">
                    <div className="board-controls">
                        <FlightFilters value={window} onChange={setWindow} now={now} />
                        <FlightSearch value={search} onChange={setSearch} />
                        <div className="refresh-control">
                            <div>
                                <button onClick={() => setView("visas")}>
                                    Visas
                                </button>
                                <a className="dnm-link" href="https://www.dnm.gov.ar/login/" target="_blank" rel="noopener noreferrer" aria-label="Abrir DNM en una pestaña nueva">DNM</a>
                                <time title="Última sincronización exitosa con TAMS publicada" dateTime={snapshot.lastSuccessfulSyncAt ?? undefined}>
                                    Última sincronización TAMS: {time(snapshot.lastSuccessfulSyncAt)}
                                </time>
                            </div>
                            <span role="status" className={snapshot.syncFailed ? "update-error" : fresh ? "update-fresh" : "update-stale"}>
                                <span aria-hidden="true">●</span> {updateStatus}
                            </span>
                        </div>
                    </div>
                    {!fresh && !snapshot.syncFailed && (
                        <p className="sync-message" role="alert">Advertencia: los datos publicados pueden estar desactualizados.</p>
                    )}
                    <div className="sync-message" aria-live="polite">
                        <span>Último cambio de vuelos: {time(snapshot.lastFlightChangeAt)}</span>
                        {snapshot.lastFailedSyncAt && <span> · Último intento fallido: {time(snapshot.lastFailedSyncAt)}</span>}
                    </div>
                    {message && <p className="sync-message" role="alert">{message}</p>}
                    <FlightTable flights={visible} onReset={() => { setSearch(""); setWindow("now"); }} filtered={!!search || window !== "now"} relative={window} />
                    <div className="board-summary">
                        <span><strong>{String(visible.length).padStart(2, "0")}</strong> vuelos en la ventana seleccionada</span>
                        <span>TERMINAL A <span className="summary-dot">·</span> Hora efectiva de llegada</span>
                    </div>
                </section>
            </main>
            <footer className="fids-footer">
                <div><strong>EZE</strong><span className="footer-divider">|</span>Aeropuerto Internacional Ministro Pistarini<p>Buenos Aires, Argentina</p></div>
                <div className="footer-source">Datos por <strong>TAMS Organismos</strong><p>Todos los horarios en hora local de Argentina (UTC-3)</p></div>
            </footer>
        </div>
    );
}

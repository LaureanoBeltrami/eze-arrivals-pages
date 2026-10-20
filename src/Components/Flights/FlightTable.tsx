import { ArrowDown, SearchX } from "lucide-react";
import type { Flight } from "../../types/flights";
import FlightRow from "./FlightRow";
import { displayedArrivalTime } from "../../lib/flightTime";
export default function FlightTable({
    flights,
    onReset,
    filtered,
    relative,
}: {
    flights: Flight[];
    onReset: () => void;
    filtered: boolean;
    relative: string;
}) {
    const direction = relative.startsWith("-") ? -1 : 1;
    const orderedFlights = [...flights].sort((a, b) => {
        const aDisplayed = displayedArrivalTime(a);
        const bDisplayed = displayedArrivalTime(b);
        const aTime = aDisplayed ? Date.parse(aDisplayed) : NaN;
        const bTime = bDisplayed ? Date.parse(bDisplayed) : NaN;
        if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
            return direction * (aTime - bTime) || a.flight_number.localeCompare(b.flight_number);
        }
        if (Number.isFinite(aTime)) return -1;
        if (Number.isFinite(bTime)) return 1;
        return a.flight_number.localeCompare(b.flight_number);
    });
    return (
        <>
            <div
                className="table-scroll"
                scroll-region=""
                tabIndex={0}
                role="region"
                aria-label="Tabla de arribos internacionales"
            >
                <table className="fids-table">
                    <caption className="sr-only">
                        Arribos internacionales de Terminal A ordenados por horario
                        efectivo de llegada. Horarios de Argentina.
                    </caption>
                    <thead>
                        <tr>
                            {[
                                "HORA",
                                "VUELO",
                                "AEROLÍNEA",
                                "ORIGEN",
                                "PROGRAMADO",
                                "ESTIMADO",
                                "TERMINAL",
                                "POSICIÓN",
                                "PAX",
                                "ESTADO",
                            ].map((label, i) => (
                                <th
                                    key={label}
                                    scope="col"
                                    title={label === "PAX" ? "Pasajeros informados por TAMS" : undefined}
                                    aria-label={label === "PAX" ? "PAX — Pasajeros informados por TAMS" : undefined}
                                >
                                    {label}
                                    {i === 0 && (
                                        <ArrowDown size={14} aria-hidden="true" />
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {orderedFlights.map((flight) => (
                            <FlightRow key={flight.id} flight={flight} />
                        ))}
                    </tbody>
                </table>
            </div>
            {!flights.length && (
                <div className="empty-flights">
                    <SearchX size={34} aria-hidden="true" />
                    <p>No hay vuelos que coincidan con los filtros.</p>
                    <span>Terminal A · Probá con otra ventana de tiempo.</span>
                    {filtered && (
                        <button onClick={onReset}>Limpiar filtros</button>
                    )}
                </div>
            )}
        </>
    );
}

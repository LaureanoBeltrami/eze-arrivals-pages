import { ArrowDown, SearchX } from "lucide-react";
import type { Flight } from "../../types/flights";
import FlightRow from "./FlightRow";
export default function FlightTable({
    flights,
    onReset,
    filtered,
}: {
    flights: Flight[];
    onReset: () => void;
    filtered: boolean;
}) {
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
                        {flights.map((flight) => (
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

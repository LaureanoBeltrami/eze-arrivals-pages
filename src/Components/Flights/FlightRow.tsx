import type { Flight } from "../../types/flights";
import { displayedArrivalTime, time } from "../../lib/flightTime";
import CountryFlag from "./CountryFlag";
import AirlineLogo from "./AirlineLogo";
import FlightStatusBadge from "./FlightStatusBadge";
import { Radar } from "lucide-react";
import { flightAwareTrackingUrl } from "../../lib/flightTracking";
export default function FlightRow({
    flight: f,
}: {
    flight: Flight;
}) {
    const trackingUrl = flightAwareTrackingUrl(f.aircraft_registration);
    const registration = f.aircraft_registration?.trim().toUpperCase() || null;

    return (
        <tr>
            <td className="effective-time">
                {time(displayedArrivalTime(f))}
            </td>
            <td>
                <div className="flight-identity">
                    <AirlineLogo flight={f} />
                    <strong>{f.flight_number}</strong>
                    {trackingUrl ? (
                        <a
                            className="flight-tracking-link"
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Seguir matrícula ${registration} en FlightAware`}
                            title={`Seguir en FlightAware — matrícula ${registration}`}
                        >
                            <Radar aria-hidden="true" />
                        </a>
                    ) : (
                        <span
                            className="flight-tracking-link is-disabled"
                            aria-label="Seguimiento no disponible: falta matrícula"
                            title="Seguimiento no disponible: falta matrícula"
                        >
                            <Radar aria-hidden="true" />
                        </span>
                    )}
                </div>
            </td>
            <td className="airline-name">{f.airline_name ?? "—"}</td>
            <td>
                <div className="flight-origin">
                    <CountryFlag
                        code={f.origin_country_code}
                        country={f.origin_country}
                    />
                    <strong>{f.origin_airport_iata ?? "—"}</strong>
                    {f.origin_city && (
                        <span className="origin-city">{f.origin_city}</span>
                    )}
                </div>
            </td>
            <td className="schedule-time">{time(f.scheduled_arrival)}</td>
            <td
                className="estimate-time"
                title={
                    f.previous_estimated_arrival
                        ? `ETA anterior: ${time(f.previous_estimated_arrival)}`
                        : undefined
                }
            >
                {time(f.estimated_arrival)}
            </td>
            <td className="terminal-cell">
                {f.terminal?.trim().toUpperCase() ?? "—"}
            </td>
            <td className="stand-cell">{f.stand?.trim() || "—"}</td>
            <td className="pax-cell" title="Pasajeros informados por TAMS">
                {f.tams_sap_pax ?? "—"}
            </td>
            <td>
                <FlightStatusBadge
                    status={f.status}
                    providerStatus={f.provider_status}
                />
            </td>
        </tr>
    );
}

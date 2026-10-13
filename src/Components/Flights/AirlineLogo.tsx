import { useState } from "react";
import type { Flight } from "../../types/flights";
import { getAirlineLogo } from "../../lib/airlineLogos";
export default function AirlineLogo({
    flight,
}: {
    flight: Pick<Flight, "airline_iata" | "airline_icao" | "airline_name">;
}) {
    const src = getAirlineLogo(flight);
    const [failedSource, setFailedSource] = useState<string | null>(null);
    const code =
        flight.airline_iata?.trim() || flight.airline_icao?.trim() || "—";
    return src && failedSource !== src ? (
        <span className="airline-logo">
            <img
                src={src}
                alt={flight.airline_name ?? code}
                width={56}
                height={30}
                decoding="async"
                onError={() => setFailedSource(src)}
            />
        </span>
    ) : (
        <span
            className="airline-logo airline-fallback"
            title={flight.airline_name ?? "Aerolínea sin logo"}
            aria-label={`Código de aerolínea: ${code}`}
        >
            {code.toUpperCase()}
        </span>
    );
}

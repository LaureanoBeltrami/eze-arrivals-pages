import type { FlightStatus } from "../../types/flights";
import { labels } from "../../lib/flights";
export default function FlightStatusBadge({
    status,
    providerStatus,
}: {
    status: FlightStatus | null;
    providerStatus?: string | null;
}) {
    return (
        <span
            className={`flight-status status-${status ?? "unknown"}`}
            title={
                providerStatus
                    ? `Estado del proveedor: ${providerStatus}`
                    : undefined
            }
        >
            <span aria-hidden="true" />
            {providerStatus?.trim().toUpperCase() === "CON" ? "CONSULTE" : status ? labels[status] : "ESTIMA"}
        </span>
    );
}

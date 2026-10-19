import type { FlightStatus } from "../../types/flights";
import { labels } from "../../lib/flights";
export default function FlightStatusBadge({
    status,
    providerStatus,
}: {
    status: FlightStatus | null;
    providerStatus?: string | null;
}) {
    const isConsulte = providerStatus?.trim().toUpperCase() === "CON";
    return (
        <span
            className={`flight-status ${isConsulte ? "status-consulte" : `status-${status ?? "unknown"}`}`}
            title={
                providerStatus
                    ? `Estado del proveedor: ${providerStatus}`
                    : undefined
            }
        >
            <span aria-hidden="true" />
            {isConsulte ? "CONSULTE" : status ? labels[status] : "ESTIMA"}
        </span>
    );
}

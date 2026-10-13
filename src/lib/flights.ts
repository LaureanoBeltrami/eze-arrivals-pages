import type { Flight, RelativeTimeFilter } from "../types/flights";
import {
    getEffectiveArrivalTime,
    getRelativeTimeWindow,
    isFlightWithinRelativeWindow,
} from "./flightTime";
export const labels = {
    scheduled: "ESTIMA",
    in_air: "EN VUELO",
    delayed: "DEMORADO",
    approaching: "EN APROXIMACIÓN",
    landed: "ATERRIZADO",
    arrived: "ARRIBADO",
    cancelled: "CANCELADO",
};
export const normalize = (value: string | null) =>
    (value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
export function filterFlights(
    flights: Flight[],
    search: string,
    now: number,
    relative: Exclude<RelativeTimeFilter, null>,
) {
    const query = normalize(search.trim());
    const window = getRelativeTimeWindow(relative, now);
    const sortTime = getEffectiveArrivalTime;
    const direction = relative.startsWith("-") ? -1 : 1;
    return flights
        .filter((flight) => {
            const match = [
                flight.flight_number,
                flight.airline_name,
                flight.origin_airport_iata,
                flight.origin_city,
                flight.origin_name ?? null,
            ].some((value) => normalize(value).includes(query));
            return match && isFlightWithinRelativeWindow(flight, window);
        })
        .sort(
            (a, b) =>
                direction * (sortTime(a) - sortTime(b)) ||
                a.flight_number.localeCompare(b.flight_number),
        );
}

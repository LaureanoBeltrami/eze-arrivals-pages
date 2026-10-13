import type { Flight } from "../types/flights";
import {
    getRelativeTimeWindow,
    isFlightWithinRelativeWindow,
} from "./flightTime";

export const isTerminalA = (flight: Pick<Flight, "terminal">) =>
    flight.terminal?.trim().toUpperCase() === "A";

/** Never infer a completed arrival from an expired ETA. TAMS ATA is an actual
 * arrival timestamp, not a separately verified touchdown timestamp. */
export function arrivalsStats(flights: Flight[], now: number) {
    const terminalA = flights.filter(isTerminalA);
    const nextHour = getRelativeTimeWindow("+1h", now)!;
    const lastHour = getRelativeTimeWindow("-1h", now)!;
    return {
        upcoming: terminalA.filter(
            (flight) =>
                !["landed", "arrived", "cancelled"].includes(
                    flight.status ?? "",
                ) &&
                !flight.actual_landing_time &&
                !flight.actual_arrival_time &&
                isFlightWithinRelativeWindow(flight, nextHour),
        ).length,
        landed: terminalA.filter((flight) => {
            if (flight.status === "cancelled") return false;
            const actual =
                flight.actual_landing_time ?? flight.actual_arrival_time;
            if (!actual) return false;
            const instant = Date.parse(actual);
            return instant >= lastHour.start && instant <= lastHour.end;
        }).length,
    };
}

export function countryFlag(code: string): string {
    const normalized = code.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(normalized)
        ? [...normalized]
              .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
              .join("")
        : "";
}

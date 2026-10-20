import type { Flight, RelativeTimeFilter } from "../types/flights";

export const TIMEZONE = "America/Argentina/Buenos_Aires";
const MINUTE = 60_000;
const clockFormatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});
const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
});
export const time = (value: string | null) =>
    value && Number.isFinite(Date.parse(value))
        ? clockFormatter.format(new Date(value))
        : "—";
/** ATA is used only after TAMS explicitly reports the ATE operational state. */
export function displayedArrivalTime(
    flight: Pick<
        Flight,
        | "provider_status"
        | "actual_arrival_time"
        | "estimated_arrival"
        | "scheduled_arrival"
    >,
): string | null {
    const actual = flight.provider_status === "ATE" ? flight.actual_arrival_time : null;

    return actual && Number.isFinite(Date.parse(actual))
        ? actual
        : flight.estimated_arrival ?? flight.scheduled_arrival;
}
export const operationalDate = (now: number) => dateFormatter.format(now);

export const relativeTimeOptions: {
    value: Exclude<RelativeTimeFilter, null>;
    label: string;
    offsets: readonly [number, number];
}[] = [
    { value: "-10h", label: "-10 horas", offsets: [-600, 0] },
    { value: "-4h", label: "-4 horas", offsets: [-240, 0] },
    { value: "-2h", label: "-2h", offsets: [-120, 0] },
    { value: "-1h", label: "-1h", offsets: [-60, 0] },
    { value: "now", label: "AHORA", offsets: [-30, 30] },
    { value: "+1h", label: "+1h", offsets: [0, 60] },
    { value: "+2h", label: "+2h", offsets: [0, 120] },
    { value: "+4h", label: "+4h", offsets: [0, 240] },
    { value: "+10h", label: "+10h", offsets: [0, 600] },
];

export interface TimeWindow {
    start: number;
    end: number;
}

/** Absolute milliseconds; ISO timestamps include their UTC offset. */
export function getEffectiveArrivalTime(
    flight: Pick<Flight, "estimated_arrival" | "scheduled_arrival"> &
    Partial<Pick<Flight, "provider_status" | "actual_arrival_time">>,
): number {
    const displayed = displayedArrivalTime(flight);
    return displayed ? Date.parse(displayed) : NaN;
}

export function getRelativeTimeWindow(
    filter: RelativeTimeFilter,
    now: number,
): TimeWindow | null {
    const option = relativeTimeOptions.find(({ value }) => value === filter);
    if (!option) return null;
    return {
        start: now + option.offsets[0] * MINUTE,
        end: now + option.offsets[1] * MINUTE,
    };
}

/** Both endpoints are inclusive, including exactly "now". */
export function isFlightWithinRelativeWindow(
    flight: Pick<Flight, "estimated_arrival" | "scheduled_arrival"> &
    Partial<Pick<Flight, "provider_status" | "actual_arrival_time">>,
    window: TimeWindow | null,
): boolean {
    if (!window) return true;
    const arrival = getEffectiveArrivalTime(flight);
    return arrival >= window.start && arrival <= window.end;
}

export function formatTimeWindow(window: TimeWindow): string {
    const crossesMidnight =
        operationalDate(window.start) !== operationalDate(window.end);
    const shortDate = (instant: number) =>
        shortDateFormatter
            .formatToParts(instant)
            .filter(({ type }) => type === "day" || type === "month")
            .map(({ value }) => value.padStart(2, "0"))
            .join("/");
    const format = (instant: number) =>
        clockFormatter.format(instant) +
        (crossesMidnight ? ` (${shortDate(instant)})` : "");
    return `${format(window.start)} → ${format(window.end)}`;
}

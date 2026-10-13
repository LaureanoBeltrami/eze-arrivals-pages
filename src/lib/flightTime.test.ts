import { afterEach, describe, expect, it, vi } from "vitest";
import {
    TIMEZONE,
    displayedArrivalTime,
    formatTimeWindow,
    getEffectiveArrivalTime,
    getRelativeTimeWindow,
    isFlightWithinRelativeWindow,
    operationalDate,
    time,
} from "./flightTime";
import type { RelativeTimeFilter } from "../types/flights";

const now = Date.parse("2026-09-10T16:31:00-03:00");
describe("Explicit ISO offsets", () => {
    it.each([
        ["2026-09-11T04:20:00+00:00", "01:20", "2026-09-11"],
        ["2026-09-11T10:30:00+00:00", "07:30", "2026-09-11"],
        ["2026-09-11T01:30:00+00:00", "22:30", "2026-09-10"],
        ["2026-09-11T01:20:00-03:00", "01:20", "2026-09-11"],
        ["2026-09-11T06:20:00+02:00", "01:20", "2026-09-11"],
    ])("formats %s without reinterpreting its offset", (raw, clock, day) => {
        expect(time(raw)).toBe(clock);
        expect(time(new Date(raw).toISOString())).toBe(clock);
        expect(operationalDate(Date.parse(raw))).toBe(day);
    });
    it("includes next-day UTC instants in the ten-hour EZE window", () => {
        const window = getRelativeTimeWindow(
            "+10h",
            Date.parse("2026-09-10T23:30:00Z"),
        )!;
        expect(formatTimeWindow(window)).toBe("20:30 (10/09) → 06:30 (11/09)");
        expect(
            isFlightWithinRelativeWindow(
                {
                    scheduled_arrival: "2026-09-11T09:30:00+00:00",
                    estimated_arrival: null,
                },
                window,
            ),
        ).toBe(true);
        expect(
            isFlightWithinRelativeWindow(
                {
                    scheduled_arrival: "2026-09-11T09:31:00+00:00",
                    estimated_arrival: null,
                },
                window,
            ),
        ).toBe(false);
    });
});
const cases: [Exclude<RelativeTimeFilter, null>, number, number, string][] = [
    ["-10h", -600, 0, "06:31 → 16:31"],
    ["-4h", -240, 0, "12:31 → 16:31"],
    ["-2h", -120, 0, "14:31 → 16:31"],
    ["-1h", -60, 0, "15:31 → 16:31"],
    ["now", -30, 30, "16:01 → 17:01"],
    ["+1h", 0, 60, "16:31 → 17:31"],
    ["+2h", 0, 120, "16:31 → 18:31"],
    ["+4h", 0, 240, "16:31 → 20:31"],
    ["+10h", 0, 600, "16:31 (10/09) → 02:31 (11/09)"],
];
const arrival = (instant: number) => ({
    scheduled_arrival: new Date(instant).toISOString(),
    estimated_arrival: null,
});
afterEach(() => vi.unstubAllEnvs());

describe.each(cases)("relative window %s", (filter, start, end, formatted) => {
    it("calculates and formats the requested offsets from current time", () => {
        const window = getRelativeTimeWindow(filter, now)!;
        expect(window).toEqual({
            start: now + start * 60000,
            end: now + end * 60000,
        });
        expect(formatTimeWindow(window)).toBe(formatted);
    });
    it("includes both exact boundaries and excludes a millisecond outside", () => {
        const window = getRelativeTimeWindow(filter, now)!;
        expect(
            isFlightWithinRelativeWindow(arrival(window.start), window),
        ).toBe(true);
        expect(isFlightWithinRelativeWindow(arrival(window.end), window)).toBe(
            true,
        );
        expect(
            isFlightWithinRelativeWindow(arrival(window.start - 1), window),
        ).toBe(false);
        expect(
            isFlightWithinRelativeWindow(arrival(window.end + 1), window),
        ).toBe(false);
    });
    it("moves both endpoints when the clock advances five minutes", () => {
        const before = getRelativeTimeWindow(filter, now)!;
        const after = getRelativeTimeWindow(filter, now + 5 * 60000)!;
        expect(after.start - before.start).toBe(5 * 60000);
        expect(after.end - before.end).toBe(5 * 60000);
    });
});

describe("effective arrival and timezone", () => {
    it("uses ATA only for TAMS ATE and otherwise retains ETA then STA", () => {
        const base = {
            scheduled_arrival: "2026-09-11T03:05:00Z",
            estimated_arrival: "2026-09-11T03:20:00Z",
            actual_arrival_time: "2026-09-11T03:12:00Z",
        };
        expect(time(displayedArrivalTime({ ...base, provider_status: "EST" }))).toBe("00:20");
        expect(time(displayedArrivalTime({ ...base, provider_status: "ATE" }))).toBe("00:12");
        expect(time(displayedArrivalTime({ ...base, provider_status: "ATE", actual_arrival_time: null }))).toBe("00:20");
        expect(time(displayedArrivalTime({ ...base, provider_status: "ATE", actual_arrival_time: null, estimated_arrival: null }))).toBe("00:05");
    });
    it("prioritizes ETA, including an ETA outside the window, and falls back only when missing", () => {
        const window = getRelativeTimeWindow("+1h", now)!;
        const scheduled = arrival(now - 3600000);
        const withEta = {
            ...scheduled,
            estimated_arrival: new Date(now + 1800000).toISOString(),
        };
        expect(getEffectiveArrivalTime(withEta)).toBe(now + 1800000);
        expect(isFlightWithinRelativeWindow(withEta, window)).toBe(true);
        expect(isFlightWithinRelativeWindow(scheduled, window)).toBe(false);
        expect(isFlightWithinRelativeWindow(arrival(now), window)).toBe(true);
        expect(
            isFlightWithinRelativeWindow(
                {
                    ...arrival(now),
                    estimated_arrival: scheduled.scheduled_arrival,
                },
                window,
            ),
        ).toBe(false);
        expect(getEffectiveArrivalTime(scheduled)).toBe(now - 3600000);
    });
    it("does not filter when relative mode is inactive", () => {
        expect(getRelativeTimeWindow(null, now)).toBeNull();
        expect(isFlightWithinRelativeWindow(arrival(now), null)).toBe(true);
    });
    it("formats Buenos Aires times even when the host uses another timezone", () => {
        vi.stubEnv("TZ", "Asia/Tokyo");
        expect(TIMEZONE).toBe("America/Argentina/Buenos_Aires");
        expect(time(new Date(now).toISOString())).toBe("16:31");
        expect(formatTimeWindow(getRelativeTimeWindow("+2h", now)!)).toBe(
            "16:31 → 18:31",
        );
        expect(operationalDate(Date.parse("2026-09-11T02:30:00Z"))).toBe(
            "2026-09-10",
        );
    });
    it("handles midnight with dates in the displayed window", () => {
        const midnight = Date.parse("2026-09-11T00:15:00-03:00");
        const past = getRelativeTimeWindow("-10h", midnight)!;
        expect(formatTimeWindow(past)).toBe("14:15 (10/09) → 00:15 (11/09)");
        expect(
            isFlightWithinRelativeWindow(arrival(midnight - 600 * 60000), past),
        ).toBe(true);
        expect(
            isFlightWithinRelativeWindow(
                arrival(midnight - 600 * 60000 - 1),
                past,
            ),
        ).toBe(false);
        const window = getRelativeTimeWindow("now", midnight)!;
        expect(formatTimeWindow(window)).toBe("23:45 (10/09) → 00:45 (11/09)");
        expect(
            isFlightWithinRelativeWindow(
                arrival(midnight - 20 * 60000),
                window,
            ),
        ).toBe(true);
    });
});

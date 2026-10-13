import { describe, expect, it } from "vitest";
import { arrivalsStats, countryFlag, isTerminalA } from "./arrivalsDisplay";
import type { Flight, FlightStatus } from "../types/flights";
const now = Date.parse("2026-09-14T00:15:00-03:00");
const base = {
    terminal: "A",
    status: "scheduled",
    estimated_arrival: null,
    actual_landing_time: null,
    actual_arrival_time: null,
} as Flight;
const at = (minutes: number) => new Date(now + minutes * 60000).toISOString();
const flight = (minutes: number, changes: Partial<Flight> = {}): Flight => ({
    ...base,
    scheduled_arrival: at(minutes),
    ...changes,
});
describe("Terminal A statistics", () => {
    it.each<FlightStatus | null>([
        "scheduled",
        "in_air",
        "approaching",
        "delayed",
        "landed",
        "arrived",
        null,
    ])("counts a real arrival despite normalized status %s", (status) => {
        for (const field of [
            "actual_landing_time",
            "actual_arrival_time",
        ] as const) {
            expect(
                arrivalsStats(
                    [
                        flight(20, {
                            status,
                            provider_status: "EST",
                            [field]: at(-15),
                        }),
                    ],
                    now,
                ),
            ).toEqual({ upcoming: 0, landed: 1 });
        }
    });
    it.each(["actual_landing_time", "actual_arrival_time"] as const)(
        "validates boundaries, invalid timestamps and cancellation using %s",
        (field) => {
            for (const [actual, expected] of [
                [at(-60), 1],
                [at(0), 1],
                [at(-60.001), 0],
                [at(0.001), 0],
                ["invalid", 0],
                [null, 0],
            ] as const) {
                expect(
                    arrivalsStats([flight(-10, { [field]: actual })], now)
                        .landed,
                ).toBe(expected);
            }
            expect(
                arrivalsStats(
                    [
                        flight(-10, {
                            status: "cancelled",
                            [field]: at(-15),
                        }),
                    ],
                    now,
                ).landed,
            ).toBe(0);
        },
    );
    it("does not replace an invalid or future landing timestamp with a recent arrival", () => {
        for (const landing of ["invalid", at(1)]) {
            expect(
                arrivalsStats(
                    [
                        flight(-10, {
                            actual_landing_time: landing,
                            actual_arrival_time: at(-10),
                        }),
                    ],
                    now,
                ).landed,
            ).toBe(0);
        }
    });
    it("does not classify scheduled time or expired ETA as a real arrival", () => {
        expect(
            arrivalsStats(
                [
                    flight(-10, { status: "landed" }),
                    flight(20, { estimated_arrival: at(-1) }),
                ],
                now,
            ),
        ).toEqual({ upcoming: 0, landed: 0 });
    });
    it("counts upcoming unknown statuses and excludes actual landings older than an hour", () => {
        expect(
            arrivalsStats(
                [
                    flight(20, { status: null }),
                    flight(20, { actual_landing_time: at(-90) }),
                    flight(20, { actual_arrival_time: at(-90) }),
                    flight(20, { estimated_arrival: at(-1) }),
                ],
                now,
            ),
        ).toEqual({ upcoming: 1, landed: 0 });
    });
    it.each(["A", "a", " A ", " a "])("accepts %s", (terminal) =>
        expect(isTerminalA({ terminal })).toBe(true),
    );
    it.each([null, "", "TCA", "B", "AA"])("rejects %s", (terminal) =>
        expect(isTerminalA({ terminal })).toBe(false),
    );
    it("counts now through +60 inclusive with ETA priority and scheduled fallback", () => {
        const rows = [
            flight(0),
            flight(60),
            flight(60.001),
            flight(-0.001),
            flight(-500, { estimated_arrival: at(30) }),
            flight(30, { estimated_arrival: at(90) }),
        ];
        expect(arrivalsStats(rows, now).upcoming).toBe(3);
    });
    it("excludes completed, cancelled and other-terminal flights from upcoming", () => {
        expect(
            arrivalsStats(
                [
                    flight(10, { status: "landed" }),
                    flight(10, { status: "arrived" }),
                    flight(10, { status: "cancelled" }),
                    flight(10, { terminal: "TCA" }),
                    flight(10, { actual_arrival_time: at(-5) }),
                ],
                now,
            ).upcoming,
        ).toBe(0);
    });
    it("counts real arrivals in the last hour across midnight, including both boundaries", () => {
        const rows = [0, -60, -60.001, 0.001].map((minutes) =>
            flight(-300, {
                status: "landed",
                actual_arrival_time: at(minutes),
            }),
        );
        expect(arrivalsStats(rows, now).landed).toBe(2);
    });
    it("prioritizes touchdown if available and never substitutes ETA for missing actual", () => {
        const rows = [
            flight(-10, { status: "landed" }),
            flight(-10, {
                status: "landed",
                actual_landing_time: at(-90),
                actual_arrival_time: at(-10),
            }),
            flight(-10, { status: "arrived", actual_landing_time: at(-15) }),
            flight(-10, { status: "cancelled", actual_arrival_time: at(-10) }),
            flight(-10, {
                terminal: "TCA",
                status: "landed",
                actual_arrival_time: at(-10),
            }),
        ];
        expect(arrivalsStats(rows, now).landed).toBe(1);
    });
    it("does not turn an elapsed ETA or unknown state into a landing", () => {
        expect(
            arrivalsStats(
                [
                    flight(-20, {
                        status: null,
                        provider_status: "EST",
                        estimated_arrival: at(-5),
                    }),
                ],
                now,
            ).landed,
        ).toBe(0);
    });
    it("returns safe empty statistics", () =>
        expect(arrivalsStats([], now)).toEqual({ upcoming: 0, landed: 0 }));
    it("renders only valid country codes as flags", () => {
        expect(countryFlag(" pa ")).toBe("🇵🇦");
        expect(countryFlag("???")).toBe("");
    });
});

import { describe, expect, it } from "vitest";
import { filterFlights } from "./flights";
import { time, operationalDate } from "./flightTime";
import type { Flight } from "../types/flights";
const now = Date.parse("2026-09-10T19:20:00Z");
const flight: Flight = {
    id: 1,
    provider: "mock",
    provider_flight_id: "demo",
    flight_number: "AR1133",
    airline_name: "Aerolíneas Argentinas",
    airline_iata: "AR",
    airline_icao: "ARG",
    origin_airport_iata: "MAD",
    origin_airport_icao: "LEMD",
    origin_city: "Madrid",
    origin_country: "España",
    origin_country_code: "ES",
    destination_airport_iata: "EZE",
    scheduled_arrival: "2026-09-10T19:20:00Z",
    estimated_arrival: "2026-09-10T19:37:00Z",
    previous_estimated_arrival: null,
    actual_landing_time: null,
    actual_arrival_time: null,
    terminal: "A",
    gate: null,
    stand: "REM 31",
    status: "in_air",
    international: true,
    last_provider_update: "2026-09-10T19:19:00Z",
};
const eta = (minutes: number): Flight => ({
    ...flight,
    estimated_arrival: new Date(now + minutes * 60000).toISOString(),
});

describe("current search and relative windows", () => {
    it("preserves Argentina dates and explicit UTC offsets", () => {
        expect(time("2026-09-11T10:00:00+00:00")).toBe("07:00");
        expect(time("2026-09-11T10:25:00+00:00")).toBe("07:25");
        expect(time("2026-09-11T02:30:00Z")).toBe("23:30");
        expect(operationalDate(Date.parse("2026-09-11T02:30:00Z"))).toBe("2026-09-10");
        expect(operationalDate(Date.parse("2026-09-11T03:00:00Z"))).toBe("2026-09-11");
        expect(time(null)).toBe("—");
    });

    it("combines search and time without filtering flight statuses", () => {
        const flights = (["scheduled", "in_air", "delayed", "approaching", "landed", "arrived", "cancelled", null] as const)
            .map((status, id) => ({ ...flight, status, id }));
        expect(filterFlights(flights, "aerolineas", now, "+2h")).toEqual(flights);
        expect(filterFlights(flights, "Miami", now, "+2h")).toEqual([]);
        expect(filterFlights([eta(121)], "", now, "+2h")).toEqual([]);
    });

    it("sorts by ETA or scheduled fallback with flight number as tiebreaker", () => {
        const late = { ...eta(50), id: 1, scheduled_arrival: new Date(now - 3600000).toISOString() };
        const early = { ...eta(10), id: 2 };
        const fallback = { ...flight, id: 3, estimated_arrival: null, scheduled_arrival: new Date(now + 20 * 60000).toISOString() };
        const tied = { ...early, id: 4, flight_number: "ZZ999" };
        const flights = [fallback, tied, late, early];
        expect(filterFlights(flights, "", now, "+1h").map(f => f.id)).toEqual([2, 4, 3, 1]);
        expect(flights.map(f => f.id)).toEqual([3, 4, 1, 2]);
    });

    it("orders negative windows from the closest past arrival to the oldest", () => {
        const flights = [-170, -5, -40, -95].map((minutes, index) => ({
            ...eta(minutes), id: index + 1, flight_number: `AR${index + 1}`,
        }));
        expect(filterFlights(flights, "", now, "-4h").map(f => f.id)).toEqual([2, 3, 4, 1]);
    });

    it("uses complete instants and scheduled fallback across Argentina midnight in negative windows", () => {
        const midnight = Date.parse("2026-09-11T00:30:00-03:00");
        const flights = [
            { ...flight, id: 1, flight_number: "AR2350", estimated_arrival: null, scheduled_arrival: "2026-09-11T02:50:00Z" },
            { ...flight, id: 2, flight_number: "AR0020", estimated_arrival: "2026-09-11T03:20:00Z" },
        ];
        expect(filterFlights(flights, "", midnight, "-1h").map(f => f.id)).toEqual([2, 1]);
    });

    it("keeps positive and AHORA windows in ascending chronological order", () => {
        const flights = [-20, 10, -5, 25].map((minutes, index) => ({
            ...eta(minutes), id: index + 1, flight_number: `AR${index + 1}`,
        }));
        expect(filterFlights(flights, "", now, "+1h").map(f => f.id)).toEqual([2, 4]);
        expect(filterFlights(flights, "", now, "now").map(f => f.id)).toEqual([1, 3, 2, 4]);
    });

    it("sorts delayed flights by confirmed actual arrival time, matching the HORA column", () => {
        const landed = {
            ...eta(-160), id: "MU745", flight_number: "MU745",
            provider_status: "ATE", status: "landed" as const,
            actual_arrival_time: new Date(now - 10 * 60000).toISOString(),
        };
        const older = { ...eta(-35), id: "AR1305", flight_number: "AR1305" };
        const latest = { ...eta(-5), id: "IB0107", flight_number: "IB0107" };
        expect(filterFlights([older, landed, latest], "", now, "-4h").map(f => f.id))
            .toEqual(["IB0107", "MU745", "AR1305"]);
    });

    it("uses the displayed actual arrival for time-window inclusion, without inferring touchdown", () => {
        const landed = {
            ...eta(-300), id: "MU745", provider_status: "ATE",
            actual_arrival_time: new Date(now - 20 * 60000).toISOString(),
        };
        expect(filterFlights([landed], "", now, "-1h")).toHaveLength(1);
        const unconfirmed = { ...landed, provider_status: "DEM" };
        expect(filterFlights([unconfirmed], "", now, "-1h")).toHaveLength(0);
    });

    it("searches all current fields ignoring case, accents and outer whitespace", () => {
        for (const query of [" ar1133 ", "AEROLINEAS", "mad", "madrid"])
            expect(filterFlights([flight], query, now, "now")).toHaveLength(1);
        expect(filterFlights([{ ...flight, origin_name: "Barajas" }], "barajas", now, "now")).toHaveLength(1);
        expect(filterFlights([flight], "Miami", now, "now")).toHaveLength(0);
    });
});

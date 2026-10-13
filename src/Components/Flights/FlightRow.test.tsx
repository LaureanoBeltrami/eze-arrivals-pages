// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Flight } from "../../types/flights";
import FlightRow from "./FlightRow";

const flight: Flight = {
    id: 1,
    provider: "tams",
    provider_flight_id: "EZE:1",
    flight_number: "G37652",
    airline_name: "GOL",
    airline_iata: "G3",
    airline_icao: "GLO",
    provider_status: "EST",
    origin_airport_iata: "GRU",
    origin_airport_icao: null,
    origin_city: null,
    origin_country: null,
    origin_country_code: "BR",
    destination_airport_iata: "EZE",
    scheduled_arrival: "2026-09-14T18:35:00Z",
    estimated_arrival: "2026-09-14T18:32:00Z",
    previous_estimated_arrival: null,
    actual_landing_time: null,
    actual_arrival_time: null,
    terminal: "A",
    gate: null,
    stand: null,
    status: null,
    international: true,
    last_provider_update: null,
};

const renderRow = (changes: Partial<Flight> = {}) => render(<table><tbody><FlightRow flight={{ ...flight, ...changes }} /></tbody></table>);
afterEach(cleanup);

it("opens FlightAware safely with the normalized registration", () => {
    renderRow({ aircraft_registration: "PR-XMD" });
    const link = screen.getByRole("link", { name: /seguir matrícula pr-xmd en flightaware/i });
    expect(link.getAttribute("href")).toBe("https://www.flightaware.com/live/flight/PRXMD");
    expect(link.getAttribute("href")).not.toMatch(/flightradar24|data\/(aircraft|flights)/);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
});

it("disables tracking without a registration and has no clipboard or fallback link", () => {
    renderRow({ aircraft_registration: null });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByLabelText(/seguimiento no disponible/i)).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/copiada|copiala|flightradar24/i);
});

import type { Flight } from "../types/flights";
import { publicAsset } from "../lib/publicAsset";
import type { StaticArrivalsSnapshot } from "./staticArrivals";

const TAMS_ENDPOINT = "https://api.tams.com.ar/api/Organismos/GetVuelos";
const HOURS = [-24, 24];

type Airport = { country: string; city: string | null; country_code: string };
type TamsRow = Record<string, unknown>;

function text(value: unknown): string | null {
    return typeof value === "string" && value.trim() && value.trim() !== "-" ? value.trim() : null;
}

function timestamp(value: unknown): string | null {
    const raw = text(value);
    if (!raw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) return null;
    const date = new Date(`${raw}-03:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function status(value: unknown): Flight["status"] {
    return ({ ATE: "landed", DEM: "delayed", CAN: "cancelled", HOR: "scheduled" } as const)[text(value) ?? ""] ?? null;
}

function requestUrl(hours: number): URL {
    const url = new URL(TAMS_ENDPOINT);
    Object.entries({ id_arpt: "EZE", id_airline: "-1", terminal: "-1", tiempo_antes: String(hours), est_vuelos: "TODOS", movtp: "A" })
        .forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
}

function normalize(row: TamsRow, airports: Record<string, Airport>, now: string): Flight | null {
    // TAMS classifies the operation itself as INT; this avoids guessing from a name.
    if (text(row.SECTOR) !== "INT") return null;
    const originCode = (text(row.ID_ARPT_DEST_ORIG) ?? "").toUpperCase();
    const airport = airports[`iata:${originCode}`];
    const scheduled = timestamp(row.DT_STDA);
    const flight = text(row.FLIGHT);
    const operation = row.ID_OP_FLIGHT;
    if (!airport || !scheduled || !flight || (typeof operation !== "number" && typeof operation !== "string")) return null;
    const airline = text(row.ID_AIRLINE);
    const estimate = timestamp(row.DT_ETDA);
    const actual = timestamp(row.DT_ATDA);
    return {
        id: `EZE:${operation}`, provider: "tams", provider_flight_id: `EZE:${operation}`,
        flight_number: `${airline ?? ""}${flight}`, airline_name: text(row.AEROLINEA),
        airline_iata: airline && /^[A-Z0-9]{2}$/.test(airline) ? airline : null,
        airline_icao: airline && /^[A-Z]{3}$/.test(airline) ? airline : null,
        provider_status: text(row.ID_REMARK), origin_name: airport.city, origin_airport_iata: originCode || null,
        origin_airport_icao: null, origin_city: airport.city, origin_country: airport.country, origin_country_code: airport.country_code,
        destination_airport_iata: "EZE", scheduled_arrival: scheduled, estimated_arrival: estimate,
        previous_estimated_arrival: null, actual_landing_time: null, actual_arrival_time: actual,
        aircraft_registration: (text(row.ID_REG) ?? "").toUpperCase() || null, terminal: text(row.TERMINAL),
        gate: text(row.GATE), stand: text(row.STAND), tams_sap_pax: typeof row.SAP_PAX === "number" && row.SAP_PAX >= 0 ? row.SAP_PAX : null,
        status: status(row.ID_REMARK), international: true, last_provider_update: now,
    };
}

/** Browser-side read of TAMS. The public API explicitly permits CORS requests. */
export async function loadLiveTamsArrivals(fetcher: typeof fetch = fetch): Promise<StaticArrivalsSnapshot> {
    const [airportResponse, ...responses] = await Promise.all([
        fetcher(publicAsset("data/airports.json"), { cache: "force-cache" }),
        ...HOURS.map((hours) => fetcher(requestUrl(hours), { cache: "no-store", headers: { Accept: "application/json" } })),
    ]);
    if (!airportResponse.ok || responses.some((response) => !response.ok)) throw new Error("TAMS unavailable");
    const airports = await airportResponse.json() as Record<string, Airport>;
    const rows = (await Promise.all(responses.map((response) => response.json()))) as unknown[];
    if (!rows.every(Array.isArray)) throw new Error("Invalid TAMS response");
    const now = new Date().toISOString();
    const flights = new Map<string, Flight>();
    for (const row of rows.flat()) {
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        const flight = normalize(row as TamsRow, airports, now);
        if (flight) flights.set(flight.provider_flight_id, flight);
    }
    if (!flights.size) throw new Error("Empty TAMS response");
    return { flights: [...flights.values()], serverTime: now, lastUpdate: now, lastSuccessfulSyncAt: now, lastFlightChangeAt: now, lastFailedSyncAt: null, syncFailed: false };
}

export type FlightStatus =
    | "scheduled"
    | "in_air"
    | "delayed"
    | "approaching"
    | "landed"
    | "arrived"
    | "cancelled";
export interface Flight {
    // The standalone snapshot uses the provider's stable identifier.
    id: number | string;
    provider: string;
    provider_flight_id: string;
    flight_number: string;
    airline_name: string | null;
    airline_iata: string | null;
    airline_icao: string | null;
    provider_status?: string | null;
    origin_name?: string | null;
    origin_airport_iata: string | null;
    origin_airport_icao: string | null;
    origin_city: string | null;
    origin_country: string | null;
    origin_country_code: string;
    destination_airport_iata: string;
    scheduled_arrival: string;
    estimated_arrival: string | null;
    previous_estimated_arrival: string | null;
    actual_landing_time: string | null;
    actual_arrival_time: string | null;
    aircraft_registration?: string | null;
    terminal: string | null;
    gate: string | null;
    stand: string | null;
    tams_sap_pax?: number | null;
    status: FlightStatus | null;
    international: boolean;
    last_provider_update: string | null;
}
export type RelativeTimeFilter =
    | "-10h"
    | "-4h"
    | "-2h"
    | "-1h"
    | "now"
    | "+1h"
    | "+2h"
    | "+4h"
    | "+10h"
    | null;
export interface ArrivalsProps {
    flights: Flight[];
    windowFlights?: Flight[];
    serverTime: string;
    lastUpdate: string | null;
    syncFailed?: boolean;
}

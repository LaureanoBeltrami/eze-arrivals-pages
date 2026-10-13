export const TAMS_ENDPOINT = "https://api.tams.com.ar/api/Organismos/GetVuelos";
export const ARGENTINA_OFFSET = "-03:00";
const WINDOWS = [-24, 24];
const RETAIN_MISSING_MS = 36 * 60 * 60 * 1000;
const requiredKeys = ["ID_OP_FLIGHT", "DT_STDA"];

function text(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed && trimmed !== "-" && trimmed !== "—" ? trimmed : null;
}

/** TAMS emits offset-less strings as Argentina local time. Reject impossible dates. */
export function parseTamsTimestamp(value) {
    if (typeof value !== "string") return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?$/);
    if (!match) return null;
    const [, year, month, day, hour, minute, second, fraction = "", offset] = match;
    const milliseconds = Number(`0${fraction}`.slice(0, 4).padEnd(4, "0"));
    const candidate = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second, milliseconds));
    if (candidate.getUTCFullYear() !== +year || candidate.getUTCMonth() !== +month - 1 || candidate.getUTCDate() !== +day || candidate.getUTCHours() !== +hour || candidate.getUTCMinutes() !== +minute || candidate.getUTCSeconds() !== +second) return null;
    const date = new Date(offset ? value : `${value}${ARGENTINA_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function idOf(raw) { return Number.isInteger(raw.ID_OP_FLIGHT) ? String(raw.ID_OP_FLIGHT) : text(raw.ID_OP_FLIGHT); }
function statusFor(remark) { return { ATE: "landed", DEM: "delayed", CAN: "cancelled", HOR: "scheduled" }[remark] ?? null; }

function normalizeRow(raw, airports, now) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("TAMS: unexpected flight structure");
    if (!requiredKeys.every((key) => Object.hasOwn(raw, key))) throw new Error("TAMS: unexpected flight structure");
    const originCode = (text(raw.ID_ARPT_DEST_ORIG) ?? "").toUpperCase();
    const origin = airports[`iata:${originCode}`];
    if (!origin?.country_code) return { kind: "ignored" };
    if (origin.country_code === "AR") return { kind: "domestic" };
    const scheduled = parseTamsTimestamp(raw.DT_STDA);
    const id = idOf(raw), number = text(raw.FLIGHT), airline = text(raw.ID_AIRLINE);
    if (!scheduled || !id || !number) return { kind: "invalid" };
    const etaText = text(raw.DT_ETDA), actualText = text(raw.DT_ATDA);
    const estimated = parseTamsTimestamp(raw.DT_ETDA), actual = parseTamsTimestamp(raw.DT_ATDA);
    if ((etaText && !estimated) || (actualText && !actual)) return { kind: "invalid" };
    const providerId = `EZE:${id}`, remark = text(raw.ID_REMARK);
    return { kind: "flight", flight: {
        id: providerId, provider: "tams", provider_flight_id: providerId,
        flight_number: `${airline ?? ""}${number}`, airline_name: text(raw.AEROLINEA),
        airline_iata: airline && /^[A-Z0-9]{2}$/.test(airline) ? airline : null,
        airline_icao: airline && /^[A-Z]{3}$/.test(airline) ? airline : null,
        provider_status: remark, origin_name: null, origin_airport_iata: originCode || null,
        origin_airport_icao: null, origin_city: null, origin_country: null, origin_country_code: origin.country_code,
        destination_airport_iata: "EZE", scheduled_arrival: scheduled, estimated_arrival: estimated,
        previous_estimated_arrival: null, actual_landing_time: null, actual_arrival_time: actual,
        aircraft_registration: (text(raw.ID_REG) ?? "").toUpperCase() || null,
        terminal: text(raw.TERMINAL), gate: text(raw.GATE), stand: text(raw.STAND),
        tams_sap_pax: Number.isInteger(raw.SAP_PAX) && raw.SAP_PAX >= 0 ? raw.SAP_PAX : null,
        status: statusFor(remark), international: true, last_provider_update: now,
    }};
}

export async function fetchTamsWindows({ fetcher, airports, now }) {
    const records = new Map();
    const report = { requests: 0, received: 0, international: 0, duplicates: 0, ignored: 0, domestic: 0, errors: 0, stale: 0 };
    for (const hours of WINDOWS) {
        const url = new URL(TAMS_ENDPOINT);
        Object.entries({ id_arpt: "EZE", id_airline: "-1", terminal: "-1", tiempo_antes: String(hours), est_vuelos: "TODOS", movtp: "A" }).forEach(([key, value]) => url.searchParams.set(key, value));
        const response = await fetcher(url, { headers: { Accept: "application/json", "User-Agent": "EzeArrivalsPages/1.0 (isolated synchronization)" }, redirect: "manual" });
        report.requests++;
        if (!response.ok) throw new Error(`TAMS: HTTP ${response.status}`);
        let rows;
        try { rows = await response.json(); } catch { throw new Error("TAMS: invalid JSON. Existing snapshot preserved."); }
        if (!Array.isArray(rows)) throw new Error("TAMS: unexpected JSON structure. Existing snapshot preserved.");
        for (const raw of rows) {
            report.received++;
            const normalized = normalizeRow(raw, airports, now);
            if (normalized.kind === "ignored") { report.ignored++; continue; }
            if (normalized.kind === "domestic") { report.domestic++; continue; }
            if (normalized.kind === "invalid") { report.errors++; continue; }
            if (records.has(normalized.flight.provider_flight_id)) report.duplicates++;
            records.set(normalized.flight.provider_flight_id, normalized.flight);
        }
    }
    report.international = records.size;
    if (report.errors) throw new Error("TAMS: incomplete or invalid flight data. Existing snapshot preserved.");
    return { records: [...records.values()], report };
}

function mergeFlight(previous, incoming) {
    const next = { ...incoming };
    // Preserve these three fields when the provider omits them.
    for (const key of ["tams_sap_pax", "actual_arrival_time", "aircraft_registration"]) {
        if (next[key] === null || next[key] === undefined) next[key] = previous[key] ?? null;
    }
    next.previous_estimated_arrival = previous.estimated_arrival !== next.estimated_arrival
        ? previous.estimated_arrival ?? null
        : previous.previous_estimated_arrival ?? null;
    return next;
}

export async function synchronizeTams({ fetcher, airports, previous, now = new Date().toISOString() }) {
    const { records, report } = await fetchTamsWindows({ fetcher, airports, now });
    const oldFlights = Array.isArray(previous?.flights) ? previous.flights : [];
    if (oldFlights.length > 0 && records.length === 0) throw new Error("TAMS: empty response would replace a valid snapshot. Existing snapshot preserved.");
    const existing = new Map(oldFlights.filter((flight) => flight?.provider === "tams" && flight.provider_flight_id).map((flight) => [flight.provider_flight_id, flight]));
    const merged = new Map(records.map((flight) => [flight.provider_flight_id, flight]));
    for (const [identity, flight] of merged) {
        const prior = existing.get(flight.provider_flight_id);
        // An older synchronization never replaces newer data.
        if (prior?.last_provider_update && Date.parse(prior.last_provider_update) > Date.parse(now)) {
            report.stale++;
            merged.set(identity, prior);
            continue;
        }
        if (prior) merged.set(identity, mergeFlight(prior, flight));
    }
    const lowerBound = Date.parse(now) - RETAIN_MISSING_MS;
    const upperBound = Date.parse(now) + RETAIN_MISSING_MS;
    for (const [identity, prior] of existing) {
        if (merged.has(identity)) continue;
        const effective = Date.parse(prior.estimated_arrival ?? prior.scheduled_arrival ?? "");
        // A smaller but otherwise valid provider response must not erase nearby flights.
        // Invalid old timestamps are retained for safety rather than silently discarded.
        if (!Number.isFinite(effective) || (effective >= lowerBound && effective <= upperBound)) {
            merged.set(identity, prior);
            report.retainedMissing = (report.retainedMissing ?? 0) + 1;
        }
    }
    const flights = [...merged.values()].sort((a, b) => String(a.provider_flight_id).localeCompare(String(b.provider_flight_id)));
    return {
        document: {
            schemaVersion: 1,
            // `lastUpdate` was the stage-2 field; accept it only as migration input.
            lastSuccessfulSyncAt: now,
            lastFlightChangeAt: previous?.lastFlightChangeAt ?? previous?.lastUpdate ?? null,
            lastFailedSyncAt: null,
            syncFailed: false,
            flights,
        },
        report,
    };
}

/** Failure metadata never includes provider bodies, credentials, or raw error text. */
export function markSyncFailure(previous, attemptedAt = new Date().toISOString()) {
    return {
        schemaVersion: 1,
        lastSuccessfulSyncAt: previous?.lastSuccessfulSyncAt ?? previous?.lastUpdate ?? null,
        lastFlightChangeAt: previous?.lastFlightChangeAt ?? previous?.lastUpdate ?? null,
        lastFailedSyncAt: attemptedAt,
        syncFailed: true,
        flights: Array.isArray(previous?.flights) ? previous.flights : [],
    };
}

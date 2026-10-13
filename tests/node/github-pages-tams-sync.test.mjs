import assert from "node:assert/strict";
import test from "node:test";
import { fetchTamsWindows, markSyncFailure, parseTamsTimestamp, synchronizeTams } from "../../sync/lib/github-pages-tams-sync.mjs";
import { decideFailurePublication, decidePublication, safeMetrics } from "../../sync/lib/snapshot-publication.mjs";

const airports = {
    "iata:PTY": { country_code: "PA" },
    "iata:AEP": { country_code: "AR" },
};
const now = "2026-10-12T15:00:00.000Z";
const row = (overrides = {}) => ({
    ID_OP_FLIGHT: 501,
    ID_ARPT_DEST_ORIG: "PTY",
    FLIGHT: "123",
    ID_AIRLINE: "CM",
    AEROLINEA: "Copa Airlines",
    DT_STDA: "2026-10-12T10:00:00",
    DT_ETDA: "2026-10-12T10:15:00",
    DT_ATDA: null,
    ID_REMARK: "HOR",
    ID_REG: "HP-1234CMP",
    TERMINAL: "A",
    STAND: "31",
    SAP_PAX: 150,
    ...overrides,
});
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const sequence = (...bodies) => {
    let index = 0;
    return async () => response(bodies[index++]);
};

test("queries the -24h and +24h TAMS windows and emits static frontend fields", async () => {
    const requested = [];
    const fetcher = async (url) => {
        requested.push(url);
        return response([row()]);
    };
    const { document, report } = await synchronizeTams({ fetcher, airports, previous: { flights: [] }, now });
    assert.deepEqual(requested.map((url) => url.searchParams.get("tiempo_antes")), ["-24", "24"]);
    assert.equal(report.requests, 2);
    assert.equal(report.duplicates, 1);
    assert.equal(document.flights.length, 1);
    assert.equal(document.flights[0].provider_flight_id, "EZE:501");
    assert.equal(document.flights[0].id, "EZE:501");
    assert.equal(document.flights[0].flight_number, "CM123");
    assert.equal(document.flights[0].scheduled_arrival, "2026-10-12T13:00:00.000Z");
    assert.equal(document.flights[0].status, "scheduled");
});

test("keeps Argentina local time correct across midnight and rejects impossible dates", () => {
    assert.equal(parseTamsTimestamp("2026-10-12T23:50:00"), "2026-10-13T02:50:00.000Z");
    assert.equal(parseTamsTimestamp("2026-10-13T00:20:00"), "2026-10-13T03:20:00.000Z");
    assert.equal(parseTamsTimestamp("2026-02-30T12:00:00"), null);
});

test("filters domestic and unknown origins and maps known TAMS states without inventing others", async () => {
    const { records, report } = await fetchTamsWindows({
        fetcher: sequence([row({ ID_ARPT_DEST_ORIG: "AEP" }), row({ ID_ARPT_DEST_ORIG: "XXX" }), row({ ID_REMARK: "NEW" })], []),
        airports,
        now,
    });
    assert.equal(report.domestic, 1);
    assert.equal(report.ignored, 1);
    assert.equal(records.length, 1);
    assert.equal(records[0].status, null);
    assert.equal(records[0].provider_status, "NEW");
});

test("preserves PAX, actual-arrival and registration values when TAMS omits them", async () => {
    const previous = {
        lastUpdate: "2026-10-12T14:55:00.000Z",
        flights: [{
            id: "EZE:501", provider: "tams", provider_flight_id: "EZE:501",
            estimated_arrival: "2026-10-12T13:15:00.000Z",
            previous_estimated_arrival: null, tams_sap_pax: 150,
            actual_arrival_time: "2026-10-12T13:19:00.000Z", aircraft_registration: "HP-1234CMP",
        }],
    };
    const { document } = await synchronizeTams({
        fetcher: sequence([row({ DT_ETDA: null, DT_ATDA: null, ID_REG: null, SAP_PAX: -1 })], []),
        airports, previous, now,
    });
    const flight = document.flights[0];
    assert.equal(flight.estimated_arrival, null);
    assert.equal(flight.previous_estimated_arrival, "2026-10-12T13:15:00.000Z");
    assert.equal(flight.tams_sap_pax, 150);
    assert.equal(flight.actual_arrival_time, "2026-10-12T13:19:00.000Z");
    assert.equal(flight.aircraft_registration, "HP-1234CMP");
});

test("does not replace a valid snapshot after an HTTP failure, invalid optional timestamp, or empty result", async () => {
    const previous = { lastUpdate: "2026-10-12T14:55:00.000Z", flights: [{ provider: "tams", provider_flight_id: "EZE:501" }] };
    await assert.rejects(() => synchronizeTams({ fetcher: async () => response([], 503), airports, previous, now }), /HTTP 503/);
    await assert.rejects(() => synchronizeTams({ fetcher: sequence([row({ DT_ETDA: "2026-02-30T12:00:00" })], []), airports, previous, now }), /incomplete or invalid/);
    await assert.rejects(() => synchronizeTams({ fetcher: sequence([], []), airports, previous, now }), /empty response/);
    const failed = markSyncFailure(previous, now);
    assert.equal(failed.lastSuccessfulSyncAt, previous.lastUpdate);
    assert.equal(failed.lastFlightChangeAt, previous.lastUpdate);
    assert.equal(failed.lastFailedSyncAt, now);
    assert.equal(failed.syncFailed, true);
    assert.deepEqual(failed.flights, previous.flights);
});

test("retains nearby valid flights omitted by an unusually small but valid response", async () => {
    const previous = {
        lastSuccessfulSyncAt: "2026-10-12T14:55:00.000Z",
        flights: [
            { provider: "tams", provider_flight_id: "EZE:501", scheduled_arrival: "2026-10-12T13:00:00.000Z", estimated_arrival: "2026-10-12T13:15:00.000Z", stand: "31" },
            { provider: "tams", provider_flight_id: "EZE:502", scheduled_arrival: "2026-10-12T16:00:00.000Z", estimated_arrival: "2026-10-12T16:20:00.000Z", stand: "32" },
        ],
    };
    const { document, report } = await synchronizeTams({ fetcher: sequence([row()], []), airports, previous, now });
    assert.deepEqual(document.flights.map((flight) => flight.provider_flight_id), ["EZE:501", "EZE:502"]);
    assert.equal(report.retainedMissing, 1);
});

test("publishes only a semantic flight change, not a lastUpdate-only change", () => {
    const before = { schemaVersion: 1, lastUpdate: "2026-10-12T15:00:00Z", syncFailed: false, flights: [{ provider_flight_id: "EZE:501", stand: "31" }] };
    const sameFlights = { ...before, lastUpdate: "2026-10-12T15:05:00Z" };
    const changedFlights = { ...sameFlights, flights: [{ provider_flight_id: "EZE:501", stand: "32" }] };
    const identical = decidePublication(before, sameFlights);
    assert.deepEqual(identical, { publish: false, reason: "flight_content_unchanged", document: before });
    assert.equal(decidePublication(before, changedFlights).publish, true);
});

test("publishes a bounded successful-sync heartbeat and a single failure transition", () => {
    const before = {
        schemaVersion: 1, lastSuccessfulSyncAt: "2026-10-12T14:00:00Z", lastFlightChangeAt: "2026-10-12T13:00:00Z",
        lastFailedSyncAt: null, syncFailed: false, flights: [{ provider_flight_id: "EZE:501", stand: "31" }],
    };
    const unchanged = { ...before, lastSuccessfulSyncAt: "2026-10-12T15:00:00Z" };
    const heartbeat = decidePublication(before, unchanged);
    assert.equal(heartbeat.publish, true);
    assert.equal(heartbeat.reason, "success_heartbeat");
    assert.equal(heartbeat.document.lastFlightChangeAt, "2026-10-12T13:00:00Z");
    const failure = markSyncFailure(before, "2026-10-12T15:05:00Z");
    assert.equal(decideFailurePublication(before, failure).reason, "sync_failed");
    assert.equal(decideFailurePublication({ ...failure, syncFailed: true }, failure).reason, "failure_already_published");
    const recovery = decidePublication({ ...failure, syncFailed: true }, unchanged);
    assert.equal(recovery.reason, "sync_recovered");
});

test("refuses failed or stale candidates and emits metrics without flight contents", () => {
    const before = { schemaVersion: 1, lastUpdate: "2026-10-12T15:00:00Z", syncFailed: false, flights: [{ provider_flight_id: "EZE:501", stand: "31" }] };
    const failed = decidePublication(before, { ...before, syncFailed: true });
    const stale = decidePublication(before, { ...before, lastUpdate: "2026-10-12T14:00:00Z", flights: [{ provider_flight_id: "EZE:501", stand: "32" }] });
    assert.equal(failed.reason, "candidate_not_successful");
    assert.equal(stale.reason, "candidate_stale");
    const metrics = safeMetrics({ requests: 2, received: 3, international: 1, duplicates: 1, ignored: 1, domestic: 1, errors: 0, stale: 0 }, failed);
    assert.deepEqual(metrics, { publication: "candidate_not_successful", requests: 2, received: 3, international: 1, duplicates: 1, ignored: 1, domestic: 1, errors: 0, stale: 0, retainedMissing: 0 });
    assert.equal(JSON.stringify(metrics).includes("EZE:501"), false);
});

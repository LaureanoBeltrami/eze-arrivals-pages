function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

/** The data branch changes only when flight content changes, never for timestamps alone. */
export function semanticSnapshot(document) {
    return canonical({
        schemaVersion: document?.schemaVersion,
        flights: [...(document?.flights ?? [])]
            .sort((a, b) => String(a.provider_flight_id).localeCompare(String(b.provider_flight_id)))
            .map(canonical),
    });
}

export const SUCCESS_HEARTBEAT_MS = 60 * 60 * 1000;

const successAt = (document) => document?.lastSuccessfulSyncAt ?? document?.lastUpdate ?? null;
const changedAt = (document) => document?.lastFlightChangeAt ?? document?.lastUpdate ?? null;

export function decidePublication(previous, candidate, heartbeatMs = SUCCESS_HEARTBEAT_MS) {
    if (!candidate || candidate.syncFailed || !Array.isArray(candidate.flights)) {
        return { publish: false, reason: "candidate_not_successful", document: previous };
    }
    const unchanged = JSON.stringify(semanticSnapshot(previous)) === JSON.stringify(semanticSnapshot(candidate));
    const oldTime = Date.parse(successAt(previous) ?? "");
    const newTime = Date.parse(successAt(candidate) ?? "");
    if (Number.isFinite(oldTime) && (!Number.isFinite(newTime) || newTime <= oldTime)) {
        return { publish: false, reason: "candidate_stale", document: previous };
    }
    if (!unchanged) {
        return { publish: true, reason: "flight_content_changed", document: { ...candidate, lastFlightChangeAt: successAt(candidate) } };
    }
    if (previous?.syncFailed) {
        return { publish: true, reason: "sync_recovered", document: { ...candidate, lastFlightChangeAt: changedAt(previous) } };
    }
    if (!Number.isFinite(oldTime) || newTime - oldTime >= heartbeatMs) {
        return { publish: true, reason: "success_heartbeat", document: { ...candidate, lastFlightChangeAt: changedAt(previous) } };
    }
    return { publish: false, reason: "flight_content_unchanged", document: previous };
}

/** Publish one failure transition for the browser, but do not create a commit per repeated failure. */
export function decideFailurePublication(previous, failure) {
    if (previous?.syncFailed) return { publish: false, reason: "failure_already_published", document: previous };
    return { publish: true, reason: "sync_failed", document: failure };
}

/** Metrics intentionally exclude complete flight records and all provider response bodies. */
export function safeMetrics(report, decision) {
    return {
        publication: decision.reason,
        requests: Number(report?.requests ?? 0),
        received: Number(report?.received ?? 0),
        international: Number(report?.international ?? 0),
        duplicates: Number(report?.duplicates ?? 0),
        ignored: Number(report?.ignored ?? 0),
        domestic: Number(report?.domestic ?? 0),
        errors: Number(report?.errors ?? 0),
        stale: Number(report?.stale ?? 0),
        retainedMissing: Number(report?.retainedMissing ?? 0),
    };
}

import { getStore } from "@netlify/blobs";

export default async () => {
    const snapshot = await getStore({ name: "eze-arrivals", consistency: "strong" })
        .get("current", { type: "json", consistency: "strong" });
    if (!snapshot) return Response.json({ error: "La primera actualización todavía no terminó." }, { status: 503 });
    return new Response(JSON.stringify(snapshot), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // Visitors read one shared snapshot; this function never contacts TAMS.
            // The browser already checks at a five-minute cadence.  Avoid an
            // intermediary returning its previous five-minute response just
            // after the scheduled writer has stored a new snapshot.
            "Cache-Control": "no-store",
        },
    });
};

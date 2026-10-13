import type { ArrivalsProps } from "../types/flights";

// The central Netlify refresh runs every five minutes, so client checks match
// that cadence instead of needlessly creating per-visitor traffic.
export const ARRIVALS_REFRESH_MS = 5 * 60_000;

/** The fields the static board receives from its published JSON document. */
export type ArrivalsSnapshot = Pick<
    ArrivalsProps,
    "flights" | "serverTime" | "lastUpdate" | "syncFailed"
>;

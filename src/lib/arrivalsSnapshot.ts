import type { ArrivalsProps } from "../types/flights";

export const ARRIVALS_REFRESH_MS = 45_000;

/** The fields the static board receives from its published JSON document. */
export type ArrivalsSnapshot = Pick<
    ArrivalsProps,
    "flights" | "serverTime" | "lastUpdate" | "syncFailed"
>;

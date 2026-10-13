/** FlightAware accepts a registration as the live-flight identifier. */
export function flightAwareTrackingUrl(registration: string | null | undefined): string | null {
    const normalized = (registration ?? "").replace(/[\s-]+/g, "").toUpperCase();

    if (!/^[A-Z0-9]{3,16}$/.test(normalized)) return null;

    return `https://www.flightaware.com/live/flight/${encodeURIComponent(normalized)}`;
}

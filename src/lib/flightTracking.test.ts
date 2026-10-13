import { describe, expect, it } from "vitest";
import { flightAwareTrackingUrl } from "./flightTracking";

describe("flightAwareTrackingUrl", () => {
    it.each([
        ["PH-BQN", "PHBQN"],
        [" ph bqn ", "PHBQN"],
    ])("normalizes %s", (registration, normalized) => {
        expect(flightAwareTrackingUrl(registration)).toBe(
            `https://www.flightaware.com/live/flight/${normalized}`,
        );
    });

    it.each([null, "", "--", "PH/BQN"])("does not create a broken link for %s", (registration) => {
        expect(flightAwareTrackingUrl(registration)).toBeNull();
    });
});

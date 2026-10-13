// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import AirlineLogo from "../Components/Flights/AirlineLogo";
import { airlineLogos, getAirlineLogo } from "./airlineLogos";
const identity = {
    airline_iata: "AR",
    airline_icao: "ARG",
    airline_name: "Aerolíneas Argentinas",
};
afterEach(cleanup);
describe("local airline logos", () => {
    it("has valid local SVG or PNG artwork for every registered airline", () => {
        for (const airline of airlineLogos) {
            const src = getAirlineLogo({
                airline_iata: airline.codes[0],
                airline_icao: null,
                airline_name: null,
            })!;
            expect(src).toMatch(/^\/images\/airlines\/[A-Z0-9]{2}\.(svg|png)$/);
            const path = resolve("public", src.slice(1));
            expect(existsSync(path)).toBe(true);
            if (src.endsWith(".svg")) {
                const svg = new DOMParser().parseFromString(
                    readFileSync(path, "utf8"),
                    "image/svg+xml",
                );
                expect(svg.querySelector("parsererror")).toBeNull();
                expect(svg.documentElement.tagName).toBe("svg");
                expect(svg.documentElement.hasAttribute("viewBox")).toBe(true);
                expect(svg.querySelector("path")).not.toBeNull();
                expect(
                    svg.querySelector("script, foreignObject, image"),
                ).toBeNull();
            } else {
                expect(readFileSync(path).subarray(0, 8).toString("hex")).toBe(
                    "89504e470d0a1a0a",
                );
            }
        }
    });
    it.each([
        [{ ...identity, airline_iata: " ar " }, "AR"],
        [{ airline_iata: null, airline_icao: "cmp", airline_name: null }, "CM"],
        [
            {
                airline_iata: null,
                airline_icao: null,
                airline_name: " AEROLÍNEAS ARGENTINAS ",
            },
            "AR",
        ],
        [{ airline_iata: "JJ", airline_icao: null, airline_name: null }, "LA"],
        [{ airline_iata: "LP", airline_icao: null, airline_name: null }, "LA"],
    ])(
        "resolves IATA, ICAO, historical alias or normalized name",
        (flight, code) => {
            expect(getAirlineLogo(flight)).toBe(`/images/airlines/${code}.svg`);
        },
    );
    it("uses a code badge for an unknown airline without an external image request", () => {
        render(
            <AirlineLogo
                flight={{
                    airline_iata: "ZZ",
                    airline_icao: null,
                    airline_name: "Unknown",
                }}
            />,
        );
        expect(screen.getByText("ZZ")).not.toBeNull();
        expect(screen.queryByRole("img")).toBeNull();
    });
    it("recovers from a missing file and can render a different airline afterwards", () => {
        const view = render(<AirlineLogo flight={identity} />);
        expect(screen.getByRole("img").getAttribute("src")).toBe(
            "/images/airlines/AR.svg",
        );
        fireEvent.error(screen.getByRole("img"));
        expect(screen.getByText("AR")).not.toBeNull();
        view.rerender(
            <AirlineLogo
                flight={{
                    ...identity,
                    airline_iata: "CM",
                    airline_icao: "CMP",
                }}
            />,
        );
        expect(screen.getByRole("img").getAttribute("src")).toBe(
            "/images/airlines/CM.svg",
        );
    });
    it("handles a completely missing identity", () => {
        render(
            <AirlineLogo
                flight={{
                    airline_iata: null,
                    airline_icao: null,
                    airline_name: null,
                }}
            />,
        );
        expect(screen.getByText("—")).not.toBeNull();
    });
});

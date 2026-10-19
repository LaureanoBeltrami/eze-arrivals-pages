// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import FlightStatusBadge from "./FlightStatusBadge";

afterEach(cleanup);

it("shows ESTIMA with the neutral badge for normal and unclassified provider states", () => {
    const { rerender } = render(<FlightStatusBadge status="scheduled" providerStatus="HOR" />);
    expect(screen.getByText("ESTIMA").className).toContain("status-scheduled");
    rerender(<FlightStatusBadge status={null} providerStatus="EST" />);
    expect(screen.getByText("ESTIMA").className).toContain("status-unknown");
});

it.each([
    ["landed", "ATERRIZADO"],
    ["delayed", "DEMORADO"],
    ["cancelled", "CANCELADO"],
] as const)("preserves %s as %s", (status, label) => {
    render(<FlightStatusBadge status={status} />);
    expect(screen.getByText(label)).not.toBeNull();
});

it("shows CONSULTE for TAMS CON even when normalized status is absent", () => {
    render(<FlightStatusBadge status={null} providerStatus="CON" />);
    expect(screen.getByText("CONSULTE").className).toContain("status-consulte");
});

it("does not display ESTIMA when TAMS explicitly reports CON", () => {
    render(<FlightStatusBadge status="scheduled" providerStatus=" con " />);
    expect(screen.getByText("CONSULTE").className).toContain("status-consulte");
    expect(screen.queryByText("ESTIMA")).toBeNull();
});

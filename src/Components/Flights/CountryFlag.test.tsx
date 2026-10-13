// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import CountryFlag from "./CountryFlag";
afterEach(cleanup);
it("uses a local flag that works independently of emoji support", () => {
    render(<CountryFlag code=" pa " country="Panamá" />);
    expect(
        screen.getByRole("img", { name: "Panamá" }).getAttribute("src"),
    ).toBe("/images/flags/pa.svg");
});
it("recovers from a missing flag without a broken image", () => {
    render(<CountryFlag code="ES" country="España" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByLabelText("España").textContent).toBe("🇪🇸");
});
it("does not fetch an image for an invalid country", () => {
    render(<CountryFlag code="?" country={null} />);
    expect(screen.queryByRole("img")).toBeNull();
});
it("includes every documented local flag", () => {
    const { codes } = JSON.parse(
        readFileSync("public/images/flags/sources.json", "utf8"),
    );
    for (const code of codes)
        expect(existsSync(`public/images/flags/${code}.svg`)).toBe(true);
});

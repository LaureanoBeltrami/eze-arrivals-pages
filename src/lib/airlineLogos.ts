import type { Flight } from "../types/flights";
import { normalize } from "./flights";
import { publicAsset } from "./publicAsset";
// Local files only. Historical TAMS codes identify the same LATAM group artwork.
export const airlineLogos = [
    { file: "AR", codes: ["AR", "ARG"], names: ["aerolineas argentinas"] },
    {
        file: "AV",
        codes: ["AV", "AVA", "LR", "LRC", "2K", "GLG"],
        names: ["avianca", "avianca costa rica (lacsa)", "avianca ecuador"],
    },
    { file: "CM", codes: ["CM", "CMP"], names: ["copa airlines", "copa"] },
    {
        file: "LA",
        codes: [
            "LA",
            "LAN",
            "JJ",
            "TAM",
            "LP",
            "LPE",
            "XL",
            "LNE",
            "LU",
            "LXP",
        ],
        names: [
            "latam",
            "latam airlines",
            "latam airlines brasil",
            "latam airlines peru",
            "latam airlines group",
        ],
    },
    { file: "IB", codes: ["IB", "IBE"], names: ["iberia"] },
    { file: "UX", codes: ["UX", "AEA"], names: ["air europa"] },
    { file: "AA", codes: ["AA", "AAL"], names: ["american airlines"] },
    { file: "UA", codes: ["UA", "UAL"], names: ["united", "united airlines"] },
    { file: "DL", codes: ["DL", "DAL"], names: ["delta", "delta air lines"] },
    { file: "AF", codes: ["AF", "AFR"], names: ["air france"] },
    {
        file: "KL",
        codes: ["KL", "KLM"],
        names: ["klm", "klm royal dutch airlines"],
    },
    { file: "LH", codes: ["LH", "DLH"], names: ["lufthansa"] },
    { file: "AZ", codes: ["AZ", "ITY"], names: ["ita airways"] },
    { file: "TK", codes: ["TK", "THY"], names: ["turkish airlines"] },
    { file: "BA", codes: ["BA", "BAW"], names: ["british airways"] },
    {
        file: "H2",
        codes: ["H2", "SKU", "H8", "SKX"],
        names: ["sky", "sky airline"],
    },
    {
        file: "JA",
        codes: ["JA", "JAT", "WJ", "JES", "JZ", "JAP"],
        names: ["jetsmart", "jetsmart airlines", "jetsmart airlines argentina"],
    },
    { file: "G3", codes: ["G3", "GLO"], names: ["gol", "gol linhas aereas"] },
    { file: "EK", codes: ["EK", "UAE"], names: ["emirates"] },
    { file: "QR", codes: ["QR", "QTR"], names: ["qatar", "qatar airways"] },
    {
        file: "ET",
        codes: ["ET", "ETH"],
        names: ["ethiopian", "ethiopian airlines"],
    },
    { file: "AC", codes: ["AC", "ACA"], names: ["air canada"] },
    { file: "AM", codes: ["AM", "AMX"], names: ["aeromexico"] },
    {
        file: "OB",
        codes: ["OB", "BOV"],
        names: ["boliviana de aviacion", "boa"],
    },
    { file: "ZP", codes: ["ZP", "AZP"], names: ["paranair"] },
    { file: "DM", codes: ["DM", "DWI"], names: ["arajet"] },
    {
        file: "PU",
        codes: ["PU", "PUE"],
        names: ["plus ultra", "plus ultra lineas aereas"],
    },
    {
        file: "MU",
        codes: ["MU", "CES"],
        names: ["china eastern airlines", "china eastern"],
    },
];
export function getAirlineLogo(
    flight: Pick<Flight, "airline_iata" | "airline_icao" | "airline_name">,
): string | null {
    const codes = [flight.airline_iata, flight.airline_icao].map((code) =>
        code?.trim().toUpperCase(),
    );
    const name = normalize(flight.airline_name).trim().replace(/\s+/g, " ");
    const airline =
        airlineLogos.find((airline) =>
            airline.codes.some((code) => codes.includes(code)),
        ) ?? airlineLogos.find((airline) => airline.names.includes(name));
    if (!airline) return null;
    const extension = ["JA", "PU", "MU"].includes(airline.file) ? "png" : "svg";
    return publicAsset(`images/airlines/${airline.file}.${extension}`);
}

import { useState } from "react";
import { countryFlag } from "../../lib/arrivalsDisplay";
import { publicAsset } from "../../lib/publicAsset";
const localFlags = new Set([
    "AW",
    "CN",
    "AR",
    "BO",
    "BR",
    "CL",
    "CO",
    "CR",
    "CU",
    "DO",
    "EC",
    "MX",
    "PA",
    "PE",
    "PR",
    "PY",
    "SV",
    "UY",
    "VE",
    "US",
    "CA",
    "ES",
    "FR",
    "IT",
    "DE",
    "NL",
    "GB",
    "CH",
    "TR",
    "AE",
    "QA",
    "ET",
    "AU",
    "NZ",
    "PT",
]);
export default function CountryFlag({
    code,
    country,
}: {
    code: string;
    country: string | null;
}) {
    const normalized = code.trim().toUpperCase();
    const [failed, setFailed] = useState<string | null>(null);
    // Local SVGs render country flags on Windows, which may show emoji as letters.
    return localFlags.has(normalized) && failed !== normalized ? (
        <img
            className="country-flag"
            src={publicAsset(`images/flags/${normalized.toLowerCase()}.svg`)}
            width={28}
            height={20}
            alt={country ?? normalized}
            onError={() => setFailed(normalized)}
        />
    ) : (
        <span className="origin-flag" aria-label={country ?? normalized}>
            {countryFlag(normalized)}
        </span>
    );
}

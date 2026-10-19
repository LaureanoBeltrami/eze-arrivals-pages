import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const data = JSON.parse(readFileSync(new URL("../../public/data/visas.json", import.meta.url), "utf8"));
const byCode = new Map(data.visas.map((visa) => [visa.code, visa]));
const badCharacters = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u25a1\ufffd]/;

test("visa observations contain no replacement characters or broken controls", () => {
  for (const [id, note] of Object.entries(data.observations)) {
    assert.ok(!badCharacters.test(note), `Corrupt observation ${id}`);
  }
  for (const visa of data.visas) {
    assert.ok(!badCharacters.test(visa.observations), `Corrupt country reference ${visa.code}`);
    assert.deepEqual([...new Set(visa.observationIds)], visa.observationIds, `Duplicate reference for ${visa.code}`);
    for (const id of visa.observationIds) assert.ok(data.observations[id], `Missing ${visa.code} observation ${id}`);
  }
});

test("prime-marked official observation IDs remain distinct", () => {
  for (const [code, ids] of Object.entries({
    CHN: ["8","37","37’","37’’","37’’’","37’’’’","37’’’’’"],
    IND: ["3","70","70’"], MNE: ["2","32","32’"],
    DOM: ["68","68’"], DZA: ["7’"], PAK: ["7’’"],
    NRU: ["6’"], TON: ["6’"], MAR: ["3’","7"],
  })) assert.deepEqual(byCode.get(code)?.observationIds, ids, code);
});

test("country fields are free from corrupt PDF extraction and include special cases", () => {
  assert.equal(data.visas.length, 190);
  const cases = {
    CHN: { capital: "PEKÍN / BEIJING", tourist: "V (VER OBS 37’’’’)" },
    IND: { capital: "NUEVA DELHI", tourist: "V – (VER OBS 70-70’)" },
    TWN: { capital: "TAIPEI", tourist: "C/V o AVE" },
    DOM: { capital: "SANTO DOMINGO", tourist: "V (VER OBS 68)" },
    WSM: { tourist: "V – AVE" },
    ESH: { continent: "ÁFRICA", nationality: "SAHARAUI" },
  };
  for (const [code, fields] of Object.entries(cases)) {
    const visa = byCode.get(code);
    assert.ok(visa, `Missing country ${code}`);
    for (const [field, expected] of Object.entries(fields)) assert.equal(visa[field], expected, `${code} ${field}`);
  }
  assert.deepEqual(byCode.get("GBN").observationIds, ["*"]);
  assert.deepEqual(byCode.get("HKG").observationIds, ["23", "**"]);
  assert.deepEqual(byCode.get("TWN").observationIds, ["62 (pág. 12)"]);
  assert.ok(data.observations["62"].startsWith("DOMINICA"));
  assert.ok(data.observations["62 (pág. 12)"].includes("CERTIFICADO DE VIAJE"));
  assert.ok(byCode.get("MDA").observationIds.includes("X"));
});

#!/usr/bin/env python3
"""Extract the DNM visa table and its numbered observations from the source PDF.

The PDF's WinAnsi font has no ToUnicode map, so common PDF extractors replace
accented characters.  This reads the original string bytes as cp1252 instead.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from pypdf import PdfReader
from pypdf.generic import ContentStream

TABLE_PAGES = range(1, 11)  # zero based: pages 2 through 11
NOTE_PAGES = range(11, 35)  # zero based: pages 12 through 35
COLUMNS = ("observations", "country", "code", "capital", "tourist", "diplomatic", "official", "continent", "nationality")
# The left edges of the visible columns in the DNM table.
BREAKS = (80, 245, 280, 420, 480, 510, 540, 650, 10_000)


def decode(value: object) -> str:
    raw = getattr(value, "original_bytes", None)
    if raw is not None:
        return raw.decode("cp1252", "replace")
    return str(value)


def text_items(reader: PdfReader, page_index: int) -> list[tuple[float, float, str]]:
    """Return text-show operations with their text-matrix origin."""
    stream = ContentStream(reader.pages[page_index].get_contents(), reader)
    x = y = 0.0
    result: list[tuple[float, float, str]] = []
    for operands, operation in stream.operations:
        if operation == b"Tm":
            x, y = float(operands[4]), float(operands[5])
        elif operation == b"Td":
            x += float(operands[0])
            y += float(operands[1])
        elif operation in (b"Tj", b"TJ"):
            values = operands[0] if operation == b"TJ" else operands
            text = "".join(decode(value) for value in values if not isinstance(value, (int, float)))
            if text.strip():
                result.append((x, y, text))
    return result


def normalized(parts: list[str]) -> str:
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def lines(items: list[tuple[float, float, str]]) -> list[tuple[float, list[tuple[float, str]]]]:
    grouped: dict[float, list[tuple[float, str]]] = defaultdict(list)
    for x, y, text in items:
        # Word occasionally emitted the three-letter code a few points above the
        # rest of its row.  Seven points joins that harmless baseline shift while
        # preserving the roughly 15-point distance between records.
        key = next((existing for existing in grouped if abs(existing - y) < 7), y)
        grouped[key].append((x, text))
    return [(y, sorted(values)) for y, values in sorted(grouped.items(), reverse=True)]


def parse_rows(reader: PdfReader) -> list[dict[str, str | list[str]]]:
    rows: list[dict[str, str | list[str]]] = []
    for page_index in TABLE_PAGES:
        items = [item for item in text_items(reader, page_index) if 52 < item[1] < 457]
        # A three-letter code is the only stable row anchor: Word may place it
        # several points above the other cells, and some country names wrap.
        anchors = [(x, y, text) for x, y, text in items if 245 <= x < 280 and re.fullmatch(r"[A-Z]{3}", normalized([text]))]
        for _, y, code in anchors:
            cells = [[] for _ in COLUMNS]
            for x, item_y, text in items:
                if abs(item_y - y) >= 8:
                    continue
                if x < 38 or x > 810:
                    continue
                column = next((i for i, boundary in enumerate(BREAKS) if x < boundary), len(COLUMNS) - 1)
                cells[column].append(text)
            result = {name: normalized(cell) for name, cell in zip(COLUMNS, cells)}
            result["code"] = normalized([code])
            if not result["country"]:
                continue
            # Wrapped names retain their first row's code. Keep a single record.
            if not result["code"] and rows and result["country"].startswith(("d`", "Zaire)")):
                rows[-1]["country"] = f"{rows[-1]['country']} {result['country']}"
                continue
            refs = re.findall(r"\d+(?:[ªº⁰¹²³⁴⁵⁶⁷⁸⁹]+)?", str(result["observations"]))
            result["observationIds"] = refs
            rows.append(result)
    return rows


def parse_notes(reader: PdfReader) -> dict[str, str]:
    content: list[str] = []
    for page_index in NOTE_PAGES:
        for y, values in lines(text_items(reader, page_index)):
            if y < 35 or y > 510:  # skip page numbers and headers
                continue
            text = normalized([value for _, value in values])
            if text:
                content.append(text)
    notes: dict[str, list[str]] = {}
    current: str | None = None
    heading = re.compile(r"^(\d+(?:[ªº⁰¹²³⁴⁵⁶⁷⁸⁹]+)?|V\s*-\s*AVE)\s*=")
    for line in content:
        match = heading.match(line)
        if match:
            current = re.sub(r"\s+", "", match.group(1))
            notes.setdefault(current, []).append(line)
        elif current:
            notes[current].append(line)
    return {key: "\n\n".join(value) for key, value in notes.items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    reader = PdfReader(args.pdf)
    if len(reader.pages) != 37:
        raise SystemExit(f"Expected 37 pages, found {len(reader.pages)}")
    visas = parse_rows(reader)
    notes = parse_notes(reader)
    if not visas or not notes:
        raise SystemExit("No table rows or notes were extracted")
    document = {
        "source": "Dirección Nacional de Migraciones - 19/03/2026",
        "sourcePages": len(reader.pages),
        "visas": visas,
        "observations": notes,
    }
    args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(visas)} countries and {len(notes)} observations")


if __name__ == "__main__":
    main()

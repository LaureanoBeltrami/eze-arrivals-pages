import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AirportHeader from "../Components/Flights/AirportHeader";
import { publicAsset } from "../lib/publicAsset";
import { visaFlag } from "../lib/visaFlags";

type Visa = { observations: string; observationIds: string[]; country: string; code: string; capital: string; tourist: string; diplomatic: string; official: string; continent: string; nationality: string };
type VisaSource = { source: string; sourcePages: number; visas: Visa[]; observations: Record<string, string> };

const compact = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function VisasPage({ now, onBack }: { now: number; onBack: () => void }) {
    const [data, setData] = useState<VisaSource | null>(null);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Visa | null>(null);
    useEffect(() => { void fetch(publicAsset("data/visas.json")).then((r) => r.ok ? r.json() : Promise.reject()).then(setData); }, []);
    const visas = useMemo(() => (data?.visas ?? []).filter((visa) => compact(`${visa.country} ${visa.nationality} ${visa.code}`).includes(compact(search))).sort((a, b) => a.country.localeCompare(b.country, "es")), [data, search]);
    return <div className="fids-page visas-page">
        <AirportHeader now={now} title="VISAS" subtitle="RÉGIMEN MIGRATORIO" />
        <main className="fids-main">
            <section className="arrivals-board" aria-label="Listado de países y régimen de visas">
                <div className="board-controls visa-controls">
                    <div className="visa-heading"><h2>LISTADO DE PAÍSES Y RÉGIMEN DE VISAS</h2><p>{data?.source ?? "Cargando fuente oficial…"}</p></div>
                    <label className="flight-search"><Search size={20} aria-hidden="true" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar país, nacionalidad o código" aria-label="Buscar país, nacionalidad o código" />{search && <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda"><X size={18} /></button>}</label>
                    <button className="visa-back" onClick={onBack}>Arribos</button>
                </div>
                <div className="table-scroll" tabIndex={0}>
                    <table className="fids-table visas-table"><thead><tr><th>PAÍS</th><th>CÓD.</th><th>CAPITAL</th><th>TA.</th><th>DIP.</th><th>OF.</th><th>CONTINENTE</th><th>NACIONALIDAD</th><th>OBS.</th></tr></thead><tbody>
                        {visas.map((visa) => <tr key={`${visa.code}-${visa.country}`}><td><button className="visa-country" onClick={() => setSelected(visa)}><span className="visa-flag" aria-hidden="true">{visaFlag(visa.code)}</span><strong>{visa.country}</strong></button></td><td>{visa.code}</td><td>{visa.capital}</td><td>{visa.tourist}</td><td>{visa.diplomatic}</td><td>{visa.official}</td><td>{visa.continent}</td><td>{visa.nationality}</td><td>{visa.observations ? <button className="observation-link" onClick={() => setSelected(visa)}>{visa.observations}</button> : "-"}</td></tr>)}
                    </tbody></table>
                </div>
                <div className="board-summary"><span><strong>{String(visas.length).padStart(3, "0")}</strong> países</span><span>Fuente: DNM · Documento de {data?.sourcePages ?? 37} páginas</span></div>
            </section>
        </main>
        {selected && <div className="visa-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><section className="visa-modal" role="dialog" aria-modal="true" aria-labelledby="visa-title" onMouseDown={(event) => event.stopPropagation()}><button className="visa-close" onClick={() => setSelected(null)} aria-label="Cerrar"><X /></button><p className="visa-kicker">{selected.code} · {selected.nationality}</p><h2 id="visa-title">{selected.country}</h2><dl><div><dt>Capital</dt><dd>{selected.capital || "-"}</dd></div><div><dt>Turista</dt><dd>{selected.tourist || "-"}</dd></div><div><dt>Diplomático</dt><dd>{selected.diplomatic || "-"}</dd></div><div><dt>Oficial</dt><dd>{selected.official || "-"}</dd></div></dl>{selected.observationIds.length > 0 && <div className="visa-notes"><h3>Observaciones</h3>{selected.observationIds.map((id) => data?.observations[id] && <article key={id}><h4>{id}</h4>{data.observations[id].split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>)}</div>}</section></div>}
    </div>;
}

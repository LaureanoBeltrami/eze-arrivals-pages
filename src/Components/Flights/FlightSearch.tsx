import { Search, X } from "lucide-react";
export default function FlightSearch({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flight-search">
            <Search size={22} aria-hidden="true" />
            <input
                aria-label="Buscar vuelo, aerolínea u origen"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Buscar vuelo, aerolínea u origen..."
            />
            {value && (
                <button
                    aria-label="Limpiar búsqueda"
                    onClick={() => onChange("")}
                >
                    <X size={20} />
                </button>
            )}
        </div>
    );
}

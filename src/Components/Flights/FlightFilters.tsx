import type { RelativeTimeFilter } from "../../types/flights";
import {
    relativeTimeOptions,
    getRelativeTimeWindow,
    formatTimeWindow,
} from "../../lib/flightTime";
const options = [...relativeTimeOptions].reverse();
export default function FlightFilters({
    value,
    onChange,
    now,
}: {
    value: Exclude<RelativeTimeFilter, null>;
    onChange: (value: Exclude<RelativeTimeFilter, null>) => void;
    now: number;
}) {
    return (
        <div className="time-window">
            <label htmlFor="time-window">VENTANA DE TIEMPO</label>
            <select
                id="time-window"
                value={value}
                onChange={(event) => {
                    const option = options.find(
                        (option) => option.value === event.target.value,
                    );
                    if (option) onChange(option.value);
                }}
            >
                {options.map((option) => {
                    const hours = Number(option.value.replace("h", ""));
                    const label =
                        option.value === "now"
                            ? "Ahora"
                            : `${hours > 0 ? "+" : ""}${hours} ${Math.abs(hours) === 1 ? "hora" : "horas"}`;
                    return (
                        <option key={option.value} value={option.value}>
                            {label}
                        </option>
                    );
                })}
            </select>
            <span
                className="window-range"
                aria-label="Rango horario seleccionado"
            >
                {formatTimeWindow(getRelativeTimeWindow(value, now)!)}
            </span>
        </div>
    );
}

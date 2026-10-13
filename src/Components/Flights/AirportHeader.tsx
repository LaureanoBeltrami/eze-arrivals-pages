import { PlaneLanding } from "lucide-react";
import { TIMEZONE, time } from "../../lib/flightTime";

export default function AirportHeader({ now }: { now: number }) {
    const date = new Intl.DateTimeFormat("es-AR", {
        timeZone: TIMEZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(now);
    return (
        <header className="fids-header">
            <div className="airport-identity">
                <div className="airport-code">
                    <PlaneLanding
                        aria-hidden="true"
                        size={40}
                        strokeWidth={1.7}
                    />
                    <strong>EZE</strong>
                </div>
                <div className="airport-name">
                    AEROPUERTO INTERNACIONAL
                    <br />
                    <strong>MINISTRO PISTARINI</strong>
                    <span>Buenos Aires, Argentina</span>
                </div>
            </div>
            <div className="board-title">
                <h1>
                    ARRIBOS
                    <br className="title-break" /> INTERNACIONALES
                </h1>
                <p>
                    <span className="live-dot" /> VUELOS EN TIEMPO REAL{" "}
                    <span className="title-separator">·</span>{" "}
                    <strong>TERMINAL A</strong>
                </p>
            </div>
            <div className="airport-clock">
                <p className="clock-date">
                    {date.charAt(0).toUpperCase() + date.slice(1)}
                </p>
                <time
                    aria-label="Hora de Buenos Aires"
                    dateTime={new Date(now).toISOString()}
                >
                    {time(new Date(now).toISOString())}
                </time>
                <p>
                    UTC-3 <span>·</span> Buenos Aires
                </p>
            </div>
        </header>
    );
}

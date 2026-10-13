import { PlaneLanding, CheckCheck } from "lucide-react";
export default function ArrivalsStats({
    upcoming,
    landed,
}: {
    upcoming: number;
    landed: number;
}) {
    return (
        <section className="arrivals-stats" aria-label="Resumen de operaciones">
            <article
                className="stat-card stat-upcoming"
                aria-label="Próximos a aterrizar"
            >
                <div className="stat-icon">
                    <PlaneLanding
                        size={34}
                        strokeWidth={1.6}
                        aria-hidden="true"
                    />
                </div>
                <div className="stat-copy">
                    <h2>PRÓXIMOS A ATERRIZAR</h2>
                    <p>en la próxima hora</p>
                </div>
                <strong className="stat-value">
                    {String(upcoming).padStart(2, "0")}
                </strong>
            </article>
            <article className="stat-card stat-landed" aria-label="Aterrizados">
                <div className="stat-icon">
                    <PlaneLanding
                        size={32}
                        strokeWidth={1.6}
                        aria-hidden="true"
                    />
                    <CheckCheck size={16} aria-hidden="true" />
                </div>
                <div className="stat-copy">
                    <h2>ATERRIZADOS</h2>
                    <p>en la última hora</p>
                </div>
                <strong className="stat-value">
                    {String(landed).padStart(2, "0")}
                </strong>
            </article>
        </section>
    );
}

import ModuleIntro from '../components/ModuleIntro';
import { Card, Note, PageHeader, SimBadge, Stat } from '../components/ui';
import { CONVERSATIONS, SURVEY_RESULTS } from '../data/demo';

export default function Reports() {
  const total = SURVEY_RESULTS.reduce((a, b) => a + b.n, 0);
  const avg = SURVEY_RESULTS.reduce((a, b, i) => a + b.n * (5 - i), 0) / total;
  const live = CONVERSATIONS.filter((c) => c.survey);
  return (
    <>
      <PageHeader title="Reportes" subtitle="Indicadores, economía y encuestas." actions={<SimBadge>Resultados de ejemplo</SimBadge>} />
      <ModuleIntro moduleKey="reports" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Respuestas de encuesta" value={String(total)} />
        <Stat label="Satisfacción media" value={avg.toFixed(2) + ' / 5'} />
        <Stat label="Ingresos de ejemplo (mes)" value="$ 4.280.000" hint="Citas completadas + pedidos entregados (ficticio)" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Distribución de respuestas</h2>
          <ul className="mt-3 space-y-2">
            {SURVEY_RESULTS.map((r) => (
              <li key={r.label} className="text-sm"><div className="flex justify-between"><span>{r.label}</span><span>{r.n}</span></div>
                <div className="h-2 rounded bg-primary-soft"><div className="h-2 rounded bg-primary" style={{ width: `${(r.n / total) * 100}%` }} /></div></li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Encuestas de conversaciones de la demo</h2>
          <ul className="mt-2 space-y-2 text-sm">{live.map((c) => <li key={c.id}>#{c.id} {c.customer}: <strong>{c.survey!.score}/5</strong> — {c.survey!.comment}</li>)}</ul>
          <div className="mt-3"><Note>En AVA la encuesta se envía desde una conversación resuelta, una cita confirmada/completada o un pedido entregado, con enlace único; los reportes combinan reservas de cualquier motor y encuestas.</Note></div>
        </Card>
      </div>
    </>
  );
}

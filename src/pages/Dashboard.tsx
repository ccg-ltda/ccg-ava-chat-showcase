import { Link } from 'react-router-dom';
import ModuleIntro from '../components/ModuleIntro';
import { Card, MaturityBadge, PageHeader, SimBadge, Stat } from '../components/ui';
import { ACTIVITY, APPOINTMENTS, CONVERSATIONS, ORDERS, WEEK } from '../data/demo';
import { MODULES } from '../data/modules';

export default function Dashboard() {
  const max = Math.max(...WEEK.map((w) => w.conv));
  const open = CONVERSATIONS.filter((c) => c.handling !== 'resolved').length;
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen del Workspace ficticio. Las cifras son de ejemplo." actions={<SimBadge>Datos ficticios</SimBadge>} />
      <ModuleIntro moduleKey="dashboard" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Conversaciones abiertas" value={String(open)} hint="IA, pendientes y en atención" />
        <Stat label="Resueltas por IA (semana)" value="78 %" hint="Ejemplo ilustrativo" />
        <Stat label="Citas próximas" value={String(APPOINTMENTS.filter((a) => a.status === 'confirmed' || a.status === 'requested').length)} />
        <Stat label="Pedidos activos" value={String(ORDERS.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold">Conversaciones de la semana</h2>
          <div className="mt-4 flex h-40 items-end gap-3" role="img" aria-label="Barras de conversaciones por día; la parte oscura es lo atendido por IA">
            {WEEK.map((w) => (
              <div key={w.d} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 items-end rounded bg-primary-soft">
                  <div className="absolute bottom-0 w-full rounded bg-primary/30" style={{ height: `${(w.conv / max) * 100}%` }} />
                  <div className="relative w-full rounded bg-primary" style={{ height: `${(w.ai / max) * 100}%` }} />
                </div>
                <span className="text-xs text-ink-muted">{w.d}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Barra oscura: atendidas solo por IA. Barra clara: total.</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Actividad reciente</h2>
          <ul className="mt-3 space-y-2 text-sm">{ACTIVITY.map((a) => <li key={a} className="border-l-2 border-primary pl-2">{a}</li>)}</ul>
        </Card>
      </div>
      <h2 className="mb-2 mt-6 font-semibold">Módulos y estado real en AVA</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link key={m.key} to={m.path} className="rounded-card border border-line bg-card p-3 shadow-card hover:border-primary">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold">{m.name}</span><MaturityBadge value={m.maturity} /></div>
            <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{m.summary}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

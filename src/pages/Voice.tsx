import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, MaturityBadge, Note, PageHeader } from '../components/ui';
import { VOICE_MAPPING, VOICE_PROPOSALS } from '../data/voice';

export default function Voice() {
  const [open, setOpen] = useState(VOICE_MAPPING[0].component);
  const row = VOICE_MAPPING.find((r) => r.component === open)!;
  return (
    <>
      <PageHeader title="AVA Chat → AVA Voz" subtitle="Qué conceptos de AVA Chat pueden servir de referencia para AVA Voz." />
      <Note tone="violet">
        Las columnas «Hoy en AVA Chat» describen código revisado. Las columnas «Reutilizable», «A adaptar» y «Nuevo» son <strong>arquitectura sugerida</strong>: no son funciones existentes de AVA Chat y esta demostración no afirma que AVA Voz las implemente.
      </Note>
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <nav aria-label="Componentes" className="lg:col-span-1">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {VOICE_MAPPING.map((r) => (
              <li key={r.component} className="shrink-0">
                <button type="button" aria-current={open === r.component} onClick={() => setOpen(r.component)} className={`w-full whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-sm font-medium lg:whitespace-normal ${open === r.component ? 'bg-primary-soft font-semibold' : 'hover:bg-card'}`}>{r.component}</button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-3 lg:col-span-3">
          <h2 className="text-xl font-bold">{row.component}</h2>
          <Card><div className="mb-1 flex items-center gap-2"><MaturityBadge value="implemented" /><span className="text-sm font-semibold">Hoy en AVA Chat</span></div>
            <p className="text-sm">{row.today}</p>
            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[8rem_1fr]"><dt className="text-ink-muted">Organización</dt><dd>{row.organization}</dd><dt className="text-ink-muted">Entidades</dt><dd><code>{row.entities}</code></dd></dl>
          </Card>
          <div className="grid gap-3 md:grid-cols-3">
            <Card><Badge tone="violet">Propuesta · reutilizable</Badge><p className="mt-2 text-sm">{row.reuse}</p></Card>
            <Card><Badge tone="violet">Propuesta · a adaptar</Badge><p className="mt-2 text-sm">{row.adapt}</p></Card>
            <Card><Badge tone="violet">Propuesta · nuevo</Badge><p className="mt-2 text-sm">{row.new}</p></Card>
          </div>
        </div>
      </div>
      <h2 className="mb-2 mt-8 text-lg font-bold">Conceptos propuestos para voz</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VOICE_PROPOSALS.map((p) => <Card key={p.title}><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{p.title}</h3><MaturityBadge value="proposal" /></div><p className="mt-1 text-sm">{p.text}</p></Card>)}
      </div>
      <p className="mt-6 text-sm">Recorre el <Link to="/escenarios" className="font-semibold text-primary-strong underline">escenario conceptual de una llamada</Link> o las <Link to="/documentacion/recomendaciones-voz" className="font-semibold text-primary-strong underline">recomendaciones de arquitectura</Link>.</p>
    </>
  );
}

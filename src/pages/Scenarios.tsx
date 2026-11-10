import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Btn, Card, Note, PageHeader, SimBadge } from '../components/ui';
import { MODULES } from '../data/modules';
import { isDone, nextIndex, SCENARIOS } from '../lib/scenario';

export default function Scenarios() {
  const [id, setId] = useState(SCENARIOS[0].id);
  const [pos, setPos] = useState(0);
  const sc = SCENARIOS.find((s) => s.id === id)!;
  const done = isDone(pos, sc.steps.length);
  const pick = (v: string) => { setId(v); setPos(0); };
  return (
    <>
      <PageHeader title="Escenarios simulados" subtitle="Avanza paso a paso. Nada sale de tu navegador: sin IA, sin mensajes, sin pagos." actions={<SimBadge>Simulación local</SimBadge>} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Escenarios">
        {SCENARIOS.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === id} type="button" onClick={() => pick(s.id)} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${s.id === id ? 'border-primary bg-primary-soft' : 'border-line bg-card'}`}>{s.title}</button>
        ))}
      </div>
      {sc.kind === 'voice' && <div className="mb-4"><Note tone="violet"><strong>Arquitectura sugerida, no existe en AVA Chat.</strong> {sc.intro}</Note></div>}
      {sc.kind === 'chat' && <p className="mb-4 text-sm text-ink-muted">{sc.intro}</p>}
      <Card>
        <ol className="space-y-2" aria-label="Pasos">
          {sc.steps.map((s, i) => {
            const mod = MODULES.find((m) => m.key === s.module);
            const state = i < pos ? 'done' : i === pos ? 'now' : 'todo';
            return (
              <li key={i} className={`flex flex-wrap items-start gap-2 rounded-lg border p-2.5 text-sm ${state === 'now' ? 'border-primary bg-primary-soft' : 'border-line'} ${state === 'todo' ? 'opacity-50' : ''}`}>
                <span className="font-bold">{i + 1}.</span><Badge tone={s.actor === 'IA' ? 'violet' : 'blue'}>{s.actor}</Badge>
                <span className="min-w-0 flex-1">{s.text}</span>
                {mod && state !== 'todo' && <Link to={mod.path} className="text-xs font-semibold text-primary-strong underline">{mod.name}</Link>}
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Btn onClick={() => setPos((p) => nextIndex(p, sc.steps.length))} disabled={done}>Siguiente paso</Btn>
          <Btn kind="ghost" onClick={() => setPos(0)}>Reiniciar</Btn>
          <span className="text-xs text-ink-muted" aria-live="polite">{Math.min(pos, sc.steps.length)} / {sc.steps.length}</span>
        </div>
        {done && <div className="mt-3"><Note><strong>Resultado:</strong> {sc.result}</Note></div>}
      </Card>
    </>
  );
}

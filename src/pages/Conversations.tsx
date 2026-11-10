import { useMemo, useState } from 'react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, Btn, Card, Empty, PageHeader, SimBadge, inputCls, useToast } from '../components/ui';
import { AGENTS, CHANNEL_LABEL, CONVERSATIONS, HANDLING_LABEL, type Conv, type Handling } from '../data/demo';

const TONE: Record<Handling, 'blue' | 'amber' | 'green' | 'gray'> = { ai: 'blue', pending: 'amber', human: 'green', resolved: 'gray' };

export default function Conversations() {
  const toast = useToast();
  const [items, setItems] = useState<Conv[]>(CONVERSATIONS);
  const [filter, setFilter] = useState<Handling | 'all'>('all');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<number | null>(1040);
  const [draft, setDraft] = useState('');

  const list = useMemo(
    () => items.filter((c) => (filter === 'all' || c.handling === filter) && (c.customer + c.last).toLowerCase().includes(q.toLowerCase())),
    [items, filter, q],
  );
  const sel = items.find((c) => c.id === selId) ?? null;
  const patch = (id: number, fn: (c: Conv) => Conv) => setItems((s) => s.map((c) => (c.id === id ? fn(c) : c)));

  const assign = (c: Conv, agent: string) => {
    patch(c.id, (x) => ({ ...x, agent, handling: 'human', messages: [...x.messages, { from: 'system', text: `Asignada a ${agent}`, at: 'ahora' }] }));
    toast(`Conversación #${c.id} asignada a ${agent}.`);
  };
  const resolve = (c: Conv) => {
    patch(c.id, (x) => ({ ...x, handling: 'resolved', messages: [...x.messages, { from: 'system', text: 'Conversación resuelta · encuesta enviada (simulada)', at: 'ahora' }] }));
    toast(`Conversación #${c.id} resuelta. Encuesta simulada enviada.`);
  };
  const send = (c: Conv) => {
    if (!draft.trim()) return;
    patch(c.id, (x) => ({ ...x, messages: [...x.messages, { from: 'agent', text: draft.trim(), at: 'ahora' }] }));
    setDraft('');
  };

  return (
    <>
      <PageHeader title="Conversaciones" subtitle="Bandeja con filtros, asignación, intervención humana y encuesta vinculada." actions={<SimBadge>Acciones simuladas</SimBadge>} />
      <ModuleIntro moduleKey="conversations" />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          <div className="flex gap-2">
            <input aria-label="Buscar conversación" className={inputCls} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select aria-label="Filtrar por estado" className={inputCls + ' max-w-[11rem]'} value={filter} onChange={(e) => setFilter(e.target.value as Handling | 'all')}>
              <option value="all">Todos</option>
              {(Object.keys(HANDLING_LABEL) as Handling[]).map((h) => <option key={h} value={h}>{HANDLING_LABEL[h]}</option>)}
            </select>
          </div>
          {list.length === 0 && <Empty title="Sin resultados" text="Ninguna conversación coincide con el filtro." />}
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelId(c.id)} aria-pressed={selId === c.id} className={`w-full rounded-card border p-3 text-left shadow-card ${selId === c.id ? 'border-primary bg-primary-soft' : 'border-line bg-card'}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{c.customer}</span><Badge tone={TONE[c.handling]}>{HANDLING_LABEL[c.handling]}</Badge></div>
              <p className="mt-0.5 truncate text-sm text-ink-muted">{c.last}</p>
              <p className="mt-1 text-xs text-ink-muted">#{c.id} · {CHANNEL_LABEL[c.channel]} · {c.updated}</p>
            </button>
          ))}
        </div>
        <Card className="lg:col-span-3">
          {!sel ? <Empty title="Selecciona una conversación" text="El detalle aparece aquí." /> : (
            <div className="flex h-full flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{sel.customer} · #{sel.id}</h2>
                  <p className="text-xs text-ink-muted">{CHANNEL_LABEL[sel.channel]} · {sel.assistant} · Agente: {sel.agent ?? 'sin asignar'}</p>
                </div>
                <Badge tone={TONE[sel.handling]}>{HANDLING_LABEL[sel.handling]}</Badge>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg bg-canvas p-3 text-sm" aria-label="Mensajes">
                {sel.messages.map((m, i) => (
                  <p key={i} className={m.from === 'system' ? 'text-center text-xs italic text-ink-muted' : `max-w-[85%] rounded-lg px-2.5 py-1.5 ${m.from === 'customer' ? 'bg-card' : m.from === 'ai' ? 'ml-auto bg-primary-soft' : 'ml-auto bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100'}`}>
                    <span className="mb-0.5 block text-[10px] uppercase text-ink-muted">{m.from === 'customer' ? 'Cliente' : m.from === 'ai' ? 'IA' : m.from === 'system' ? 'Sistema' : 'Agente'} · {m.at}</span>{m.text}
                  </p>
                ))}
              </div>
              {sel.survey && <div className="rounded-lg border border-line p-3 text-sm"><strong>Encuesta vinculada:</strong> {sel.survey.score}/5 — “{sel.survey.comment}”</div>}
              {sel.handling !== 'resolved' && (
                <>
                  {sel.handling === 'human' && (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(sel); }}>
                      <input aria-label="Respuesta del agente" className={inputCls} placeholder="Responder como agente (simulado)…" value={draft} onChange={(e) => setDraft(e.target.value)} />
                      <Btn type="submit">Enviar</Btn>
                    </form>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Asignar agente" className={inputCls + ' max-w-[12rem]'} value="" onChange={(e) => e.target.value && assign(sel, e.target.value)}>
                      <option value="">Asignar a…</option>
                      {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <Btn kind="ghost" onClick={() => resolve(sel)}>Resolver</Btn>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

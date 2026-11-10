import { Head, Link, router } from '@inertiajs/react';
import { PlayCircle } from 'lucide-react';
import { useState } from 'react';
import Alert from '@/Components/Alert';
import Badge from '@/Components/Badge';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AppLayout from '@/Layouts/AppLayout';
import { isDone, nextIndex, SCENARIOS } from '../scenario';

/** Where each step of a scenario is lived in the app (real screens of the showcase). */
const WHERE = { chatbots: ['chatbots.index', 'Chatbots'], assistants: ['chatbots.index', 'Asistentes'], customers: ['customers.index', 'Clientes'], bookings: ['bookings.index', 'Agenda'], conversations: ['conversations.index', 'Conversaciones'], reports: ['reports.index', 'Reportes'], integrations: ['integrations.index', 'Integraciones'] };

export default function Scenarios({ scenario }) {
    const sc = SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0];
    const [pos, setPos] = useState(0);
    const done = isDone(pos, sc.steps.length);
    const pick = (id) => { setPos(0); router.get(route('demo.scenarios'), { s: id }, { preserveState: true, replace: true }); };

    return (
        <>
            <Head title="Escenarios simulados" />
            <PageHeader title={<span className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-accent-blue"><PlayCircle className="size-5" aria-hidden="true" /></span>Escenarios simulados</span>} description="Avanza paso a paso. Nada sale de tu navegador: sin IA, sin mensajes, sin pagos." />
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Escenarios">
                {SCENARIOS.map((s) => <button key={s.id} role="tab" aria-selected={s.id === sc.id} type="button" onClick={() => pick(s.id)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${s.id === sc.id ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-card text-ink'}`}>{s.title}</button>)}
            </div>
            {sc.kind === 'voice' ? <Alert tone="info"><strong>Arquitectura sugerida, no existe en AVA Chat.</strong> {sc.intro} Todo el escenario es conceptual y simulado.</Alert> : <p className="text-sm text-ink-muted">{sc.intro}</p>}
            <Card className="space-y-4 p-5">
                <ol className="space-y-2" aria-label="Pasos">
                    {sc.steps.map((s, i) => {
                        const state = i < pos ? 'done' : i === pos ? 'now' : 'todo';
                        const w = WHERE[s.module];
                        return (
                            <li key={i} className={`flex flex-wrap items-start gap-2 rounded-lg border p-3 text-sm ${state === 'now' ? 'border-primary bg-primary-soft' : 'border-line'} ${state === 'todo' ? 'opacity-50' : ''}`}>
                                <span className="font-bold text-ink">{i + 1}.</span><Badge tone={s.actor === 'IA' ? 'violet' : 'blue'}>{s.actor}</Badge>
                                <span className="min-w-0 flex-1 text-ink">{s.text}</span>
                                {w && state !== 'todo' && sc.kind === 'chat' && <Link href={route(w[0])} className="text-xs font-semibold text-primary underline">{w[1]}</Link>}
                            </li>
                        );
                    })}
                </ol>
                <div className="flex flex-wrap items-center gap-2">
                    <PrimaryButton type="button" onClick={() => setPos((p) => nextIndex(p, sc.steps.length))} disabled={done}>Siguiente paso</PrimaryButton>
                    <SecondaryButton onClick={() => setPos(0)}>Reiniciar</SecondaryButton>
                    <span className="text-xs text-ink-muted" aria-live="polite">{Math.min(pos, sc.steps.length)} / {sc.steps.length}</span>
                </div>
                {done && <Alert tone="success"><strong>Resultado:</strong> {sc.result}</Alert>}
            </Card>
        </>
    );
}

Scenarios.layout = (page) => <AppLayout>{page}</AppLayout>;

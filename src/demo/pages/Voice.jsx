import { Head, Link } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import { useState } from 'react';
import Alert from '@/Components/Alert';
import Badge from '@/Components/Badge';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';
import AppLayout from '@/Layouts/AppLayout';
import { VOICE_MAPPING, VOICE_PROPOSALS } from '../voice';

/** AVA Chat → AVA Voz. «Hoy en AVA Chat» is verified code; reuse / adapt / new are SUGGESTED architecture, never existing functions. */
export default function Voice() {
    const [open, setOpen] = useState(VOICE_MAPPING[0].component);
    const row = VOICE_MAPPING.find((r) => r.component === open);

    return (
        <>
            <Head title="AVA Chat → AVA Voz" />
            <PageHeader title={<span className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-accent-blue"><Phone className="size-5" aria-hidden="true" /></span>AVA Chat → AVA Voz</span>} description="Qué conceptos de AVA Chat sirven de referencia para AVA Voz, qué se adaptaría y qué sería nuevo." />

            <Alert tone="info"><strong>Reales vs. propuestos.</strong> La tarjeta «Hoy en AVA Chat» describe código revisado del repositorio. Las tarjetas violeta («Propuesta») son <strong>arquitectura sugerida</strong>: no son funciones existentes de AVA Chat y esta demostración no afirma que AVA Voz las implemente.</Alert>

            <div className="grid gap-6 lg:grid-cols-4">
                <nav aria-label="Componentes" className="min-w-0 lg:col-span-1">
                    <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                        {VOICE_MAPPING.map((r) => (
                            <li key={r.component} className="shrink-0">
                                <button type="button" aria-current={open === r.component ? 'true' : undefined} onClick={() => setOpen(r.component)} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap lg:whitespace-normal ${open === r.component ? 'bg-primary-soft font-semibold text-primary' : 'text-ink hover:bg-card'}`}>{r.component}</button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="min-w-0 space-y-4 lg:col-span-3">
                    <h2 className="text-xl font-bold text-ink">{row.component}</h2>
                    <Card className="p-5">
                        <div className="mb-2 flex items-center gap-2"><Badge tone="green">Implementado en AVA</Badge><span className="text-sm font-semibold text-ink">Hoy en AVA Chat</span></div>
                        <p className="text-sm text-ink">{row.today}</p>
                        <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
                            <dt className="text-ink-muted">Organización</dt><dd className="text-ink">{row.organization}</dd>
                            <dt className="text-ink-muted">Entidades</dt><dd className="font-mono text-[13px] text-ink">{row.entities}</dd>
                        </dl>
                    </Card>
                    <div className="grid gap-4 md:grid-cols-3">
                        {[['Reutilizable', row.reuse], ['A adaptar', row.adapt], ['Nuevo', row.new]].map(([label, text]) => (
                            <Card key={label} className="border-accent-violet/40 p-5"><Badge tone="violet">Propuesta · {label}</Badge><p className="mt-3 text-sm text-ink">{text}</p></Card>
                        ))}
                    </div>
                </div>
            </div>

            <section aria-labelledby="voz-proposals" className="space-y-3">
                <h2 id="voz-proposals" className="text-lg font-bold text-ink">Conceptos propuestos para voz</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {VOICE_PROPOSALS.map((p) => (
                        <Card key={p.title} className="p-5"><div className="flex items-start justify-between gap-2"><h3 className="text-base font-bold text-ink">{p.title}</h3><Badge tone="violet">Propuesta</Badge></div><p className="mt-2 text-sm text-ink-muted">{p.text}</p></Card>
                    ))}
                </div>
            </section>

            <p className="text-sm text-ink-muted">Recorre el <Link href={route('demo.scenarios', { s: 'voz-llamada' })} className="font-semibold text-primary underline">escenario conceptual de una llamada</Link> o las <Link href={route('demo.docs', { section: 'recomendaciones-voz' })} className="font-semibold text-primary underline">recomendaciones de arquitectura</Link>.</p>
        </>
    );
}

Voice.layout = (page) => <AppLayout>{page}</AppLayout>;

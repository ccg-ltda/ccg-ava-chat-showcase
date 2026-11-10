import { Head, Link } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import Alert from '@/Components/Alert';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';
import AppLayout from '@/Layouts/AppLayout';
import { DOCS } from '../docs';

function Block({ b }) {
    switch (b.t) {
        case 'p': return <p className="text-sm leading-relaxed text-ink">{b.text}</p>;
        case 'ul': return <ul className="list-disc space-y-1 pl-5 text-sm text-ink">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>;
        case 'note': return <Alert tone={b.tone === 'amber' ? 'warning' : 'info'}>{b.text}</Alert>;
        case 'flow': return (
            <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Diagrama de flujo">
                {b.steps.map((s, i) => <li key={s} className="flex items-center gap-2"><span className="rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1 font-medium text-primary">{s}</span>{i < b.steps.length - 1 && <span aria-hidden="true" className="text-ink-muted">›</span>}</li>)}
            </ol>
        );
        case 'table': return (
            <div className="overflow-x-auto rounded-card border border-line">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-canvas/60 text-[11px] font-semibold tracking-wider text-ink-muted uppercase"><tr>{b.head.map((h) => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-line">{b.rows.map((r) => <tr key={r.join('|')}>{r.map((c, i) => <td key={i} className="px-4 py-3 align-top text-ink">{c}</td>)}</tr>)}</tbody>
                </table>
            </div>
        );
        default: return null;
    }
}

export default function Docs({ section }) {
    const current = DOCS.find((d) => d.id === section) ?? DOCS[0];
    return (
        <>
            <Head title="Documentación" />
            <PageHeader title={<span className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-accent-blue"><BookOpen className="size-5" aria-hidden="true" /></span>Documentación</span>} description="Guía navegable de AVA Chat. Cada afirmación sobre el sistema actual proviene del código revisado." />
            <div className="grid gap-6 lg:grid-cols-4">
                <nav aria-label="Secciones de la documentación" className="min-w-0 lg:col-span-1">
                    <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                        {DOCS.map((d) => (
                            <li key={d.id} className="shrink-0"><Link href={route('demo.docs', { section: d.id })} aria-current={d.id === current.id ? 'page' : undefined} className={`block rounded-lg px-3 py-2 text-sm whitespace-nowrap lg:whitespace-normal ${d.id === current.id ? 'bg-primary-soft font-semibold text-primary' : 'font-medium text-ink hover:bg-card'}`}>{d.title}</Link></li>
                        ))}
                    </ul>
                </nav>
                <Card as="article" className="min-w-0 space-y-4 p-6 lg:col-span-3">
                    <h2 className="text-xl font-bold text-ink">{current.title}</h2>
                    {current.blocks.map((b, i) => <Block key={i} b={b} />)}
                </Card>
            </div>
        </>
    );
}

Docs.layout = (page) => <AppLayout>{page}</AppLayout>;

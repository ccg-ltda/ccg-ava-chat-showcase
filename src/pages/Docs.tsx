import { Link, useParams } from 'react-router-dom';
import { Note, PageHeader, Table, Td } from '../components/ui';
import { DOCS, type Block } from '../data/docs';

function Render({ b }: { b: Block }) {
  switch (b.t) {
    case 'p': return <p className="text-sm leading-relaxed">{b.text}</p>;
    case 'ul': return <ul className="list-disc space-y-1 pl-5 text-sm">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>;
    case 'note': return <Note tone={b.tone}>{b.text}</Note>;
    case 'flow': return (
      <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Diagrama de flujo">
        {b.steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2"><span className="rounded-lg border border-primary bg-primary-soft px-2.5 py-1 font-medium">{s}</span>{i < b.steps.length - 1 && <span aria-hidden="true">›</span>}</li>
        ))}
      </ol>
    );
    case 'table': return <Table head={b.head}>{b.rows.map((r) => <tr key={r.join('|')}>{r.map((c, i) => <Td key={i}>{c}</Td>)}</tr>)}</Table>;
  }
}

export default function Docs() {
  const { section } = useParams();
  const current = DOCS.find((d) => d.id === section) ?? DOCS[0];
  return (
    <>
      <PageHeader title="Documentación" subtitle="Guía navegable de AVA Chat. Cada afirmación proviene del código revisado." />
      <div className="grid gap-6 lg:grid-cols-4">
        <nav aria-label="Secciones de la documentación" className="lg:col-span-1">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {DOCS.map((d) => (
              <li key={d.id} className="shrink-0">
                <Link to={`/documentacion/${d.id}`} aria-current={d.id === current.id ? 'page' : undefined} className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm lg:whitespace-normal ${d.id === current.id ? 'bg-primary-soft font-semibold' : 'hover:bg-card'}`}>{d.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="space-y-4 lg:col-span-3">
          <h2 className="text-xl font-bold">{current.title}</h2>
          {current.blocks.map((b, i) => <Render key={i} b={b} />)}
        </article>
      </div>
    </>
  );
}

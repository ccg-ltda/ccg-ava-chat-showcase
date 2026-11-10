import { useState } from 'react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, Card, PageHeader, SimBadge, Table, Td, inputCls } from '../components/ui';
import { APPOINTMENTS, APPT_LABEL, CONVERSATIONS, CUSTOMERS } from '../data/demo';

export default function Customers() {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(1);
  const rows = CUSTOMERS.filter((c) => (c.name + c.email + c.tags.join(' ')).toLowerCase().includes(q.toLowerCase()));
  const sel = CUSTOMERS.find((c) => c.id === selId) ?? CUSTOMERS[0];
  const convs = CONVERSATIONS.filter((c) => c.customer === sel.name);
  const appts = APPOINTMENTS.filter((a) => a.customer === sel.name);
  return (
    <>
      <PageHeader title="Clientes" subtitle="Ficha por Workspace con su historial." actions={<SimBadge>Datos ficticios</SimBadge>} />
      <ModuleIntro moduleKey="customers" />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <input aria-label="Buscar cliente" className={inputCls} placeholder="Buscar por nombre, correo o etiqueta…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Table head={['Cliente', 'Origen', 'Etiquetas', 'Consentimiento']}>
            {rows.map((c) => (
              <tr key={c.id} className={selId === c.id ? 'bg-primary-soft' : ''}>
                <Td><button type="button" className="font-semibold text-primary-strong underline-offset-2 hover:underline" onClick={() => setSelId(c.id)}>{c.name}</button><div className="text-xs text-ink-muted">{c.email}</div></Td>
                <Td>{c.origin}</Td>
                <Td><span className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</span></Td>
                <Td>{c.consent ? <Badge tone="green">Sí</Badge> : <Badge tone="red">No</Badge>}</Td>
              </tr>
            ))}
          </Table>
          {rows.length === 0 && <p className="text-sm text-ink-muted">Sin resultados.</p>}
        </div>
        <Card className="space-y-3 lg:col-span-2">
          <h2 className="font-semibold">{sel.name}</h2>
          <p className="text-sm text-ink-muted">{sel.phone} · {sel.email}</p>
          <p className="text-sm">Conversaciones: <strong>{sel.convs}</strong> · Citas: <strong>{sel.appts}</strong></p>
          <div><h3 className="text-sm font-semibold">Conversaciones recientes</h3>{convs.length ? <ul className="mt-1 text-sm">{convs.map((c) => <li key={c.id}>#{c.id} · {c.last}</li>)}</ul> : <p className="text-sm text-ink-muted">Sin conversaciones en la muestra.</p>}</div>
          <div><h3 className="text-sm font-semibold">Citas</h3>{appts.length ? <ul className="mt-1 text-sm">{appts.map((a) => <li key={a.id}>{a.service} · {a.day} nov {a.time} · {APPT_LABEL[a.status]}</li>)}</ul> : <p className="text-sm text-ink-muted">Sin citas en la muestra.</p>}</div>
        </Card>
      </div>
    </>
  );
}

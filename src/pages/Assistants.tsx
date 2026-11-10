import { useState } from 'react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, Card, Note, PageHeader, SimBadge } from '../components/ui';
import { ASSISTANTS, CHANNEL_LABEL } from '../data/demo';

const FLOW = [
  'Llega un mensaje por un canal',
  'AVA identifica el chatbot y valida plan y módulo',
  'AVA llama al flujo n8n asignado (contrato firmado)',
  'n8n/IA decide y usa las herramientas de AVA con el token del asistente',
  'La respuesta vuelve por el canal; o se traspasa a un humano',
];

export default function Assistants() {
  const [sel, setSel] = useState(0);
  const a = ASSISTANTS[sel];
  return (
    <>
      <PageHeader title="Asistentes IA" subtitle="Configuración conceptual de un asistente. Los datos son ficticios." actions={<SimBadge>Configuración simulada</SimBadge>} />
      <ModuleIntro moduleKey="assistants" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          {ASSISTANTS.map((x, i) => (
            <button key={x.name} type="button" onClick={() => setSel(i)} aria-pressed={sel === i} className={`w-full rounded-card border p-3 text-left shadow-card ${sel === i ? 'border-primary bg-primary-soft' : 'border-line bg-card'}`}>
              <p className="font-semibold">{x.name}</p>
              <p className="mt-1 flex flex-wrap gap-1">{x.channels.map((c) => <Badge key={c} tone="blue">{CHANNEL_LABEL[c]}</Badge>)}</p>
            </button>
          ))}
        </div>
        <Card className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="font-semibold">{a.name}</h2>
            <p className="text-xs text-ink-muted">Flujo asignado: {a.workflow}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Instrucciones</h3>
            <p className="mt-1 rounded-lg bg-canvas p-3 text-sm">{a.instructions}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Herramientas que AVA expone al asistente</h3>
            <ul className="mt-1 flex flex-wrap gap-1.5">{a.tools.map((t) => <li key={t}><Badge>{t}</Badge></li>)}</ul>
            <p className="mt-1 text-xs text-ink-muted">Reflejan las rutas <code>/api/agent/*</code> (reservas, pedidos, recordatorios, conocimiento, traspaso).</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Flujo de atención</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{FLOW.map((f) => <li key={f}>{f}</li>)}</ol>
          </div>
          <Note>En AVA, el modelo de IA y la lógica conversacional viven en <strong>n8n</strong>. AVA es el plano de control: canales, conversaciones, permisos, herramientas, auditoría.</Note>
        </Card>
      </div>
    </>
  );
}

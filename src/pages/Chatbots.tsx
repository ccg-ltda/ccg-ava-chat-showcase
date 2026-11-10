import { useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, Card, Note, PageHeader, SimBadge } from '../components/ui';

const CHANNELS = [
  { k: 'Web', d: 'Widget de chat para insertar en el sitio del cliente.', s: 'Disponible', tone: 'green' as const },
  { k: 'WhatsApp', d: 'Número de WhatsApp Business del Workspace.', s: 'Disponible (sin validación real con Meta)', tone: 'amber' as const },
  { k: 'Instagram', d: 'Mensajes directos de la cuenta profesional (OAuth).', s: 'Requiere app de Meta de la plataforma', tone: 'amber' as const },
  { k: 'Messenger', d: 'Mensajes de la página de Facebook (OAuth).', s: 'Requiere app de Meta de la plataforma', tone: 'amber' as const },
];

/** Local scripted replies. No network, no AI model, no tokens. */
function reply(text: string): string {
  const t = text.toLowerCase();
  if (/cita|agendar|turno/.test(t)) return 'Puedo ayudarte con una cita. Tengo el jueves a las 9:00 o 15:30. (Respuesta simulada)';
  if (/precio|cuesta|valor/.test(t)) return 'La limpieza dental cuesta $ 90.000. (Dato ficticio)';
  if (/humano|persona|asesor/.test(t)) return 'Te paso con un asesor. Estado: pendiente de agente. (Simulado)';
  return 'Soy un asistente de demostración con respuestas guionadas. Prueba escribir "cita", "precio" o "humano".';
}

export default function Chatbots() {
  const [pos, setPos] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [color, setColor] = useState('#1d4ed8');
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [log, setLog] = useState<{ me: boolean; t: string }[]>([{ me: false, t: '¡Hola! ¿En qué te ayudo?' }]);
  const end = useRef<HTMLDivElement>(null);

  const send = () => {
    const v = text.trim();
    if (!v) return;
    setLog((l) => [...l, { me: true, t: v }, { me: false, t: reply(v) }]);
    setText('');
    setTimeout(() => end.current?.scrollIntoView?.({ block: 'end' }), 0);
  };

  return (
    <>
      <PageHeader title="Chatbots" subtitle="Canales, widget web y ejemplo interactivo." actions={<SimBadge>Widget de demostración</SimBadge>} />
      <ModuleIntro moduleKey="chatbots" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((c) => (
          <Card key={c.k}><h2 className="font-semibold">{c.k}</h2><p className="mt-1 text-xs text-ink-muted">{c.d}</p><p className="mt-2"><Badge tone={c.tone}>{c.s}</Badge></p></Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Apariencia del widget</h2>
          <p className="mt-1 text-xs text-ink-muted">AVA permite posición, color, forma, tamaño y comportamiento de apertura.</p>
          <label className="mt-3 block text-sm font-medium">Posición
            <select className="mt-1 w-full rounded-lg border border-field bg-card px-2 py-1.5" value={pos} onChange={(e) => setPos(e.target.value as typeof pos)}>
              <option value="bottom-right">Inferior derecha</option><option value="bottom-left">Inferior izquierda</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium">Color
            <input type="color" className="mt-1 h-9 w-full rounded-lg border border-field" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <div className="mt-3"><Note>Código de inserción: en AVA se genera por chatbot. Aquí no se muestra ningún identificador real.</Note></div>
        </Card>
        <div className="relative min-h-[26rem] overflow-hidden rounded-card border border-line bg-card shadow-card lg:col-span-2" aria-label="Sitio web de ejemplo con el widget">
          <div className="p-4 text-sm text-ink-muted"><p className="font-semibold text-ink">Sitio web del cliente (ejemplo)</p><p>Contenido de la página…</p></div>
          <div className={`absolute bottom-3 flex flex-col items-end gap-2 ${pos === 'bottom-right' ? 'right-3' : 'left-3 items-start'}`}>
            {open && (
              <div className="w-72 max-w-[calc(100vw-4rem)] rounded-xl border border-line bg-card shadow-card">
                <div className="flex items-center justify-between rounded-t-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: color }}>Asistente Clínica Demo<button type="button" aria-label="Cerrar chat" onClick={() => setOpen(false)}><X className="size-4" /></button></div>
                <div className="h-48 space-y-2 overflow-y-auto p-3 text-sm">
                  {log.map((m, i) => <p key={i} className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${m.me ? 'ml-auto bg-primary-soft' : 'bg-canvas'}`}>{m.t}</p>)}
                  <div ref={end} />
                </div>
                <form className="flex gap-1 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <input aria-label="Mensaje" className="min-w-0 flex-1 rounded-lg border border-field bg-card px-2 py-1 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe…" />
                  <button type="submit" aria-label="Enviar" className="rounded-lg px-2 text-white" style={{ background: color }}><Send className="size-4" /></button>
                </form>
              </div>
            )}
            <button type="button" aria-label={open ? 'Ocultar widget' : 'Abrir widget'} onClick={() => setOpen((o) => !o)} className="grid size-12 place-items-center rounded-full text-white shadow-card" style={{ background: color }}><MessageCircle className="size-6" /></button>
          </div>
        </div>
      </div>
    </>
  );
}

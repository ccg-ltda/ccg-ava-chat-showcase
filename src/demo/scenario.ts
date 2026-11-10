/** Pure engine of the simulated scenarios: no network, no timers, no AI. */
export interface Step {
  actor: 'Cliente' | 'Chatbot' | 'IA' | 'AVA' | 'Agente' | 'Sistema';
  text: string;
  /** Which AVA module this step belongs to (key in data/modules.ts). */
  module: string;
}
export interface Scenario { id: string; title: string; kind: 'chat' | 'voice'; intro: string; steps: Step[]; result: string }

export const SCENARIOS: Scenario[] = [
  {
    id: 'chat-cita', title: 'AVA Chat: del mensaje a la encuesta', kind: 'chat',
    intro: 'Recorre una atención completa por WhatsApp con datos ficticios.',
    steps: [
      { actor: 'Cliente', text: 'Valeria escribe: «Quisiera una cita de limpieza dental».', module: 'chatbots' },
      { actor: 'Chatbot', text: 'El canal entrega el mensaje; AVA valida el plan del Workspace y llama al flujo asignado.', module: 'assistants' },
      { actor: 'IA', text: 'La IA (en n8n) identifica la intención: reservar cita.', module: 'assistants' },
      { actor: 'AVA', text: 'Se registra la solicitud y se vincula al cliente (ficha de Valeria).', module: 'customers' },
      { actor: 'AVA', text: 'El asistente consulta disponibilidad y crea la cita: estado «Solicitada».', module: 'bookings' },
      { actor: 'Cliente', text: 'Pregunta por un descuento que el asistente no puede decidir.', module: 'conversations' },
      { actor: 'Agente', text: 'Traspaso a humano: la conversación pasa a «Pendiente de agente» y Laura la toma.', module: 'conversations' },
      { actor: 'Agente', text: 'Laura confirma la cita y resuelve la conversación.', module: 'conversations' },
      { actor: 'Sistema', text: 'Se envía la encuesta de satisfacción (simulada) y se programa un recordatorio.', module: 'reports' },
      { actor: 'Sistema', text: 'La respuesta 5/5 aparece en Reportes.', module: 'reports' },
    ],
    result: 'Conversación resuelta · cita confirmada · encuesta 5/5 reflejada en Reportes.',
  },
  {
    id: 'voz-llamada', title: 'AVA Voz (propuesta): de la llamada a las métricas', kind: 'voice',
    intro: 'Flujo CONCEPTUAL: ilustra cómo una llamada podría reutilizar piezas de AVA Chat. No existe en AVA Chat.',
    steps: [
      { actor: 'Cliente', text: 'Llamada entrante: una persona marca el número de la clínica (sesión de voz nueva).', module: 'integrations' },
      { actor: 'Sistema', text: 'El proveedor de telefonía notifica la llamada; se identifica el Workspace por el número marcado.', module: 'integrations' },
      { actor: 'AVA', text: 'Identificación del cliente: se busca o crea la ficha por número de teléfono (la ficha de cliente ya existe en AVA Chat).', module: 'customers' },
      { actor: 'IA', text: 'Agente IA de voz: transcribe lo que dice la persona y responde con voz sintetizada.', module: 'assistants' },
      { actor: 'AVA', text: 'Consulta de información: el agente usa las herramientas de AVA (servicios, precios, disponibilidad) y responde con datos reales del Workspace.', module: 'bookings' },
      { actor: 'AVA', text: 'Creación de cita: con las mismas herramientas de agenda queda una cita «Solicitada».', module: 'bookings' },
      { actor: 'Agente', text: 'Transferencia humana: ante una queja, la llamada pasa a un operador con la transcripción como contexto.', module: 'conversations' },
      { actor: 'Sistema', text: 'Registro: se guarda la transcripción, la duración y los eventos en el historial del cliente.', module: 'conversations' },
      { actor: 'Sistema', text: 'Métricas: duración, abandono, contención de la IA y satisfacción alimentan Reportes.', module: 'reports' },
    ],
    result: 'Propuesta: una llamada queda como sesión con transcripción, vinculada a cliente, cita y reporte.',
  },
];

export function nextIndex(current: number, total: number): number {
  return Math.min(current + 1, total);
}
export function isDone(current: number, total: number): boolean {
  return current >= total;
}

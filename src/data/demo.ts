/** Fictional data. No real people, companies, phone numbers or messages. */
export type Handling = 'ai' | 'pending' | 'human' | 'resolved';
export const HANDLING_LABEL: Record<Handling, string> = {
  ai: 'IA atendiendo',
  pending: 'Pendiente de agente',
  human: 'En atención',
  resolved: 'Resuelta',
};
export type Channel = 'web' | 'whatsapp' | 'instagram' | 'messenger';
export const CHANNEL_LABEL: Record<Channel, string> = { web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger' };

export interface Msg { from: 'customer' | 'ai' | 'agent' | 'system'; text: string; at: string }
export interface Conv {
  id: number; customer: string; channel: Channel; handling: Handling; agent: string | null; assistant: string;
  last: string; updated: string; survey?: { score: number; comment: string } | null; messages: Msg[];
}

export const AGENTS = ['Laura Méndez', 'Andrés Rojas', 'Camila Ortiz'];

export const CONVERSATIONS: Conv[] = [
  { id: 1041, customer: 'Valeria Núñez', channel: 'whatsapp', handling: 'ai', agent: null, assistant: 'Asistente Clínica Demo', last: 'Quisiera una cita de limpieza dental', updated: 'hace 2 min', messages: [
    { from: 'customer', text: 'Hola, quisiera una cita de limpieza dental', at: '10:02' },
    { from: 'ai', text: 'Claro, Valeria. Tengo disponibilidad el jueves a las 9:00 o 15:30 en Sede Centro. ¿Cuál prefieres?', at: '10:02' },
    { from: 'customer', text: 'El jueves a las 9', at: '10:03' } ] },
  { id: 1040, customer: 'Mateo Salcedo', channel: 'web', handling: 'pending', agent: null, assistant: 'Asistente Clínica Demo', last: 'Necesito hablar con una persona', updated: 'hace 6 min', messages: [
    { from: 'customer', text: 'Tengo un problema con mi factura', at: '09:55' },
    { from: 'ai', text: 'Lamento el inconveniente. Para temas de facturación te paso con un asesor.', at: '09:55' },
    { from: 'system', text: 'Traspaso solicitado: pendiente de agente', at: '09:56' } ] },
  { id: 1039, customer: 'Sofía Bermúdez', channel: 'instagram', handling: 'human', agent: 'Laura Méndez', assistant: 'Asistente Tienda Demo', last: '¿Tienen la talla M en azul?', updated: 'hace 11 min', messages: [
    { from: 'customer', text: '¿Tienen la talla M en azul?', at: '09:41' },
    { from: 'agent', text: 'Hola Sofía, soy Laura. Reviso el inventario de la sede Norte y te confirmo.', at: '09:44' } ] },
  { id: 1038, customer: 'Daniel Ferrer', channel: 'messenger', handling: 'resolved', agent: 'Andrés Rojas', assistant: 'Asistente Tienda Demo', last: 'Gracias, todo resuelto', updated: 'hace 1 h', survey: { score: 5, comment: 'Atención rápida y clara.' }, messages: [
    { from: 'customer', text: '¿Cuál es el estado de mi pedido PD-0087?', at: '08:30' },
    { from: 'ai', text: 'Tu pedido PD-0087 está Despachado. Llega hoy antes de las 6 p. m.', at: '08:30' },
    { from: 'customer', text: 'Gracias, todo resuelto', at: '08:32' },
    { from: 'system', text: 'Conversación resuelta · encuesta enviada', at: '08:33' } ] },
  { id: 1037, customer: 'Isabela Cortés', channel: 'whatsapp', handling: 'resolved', agent: null, assistant: 'Asistente Clínica Demo', last: 'Cita confirmada para el martes', updated: 'hace 3 h', survey: { score: 4, comment: 'Todo bien, el horario tardó en confirmarse.' }, messages: [
    { from: 'customer', text: 'Confirmo mi cita del martes', at: '07:10' },
    { from: 'ai', text: 'Listo, tu cita queda confirmada. Te recordaremos 24 horas antes.', at: '07:10' } ] },
];

export const CUSTOMERS = [
  { id: 1, name: 'Valeria Núñez', phone: '+57 300 000 0001', email: 'valeria@ejemplo.test', origin: 'whatsapp', tags: ['Limpieza', 'Recurrente'], consent: true, convs: 3, appts: 4, last: '2026-11-10' },
  { id: 2, name: 'Mateo Salcedo', phone: '+57 300 000 0002', email: 'mateo@ejemplo.test', origin: 'web', tags: ['Facturación'], consent: true, convs: 1, appts: 0, last: '2026-11-10' },
  { id: 3, name: 'Sofía Bermúdez', phone: '+57 300 000 0003', email: 'sofia@ejemplo.test', origin: 'instagram', tags: ['Tienda'], consent: false, convs: 2, appts: 0, last: '2026-11-10' },
  { id: 4, name: 'Daniel Ferrer', phone: '+57 300 000 0004', email: 'daniel@ejemplo.test', origin: 'messenger', tags: ['Pedidos'], consent: true, convs: 5, appts: 1, last: '2026-11-09' },
  { id: 5, name: 'Isabela Cortés', phone: '+57 300 000 0005', email: 'isabela@ejemplo.test', origin: 'whatsapp', tags: ['Ortodoncia'], consent: true, convs: 2, appts: 6, last: '2026-11-08' },
];

export type ApptStatus = 'requested' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'failed';
export const APPT_LABEL: Record<ApptStatus, string> = { requested: 'Solicitada', confirmed: 'Confirmada', completed: 'Completada', no_show: 'No asistió', cancelled: 'Cancelada', failed: 'Fallida' };
export interface Appt { id: number; customer: string; service: string; professional: string; location: string; day: number; time: string; status: ApptStatus; origin: string }
export const APPOINTMENTS: Appt[] = [
  { id: 1, customer: 'Isabela Cortés', service: 'Control de ortodoncia', professional: 'Dra. Paula Vega', location: 'Sede Centro', day: 10, time: '08:30', status: 'completed', origin: 'whatsapp' },
  { id: 2, customer: 'Valeria Núñez', service: 'Limpieza dental', professional: 'Dr. Iván Castaño', location: 'Sede Centro', day: 12, time: '09:00', status: 'requested', origin: 'whatsapp' },
  { id: 3, customer: 'Daniel Ferrer', service: 'Valoración general', professional: 'Dra. Paula Vega', location: 'Sede Norte', day: 12, time: '11:00', status: 'confirmed', origin: 'web' },
  { id: 4, customer: 'Sofía Bermúdez', service: 'Blanqueamiento', professional: 'Dr. Iván Castaño', location: 'Sede Norte', day: 13, time: '15:30', status: 'confirmed', origin: 'web' },
  { id: 5, customer: 'Mateo Salcedo', service: 'Limpieza dental', professional: 'Dra. Paula Vega', location: 'Sede Centro', day: 14, time: '10:00', status: 'cancelled', origin: 'web' },
];
export const SERVICES = [
  { name: 'Limpieza dental', minutes: 45, price: 90000, locations: 'Centro, Norte' },
  { name: 'Control de ortodoncia', minutes: 30, price: 70000, locations: 'Centro' },
  { name: 'Valoración general', minutes: 30, price: 50000, locations: 'Centro, Norte' },
  { name: 'Blanqueamiento', minutes: 60, price: 280000, locations: 'Norte' },
];
export const PROFESSIONALS = [
  { name: 'Dra. Paula Vega', services: 'Ortodoncia, Valoración', schedule: 'Lun–Vie 08:00–16:00' },
  { name: 'Dr. Iván Castaño', services: 'Limpieza, Blanqueamiento', schedule: 'Mar–Sáb 09:00–17:00' },
];

export const PRODUCTS = [
  { sku: 'CAM-001', name: 'Camiseta básica', category: 'Ropa', price: 45000, stock: { Centro: 24, Norte: 8 } },
  { sku: 'CAM-002', name: 'Camiseta estampada', category: 'Ropa', price: 59000, stock: { Centro: 0, Norte: 12 } },
  { sku: 'GOR-010', name: 'Gorra clásica', category: 'Accesorios', price: 35000, stock: { Centro: 15, Norte: 3 } },
  { sku: 'MOC-020', name: 'Mochila urbana', category: 'Accesorios', price: 120000, stock: { Centro: 6, Norte: 0 } },
];
export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
export const ORDER_LABEL: Record<OrderStatus, string> = { received: 'Recibido', confirmed: 'Confirmado', preparing: 'En preparación', ready: 'Listo', dispatched: 'Despachado', delivered: 'Entregado', cancelled: 'Cancelado' };
/** Same transitions as config/orders.php in AVA Platform. */
export const ORDER_NEXT: Record<OrderStatus, OrderStatus[]> = {
  received: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'delivered', 'cancelled'], dispatched: ['delivered', 'cancelled'], delivered: [], cancelled: [],
};
export const ORDERS: { number: string; customer: string; total: number; method: string; status: OrderStatus; lines: string[] }[] = [
  { number: 'PD-0089', customer: 'Sofía Bermúdez', total: 94000, method: 'Recogida', status: 'received', lines: ['1 × Camiseta estampada', '1 × Gorra clásica'] },
  { number: 'PD-0088', customer: 'Mateo Salcedo', total: 120000, method: 'Entrega a domicilio', status: 'preparing', lines: ['1 × Mochila urbana'] },
  { number: 'PD-0087', customer: 'Daniel Ferrer', total: 90000, method: 'Entrega a domicilio', status: 'dispatched', lines: ['2 × Camiseta básica'] },
];

export const ASSISTANTS = [
  { name: 'Asistente Clínica Demo', channels: ['web', 'whatsapp'] as Channel[], workflow: 'flujo-clinica (catálogo de flujos n8n)', active: true,
    instructions: 'Eres el asistente de una clínica dental. Saluda, identifica la intención (cita, información, facturación), consulta disponibilidad con las herramientas y transfiere a un humano ante dudas de facturación.',
    tools: ['Consultar servicios', 'Consultar disponibilidad', 'Crear cita', 'Confirmar / reprogramar / cancelar cita', 'Crear recordatorio', 'Buscar en la base de conocimiento', 'Traspasar a humano'] },
  { name: 'Asistente Tienda Demo', channels: ['instagram', 'messenger', 'web'] as Channel[], workflow: 'flujo-tienda (catálogo de flujos n8n)', active: true,
    instructions: 'Eres el asistente de una tienda. Muestra productos del catálogo, registra pedidos y consulta el estado de los pedidos de esta conversación. Nunca cambias el estado de un pedido.',
    tools: ['Opciones de pedido', 'Listar productos', 'Crear pedido', 'Consultar pedidos de la conversación', 'Traspasar a humano'] },
];

export const SURVEY_RESULTS = [
  { label: '5 — Excelente', n: 38 }, { label: '4 — Buena', n: 21 }, { label: '3 — Regular', n: 7 }, { label: '2 — Mala', n: 3 }, { label: '1 — Muy mala', n: 1 },
];
export const WEEK = [
  { d: 'Lun', conv: 42, ai: 33 }, { d: 'Mar', conv: 51, ai: 40 }, { d: 'Mié', conv: 47, ai: 36 }, { d: 'Jue', conv: 58, ai: 47 }, { d: 'Vie', conv: 63, ai: 49 }, { d: 'Sáb', conv: 29, ai: 25 }, { d: 'Dom', conv: 14, ai: 13 },
];
export const ACTIVITY = [
  'Conversación #1041 iniciada por WhatsApp (ficticia)', 'Cita #2 solicitada por el asistente', 'Traspaso a humano en #1040',
  'Pedido PD-0089 recibido', 'Encuesta enviada tras resolver #1038 · respuesta 5', 'Recordatorio programado para cita #3',
];
export const money = (n: number) => '$ ' + n.toLocaleString('es-CO');

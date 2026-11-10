import { reg } from '../server';
import { take } from '../db';
import { fmtDate, fmtDateTime, fmtTime, includes, iso } from '../util';
import { CHANNEL_LABEL, HANDLING } from './dashboard';

const LIMIT = 80;
const APPT_STATUS = { requested: 'Solicitada', confirmed: 'Confirmada', completed: 'Realizada', no_show: 'No asistió', cancelled: 'Cancelada', failed: 'Fallida' };
const ORDER_STATUS = { received: 'Recibido', confirmed: 'Confirmado', preparing: 'En preparación', ready: 'Listo', dispatched: 'Despachado', delivered: 'Entregado', cancelled: 'Cancelado' };
const preview = (m) => (m ? (m.direction === 'out' ? 'Tú: ' : '') + m.body.replace(/\s+/g, ' ').slice(0, 80) : null);
const lastMessage = (db, id) => { let best = null; db.messages.forEach((m) => { if (m.conversation_id === id && (!best || m.id > best.id)) best = m; }); return best; };
const bot = (db, id) => db.chatbots.find((b) => b.id === id);
const user = (db, id) => db.users.find((u) => u.id === id);

export function addMessage(db, conversation, direction, sender, body, extra = {}) {
    const message = { id: take('message', db.messages), conversation_id: conversation.id, direction, sender, sender_user_id: extra.user ?? null, type: 'text', body, status: direction === 'out' ? 'delivered' : 'received', sent_at: iso(Date.now()), simulated: Boolean(extra.simulated), ...extra };
    delete message.user;
    db.messages.push(message);
    conversation.last_message_at = message.sent_at;
    return message;
}

export function audit(db, description, event = 'updated') {
    db.audit.push({ id: take('audit', db.audit), description, user: user(db, db.me).name, at: iso(Date.now()), event });
}

function summary(db, c) {
    const last = lastMessage(db, c.id);
    return {
        id: c.id, contactId: c.contact_id, contactName: c.contact_name, channel: { key: c.channel, label: CHANNEL_LABEL[c.channel] },
        chatbot: { id: c.chatbot_id, name: bot(db, c.chatbot_id).name }, handling: c.handling, demo: false, assignedName: user(db, c.assigned_user_id)?.name ?? null, support: null,
        lastAt: c.last_message_at ? fmtDateTime(c.last_message_at) : null, preview: preview(last),
    };
}

function operationsOf(db, c) {
    const rows = [];
    (db.appointments ?? []).filter((a) => a.conversation_id === c.id).forEach((a) => rows.push({ kind: 'appointment', id: a.id, title: `${a.service_name}`, statusLabel: APPT_STATUS[a.status], when: `${fmtDate(a.starts_at)} ${fmtTime(a.starts_at)}`, detail: a.professional_name }));
    (db.orders ?? []).filter((o) => o.conversation_id === c.id).forEach((o) => rows.push({ kind: 'order', id: o.id, title: o.number, statusLabel: ORDER_STATUS[o.status], when: fmtDate(o.created_at), detail: null }));
    return rows;
}

function abilities(c, me) {
    const mine = c.assigned_user_id === me;
    return {
        take: c.handling === 'ai' || c.handling === 'pending',
        reply: c.handling === 'human' && mine,
        release: (c.handling === 'human' && mine) || c.handling === 'pending',
        resolve: c.handling !== 'resolved' && (c.handling !== 'human' || mine),
        assign: c.handling !== 'resolved',
        context: c.handling === 'human' && mine,
    };
}

function detail(db, c) {
    const items = db.messages.filter((m) => m.conversation_id === c.id).sort((a, b) => a.sent_at.localeCompare(b.sent_at) || a.id - b.id).map((m) => ({
        id: m.id, direction: m.direction, sender: m.sender, senderName: m.sender === 'agent' ? user(db, m.sender_user_id)?.name ?? null : null, type: m.type, body: m.body, mediaMime: null, attachments: [],
        status: m.status, deliveredTime: m.direction === 'out' ? fmtTime(m.sent_at) : null, readTime: null, simulated: m.simulated, failureReason: null, day: fmtDate(m.sent_at), time: fmtTime(m.sent_at),
    }));
    const assigned = user(db, c.assigned_user_id);
    return {
        ...summary(db, c), assignedUser: assigned ? { id: assigned.id, name: assigned.name, isMe: assigned.id === db.me } : null, handoffReason: c.handoff_reason, closed: null,
        context: c.context ?? { facts: [], steps: [], operations: [], conflicts: [], nextStep: null, resuming: false }, handoffAt: c.handoff_requested_at ? fmtDateTime(c.handoff_requested_at) : null,
        delivery: { ok: true, reason: null }, simulate: true, can: abilities(c, db.me), operations: operationsOf(db, c), tools: c.tools ?? [], activity: true, survey: true, feedback: null, truncated: false, items,
    };
}

reg.get('conversations.index', ({ db, query }) => {
    const status = HANDLING.includes(query.status) ? query.status : null;
    const q = (query.q ?? '').trim();
    let rows = db.conversations
        .filter((c) => !status || c.handling === status)
        .filter((c) => !query.channel || c.channel === query.channel)
        .filter((c) => !query.chatbot || String(c.chatbot_id) === String(query.chatbot))
        .filter((c) => !q || includes(c.contact_id, q) || includes(c.contact_name, q));
    rows = rows.sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '') || b.id - a.id).slice(0, LIMIT);
    const scoped = db.conversations;
    const counts = Object.fromEntries(HANDLING.map((h) => [h, scoped.filter((c) => c.handling === h).length]));
    const selected = query.c ? db.conversations.find((c) => String(c.id) === String(query.c)) : null;
    return {
        component: 'Conversations/Index',
        props: {
            conversations: rows.map((c) => summary(db, c)), counts, selected: selected ? detail(db, selected) : null,
            agents: selected ? db.users.filter((u) => u.active && (u.role === 'agente' || u.role === 'admin' || u.role === 'supervisor')).map((u) => ({ id: u.id, name: u.name })) : [],
            filters: { q, status: status ?? 'all', channel: query.channel ?? null, chatbot: query.chatbot ? Number(query.chatbot) : null },
            options: { channels: Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label })), chatbots: db.chatbots.map((b) => ({ value: b.id, label: b.name })) },
            demo: { canManage: true, demo: db.conversations.filter((c) => c.demo).length, total: db.conversations.length }, savedFilters: db.savedFilters.filter((f) => f.scope === 'conversations'),
            scope: { mode: 'active', canChoose: false, readOnly: false, workspace: { id: db.workspace.id, name: db.workspace.name, code: db.workspace.code } },
            privateAccess: null,
        },
    };
});

const find = (db, id) => db.conversations.find((c) => String(c.id) === String(id));
const backTo = (c) => ({ redirect: `/conversations?c=${c.id}` });

reg.mut('conversations.take', ({ db, params }) => {
    const c = find(db, params.conversation);
    c.handling = 'human'; c.assigned_user_id = db.me; c.handoff_reason = null; c.handoff_requested_at = null;
    addMessage(db, c, 'out', 'system', 'Un agente tomó la conversación', { type: 'text', status: 'delivered' });
    audit(db, `Tomó la conversación #${c.id}`);
    return { ...backTo(c), flash: { success: 'Tomaste la conversación. La IA ya no responde.' } };
});
reg.mut('conversations.release', ({ db, params }) => {
    const c = find(db, params.conversation);
    c.handling = 'ai'; c.assigned_user_id = null; c.handoff_reason = null; c.handoff_requested_at = null;
    audit(db, `Devolvió a la IA la conversación #${c.id}`);
    return { ...backTo(c), flash: { success: 'La conversación volvió a la IA.' } };
});
reg.mut('conversations.resolve', ({ db, params }) => {
    const c = find(db, params.conversation);
    c.handling = 'resolved';
    // The linked survey is sent when a conversation is resolved (docs/encuestas.md in AVA Platform): here it is created as sent, never answered.
    if (db.surveys?.length && !db.surveyResponses.some((s) => s.origin === 'conversation' && s.origin_id === c.id)) {
        db.surveyResponses.push({ id: take('surveyResponse', db.surveyResponses), survey_id: db.surveys[0].id, customer_id: c.customer_id, conversation_id: c.id, origin: 'conversation', origin_id: c.id, status: 'sent', mode: 'whatsapp', rating: null, comment: null, sent_at: iso(Date.now()), answered_at: null });
    }
    audit(db, `Resolvió la conversación #${c.id}`);
    return { ...backTo(c), flash: { success: 'Conversación resuelta. Se envió la encuesta (simulada).' } };
});
reg.mut('conversations.assign', ({ db, params, data }) => {
    const c = find(db, params.conversation);
    const who = db.users.find((u) => String(u.id) === String(data.user_id ?? data.agent_id ?? data.user));
    if (!who) return { errors: { user_id: 'Elige un agente.' } };
    c.assigned_user_id = who.id; c.handling = 'human';
    audit(db, `Asignó la conversación #${c.id} a ${who.name}`);
    return { ...backTo(c), flash: { success: `Conversación asignada a ${who.name}.` } };
});
reg.mut('conversations.messages.store', ({ db, params, data }) => {
    const c = find(db, params.conversation);
    const body = String(data.body ?? '').trim();
    if (!body) return { errors: { body: 'Escribe un mensaje.' } };
    addMessage(db, c, 'out', 'agent', body, { user: db.me, simulated: true });
    return { ...backTo(c) };
});
reg.mut('conversations.context.store', ({ db, params, data }) => {
    const c = find(db, params.conversation);
    c.context = c.context ?? { facts: [], steps: [], operations: [], conflicts: [], nextStep: null, resuming: false };
    Object.entries(data.facts ?? {}).forEach(([key, value]) => {
        const hit = c.context.facts.find((f) => f.key === key);
        if (hit) hit.value = value; else c.context.facts.push({ key, value, source: 'agent' });
    });
    return { ...backTo(c), flash: { success: 'Dato guardado.' } };
});

reg.api('conversations.survey', ({ db, params }) => {
    const id = Number(params.conversation);
    const surveys = db.surveyResponses.filter((s) => s.conversation_id === id).map((s) => ({
        id: s.id, survey: db.surveys.find((x) => x.id === s.survey_id)?.name ?? 'Encuesta', status: s.status, rating: s.rating, scaleMin: 1, scaleMax: 5, mode: s.mode,
        sentAt: fmtDateTime(s.sent_at), answeredAt: s.answered_at ? fmtDateTime(s.answered_at) : null, origin: 'Conversación', originId: s.origin_id, comment: s.comment,
    }));
    return { surveys, truncated: false };
});
reg.api('conversations.activity', () => ({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 20, links: [] }));
reg.api('conversations.alerts', () => ({ items: [], unread: 0 }));

/* ------------------------------------------------------------------------------------------------------------------
 * The DEMO bench of the inbox (AVA Platform has the same routes in its demo environment): the contact writes, the "AI" answers,
 * the assistant asks for a person. The "AI" here is a local script of keywords: it calls no model and spends no tokens.
 * ------------------------------------------------------------------------------------------------------------------ */
function scriptedReply(db, c, text) {
    const t = text.toLowerCase();
    const customer = db.customers.find((x) => x.id === c.customer_id);
    if (/humano|persona|asesor|agente|queja|factura/.test(t)) return { body: 'Entiendo. Te paso con una persona del equipo para que te ayude con esto.', handoff: 'El contacto pidió hablar con una persona.' };
    if (/cita|agendar|turno|reserv/.test(t) && c.chatbot_id === 1) {
        const pro = db.professionals[1];
        const service = db.services[0];
        const base = new Date(); base.setUTCDate(base.getUTCDate() + 2); base.setUTCHours(15, 0, 0, 0);
        const taken = db.appointments.some((a) => a.professional_id === pro.id && Math.abs(new Date(a.starts_at) - base) < 3600000);
        const start = taken ? new Date(base.getTime() + 3 * 3600000) : base;
        const a = {
            id: take('appointment', db.appointments), customer_id: customer.id, service_id: service.id, professional_id: pro.id, location_id: 1, service_name: service.name, professional_name: pro.name, location_name: 'Sede Centro',
            price_amount: service.price, price_currency: 'COP', starts_at: start.toISOString(), ends_at: new Date(start.getTime() + service.durationMinutes * 60000).toISOString(), rest_minutes: service.bufferMinutes, status: 'requested',
            origin: 'chat', origin_channel: c.channel === 'whatsapp' ? 'whatsapp' : 'web', customer_confirmed: false, notes: 'Solicitada por el asistente (simulación).', cancel_reason: null, conversation_id: c.id, created_at: new Date().toISOString(),
        };
        db.appointments.push(a);
        audit(db, `El asistente creó la cita #${a.id} de ${service.name} para ${customer.name}`, 'created');
        return { body: `Listo, ${customer.firstName}: dejé tu cita de ${service.name} solicitada para el ${fmtDate(a.starts_at)} a las ${fmtTime(a.starts_at)} en Sede Centro. El equipo la confirmará.` };
    }
    if (/pedido|compr|camiseta|gorra|mochila|talla/.test(t) && c.chatbot_id === 2) return { body: 'Tenemos camisetas, gorras y mochilas. ¿Qué producto y cuántas unidades quieres? Puedo registrar el pedido.' };
    if (/precio|cuesta|valor/.test(t)) return { body: 'La limpieza dental cuesta $ 90.000 y la valoración general $ 50.000.' };
    if (/horario|atienden|abren/.test(t)) return { body: 'Atendemos de lunes a viernes de 8:00 a 18:00 y los sábados de 9:00 a 13:00 (Sede Centro).' };
    return { body: 'Gracias por escribir. Cuéntame un poco más para ayudarte.' };
}

const aiReplyTo = (db, c) => {
    const last = [...db.messages].filter((m) => m.conversation_id === c.id && m.direction === 'in').pop();
    const out = scriptedReply(db, c, last?.body ?? '');
    addMessage(db, c, 'out', 'ai', out.body, { simulated: true });
    if (out.handoff) { c.handling = 'pending'; c.handoff_reason = out.handoff; c.handoff_requested_at = iso(Date.now()); }
};

reg.mut('conversations.simulate.incoming', ({ db, params, data }) => {
    const c = find(db, params.conversation);
    const body = String(data.body ?? '').trim();
    if (!body) return { errors: { body: 'Escribe el mensaje.' } };
    addMessage(db, c, 'in', 'contact', body, { simulated: true });
    if (c.handling === 'resolved') { c.handling = 'ai'; }
    if (c.handling === 'ai') aiReplyTo(db, c);
    return { ...backTo(c) };
});
reg.mut('conversations.simulate.ai-reply', ({ db, params }) => { const c = find(db, params.conversation); aiReplyTo(db, c); return { ...backTo(c) }; });
reg.mut('conversations.simulate.handoff', ({ db, params }) => {
    const c = find(db, params.conversation);
    c.handling = 'pending'; c.handoff_reason = 'El asistente pidió una persona (simulado).'; c.handoff_requested_at = iso(Date.now());
    addMessage(db, c, 'out', 'ai', 'Voy a pasarte con una persona del equipo.', { simulated: true });
    return { ...backTo(c), flash: { warning: 'La conversación quedó pendiente de agente.' } };
});
reg.mut('conversations.simulate.status', ({ db, params, data }) => { const m = db.messages.find((x) => String(x.id) === params.message); if (m) m.status = data.status; return { ...backTo(find(db, params.conversation)) }; });
const SCENES = [
    ['Quiero cancelar mi cita de mañana', 'Claro, puedo ayudarte a cancelarla. ¿Confirmas que quieres cancelar la cita?', 'whatsapp', 1],
    ['¿Tienen la mochila urbana en stock?', 'La mochila urbana está disponible en Sede Centro (6 unidades).', 'instagram', 2],
    ['Tengo una queja con la atención de ayer', 'Lamento lo ocurrido. Te paso con una persona del equipo.', 'web', 1],
];
function generateDemo(db) {
    SCENES.forEach(([ask, answer, channel, bot], i) => {
        const customer = db.customers[(db.conversations.length + i) % db.customers.length];
        const now = Date.now() - i * 60000;
        const id = take('conversation', db.conversations);
        const c = { id, chatbot_id: bot, channel, customer_id: customer.id, contact_id: customer.identities?.[0]?.external_id ?? customer.phone, contact_name: customer.name, handling: /queja/.test(ask) ? 'pending' : 'ai', assigned_user_id: null, handoff_reason: /queja/.test(ask) ? 'Queja: requiere una persona.' : null, handoff_requested_at: /queja/.test(ask) ? iso(now) : null, created_at: iso(now), last_message_at: iso(now), demo: true };
        db.conversations.push(c);
        addMessage(db, c, 'in', 'contact', ask, { simulated: true });
        addMessage(db, c, 'out', 'ai', answer, { simulated: true });
    });
}
reg.mut('conversations.demo', ({ db, params }) => {
    const ids = new Set(db.conversations.filter((c) => c.demo).map((c) => c.id));
    if (params.action === 'generate') { generateDemo(db); return { flash: { success: 'Se generaron 3 conversaciones ficticias.' } }; }
    db.conversations = db.conversations.filter((c) => !ids.has(c.id));
    db.messages = db.messages.filter((m) => !ids.has(m.conversation_id));
    if (params.action === 'reset') generateDemo(db);
    return { flash: { success: params.action === 'reset' ? 'Escenarios demo reiniciados.' : 'Se limpiaron las conversaciones demo.' } };
});

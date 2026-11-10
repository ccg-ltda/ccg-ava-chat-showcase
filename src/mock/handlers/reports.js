import { reg } from '../server';
import { take } from '../db';
import { DAY, fmtDate, ymd } from '../util';
import { CHANNEL_LABEL, HANDLING, HANDLING_LABEL, PERIODS, activity, resolvePeriod, series } from './dashboard';
import { ORIGIN_LABEL, STATUS_LABEL } from './booking';

const inRange = (value, from, to) => { const t = new Date(value).getTime(); return t >= from && t <= to; };
const compare = (value, previous) => ({ value, previous, change: previous > 0 ? Math.round(((value - previous) / previous) * 100) : null });
const tally = (rows, keyFn, labelFn = (k) => k, limit = 6) => {
    const m = new Map();
    rows.forEach((r) => { const k = keyFn(r); if (k != null) m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit).map(([key, value]) => ({ key: String(key), label: labelFn(key), value }));
};
const ORDER_STATUS = { received: 'Recibido', confirmed: 'Confirmado', preparing: 'En preparación', ready: 'Listo', dispatched: 'Despachado', delivered: 'Entregado', cancelled: 'Cancelado' };
const METHODS = { pickup: 'Recogida', delivery: 'Entrega a domicilio' };
const CONSENT = { unknown: 'Sin registrar', granted: 'Autorizado', revoked: 'Dado de baja' };
const SOURCE = { manual: 'Alta manual', conversation: 'Conversación', booking: 'Reserva', import: 'Importación' };

function hours(db, period, of) {
    const counts = Array(24).fill(0);
    const rows = of === 'messages' ? db.messages.filter((m) => m.direction === 'in' && inRange(m.sent_at, period.from, period.to)).map((m) => m.sent_at) : db.conversations.filter((c) => inRange(c.created_at, period.from, period.to)).map((c) => c.created_at);
    rows.forEach((at) => { counts[(new Date(at).getUTCHours() + 19) % 24] += 1; });
    return { total: counts.reduce((a, b) => a + b, 0), points: counts.map((value, h) => ({ key: String(h), label: `${String(h).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:59`, short: String(h).padStart(2, '0'), value })) };
}

function bookingsSection(db, period) {
    const rows = db.appointments.filter((a) => inRange(a.starts_at, period.from, period.to));
    const by = (s) => rows.filter((a) => a.status === s).length;
    const completed = rows.filter((a) => a.status === 'completed');
    const live = rows.filter((a) => a.status !== 'cancelled');
    return {
        kpis: { total: rows.length, completed: by('completed'), cancelled: by('cancelled'), noShow: by('no_show'), upcoming: db.appointments.filter((a) => new Date(a.starts_at) > period.to && ['requested', 'confirmed'].includes(a.status)).length, recordedValue: completed.reduce((s, a) => s + (a.price_amount ?? 0), 0), withoutPrice: completed.filter((a) => a.price_amount == null).length, currency: 'COP' },
        byStatus: Object.entries(STATUS_LABEL).map(([key, label]) => ({ key, label, value: by(key) })),
        byService: tally(live, (a) => a.service_name), byProfessional: tally(live, (a) => a.professional_name), byOrigin: tally(rows, (a) => a.origin, (k) => ORIGIN_LABEL[k] ?? k),
    };
}

function ordersSection(db, period) {
    const rows = db.orders.filter((o) => inRange(o.created_at, period.from, period.to));
    const sold = rows.filter((o) => o.status !== 'cancelled');
    const delivered = rows.filter((o) => o.status === 'delivered');
    const lines = sold.flatMap((o) => o.lines);
    const top = new Map();
    lines.forEach((l) => top.set(l.name, (top.get(l.name) ?? 0) + l.quantity));
    return {
        kpis: { total: rows.length, delivered: delivered.length, cancelled: rows.filter((o) => o.status === 'cancelled').length, open: rows.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length, sales: sold.reduce((s, o) => s + o.total, 0), averageTicket: sold.length ? Math.round(sold.reduce((s, o) => s + o.total, 0) / sold.length) : null, currency: 'COP', mixedCurrencies: false },
        byStatus: Object.entries(ORDER_STATUS).map(([key, label]) => ({ key, label, value: rows.filter((o) => o.status === key).length })),
        byMethod: tally(rows, (o) => o.delivery_method, (k) => METHODS[k]),
        topProducts: [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key, value]) => ({ key, label: key, value })),
    };
}

function customersSection(db, period) {
    const active = db.customers.filter((c) => c.active);
    return {
        kpis: { total: db.customers.length, active: active.length, new: db.customers.filter((c) => inRange(c.created_at, period.from, period.to)).length, reachable: active.filter((c) => c.consent === 'granted').length },
        byConsent: Object.entries(CONSENT).map(([key, label]) => ({ key, label, value: db.customers.filter((c) => c.consent === key).length })),
        bySource: tally(db.customers, (c) => c.source, (k) => SOURCE[k] ?? k),
    };
}

function moneyPoints(db, period, rows, prevRows, dateKey, amount) {
    const days = [];
    for (let t = period.from; t <= period.to; t += DAY) days.push(t);
    const sumOn = (list, day) => list.filter((r) => ymd(new Date(r[dateKey]).getTime()) === ymd(day)).reduce((s, r) => s + amount(r), 0);
    const points = days.map((t) => {
        const [, m, d] = ymd(t).split('-');
        return { key: ymd(t), label: `${d}/${m}`, short: `${d}/${m}`, values: { income: sumOn(rows, t), previous: sumOn(prevRows, t - period.days * DAY) } };
    });
    return { total: points.reduce((s, p) => s + p.values.income, 0), points };
}

function economics(db, period) {
    const prev = { from: period.from - period.days * DAY, to: period.from - 1 };
    const appts = (a, b) => db.appointments.filter((x) => x.status === 'completed' && inRange(x.starts_at, a, b));
    const ords = (a, b) => db.orders.filter((x) => x.status === 'delivered' && inRange(x.created_at, a, b));
    const build = (now, before, sum) => {
        const income = sum(now); const incomeBefore = sum(before);
        return { kpis: { income: compare(income, incomeBefore), count: compare(now.length, before.length), average: compare(now.length ? Math.round(income / now.length) : 0, before.length ? Math.round(incomeBefore / before.length) : 0), withoutValue: 0, currency: 'COP', mixedCurrencies: false }, previousRange: { from: fmtDate(prev.from), to: fmtDate(prev.to) } };
    };
    const a = appts(period.from, period.to); const o = ords(period.from, period.to);
    return {
        bookings: { data: { ...build(a, appts(prev.from, prev.to), (r) => r.reduce((s, x) => s + (x.price_amount ?? 0), 0)), series: moneyPoints(db, period, a, appts(prev.from, prev.to), 'starts_at', (x) => x.price_amount ?? 0) }, error: null },
        orders: { data: { ...build(o, ords(prev.from, prev.to), (r) => r.reduce((s, x) => s + x.total, 0)), series: moneyPoints(db, period, o, ords(prev.from, prev.to), 'created_at', (x) => x.total) }, error: null },
    };
}

function surveys(db, period) {
    const sent = db.surveyResponses.filter((s) => inRange(s.sent_at, period.from, period.to));
    const answered = sent.filter((s) => s.status === 'answered' && s.rating != null);
    const avg = answered.length ? Math.round((answered.reduce((s, r) => s + r.rating, 0) / answered.length) * 100) / 100 : null;
    const dist = [5, 4, 3, 2, 1].map((n) => ({ key: String(n), label: `${n} de 5`, value: answered.filter((r) => r.rating === n).length })).filter((d) => d.value > 0);
    const evolution = (() => { const m = new Map(); answered.forEach((r) => { const k = ymd(new Date(r.answered_at).getTime()); m.set(k, (m.get(k) ?? 0) + 1); }); return [...m.entries()].sort().map(([key, value]) => { const [, mo, d] = key.split('-'); return { key, label: `${d}/${mo}`, short: `${d}/${mo}`, value }; }); })();
    const trend = (() => { const m = new Map(); answered.forEach((r) => { const k = ymd(new Date(r.answered_at).getTime()); const c = m.get(k) ?? [0, 0]; m.set(k, [c[0] + r.rating, c[1] + 1]); }); return [...m.entries()].sort().map(([key, [s, n]]) => { const [, mo, d] = key.split('-'); return { key, label: `${d}/${mo}`, short: `${d}/${mo}`, value: Math.round((s / n) * 100) / 100 }; }); })();
    const conv = (id) => db.conversations.find((c) => c.id === id);
    return {
        data: {
            sent: sent.length, responses: answered.length, incomplete: 0, responseRate: sent.length ? answered.length / sent.length : null, average: avg, satisfaction: answered.length ? answered.filter((r) => r.rating >= 4).length / answered.length : null,
            pending: sent.filter((s) => s.status === 'sent').length, expired: 0, nps: null, scale: { min: 1, max: 5 }, skipped: 0, events: { ambiguous: 0, invalid: 0, duplicate: 0 }, linkedToConversation: answered.filter((r) => r.conversation_id).length,
            evolution, distribution: dist, trend, byOrigin: [{ key: 'conversation', label: 'Conversación', value: sent.length }], bySource: [{ key: 'whatsapp', label: 'WhatsApp', value: answered.length }],
            byLocation: [], byService: [], byProfessional: [], bySurvey: [{ name: db.surveys[0].name, responses: answered.length, average: avg, scaleMax: 5, satisfaction: answered.length ? answered.filter((r) => r.rating >= 4).length / answered.length : 0 }],
            recent: answered.sort((a, b) => b.answered_at.localeCompare(a.answered_at)).slice(0, 8).map((r) => ({ survey: db.surveys[0].name, rating: r.rating, scaleMax: 5, source: 'whatsapp', at: r.answered_at, conversationId: r.conversation_id, contact: conv(r.conversation_id)?.contact_name })),
            comments: answered.filter((r) => r.comment).sort((a, b) => b.answered_at.localeCompare(a.answered_at)).slice(0, 8).map((r) => ({ comment: r.comment, rating: r.rating, at: r.answered_at })),
        },
        error: null,
    };
}

export const TRIGGERS = [{ value: 'conversation_resolved', label: 'Conversación finalizada' }, { value: 'appointment_confirmed', label: 'Reserva confirmada' }, { value: 'appointment_completed', label: 'Servicio completado (cita)' }, { value: 'order_completed', label: 'Pedido entregado' }];

function surveyAdmin(db) {
    return {
        surveys: db.surveys.map((s) => ({
            id: s.id, name: s.name, status: s.active ? 'active' : 'inactive', type: 'satisfaction', scaleMin: 1, scaleMax: s.scaleMax, prompt: s.prompt ?? '¿Cómo calificas la atención recibida? Responde de 1 a 5.', acceptWhatsapp: true, acceptLink: true, allowComment: true,
            linkTtlHours: 72, templateName: s.templateName ?? 'encuesta_satisfaccion', templateLanguage: 'es', templateParams: ['customer_name', 'link'], thanksText: '¡Gracias por tu respuesta!', native: true, autoSend: Boolean(s.autoSend), triggerEvent: s.trigger, sendDelayMinutes: 5, cooldownHours: 24,
        })),
        dispatches: db.surveyResponses.filter((r) => r.status === 'sent').slice(-8).reverse().map((r) => ({ id: r.id, survey: db.surveys.find((s) => s.id === r.survey_id)?.name, status: 'sent', sentAt: r.sent_at, expiresAt: new Date(new Date(r.sent_at).getTime() + 72 * 3600000).toISOString(), expired: false, failureReason: null, conversationId: r.conversation_id, contact: '••••1003', canRetry: false, origin: 'conversation', scheduledFor: null, canRevoke: true })),
        review: [], templateParams: ['customer_name', 'business', 'survey_name', 'link'], triggers: TRIGGERS, whatsapp: true,
    };
}

reg.mut('surveys.admin.store', ({ db, data }) => {
    if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } };
    db.surveys.push({ id: take('survey', db.surveys), name: data.name.trim(), scaleMax: Number(data.scale_max ?? 5), mode: 'whatsapp', active: true, trigger: data.trigger_event ?? 'conversation_resolved', autoSend: Boolean(data.auto_send), prompt: data.prompt });
    return { flash: { success: 'Encuesta creada correctamente' } };
});
reg.mut('surveys.admin.update', ({ db, params, data }) => {
    const s = db.surveys.find((x) => String(x.id) === params.survey);
    if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } };
    Object.assign(s, { name: data.name.trim(), prompt: data.prompt ?? s.prompt, autoSend: Boolean(data.auto_send), trigger: data.trigger_event ?? s.trigger, active: data.status ? data.status === 'active' : s.active });
    return { flash: { success: 'Encuesta actualizada' } };
});
reg.mut('surveys.admin.invite', ({ db, params, data }) => {
    const s = db.surveys.find((x) => String(x.id) === params.survey);
    const customer = db.customers.find((c) => String(c.id) === String(data.customer_id)) ?? db.customers[0];
    db.surveyResponses.push({ id: take('surveyResponse', db.surveyResponses), survey_id: s.id, customer_id: customer.id, conversation_id: data.conversation_id ? Number(data.conversation_id) : null, origin: 'manual', origin_id: null, status: 'sent', mode: 'whatsapp', rating: null, comment: null, sent_at: new Date().toISOString(), answered_at: null });
    return { flash: { success: 'Invitación enviada (simulada: no sale ningún mensaje real).' } };
});
reg.mut('surveys.admin.revoke', ({ db, params }) => { const r = db.surveyResponses.find((x) => String(x.id) === params.dispatch); if (r) r.status = 'revoked'; return { flash: { success: 'Envío revocado' } }; });
reg.mut('surveys.admin.retry', () => ({ flash: { success: 'Reintento programado (simulado).' } }));

function team(db) {
    const active = db.users.filter((u) => u.active);
    const roles = {};
    active.forEach((u) => { roles[u.role] = (roles[u.role] ?? 0) + 1; });
    return { stats: { users: active.length, admins: active.filter((u) => u.role === 'admin').length, rolesInUse: Object.keys(roles).length, permissions: 148 }, roleBreakdown: Object.entries(roles).map(([role, count]) => ({ role, count })), recentUsers: active.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })) };
}

reg.get('reports.index', ({ db, query }) => {
    const period = resolvePeriod(query);
    const before = activity(db, period.from - period.days * DAY, period.from - 1);
    const now = activity(db, period.from, period.to);
    const states = HANDLING.map((key) => ({ key, label: HANDLING_LABEL[key], value: db.conversations.filter((c) => c.handling === key && inRange(c.last_message_at, period.from, period.to)).length }));
    const byChannel = tally(db.conversations.filter((c) => inRange(c.created_at, period.from, period.to)), (c) => c.channel, (k) => CHANNEL_LABEL[k], 10);
    const section = (data) => ({ data, error: null });
    const bk = bookingsSection(db, period);
    const growth = { total: db.users.length, points: [] };
    return {
        component: 'Reports/Index',
        props: {
            ...team(db), teamGrowth: growth,
            sources: { conversations: true, team: true, economics: true, bookingRecords: false, bookings: true, orders: true, customers: true },
            filters: { period: period.key, granularity: period.granularity }, range: { from: fmtDate(period.from), to: fmtDate(period.to), days: period.days, granularity: period.granularity },
            options: { periods: Object.entries(PERIODS).map(([value, p]) => ({ value, label: p.label })), granularities: PERIODS[period.key].granularities.map((value) => ({ value, label: { day: 'Día', week: 'Semana', month: 'Mes' }[value] })) },
            metrics: [
                { key: 'chats', label: 'Chats', hint: 'Conversaciones iniciadas', section: 'conversations', connected: true }, { key: 'interactions', label: 'Interacciones', hint: 'Mensajes recibidos y respuestas enviadas', section: 'interactions', connected: true },
                { key: 'questions', label: 'Preguntas', hint: 'Preguntas recibidas por Ava', section: 'questions', connected: false }, { key: 'surveys', label: 'Encuestas', hint: 'Respuestas recibidas', section: 'surveys', connected: false },
            ],
            figures: section({
                chats: compare(now.conversations, before.conversations), interactions: compare(now.received + now.sent, before.received + before.sent),
                rows: [['conversations', 'Conversaciones nuevas'], ['received', 'Mensajes recibidos'], ['sent', 'Respuestas enviadas'], ['ai', 'Respuestas de la IA'], ['agents', 'Respuestas de agentes']].map(([key, label]) => ({ key, label, ...compare(now[key], before[key]) })),
            }),
            activity: section(series(db, period)), channels: section(byChannel), states: section(states), chatHours: section(hours(db, period, 'conversations')), messageHours: section(hours(db, period, 'messages')),
            scope: { mode: 'active', canChoose: false, workspace: { id: db.workspace.id, name: db.workspace.name, code: db.workspace.code } },
            operations: { bookings: section(bk), orders: section(ordersSection(db, period)), customers: section(customersSection(db, period)) },
            economics: economics(db, period),
            locations: { options: db.locations.map((l) => ({ id: l.id, name: l.name, isActive: l.isActive })), selected: null, limited: false, enabled: true },
            consolidatedBookings: section({ total: bk.kpis.total, byStatus: bk.byStatus, byOrigin: bk.byOrigin, bySource: [{ key: 'ava', label: 'Agenda de Ava', value: bk.kpis.total }], byService: bk.byService, byProfessional: bk.byProfessional, byLocation: tally(db.appointments.filter((a) => inRange(a.starts_at, period.from, period.to)), (a) => a.location_name) }),
            bookingFilters: { source: null, status: null, service: null, professional: null },
            surveys: surveys(db, period),
            surveyAdmin: surveyAdmin(db),
            canOpenConversations: true,
        },
    };
});

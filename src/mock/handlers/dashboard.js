import { reg } from '../server';
import { DAY, fmtDate, fmtDateTime, fmtTime, startOfLocalDay, ymd } from '../util';

export const PERIODS = {
    '7d': { label: 'Últimos 7 días', days: 7, granularities: ['day'] },
    '30d': { label: 'Últimos 30 días', days: 30, granularities: ['day', 'week'] },
    '90d': { label: 'Últimos 90 días', days: 90, granularities: ['week', 'day', 'month'] },
    '12m': { label: 'Últimos 12 meses', days: 365, granularities: ['month', 'week'] },
};

export const CHANNEL_LABEL = { web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger' };
export const HANDLING = ['ai', 'pending', 'human', 'resolved'];
export const HANDLING_LABEL = { ai: 'IA atendiendo', pending: 'Pendiente de agente', human: 'En atención', resolved: 'Resuelta' };

/** Resolves `?period=` to a range ending now. */
export function resolvePeriod(query, now = Date.now()) {
    const key = PERIODS[query.period] ? query.period : '30d';
    const spec = PERIODS[key];
    const to = now;
    const from = startOfLocalDay(now - (spec.days - 1) * DAY);
    const granularity = spec.granularities.includes(query.granularity) ? query.granularity : spec.granularities[0];
    return { key, spec, from, to, days: spec.days, granularity };
}

const inRange = (value, from, to) => { const t = new Date(value).getTime(); return t >= from && t <= to; };
const compare = (value, previous) => ({ value, previous, change: previous > 0 ? Math.round(((value - previous) / previous) * 100) : null });

export function activity(db, from, to) {
    const convs = db.conversations.filter((c) => inRange(c.created_at, from, to)).length;
    const msgs = db.messages.filter((m) => inRange(m.sent_at, from, to));
    const out = msgs.filter((m) => m.direction === 'out');
    return { conversations: convs, received: msgs.filter((m) => m.direction === 'in').length, sent: out.length, ai: out.filter((m) => m.sender === 'ai').length, agents: out.filter((m) => m.sender === 'agent').length };
}

function bucketKey(ms, granularity) {
    if (granularity === 'month') return ymd(ms).slice(0, 7);
    if (granularity === 'week') { const day = new Date(ms - 5 * 3600000).getUTCDay(); return ymd(startOfLocalDay(ms) - ((day + 6) % 7) * DAY); }
    return ymd(ms);
}

export function series(db, period) {
    const points = new Map();
    const add = (ms, field) => {
        if (!inRange(ms, period.from, period.to)) return;
        const key = bucketKey(new Date(ms).getTime(), period.granularity);
        if (!points.has(key)) points.set(key, { key, values: { conversations: 0, received: 0, sent: 0 } });
        points.get(key).values[field] += 1;
    };
    // Every bucket of the range exists, even at zero.
    for (let t = period.from; t <= period.to; t += DAY) {
        const key = bucketKey(t, period.granularity);
        if (!points.has(key)) points.set(key, { key, values: { conversations: 0, received: 0, sent: 0 } });
    }
    db.conversations.forEach((c) => add(c.created_at, 'conversations'));
    db.messages.forEach((m) => add(m.sent_at, m.direction === 'in' ? 'received' : 'sent'));
    const list = [...points.values()].sort((a, b) => a.key.localeCompare(b.key)).map((p) => {
        const [y, mo, d] = p.key.split('-');
        const label = period.granularity === 'month' ? `${mo}/${y}` : `${d}/${mo}`;
        return { ...p, label, short: period.granularity === 'month' ? mo : `${d}/${mo}` };
    });
    return { total: list.reduce((s, p) => s + p.values.conversations + p.values.received + p.values.sent, 0), points: list };
}

export function integrationsState(db) {
    return db.integrations.filter((i) => i.visible !== false).map((i) => ({ id: i.id, name: i.name, type: i.typeLabel, state: i.state, testedAt: i.tested_at ? fmtDateTime(i.tested_at) : null }));
}

reg.get('dashboard', ({ db, query }) => {
    const period = resolvePeriod(query);
    const before = activity(db, period.from - period.days * DAY, period.from - 1);
    const now = activity(db, period.from, period.to);
    const open = db.conversations.filter((c) => c.handling !== 'resolved').length;
    const pending = db.conversations.filter((c) => c.handling === 'pending').length;
    const states = HANDLING.map((key) => ({ key, label: HANDLING_LABEL[key], value: db.conversations.filter((c) => c.handling === key && inRange(c.last_message_at, period.from, period.to)).length }));
    const byChannel = {};
    db.conversations.filter((c) => inRange(c.created_at, period.from, period.to)).forEach((c) => { byChannel[c.channel] = (byChannel[c.channel] ?? 0) + 1; });
    const section = (data) => ({ data, error: null });
    const bot = (id) => db.chatbots.find((b) => b.id === id);
    return {
        component: 'Dashboard/Index',
        props: {
            filters: { period: period.key },
            range: { from: fmtDate(period.from), to: fmtDate(period.to), days: period.days, granularity: period.granularity },
            options: { periods: Object.entries(PERIODS).map(([value, p]) => ({ value, label: p.label })) },
            scope: { mode: 'active', canChoose: false, workspace: { id: db.workspace.id, name: db.workspace.name, code: db.workspace.code } },
            can: { conversations: true, assistants: true, integrations: true, audit: true },
            sources: { conversations: true, assistants: true, users: true },
            kpis: section({
                conversations: compare(now.conversations, before.conversations), messages: compare(now.received + now.sent, before.received + before.sent),
                messagesIn: now.received, byAi: now.ai, byAgents: now.agents, open, pending,
                assistants: { total: db.chatbots.length, active: db.chatbots.filter((b) => b.is_active).length }, users: db.users.filter((u) => u.active).length,
            }),
            activity: section(series(db, period)),
            states: section(states),
            channels: section(Object.entries(byChannel).sort((a, b) => b[1] - a[1]).map(([key, value]) => ({ key, label: CHANNEL_LABEL[key] ?? key, value }))),
            attention: section({ pending, unconfirmed: 0, failedExecutions: 0 }),
            integrations: section(integrationsState(db)),
            recentConversations: section([...db.conversations].filter((c) => c.last_message_at).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at) || b.id - a.id).slice(0, 6)
                .map((c) => ({ id: c.id, contact: c.contact_name || c.contact_id, channel: CHANNEL_LABEL[c.channel], handling: c.handling, assistant: bot(c.chatbot_id).name, workspaceId: db.workspace.id, workspace: null, lastAt: `${fmtDate(c.last_message_at)} ${fmtTime(c.last_message_at)}` }))),
            recentActivity: section([...db.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map((a) => ({ id: a.id, description: a.description, user: a.user, date: fmtDate(a.at), time: fmtTime(a.at), workspace: null }))),
            demo: null,
        },
    };
});

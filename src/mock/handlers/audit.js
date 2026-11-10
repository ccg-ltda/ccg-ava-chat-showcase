import { reg } from '../server';
import { fmtDate, fmtTime, includes, listPage, PER_PAGE_OPTIONS } from '../util';

const RESOURCES = [['user', 'Usuarios'], ['role', 'Roles'], ['plan', 'Planes'], ['settings', 'Configuraciones'], ['integration', 'Integraciones'], ['chatbot', 'Asistentes'], ['conversation', 'Conversaciones'], ['appointment', 'Agenda'], ['order', 'Pedidos'], ['customer', 'Clientes'], ['product', 'Catálogo'], ['service', 'Servicios']];
const ACTIONS = { created: 'Creado', updated: 'Modificado', deleted: 'Eliminado', resolved: 'Resuelto', assigned: 'Asignado', taken: 'Tomado', returned: 'Devuelto a la IA' };

/** The demo records free-text descriptions; the module is read from the words, the action from the verb. */
function classify(text) {
    const t = text.toLowerCase();
    const resource = /conversaci[oó]n/.test(t) ? 'conversation' : /cita|agenda|profesional|horario/.test(t) ? 'appointment' : /pedido/.test(t) ? 'order' : /cliente/.test(t) ? 'customer' : /producto|catálogo/.test(t) ? 'product' : /servicio/.test(t) ? 'service'
        : /chatbot|asistente|instrucciones|token/.test(t) ? 'chatbot' : /canal|integraci/.test(t) ? 'integration' : /plan/.test(t) ? 'plan' : /usuario|invit|supervisor/.test(t) ? 'user' : /apariencia|configur/.test(t) ? 'settings' : 'settings';
    const action = /^(cre[oó]|invit[oó]|agreg)/.test(t) ? 'created' : /^(elimin|retir)/.test(t) ? 'deleted' : /^resolvi/.test(t) ? 'resolved' : /^(asign)/.test(t) ? 'assigned' : /^tom[oó]/.test(t) ? 'taken' : /^devolvi/.test(t) ? 'returned' : 'updated';
    return { resource, action };
}

reg.get('audit.index', ({ db, query }) => {
    const f = { search: (query.search ?? '').trim(), from: query.from || null, to: query.to || null, user: query.user || null, workspace: null, resource: query.resource || null, action: query.action || null, actor: query.actor || null, outcome: query.outcome || null };
    const all = [...db.audit].sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id).map((a) => ({ ...a, ...classify(a.description) }));
    const rows = all.filter((e) => (!f.search || includes(e.description, f.search)) && (!f.resource || e.resource === f.resource) && (!f.action || e.action === f.action) && (!f.user || String(db.users.find((u) => u.name === e.user)?.id) === String(f.user))
        && (!f.actor || f.actor === 'user') && (!f.outcome || f.outcome === 'success') && (!f.from || e.at.slice(0, 10) >= f.from) && (!f.to || e.at.slice(0, 10) <= f.to));
    const { page, perPage } = listPage(rows, query, 'audit');
    const perPageAudit = Number(query.per_page) && PER_PAGE_OPTIONS.includes(Number(query.per_page)) ? Number(query.per_page) : PER_PAGE_OPTIONS[0];
    const pageNo = Math.max(1, Number(query.page) || 1);
    const lastPage = Math.max(1, Math.ceil(rows.length / perPageAudit));
    const current = Math.min(pageNo, lastPage);
    const data = rows.slice((current - 1) * perPageAudit, current * perPageAudit).map((e) => ({
        id: e.id, action: e.action, actionLabel: ACTIONS[e.action], description: e.description, module: RESOURCES.find(([k]) => k === e.resource)?.[1] ?? 'Configuraciones', date: fmtDate(e.at), time: fmtTime(e.at),
        user: { name: e.user, email: db.users.find((u) => u.name === e.user)?.email ?? null }, workspace: { code: db.workspace.code, name: db.workspace.name }, record: null, outcome: 'success', actor: 'user', ip: '203.0.113.10', changes: [],
    }));
    void page; void perPage;
    return {
        component: 'Audit/Index',
        props: {
            events: { data, meta: { current_page: current, last_page: lastPage, per_page: perPageAudit, total: rows.length, from: rows.length ? (current - 1) * perPageAudit + 1 : 0, to: rows.length ? (current - 1) * perPageAudit + data.length : 0 } },
            summary: { total: rows.length, created: rows.filter((e) => e.action === 'created').length, updated: rows.filter((e) => e.action === 'updated').length, deleted: rows.filter((e) => e.action === 'deleted').length, failed: 0, automatic: 0 },
            filters: { ...f, perPage: perPageAudit }, perPageOptions: PER_PAGE_OPTIONS,
            options: {
                users: db.users.map((u) => ({ value: u.id, label: u.name })), canChoose: false, resources: RESOURCES.map(([value, label]) => ({ value, label })), actions: Object.entries(ACTIONS).map(([value, label]) => ({ value, label })),
                actors: [{ value: 'user', label: 'Una persona' }, { value: 'system', label: 'Automático' }], outcomes: [{ value: 'success', label: 'Correcto' }, { value: 'failed', label: 'Fallido' }],
            },
            scope: { mode: 'active', workspace: null }, savedFilters: db.savedFilters.filter((s) => s.scope === 'audit'),
        },
    };
});

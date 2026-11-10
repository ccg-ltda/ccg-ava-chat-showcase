import { reg } from '../server';
import { take } from '../db';
import { fmtDateTime, iso } from '../util';
import { audit } from './conversations';

/** Field descriptors as the integration types of AVA Platform declare them (text / secret / textarea / select / copy). */
const FIELDS = {
    web: [
        { name: 'webhook_url', label: 'URL del webhook de n8n', kind: 'text', required: true, placeholder: 'https://n8n.ejemplo.com/webhook/ava-web', hint: 'Webhook de producción del flujo que responde a los visitantes.' },
        { name: 'webhook_secret', label: 'Secreto compartido (opcional)', kind: 'secret', required: false, hint: 'Se envía en un encabezado; valídalo en n8n.' },
        { name: 'allowed_origins', label: 'Sitios permitidos (opcional)', kind: 'textarea', required: false, placeholder: 'https://www.ejemplo.com' },
    ],
    whatsapp: [
        { name: 'phone_number_id', label: 'ID del número de teléfono', kind: 'text', required: true, placeholder: '000000000000000' },
        { name: 'business_account_id', label: 'ID de la cuenta de WhatsApp Business', kind: 'text', required: true, placeholder: '000000000000000' },
        { name: 'access_token', label: 'Token de acceso', kind: 'secret', required: true, hint: 'Se guarda cifrado y nunca se vuelve a mostrar.' },
        { name: 'verify_token', label: 'Verify Token del webhook', kind: 'secret', required: true },
    ],
};
const GATEWAY_FIELDS = [
    { name: 'environment', label: 'Ambiente', kind: 'select', required: true, options: [{ value: 'sandbox', label: 'Sandbox (pruebas)' }, { value: 'production', label: 'Producción' }], default: 'sandbox' },
    { name: 'merchant_id', label: 'Identificador del comercio', kind: 'secret', required: true, hint: 'Se guarda cifrado; nunca se muestra.' },
];

const ch = (db, type) => db.integrations.find((i) => i.type === type);
const integrationCard = (db, i) => i && ({
    id: i.id, isActive: i.active, summary: { rows: [{ label: 'Cuenta', value: i.name }, { label: 'Actualizada', value: fmtDateTime(i.updated_at ?? i.tested_at ?? db.seededAt) ?? '—' }] }, updatedAt: fmtDateTime(i.updated_at ?? db.seededAt), form: {},
    lastTest: i.tested_at ? { at: fmtDateTime(i.tested_at), ok: i.state === 'verified', message: i.state === 'verified' ? 'Conexión verificada (simulada: no se contactó a ningún proveedor).' : 'Falló la prueba simulada.' } : null,
});

function channels(db) {
    const defs = [
        { key: 'web', label: 'Web', description: 'Widget de chat para insertar en el sitio web del cliente.', available: true, unavailable: null, testable: false },
        { key: 'whatsapp', label: 'WhatsApp', description: 'Conversaciones con el número de WhatsApp Business del Workspace.', available: true, unavailable: null, testable: true },
        { key: 'instagram', label: 'Instagram', description: 'Mensajes directos de la cuenta profesional de Instagram del Workspace.', available: false, unavailable: 'Falta configurar la app de Meta de la plataforma.', testable: false, oauth: true },
        { key: 'messenger', label: 'Messenger', description: 'Mensajes de la página de Facebook del Workspace.', available: false, unavailable: 'Falta configurar la app de Meta de la plataforma.', testable: false, oauth: true },
    ];
    return defs.map((d) => {
        const i = ch(db, d.key);
        return {
            ...d, fields: FIELDS[d.key] ?? [], notice: d.key === 'web' ? 'Ava reenvía cada mensaje del widget a este webhook y devuelve su respuesta.' : null,
            connection: d.key === 'whatsapp' && i ? { label: i.state === 'verified' ? 'Conectado' : 'Verificación en curso', tone: i.state === 'verified' ? 'green' : 'blue', webhook: { url: 'https://tu-dominio.example/api/webhooks/whatsapp', public: true }, stages: [{ key: 'credentials', label: 'Credenciales guardadas', done: true, detail: 'Guardadas cifradas (demostración).' }, { key: 'webhook', label: 'Webhook verificado por Meta', done: false, detail: 'Pendiente: no hay conexión real con Meta en la demostración.' }, { key: 'traffic', label: 'Mensaje real recibido', done: false, detail: 'Pendiente.' }] } : null,
            integration: integrationCard(db, i), stored: {},
        };
    });
}

function gateways() {
    const spec = [
        { key: 'wompi', label: 'Wompi', description: 'Cobros con tarjeta y PSE en Colombia.', state: 'not_configured', note: 'Sin validación real en Sandbox.' },
        { key: 'cardnet', label: 'CardNET', description: 'Botón de pago de CardNET (República Dominicana).', state: 'protocol_pending', note: 'El protocolo no está implementado: falta la guía oficial de CardNET. No se ofrece a ningún cliente.' },
        { key: 'azul', label: 'AZUL', description: 'Pasarela AZUL (República Dominicana).', state: 'plan_disabled', note: 'Aplazada.' },
    ];
    return spec.map((g) => ({
        key: g.key, label: g.label, description: g.description, available: g.state !== 'plan_disabled', unavailable: g.state === 'plan_disabled' ? 'Deshabilitada por el plan de este Workspace.' : null, state: g.state, reasons: [g.note], blockedBy: [],
        needsIntegration: true, fields: GATEWAY_FIELDS, notice: 'Demostración: no se guarda ni se usa ninguna credencial real.', testable: false, labPayment: false, integration: null, stored: {},
    }));
}

const automation = (db) => {
    const n8n = ch(db, 'n8n');
    return {
        state: n8n?.state === 'verified' ? 'connected' : db.chatbots.some((b) => b.token) ? 'configured' : 'not_configured', endpoint: 'https://tu-dominio.example/api/agent/config', messagesEndpoint: 'https://tu-dominio.example/api/agent/messages',
        curl: { tokenVariable: 'AVA_AGENT_TOKEN', examples: [{ key: 'config', label: 'Leer la configuración', command: 'curl -H "Authorization: Bearer $AVA_AGENT_TOKEN" https://tu-dominio.example/api/agent/config' }] },
        lastSeen: null, chatbots: db.chatbots.map((b) => ({ id: b.id, name: b.name, isActive: b.is_active, hasToken: Boolean(b.token), tokenDaysLeft: b.token ? 70 : null, hint: b.token ? '…ab12' : null, lastSeen: null })),
        connection: n8n ? { id: n8n.id, state: n8n.state === 'verified' ? 'verified' : 'configured', baseUrl: 'https://n8n.ejemplo.com', host: 'n8n.ejemplo.com', apiKeySet: true, lastTest: n8n.tested_at ? { at: fmtDateTime(n8n.tested_at), ok: n8n.state === 'verified', message: 'Prueba simulada.' } : null, updatedAt: fmtDateTime(db.seededAt) } : { state: 'not_configured', id: null },
    };
};

const generic = (db) => (db.connections ?? []).map((c) => ({
    id: c.id, name: c.name, provider: c.provider, description: c.description, type: 'http', typeLabel: 'API HTTP', isActive: c.active, summary: { method: c.method, host: c.host, endpoint: c.endpoint, auth: 'Sin autenticación', timeout: 10 }, lastTest: null, updatedAt: fmtDateTime(c.updated_at),
    form: { name: c.name, provider: c.provider ?? '', description: c.description ?? '', type: 'http', is_active: c.active, method: c.method, url: `https://${c.host}${c.endpoint}`, auth_type: 'none', timeout: 10 },
}));

const CATALOG = {
    types: [{ value: 'http', label: 'API HTTP' }], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m })),
    authTypes: [{ value: 'none', label: 'Sin autenticación' }, { value: 'api_key', label: 'API Key' }, { value: 'bearer', label: 'Bearer Token' }, { value: 'basic', label: 'Basic Auth' }], apiKeyLocations: [{ value: 'header', label: 'Header' }, { value: 'query', label: 'Query parameter' }],
    defaultTimeout: 10, maxTimeout: 30, maxHeaders: 20, maxQuery: 20,
};

reg.get('integrations.index', ({ db }) => ({
    component: 'Integrations/Index',
    props: {
        channels: channels(db), providers: [], paymentGateways: gateways(), labPaymentLink: null, integrations: generic(db), catalog: CATALOG, automation: automation(db), metaPages: null, metaPlatform: null, webhooks: null, newWebhookSecret: null, inboundWebhooks: null, newInboundSecret: null,
        scope: { workspace: { id: db.workspace.id, name: db.workspace.name, code: db.workspace.code }, readOnly: false, canChoose: false, canManage: true, can: null },
    },
}));

reg.mut('integrations.channels.update', ({ db, params, data }) => {
    const key = params.channel;
    const missing = (FIELDS[key] ?? []).find((f) => f.required && f.kind !== 'secret' && !String(data[f.name] ?? '').trim());
    if (missing) return { errors: { [missing.name]: `${missing.label}: es obligatorio.` } };
    let i = ch(db, key);
    if (!i) { i = { id: take('integration', db.integrations), name: key === 'web' ? 'Widget del sitio web' : 'WhatsApp Clínica', type: key, typeLabel: key, state: 'untested', tested_at: null, active: true }; db.integrations.push(i); }
    Object.assign(i, { state: key === 'web' ? 'configured' : 'untested', tested_at: null, updated_at: iso(Date.now()) });
    audit(db, `Guardó la configuración del canal ${key}`);
    return { flash: { success: 'Configuración guardada (demostración: no se guardó ninguna credencial real).' } };
});
reg.mut('integrations.test', ({ db, params }) => {
    const i = db.integrations.find((x) => String(x.id) === params.integration);
    i.tested_at = iso(Date.now()); i.state = 'verified';
    return { flash: { success: 'Prueba simulada: no se contactó a ningún proveedor.' } };
});
reg.mut('integrations.activate', ({ db, params }) => { db.integrations.find((x) => String(x.id) === params.integration).active = true; return { flash: { success: 'Integración activada' } }; });
reg.mut('integrations.deactivate', ({ db, params }) => { db.integrations.find((x) => String(x.id) === params.integration).active = false; return { flash: { success: 'Integración desactivada' } }; });
reg.mut('integrations.payment-gateways.update', () => ({ flash: { warning: 'Demostración: las pasarelas de pago no guardan credenciales ni procesan cobros.' } }));

reg.mut('integrations.store', ({ db, data }) => {
    if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } };
    if (!/^https?:\/\//.test(String(data.url ?? ''))) return { errors: { url: 'Escribe una URL válida que empiece por http:// o https://.' } };
    const u = new URL(data.url);
    db.connections = db.connections ?? [];
    db.connections.push({ id: 1000 + take('connection', db.connections), name: data.name.trim(), provider: data.provider || null, description: data.description || null, active: true, method: data.method || 'GET', host: u.host, endpoint: u.pathname, updated_at: iso(Date.now()) });
    return { flash: { success: 'Integración creada (demostración: no se enviará ninguna solicitud real).' } };
});
reg.mut('integrations.update', ({ db, params, data }) => { const c = (db.connections ?? []).find((x) => String(x.id) === params.integration); if (c) Object.assign(c, { name: data.name ?? c.name, updated_at: iso(Date.now()) }); return { flash: { success: 'Integración actualizada' } }; });
reg.mut('integrations.destroy', ({ db, params }) => { db.connections = (db.connections ?? []).filter((x) => String(x.id) !== params.integration); return { flash: { success: 'Conexión retirada' } }; });
reg.mut('integrations.n8n.update', ({ db }) => {
    let i = ch(db, 'n8n');
    if (!i) { i = { id: take('integration', db.integrations), name: 'Flujos de n8n', type: 'n8n', typeLabel: 'n8n', state: 'untested', tested_at: null, active: true }; db.integrations.push(i); }
    return { flash: { success: 'Conexión con n8n guardada (demostración).' } };
});

reg.api('integrations.calls.index', () => ({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 15, links: [], from: 0, to: 0 }));

import { reg } from '../server';
import { take } from '../db';
import { fmtDateTime, iso } from '../util';
import { audit } from './conversations';

const CHANNELS = {
    web: { label: 'Web', description: 'Widget de chat para insertar en el sitio web del cliente.', integration: 'web', conversations: true, kind: 'widget' },
    whatsapp: { label: 'WhatsApp', description: 'Conversaciones con el número de WhatsApp Business del Workspace.', integration: 'whatsapp', conversations: true, kind: 'button' },
    instagram: { label: 'Instagram', description: 'Mensajes directos de la cuenta profesional de Instagram del Workspace.', integration: 'instagram', conversations: true, kind: null, unavailable: 'Falta configurar la app de Meta de la plataforma.' },
    messenger: { label: 'Messenger', description: 'Mensajes de la página de Facebook del Workspace.', integration: 'messenger', conversations: true, kind: null, unavailable: 'Falta configurar la app de Meta de la plataforma.' },
};

const OPTIONS = {
    positions: [{ value: 'bottom-right', label: 'Inferior derecha' }, { value: 'bottom-left', label: 'Inferior izquierda' }],
    openBehaviors: [{ value: 'click', label: 'Al hacer clic' }, { value: 'auto', label: 'Abrir solo a los 5 segundos' }],
    icons: [{ value: 'avatar', label: 'Avatar del chatbot' }, { value: 'channel', label: 'Icono del canal' }],
    ranges: { size: { min: 48, max: 72, step: 4 }, shape: { min: 0, max: 50, step: 5 }, shadow: { min: 0, max: 4, step: 1 }, widgetSize: { min: 320, max: 420, step: 10 }, radius: { min: 0, max: 28, step: 1 } },
    maxLength: { buttonText: 40, headerTitle: 40, welcomeMessage: 280, message: 200 },
};

const DEFAULTS = {
    widget: { enabled: true, button_text: null, header_title: null, welcome_message: null, icon: 'avatar', primary_color: null, text_color: null, size: 60, shape: 50, position: 'bottom-right', shadow: 2, widget_size: 370, radius: 16, open_behavior: 'click' },
    button: { enabled: true, button_text: null, message: null, icon: 'channel', primary_color: null, text_color: null, size: 60, shape: 50, position: 'bottom-right', shadow: 2 },
};

const BLOCKS = [
    ['identity', 'Bloque 1 · Identidad y comunicación', 'Quién es el asistente, su rol y propósito, la personalidad y el tono, el idioma y cómo se dirige a las personas.', 'modular'],
    ['knowledge', 'Bloque 2 · Memoria y conocimiento', 'Cómo usa el contexto y los documentos de la base de conocimiento, y qué hace cuando no tiene información suficiente.', 'modular'],
    ['limits', 'Bloque 3 · Comportamiento, reglas y derivación', 'Cómo actúa ante solicitudes concretas, qué datos pide antes de continuar y cuándo pasa la conversación a una persona.', 'modular'],
    ['legacy', 'Prompt completo', 'Un solo texto con todas las instrucciones del asistente. Es el que se envía mientras el modo sea Single.', 'single'],
];

const hash = (text) => { let h = 0; for (const ch of String(text ?? '')) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0; return String(h >>> 0); };
const find = (db, id) => db.chatbots.find((b) => String(b.id) === String(id));

function blocksOf(b) { return BLOCKS.map(([key, label, help, mode]) => { const text = b.instructions?.[key] ?? ''; return { key, mode, label, help, text, hash: hash(text), chars: text.length }; }); }

function channelState(db, b, key) {
    const spec = CHANNELS[key];
    if (spec.unavailable) return 'unavailable';
    const row = b.channelStates?.[key];
    const integration = db.integrations.find((i) => i.type === spec.integration);
    if (!integration) return 'not_configured';
    if (!integration.active) return 'integration_inactive';
    const other = db.chatbots.find((x) => x.id !== b.id && x.channelStates?.[key] === 'active');
    if (other && row !== 'active') return 'in_use';
    return row === 'active' ? 'active' : 'inactive';
}

function channelList(db, b) {
    return Object.entries(CHANNELS).map(([key, spec]) => {
        const state = channelState(db, b, key);
        const integration = db.integrations.find((i) => i.type === spec.integration);
        return {
            key, label: spec.label, description: spec.description, unavailable: spec.unavailable ?? null, state, usedBy: state === 'in_use' ? db.chatbots.find((x) => x.id !== b.id && x.channelStates?.[key] === 'active')?.name : null,
            conversations: spec.conversations, testable: key === 'whatsapp', connection: integration?.tested_at ? { ok: integration.state === 'verified', message: 'Conexión probada (simulada).', at: fmtDateTime(integration.tested_at) } : null,
            installCode: state === 'active' && spec.kind === 'widget' ? '<script src="https://tu-dominio.example/widget/ava-widget.js" data-chatbot="CLAVE-PUBLICA-DE-EJEMPLO" defer></script>' : null,
        };
    });
}

function appearanceList(db, b) {
    return Object.entries(CHANNELS).filter(([, s]) => s.kind || s.unavailable).map(([key, spec]) => {
        if (spec.unavailable) return { key, label: spec.label, available: false };
        const saved = b.appearance?.[key];
        return {
            key, label: spec.label, available: true, kind: spec.kind, saved: Boolean(saved), values: { ...DEFAULTS[spec.kind], ...(saved ?? {}) }, defaultPrimary: key === 'whatsapp' ? '#128C7E' : db.workspace.settings.primaryColor,
            destination: key === 'whatsapp' ? { ready: true, message: null, number: '573000001001' } : { ready: true, message: null, number: null },
        };
    });
}

const scope = (db) => ({ workspace: { id: db.workspace.id, name: db.workspace.name, code: db.workspace.code }, readOnly: false, canChoose: false, canManage: true, can: { create: true, edit: true, activate: true, channels: true, tokens: true } });

reg.get('chatbots.index', ({ db }) => ({
    component: 'Chatbots/Index',
    props: {
        chatbots: [...db.chatbots].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ id: b.id, name: b.name, description: b.description, isActive: b.is_active, avatarUrl: null, activeChannels: Object.entries(CHANNELS).filter(([k]) => channelState(db, b, k) === 'active').map(([, s]) => s.label), updatedAt: fmtDateTime(b.updated_at ?? b.created_at) })),
        scope: scope(db),
    },
}));

reg.get('chatbots.show', ({ db, params }) => {
    const b = find(db, params.chatbot);
    const versions = (b.versions ?? []).slice().reverse().slice(0, 10);
    return {
        component: 'Chatbots/Show',
        props: {
            chatbot: {
                id: b.id, name: b.name, description: b.description ?? '', instructions: b.instructions?.legacy ?? '', instructionBlocks: blocksOf(b),
                instructionStatus: { version: b.instructionVersion ?? 1, mode: b.mode === 'single' ? 'single' : 'modular', syncedVersion: null, syncedAt: null, state: 'never', label: 'Guardado en Zonno. n8n todavía no ha confirmado que lo recibió (simulado).' },
                instructionVersions: versions, isActive: b.is_active, profileSaved: true, avatarUrl: null,
            },
            agentToken: { endpoint: `${window.location.origin}/api/agent/config`, configured: Boolean(b.token), hint: b.token ? '…ab12' : null, createdAt: b.token ? fmtDateTime(b.token.createdAt) : null, token: b.token?.fresh ?? null, lifecycle: null },
            channels: channelList(db, b),
            appearance: { channels: appearanceList(db, b), options: OPTIONS, mode: db.workspace.settings.appearance, scriptUrl: '/widget/ava-widget.js' },
            instructionsMax: 12000, avatar: { maxKb: 1024 }, feedback: [],
            knowledge: { documents: b.knowledge ?? [], extensions: ['pdf', 'txt', 'md', 'docx'], maxKb: 5120 },
            scope: scope(db),
        },
    };
});

reg.mut('chatbots.store', ({ db, data }) => {
    const name = String(data.name ?? '').trim();
    if (!name) return { errors: { name: 'El nombre es obligatorio.' } };
    const b = { id: take('chatbot', db.chatbots), name, description: data.description || '', is_active: false, workflow: null, mode: 'modular', channels: [], channelStates: {}, instructions: {}, created_at: iso(Date.now()), updated_at: iso(Date.now()), knowledge: [] };
    db.chatbots.push(b);
    audit(db, `Creó el chatbot «${name}»`, 'created');
    return { redirect: `/chatbots/${b.id}`, flash: { success: 'Chatbot creado correctamente' } };
});
reg.mut('chatbots.update', ({ db, params, data }) => {
    const b = find(db, params.chatbot);
    const name = String(data.name ?? '').trim();
    if (!name) return { errors: { name: 'El nombre es obligatorio.' } };
    Object.assign(b, { name, description: data.description ?? b.description, updated_at: iso(Date.now()) });
    audit(db, `Actualizó el chatbot «${name}»`);
    return { redirect: `/chatbots/${b.id}`, flash: { success: 'Chatbot actualizado correctamente' } };
});
reg.mut('chatbots.activate', ({ db, params }) => { find(db, params.chatbot).is_active = true; return { redirect: `/chatbots/${params.chatbot}`, flash: { success: 'Chatbot activado correctamente' } }; });
reg.mut('chatbots.deactivate', ({ db, params }) => { find(db, params.chatbot).is_active = false; return { redirect: `/chatbots/${params.chatbot}`, flash: { success: 'Chatbot desactivado correctamente' } }; });
reg.mut('chatbots.channels.update', ({ db, params, data }) => {
    const b = find(db, params.chatbot);
    b.channelStates = { ...(b.channelStates ?? {}), [params.channel]: data.is_active ? 'active' : 'inactive' };
    return { redirect: `/chatbots/${b.id}`, flash: { success: data.is_active ? 'Canal activado' : 'Canal desactivado' } };
});
reg.mut('chatbots.channels.appearance.update', ({ db, params, data }) => {
    const b = find(db, params.chatbot);
    b.appearance = { ...(b.appearance ?? {}), [params.channel]: { ...(b.appearance?.[params.channel] ?? {}), ...data } };
    return { redirect: `/chatbots/${b.id}`, flash: { success: 'Apariencia guardada' } };
});
reg.mut('chatbots.instructions.update', ({ db, params, data }) => {
    const b = find(db, params.chatbot);
    const text = String(data.text ?? '');
    if (!text.trim()) return { errors: { text: 'El texto no puede estar vacío.' } };
    b.instructions = { ...(b.instructions ?? {}), [params.block]: text };
    b.instructionVersion = (b.instructionVersion ?? 1) + 1;
    b.versions = [...(b.versions ?? []), { version: b.instructionVersion, at: fmtDateTime(iso(Date.now())), author: 'Laura Méndez', source: 'manual', blocks: [params.block] }];
    audit(db, `Actualizó las instrucciones de «${b.name}»`);
    return { redirect: `/chatbots/${b.id}`, flash: { success: 'Instrucciones guardadas' } };
});
reg.mut('chatbots.instructions.mode', ({ db, params, data }) => { find(db, params.chatbot).mode = data.mode; return { redirect: `/chatbots/${params.chatbot}`, flash: { success: 'Modo de instrucciones actualizado' } }; });
reg.mut('chatbots.agent-token.generate', ({ db, params }) => { const b = find(db, params.chatbot); b.token = { createdAt: iso(Date.now()), fresh: 'demo_' + 'x'.repeat(8) + '-token-ficticio-no-valido' }; return { redirect: `/chatbots/${b.id}`, flash: { success: 'Token generado (ficticio: no abre ninguna API).' } }; });
reg.mut('chatbots.agent-token.rotate', ({ db, params }) => { const b = find(db, params.chatbot); b.token = { createdAt: iso(Date.now()), fresh: 'demo_' + 'y'.repeat(8) + '-token-ficticio-no-valido' }; return { redirect: `/chatbots/${b.id}`, flash: { success: 'Token rotado (ficticio).' } }; });
reg.mut('chatbots.agent-token.revoke', ({ db, params }) => { find(db, params.chatbot).token = null; return { redirect: `/chatbots/${params.chatbot}`, flash: { success: 'Token revocado' } }; });
reg.mut('chatbots.knowledge.store', ({ db, params, data }) => {
    const b = find(db, params.chatbot);
    b.knowledge = [...(b.knowledge ?? []), { id: take('knowledge', b.knowledge ?? []), name: data.name ?? 'documento-demo.pdf', status: 'ready', sizeKb: 48, createdAt: fmtDateTime(iso(Date.now())), linked: true }];
    return { redirect: `/chatbots/${b.id}`, flash: { success: 'Documento agregado (simulado: no se sube ningún archivo).' } };
});

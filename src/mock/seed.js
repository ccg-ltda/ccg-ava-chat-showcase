/**
 * The ONE set of demonstration data. All people, companies, phone numbers and messages are fictional.
 * Relations are real: a customer has conversations, appointments, orders and survey answers that point back to them.
 */
import { DAY, HOUR, MIN, iso, rng } from './util';
import { seedBooking } from './seed/booking';
import { seedCommerce } from './seed/commerce';
import { seedAdmin } from './seed/admin';

export const SEED_VERSION = 1;

export const CHANNELS = { web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger' };

export function makeSeed(now = Date.now()) {
    const rand = rng(11);
    const ago = (ms) => iso(now - ms);

    const db = {
        version: SEED_VERSION,
        seededAt: now,
        counters: {},
        workspace: {
            id: 1, code: 'CLN-DEMO', name: 'Clínica Demo', organization: 'Grupo Salud Demo', description: 'Workspace ficticio para la demostración.',
            settings: { appearance: 'light', primaryColor: '#1d4ed8', logoUrl: null, currency: 'COP', timezone: 'America/Bogota', dateFormat: 'dmy', timeFormat: '24h', tax: { country: 'CO', enabled: true, name: 'IVA', rate: '19.00' } },
        },
        users: [
            { id: 1, name: 'Laura Méndez', email: 'laura.mendez@demo.test', role: 'admin', active: true, last_login: ago(20 * MIN), locations: [] },
            { id: 2, name: 'Andrés Rojas', email: 'andres.rojas@demo.test', role: 'agente', active: true, last_login: ago(3 * HOUR), locations: [] },
            { id: 3, name: 'Camila Ortiz', email: 'camila.ortiz@demo.test', role: 'supervisor', active: true, last_login: ago(DAY), locations: [] },
            { id: 4, name: 'Sergio Pardo', email: 'sergio.pardo@demo.test', role: 'agente', active: false, last_login: ago(40 * DAY), locations: [] },
        ],
        me: 1,
        customers: [], conversations: [], messages: [], surveyResponses: [], audit: [], notifications: [], savedFilters: [],
    };

    const people = [
        ['Valeria Núñez', 'whatsapp'], ['Mateo Salcedo', 'web'], ['Sofía Bermúdez', 'instagram'], ['Daniel Ferrer', 'messenger'],
        ['Isabela Cortés', 'whatsapp'], ['Tomás Aguirre', 'whatsapp'], ['Mariana Pizarro', 'web'], ['Julián Escobar', 'whatsapp'],
        ['Natalia Rincón', 'instagram'], ['Felipe Cardona', 'messenger'], ['Paula Giraldo', 'whatsapp'], ['Esteban Lozano', 'web'],
    ];
    people.forEach(([name, origin], i) => {
        const id = i + 1;
        const [firstName, ...rest] = name.split(' ');
        db.customers.push({
            id, name, firstName, lastName: rest.join(' '), email: `${firstName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${id}@ejemplo.test`,
            phone: `+57 300 000 ${String(1000 + id)}`, origin, source: id % 4 === 0 ? 'manual' : id % 3 === 0 ? 'booking' : 'conversation', tags: [], notes: null, active: true,
            consent: id % 5 === 3 ? 'revoked' : id % 4 === 2 ? 'unknown' : 'granted', consent_channel: 'whatsapp', consent_note: null,
            preferred_channel: origin === 'whatsapp' ? 'whatsapp' : 'email', created_at: ago((50 - id * 2) * DAY),
            identities: [{ channel: origin, external_id: origin === 'instagram' ? `@${firstName.toLowerCase()}_${id}` : `+57 300 000 ${String(1000 + id)}` }],
        });
    });
    db.customers[0].tags = ['Limpieza', 'Recurrente']; db.customers[1].tags = ['Facturación']; db.customers[2].tags = ['Tienda'];
    db.customers[3].tags = ['Pedidos']; db.customers[4].tags = ['Ortodoncia']; db.customers[5].tags = ['Valoración'];
    db.tagCatalog = ['Limpieza', 'Recurrente', 'Facturación', 'Tienda', 'Pedidos', 'Ortodoncia', 'Valoración'].map((name, i) => ({ id: i + 1, name, isActive: true }));

    db.chatbots = [
        {
            id: 1, name: 'Asistente Clínica Demo', description: 'Atiende citas e información de la clínica.', is_active: true, workflow: 'flujo-clinica', mode: 'modular',
            channelStates: { web: 'active', whatsapp: 'active' }, token: { createdAt: ago(20 * DAY) }, instructionVersion: 3, created_at: ago(60 * DAY), updated_at: ago(2 * DAY),
            knowledge: [{ id: 1, name: 'Preguntas frecuentes de la clínica.pdf', status: 'ready', sizeKb: 220, createdAt: ago(30 * DAY), linked: true }],
            instructions: { identity: 'Eres el asistente virtual de una clínica dental. Hablas con calidez y claridad, tratas de «tú» y respondes siempre en español.', knowledge: 'Usa solo la información de la base de conocimiento y de las herramientas de agenda. Si no sabes algo, dilo y ofrece pasar con una persona.', limits: 'Para facturación, quejas o urgencias, deriva a un agente humano. Antes de agendar pide nombre y teléfono.' },
        },
        {
            id: 2, name: 'Asistente Tienda Demo', description: 'Catálogo y pedidos de la tienda.', is_active: true, workflow: 'flujo-tienda', mode: 'modular',
            channelStates: { web: 'inactive' }, token: null, instructionVersion: 2, created_at: ago(45 * DAY), updated_at: ago(5 * DAY), knowledge: [],
            instructions: { identity: 'Eres el asistente de una tienda de ropa y accesorios. Eres cercano y breve.', knowledge: 'Consulta el catálogo con las herramientas de pedidos; no inventes precios ni existencias.', limits: 'Nunca cambias el estado de un pedido. Si el cliente reclama, pasa con un agente.' },
        },
    ];

    let messageId = 1;
    const push = (conversation, direction, sender, body, at, extra = {}) => {
        db.messages.push({ id: messageId++, conversation_id: conversation.id, direction, sender, sender_user_id: extra.user ?? null, type: 'text', body, status: direction === 'out' ? 'delivered' : 'received', sent_at: iso(at), simulated: false, ...extra, user: undefined });
        conversation.last_message_at = iso(at);
    };
    let conversationId = 1;
    const open = (customer, chatbot, channel, handling, createdAgo, extra = {}) => {
        const c = {
            id: conversationId++, chatbot_id: chatbot, channel, customer_id: customer.id, contact_id: channel === 'instagram' ? `@${customer.name.split(' ')[0].toLowerCase()}_${customer.id}` : customer.phone,
            contact_name: customer.name, handling, assigned_user_id: null, handoff_reason: null, handoff_requested_at: null, created_at: ago(createdAgo), last_message_at: ago(createdAgo), demo: false, ...extra,
        };
        db.conversations.push(c);
        return c;
    };

    /* --- Today: hand-written conversations, the ones the guided tour walks through --- */
    const c1 = open(db.customers[0], 1, 'whatsapp', 'ai', 14 * MIN);
    push(c1, 'in', 'contact', 'Hola, quisiera una cita de limpieza dental', now - 14 * MIN);
    push(c1, 'out', 'ai', 'Claro, Valeria. Tengo disponibilidad el jueves a las 9:00 o a las 15:30 en Sede Centro. ¿Cuál prefieres?', now - 13 * MIN);
    push(c1, 'in', 'contact', 'El jueves a las 9', now - 12 * MIN);

    const c2 = open(db.customers[1], 1, 'web', 'pending', 25 * MIN, { handoff_reason: 'El cliente pide hablar con una persona por un tema de facturación.', handoff_requested_at: ago(20 * MIN) });
    push(c2, 'in', 'contact', 'Tengo un problema con mi factura de octubre', now - 25 * MIN);
    push(c2, 'out', 'ai', 'Lamento el inconveniente. Para temas de facturación te paso con un asesor.', now - 24 * MIN);
    push(c2, 'in', 'contact', 'Necesito hablar con una persona', now - 21 * MIN);

    const c3 = open(db.customers[2], 2, 'instagram', 'human', 55 * MIN, { assigned_user_id: 1 });
    push(c3, 'in', 'contact', '¿Tienen la camiseta básica en talla M?', now - 55 * MIN);
    push(c3, 'out', 'ai', 'Déjame revisar el inventario de las sedes.', now - 54 * MIN);
    push(c3, 'out', 'agent', 'Hola Sofía, soy Laura. En la sede Norte quedan 8 unidades; te la puedo separar.', now - 40 * MIN, { user: 1 });
    push(c3, 'in', 'contact', 'Sí, sepárala por favor', now - 36 * MIN);

    const c4 = open(db.customers[3], 2, 'messenger', 'resolved', 3 * HOUR + 20 * MIN, { assigned_user_id: 2 });
    push(c4, 'in', 'contact', '¿Cuál es el estado de mi pedido PD-0087?', now - 3 * HOUR - 20 * MIN);
    push(c4, 'out', 'ai', 'Tu pedido PD-0087 está Despachado y llega hoy antes de las 6 p. m.', now - 3 * HOUR - 19 * MIN);
    push(c4, 'in', 'contact', 'Gracias, todo resuelto', now - 3 * HOUR - 15 * MIN);

    const c5 = open(db.customers[4], 1, 'whatsapp', 'resolved', 5 * HOUR);
    push(c5, 'in', 'contact', 'Confirmo mi cita del martes', now - 5 * HOUR);
    push(c5, 'out', 'ai', 'Listo, tu cita queda confirmada. Te recordaremos 24 horas antes.', now - 5 * HOUR + MIN);

    /* --- History: 30 days of mostly AI-resolved conversations, so the charts and reports have a real shape --- */
    const openers = ['¿Atienden los sábados?', 'Quiero reprogramar mi cita', '¿Cuánto cuesta una valoración?', 'Necesito una cita esta semana', '¿Dónde queda la sede Norte?', 'Quiero cancelar mi cita', '¿Tienen disponibilidad mañana?'];
    const answers = ['Sí, atendemos de 9:00 a 13:00 en Sede Norte.', 'Claro, te muestro los horarios disponibles.', 'La valoración general cuesta $ 50.000.', 'Te ayudo con eso ahora mismo.', 'Está en la carrera 15 # 100-20.'];
    for (let i = 0; i < 150; i += 1) {
        const customer = db.customers[Math.floor(rand() * db.customers.length)];
        const bot = customer.origin === 'instagram' || customer.origin === 'messenger' ? 2 : 1;
        const at = now - (8 * HOUR + rand() * 58 * DAY);
        const handled = rand();
        const c = open(customer, bot, customer.origin, 'resolved', now - at, { assigned_user_id: handled > 0.78 ? 2 : null });
        push(c, 'in', 'contact', openers[Math.floor(rand() * openers.length)], at);
        push(c, 'out', 'ai', answers[Math.floor(rand() * answers.length)], at + MIN);
        if (handled > 0.78) push(c, 'out', 'agent', 'Hola, te ayudo personalmente con este tema.', at + 6 * MIN, { user: 2 });
        push(c, 'in', 'contact', 'Perfecto, gracias.', at + 9 * MIN);
    }

    db.counters = { message: messageId, conversation: conversationId };

    seedBooking(db, { now, ago, rand });
    seedCommerce(db, { now, ago, rand });
    seedAdmin(db, { now, ago, rand });
    return db;
}

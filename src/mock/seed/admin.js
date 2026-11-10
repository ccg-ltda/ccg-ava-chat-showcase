import { DAY, HOUR, MIN } from '../util';

export function seedAdmin(db, { ago, rand }) {
    db.integrations = [
        { id: 1, name: 'WhatsApp Clínica', type: 'whatsapp', typeLabel: 'WhatsApp', state: 'untested', tested_at: null, active: true, chatbot_id: 1 },
        { id: 2, name: 'Widget del sitio web', type: 'web', typeLabel: 'Web', state: 'configured', tested_at: null, active: true, chatbot_id: 1 },
        { id: 3, name: 'Flujos de n8n', type: 'n8n', typeLabel: 'n8n', state: 'untested', tested_at: null, active: true, chatbot_id: null },
    ];

    db.surveys = [{ id: 1, name: 'Satisfacción de la atención', scaleMax: 5, mode: 'whatsapp', active: true, trigger: 'conversation_resolved' }];
    db.surveyResponses = [];
    const comments = ['Atención rápida y clara.', 'Todo bien, el horario tardó en confirmarse.', 'Me ayudaron a la primera.', 'Buen servicio.', null, null, 'Tardaron en responder.', 'Excelente, muy amables.'];
    let id = 1;
    db.conversations.filter((c) => c.handling === 'resolved').forEach((c, i) => {
        if (i % 2 === 1 && i > 3) return; // not every conversation is answered
        const rating = [5, 5, 5, 4, 4, 3, 5, 2][Math.floor(rand() * 8)];
        const answered = i % 7 !== 6;
        db.surveyResponses.push({
            id: id++, survey_id: 1, customer_id: c.customer_id, conversation_id: c.id, origin: 'conversation', origin_id: c.id, status: answered ? 'answered' : 'sent', mode: 'whatsapp',
            rating: answered ? rating : null, comment: answered ? comments[Math.floor(rand() * comments.length)] : null,
            sent_at: new Date(new Date(c.last_message_at).getTime() + 2 * MIN).toISOString(), answered_at: answered ? new Date(new Date(c.last_message_at).getTime() + 20 * MIN).toISOString() : null,
        });
    });
    db.counters.surveyResponse = id;

    db.audit = [
        ['Cambió el plan del Workspace a «Plan Clínica»', 2 * DAY], ['Creó el chatbot «Asistente Tienda Demo»', 12 * DAY], ['Invitó a camila.ortiz@demo.test como supervisor', 20 * DAY],
        ['Actualizó los horarios del profesional Dra. Paula Vega', 30 * HOUR], ['Conectó el canal Web', 25 * DAY], ['Cambió la apariencia del Workspace', 5 * DAY],
    ].map(([description, back], i) => ({ id: i + 1, description, user: 'Laura Méndez', at: ago(back), event: 'updated' }));
    db.counters.audit = db.audit.length + 1;

    db.notifications = [
        { id: 1, title: 'Conversación pendiente de agente', body: 'Mateo Salcedo pide hablar con una persona.', href: '/conversations?c=2', read: false, created_at: ago(20 * MIN) },
        { id: 2, title: 'Nueva cita solicitada', body: 'Valeria Núñez solicitó una limpieza dental.', href: '/bookings', read: false, created_at: ago(2 * HOUR) },
    ];
}

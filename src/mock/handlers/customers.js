import { reg } from '../server';
import { take } from '../db';
import { includes, iso, listPage, PER_PAGE_OPTIONS } from '../util';
import { audit } from './conversations';

const OPTIONS = {
    sources: { manual: 'Alta manual', conversation: 'Conversación', booking: 'Reserva', import: 'Importación' },
    consents: { unknown: 'Sin registrar', granted: 'Autorizado', revoked: 'Dado de baja' },
    consentChannels: { in_person: 'En persona', whatsapp: 'WhatsApp', call: 'Llamada telefónica', email: 'Correo electrónico', sms: 'SMS', web: 'Formulario web' },
    preferences: { whatsapp: 'WhatsApp', sms: 'SMS', call: 'Llamada telefónica', email: 'Correo electrónico' },
    channels: { whatsapp: 'WhatsApp', web: 'Web', instagram: 'Instagram', messenger: 'Messenger' },
};

export const fullName = (c) => `${c.firstName} ${c.lastName}`.trim();

export function customerSummary(c) {
    return {
        id: c.id, firstName: c.firstName, lastName: c.lastName, fullName: fullName(c), phone: c.phone, email: c.email, source: c.source, consent: c.consent,
        preferredChannel: c.preferred_channel, legacyPreferredChannel: null, isActive: c.active, anonymized: Boolean(c.anonymized), notes: c.notes, consentNote: c.consent_note,
        consentChannel: c.consent_channel, tags: [...c.tags].sort(), identities: c.identities,
    };
}

const allTags = (db) => [...new Set(db.customers.flatMap((c) => c.tags))].sort();
const options = (db) => ({ ...OPTIONS, tags: allTags(db), tagCatalog: db.tagCatalog.filter((t) => t.isActive).map((t) => t.name) });

function tagAdmin(db, query) {
    const search = (query.tag_search ?? '').trim();
    return {
        search,
        data: db.tagCatalog.filter((t) => !search || includes(t.name, search)).map((t) => ({ id: t.id, name: t.name, isActive: t.isActive, customers: db.customers.filter((c) => c.tags.includes(t.name)).length })),
        possibleDuplicates: [], canCreate: true, canEdit: true,
    };
}

reg.get('customers.index', ({ db, query }) => {
    const f = Object.fromEntries(['search', 'source', 'consent', 'tag', 'status'].map((k) => [k, (query[k] ?? '').trim()]));
    const rows = db.customers
        .filter((c) => !f.search || includes(fullName(c), f.search) || includes(c.email, f.search) || includes(c.phone, f.search))
        .filter((c) => !f.source || c.source === f.source).filter((c) => !f.consent || c.consent === f.consent).filter((c) => !f.tag || c.tags.includes(f.tag))
        .filter((c) => !f.status || (f.status === 'active' ? c.active : !c.active))
        .sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const { page, perPage } = listPage(rows, query, 'customers');
    return {
        component: 'Customers/Index',
        props: { customers: { data: page.data.map(customerSummary), meta: page.meta }, filters: { ...f, perPage }, perPageOptions: PER_PAGE_OPTIONS, options: options(db), tagAdmin: tagAdmin(db, query), total: db.customers.length },
    };
});

reg.get('customers.show', ({ db, params }) => {
    const c = db.customers.find((x) => String(x.id) === params.customer);
    const conversations = db.conversations.filter((v) => c.identities.some((i) => i.channel === v.channel && i.external_id === v.contact_id))
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)).slice(0, 20).map((v) => ({ id: v.id, channel: v.channel, handling: v.handling, lastMessageAt: v.last_message_at }));
    const appointments = (db.appointments ?? []).filter((a) => a.customer_id === c.id).sort((a, b) => b.starts_at.localeCompare(a.starts_at)).slice(0, 20)
        .map((a) => ({ id: a.id, serviceName: a.service_name, professionalName: a.professional_name, price: a.price_amount, currency: a.price_currency, startsAt: a.starts_at, status: a.status }));
    return {
        component: 'Customers/Show',
        props: { customer: { ...customerSummary(c), consentAt: c.consent === 'granted' ? c.created_at : null, createdAt: c.created_at }, conversations, appointments, campaigns: [], options: options(db) },
    };
});

function validate(data) {
    const errors = {};
    if (!String(data.first_name ?? '').trim()) errors.first_name = 'El nombre es obligatorio.';
    if (!String(data.phone ?? '').trim() && !String(data.email ?? '').trim() && !(data.identities ?? []).length) errors.phone = 'Indica al menos un teléfono, un correo o un canal para reconocer a la persona.';
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.email = 'El correo no es válido.';
    return errors;
}

const apply = (c, d) => Object.assign(c, {
    firstName: d.first_name.trim(), lastName: (d.last_name ?? '').trim(), phone: d.phone || null, email: d.email || null, source: d.source || 'manual', notes: d.notes || null,
    consent: d.marketing_consent || 'unknown', consent_note: d.consent_note || null, consent_channel: d.consent_channel || null, preferred_channel: d.preferred_channel || null,
    tags: [...(d.tags ?? [])], identities: (d.identities ?? []).filter((i) => i.external_id),
});

reg.mut('customers.store', ({ db, data }) => {
    const errors = validate(data);
    if (Object.keys(errors).length) return { errors };
    const c = { id: take('customer', db.customers), active: true, created_at: iso(Date.now()), origin: 'web' };
    apply(c, data); c.name = fullName(c);
    db.customers.push(c);
    audit(db, `Creó el cliente «${fullName(c)}»`, 'created');
    return { redirect: `/customers/${c.id}`, flash: { success: 'Cliente creado correctamente' } };
});
reg.mut('customers.update', ({ db, params, data }) => {
    const errors = validate(data);
    if (Object.keys(errors).length) return { errors };
    const c = db.customers.find((x) => String(x.id) === params.customer);
    apply(c, data); c.name = fullName(c);
    audit(db, `Actualizó el cliente «${fullName(c)}»`);
    return { flash: { success: 'Cliente actualizado correctamente' } };
});
reg.mut('customers.activate', ({ db, params }) => { db.customers.find((x) => String(x.id) === params.customer).active = true; return { flash: { success: 'Cliente activado correctamente' } }; });
reg.mut('customers.deactivate', ({ db, params }) => { db.customers.find((x) => String(x.id) === params.customer).active = false; return { flash: { success: 'Cliente desactivado correctamente' } }; });
reg.mut('customers.anonymize', ({ db, params }) => {
    const c = db.customers.find((x) => String(x.id) === params.customer);
    Object.assign(c, { firstName: 'Cliente', lastName: 'anonimizado', name: 'Cliente anonimizado', phone: null, email: null, notes: null, identities: [], tags: [], anonymized: true, active: false });
    return { flash: { success: 'Datos personales eliminados. Las conversaciones y reservas de esta persona no se modifican.' } };
});

reg.mut('customers.tags.store', ({ db, data }) => {
    const name = String(data.name ?? '').trim();
    if (!name) return { errors: { name: 'Escribe el nombre de la etiqueta.' } };
    if (db.tagCatalog.some((t) => t.name.toLowerCase() === name.toLowerCase())) return { errors: { name: 'Ya existe una etiqueta con ese nombre.' } };
    db.tagCatalog.push({ id: take('tag', db.tagCatalog), name, isActive: true });
    return { flash: { success: 'Etiqueta creada correctamente' } };
});
reg.mut('customers.tags.update', ({ db, params, data }) => {
    const t = db.tagCatalog.find((x) => String(x.id) === params.tag);
    const name = String(data.name ?? '').trim();
    if (!name) return { errors: { name: 'Escribe el nombre de la etiqueta.' } };
    db.customers.forEach((c) => { c.tags = c.tags.map((x) => (x === t.name ? name : x)); });
    t.name = name;
    return { flash: { success: 'Etiqueta actualizada correctamente' } };
});
reg.mut('customers.tags.activate', ({ db, params }) => { db.tagCatalog.find((x) => String(x.id) === params.tag).isActive = true; return { flash: { success: 'Etiqueta activada' } }; });
reg.mut('customers.tags.deactivate', ({ db, params }) => { db.tagCatalog.find((x) => String(x.id) === params.tag).isActive = false; return { flash: { success: 'Etiqueta desactivada' } }; });
reg.mut('customers.tags.destroy', ({ db, params }) => {
    const t = db.tagCatalog.find((x) => String(x.id) === params.tag);
    db.customers.forEach((c) => { c.tags = c.tags.filter((x) => x !== t.name); });
    db.tagCatalog = db.tagCatalog.filter((x) => x !== t);
    return { flash: { success: 'Etiqueta eliminada' } };
});

reg.api('reminders.customers', ({ db, query }) => ({ data: db.customers.filter((c) => c.active && (!query.q || includes(fullName(c), query.q))).slice(0, 20).map((c) => ({ id: c.id, name: fullName(c), phone: c.phone, email: c.email })) }));

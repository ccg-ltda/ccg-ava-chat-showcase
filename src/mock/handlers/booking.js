import { reg } from '../server';
import { take } from '../db';
import { DAY, HOUR, MIN, fmtDate, fmtTime, includes, iso, PER_PAGE_OPTIONS, startOfLocalDay, ymd } from '../util';
import { audit } from './conversations';
import { fullName } from './customers';

export const STATUS_LABEL = { requested: 'Solicitada', confirmed: 'Confirmada', completed: 'Realizada', no_show: 'No asistió', cancelled: 'Cancelada', failed: 'Fallida' };
export const ORIGIN_LABEL = { admin: 'Agenda', web: 'Reserva web', chat: 'Ava Chat' };
const ACTIVE = ['requested', 'confirmed'];
const OFFSET = -5 * HOUR;
const localDate = (ms) => ymd(ms);
const localMinute = (ms) => { const d = new Date(ms + OFFSET); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const dateToMs = (date) => { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d) - OFFSET; };

export function presentAppointment(db, a) {
    const customer = db.customers.find((c) => c.id === a.customer_id);
    const start = new Date(a.starts_at).getTime();
    const end = new Date(a.ends_at).getTime();
    const originSuffix = a.origin_channel === 'whatsapp' ? ' · WhatsApp' : a.origin_channel === 'web' ? ' · Chat web' : '';
    return {
        id: a.id, service: a.service_name, serviceId: a.service_id, professional: a.professional_name, professionalId: a.professional_id, location: a.location_name, locationId: a.location_id,
        price: a.price_amount, currency: a.price_currency, startsAt: a.starts_at, endsAt: a.ends_at, date: localDate(start), dateLabel: fmtDate(start), timeLabel: fmtTime(start), endLabel: fmtTime(end),
        startMinute: localMinute(start), durationMinutes: Math.round((end - start) / MIN), restMinutes: a.rest_minutes ?? 0, status: a.status, statusLabel: STATUS_LABEL[a.status], active: ACTIVE.includes(a.status),
        customer: customer ? { name: fullName(customer), phone: customer.phone, email: customer.email } : { name: 'Cliente', phone: null, email: null }, customerConfirmed: Boolean(a.customer_confirmed),
        notes: a.notes, cancelReason: a.cancel_reason, provider: 'internal', external: false, syncStatus: null, syncError: null, notifications: [],
        originLabel: `${ORIGIN_LABEL[a.origin] ?? 'Agenda'}${originSuffix}`,
    };
}

const capabilities = () => ({ availability: true, book: true, reschedule: true, cancel: true, provider: 'internal', label: 'Agenda de Ava', external: false, connected: true, consentChannels: true, enabled: true, canCreate: true });

function locationHours(db) {
    return Object.fromEntries(db.locations.filter((l) => l.isActive).map((l) => [l.id, l.hours?.length ? Object.fromEntries(l.hours.map((h) => [h.weekday, [Number(h.opensAt.slice(0, 2)) * 60 + Number(h.opensAt.slice(3)), Number(h.closesAt.slice(0, 2)) * 60 + Number(h.closesAt.slice(3))]])) : null]));
}

function options(db) {
    const services = db.services.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, price: s.price, locationIds: s.locationIds, everywhere: db.locations.some((l) => l.offersAllServices), resourceIds: s.resourceIds }));
    const professionals = db.professionals.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name, serviceIds: p.serviceIds, locationIds: [...new Set(p.schedule.map((b) => b.locationId).filter(Boolean))] }));
    return { locationHours: locationHours(db), services, professionals, locations: db.locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name })), locationRequired: db.locations.filter((l) => l.isActive).length > 1, currency: db.workspace.settings.currency };
}

function settingsProps(db) {
    const s = db.bookingSettings;
    return {
        values: { provider: s.provider, requires_confirmation: s.requires_confirmation, min_notice_minutes: s.min_notice_minutes, max_advance_days: s.max_advance_days, cancel_notice_hours: s.cancel_notice_hours, slot_step_minutes: s.slot_step_minutes, require_phone: s.require_phone, require_email: s.require_email, public_enabled: s.public_enabled },
        providers: [{ value: 'internal', label: 'Agenda de Ava', available: true }], externalInPlan: false, steps: [5, 10, 15, 20, 30, 60], publicUrl: s.public_enabled ? `${window.location.origin}/reservar/demo` : null,
        notifications: {
            ready: true, values: { notify_received: s.notify_received, notify_confirmed: s.notify_confirmed, reminders_enabled: s.reminders_enabled, reminder_offsets: s.reminder_offsets, notify_integration_id: 1, messages: {} }, canSend: true, problem: null,
            accounts: [{ id: 1, name: 'WhatsApp Clínica' }], variables: ['nombre', 'servicio', 'profesional', 'sede', 'fecha', 'hora', 'negocio'],
            defaults: { received: 'Hola {{nombre}}, recibimos tu solicitud de cita de {{servicio}} para el {{fecha}} a las {{hora}}. Te avisaremos cuando {{negocio}} la confirme.', confirmed: 'Hola {{nombre}}, tu cita de {{servicio}} quedó confirmada para el {{fecha}} a las {{hora}}. {{negocio}}', reminder: 'Hola {{nombre}}, te recordamos tu cita de {{servicio}} el {{fecha}} a las {{hora}}. {{negocio}}' },
            limits: { max_count: 3, min: 15, max: 20160, text_max: 1000, window_hours: 24 },
        },
    };
}

const num = (v) => (v && /^\d+$/.test(String(v)) ? Number(v) : null);

function agendaRows(db, query, from, end) {
    const f = { professional: num(query.professional), location: num(query.location), service: num(query.service), status: STATUS_LABEL[query.status] ? query.status : null, origin: ORIGIN_LABEL[query.origin] ? query.origin : null };
    const search = (query.search ?? '').trim();
    return db.appointments.filter((a) => {
        const t = new Date(a.starts_at).getTime();
        if (t < from || t >= end) return false;
        if (f.professional && a.professional_id !== f.professional) return false;
        if (f.location && a.location_id !== f.location) return false;
        if (f.service && a.service_id !== f.service) return false;
        if (f.status && a.status !== f.status) return false;
        if (f.origin && a.origin !== f.origin) return false;
        if (search) { const c = db.customers.find((x) => x.id === a.customer_id); if (!includes(fullName(c), search) && !includes(c.phone, search) && !includes(a.service_name, search)) return false; }
        return true;
    }).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id - b.id);
}

reg.get('bookings.index', ({ db, query }) => {
    const today = localDate(Date.now());
    const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(query.from ?? '') ? query.from : today;
    const days = [1, 7, 31].includes(Number(query.days)) ? Number(query.days) : 7;
    const custom = Boolean(query.to);
    const month = days === 31 && !custom;
    let from = dateToMs(fromDate);
    let end;
    let to = null;
    let span = days;
    if (month) { const d = new Date(from + OFFSET); from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - OFFSET; end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - OFFSET; }
    else if (custom && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) { to = query.to; end = dateToMs(to) + DAY; span = Math.round((end - from) / DAY); }
    else end = from + days * DAY;
    const view = ['calendar', 'list'].includes(query.view) ? query.view : null;
    const rows = agendaRows(db, query, from, end);
    const dayCounts = month ? rows.reduce((acc, a) => { const k = localDate(new Date(a.starts_at).getTime()); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}) : null;
    return {
        component: 'Bookings/Index',
        props: {
            capabilities: capabilities(),
            filters: { from: ymd(from), to, days: span, period: month ? 'month' : custom ? 'custom' : days === 1 ? 'day' : 'week', view, professional: num(query.professional), location: num(query.location), service: num(query.service), status: STATUS_LABEL[query.status] ? query.status : null, origin: ORIGIN_LABEL[query.origin] ? query.origin : null, search: (query.search ?? '').trim() },
            dayCounts, appointments: month && view === 'calendar' ? [] : rows.slice(0, 400).map((a) => presentAppointment(db, a)), options: options(db),
            customers: null, centralClients: true, settings: settingsProps(db), perPageOptions: PER_PAGE_OPTIONS, today, listLimit: 400,
        },
    };
});

reg.api('bookings.day', ({ db, query }) => {
    const start = dateToMs(query.date);
    const rows = agendaRows(db, query, start, start + DAY);
    return { date: query.date, total: rows.length, truncated: false, appointments: rows.map((a) => presentAppointment(db, a)) };
});

reg.api('bookings.clients', ({ db, query }) => ({ clients: db.customers.filter((c) => c.active && (!query.q || includes(fullName(c), query.q) || includes(c.phone, query.q))).slice(0, 8).map((c) => ({ id: c.id, name: fullName(c), phone: c.phone, email: c.email, appointments: db.appointments.filter((a) => a.customer_id === c.id).length })) }));

/** Free starts: working hours of the professional (and of the sede), minus existing appointments, notice and exceptions. */
reg.api('bookings.availability', ({ db, query }) => {
    const service = db.services.find((s) => String(s.id) === String(query.service_id));
    if (!service) return { status: 422, json: { message: 'Elige un servicio.' } };
    const pros = db.professionals.filter((p) => p.isActive && p.serviceIds.includes(service.id) && (!query.professional_id || String(p.id) === String(query.professional_id)));
    const step = db.bookingSettings.slot_step_minutes;
    const ignore = Number(query.ignore_appointment) || null;
    const base = dateToMs(/^\d{4}-\d{2}-\d{2}$/.test(query.from ?? '') ? query.from : localDate(Date.now()));
    const slots = [];
    const minStart = Date.now() + db.bookingSettings.min_notice_minutes * MIN;
    for (let d = 0; d < Number(query.days || 7); d += 1) {
        const dayStart = base + d * DAY;
        const date = localDate(dayStart);
        const weekday = ((new Date(dayStart + OFFSET + 12 * HOUR).getUTCDay() + 6) % 7) + 1;
        if (db.exceptions.some((e) => (!e.professionalId || pros.some((p) => p.id === e.professionalId)) && date >= e.dateFrom && date <= e.dateTo && !e.startsAt && !e.professionalId)) continue;
        pros.forEach((pro) => {
            if (db.exceptions.some((e) => e.professionalId === pro.id && date >= e.dateFrom && date <= e.dateTo)) return;
            pro.schedule.filter((b) => b.weekday === weekday && (!query.location_id || !b.locationId || String(b.locationId) === String(query.location_id))).forEach((b) => {
                const [sh, sm] = b.startsAt.split(':').map(Number);
                const [eh, em] = b.endsAt.split(':').map(Number);
                for (let m = sh * 60 + sm; m + service.durationMinutes <= eh * 60 + em; m += step) {
                    const start = dayStart + m * MIN;
                    const stop = start + service.durationMinutes * MIN;
                    if (start < minStart) continue;
                    const clash = db.appointments.some((a) => a.id !== ignore && a.professional_id === pro.id && ACTIVE.includes(a.status) && new Date(a.starts_at).getTime() < stop + service.bufferMinutes * MIN && new Date(a.ends_at).getTime() + (a.rest_minutes ?? 0) * MIN > start);
                    if (!clash) slots.push({ date, startsAt: iso(start), endsAt: iso(stop), timeLabel: fmtTime(start), professionalId: pro.id, professionalName: pro.name });
                }
            });
        });
    }
    slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.professionalId - b.professionalId);
    return { slots: slots.slice(0, 120) };
});

function bookingErrors(data, rescheduling) {
    const errors = {};
    if (!data.starts_at) errors.starts_at = 'Elige un horario libre.';
    if (!rescheduling) {
        if (!data.service_id) errors.service_id = 'Elige un servicio.';
        const c = data.customer ?? {};
        if (!data.central_customer_id && !String(c.name ?? '').trim()) errors['customer.name'] = 'El nombre del cliente es obligatorio.';
    }
    return errors;
}

reg.mut('bookings.store', ({ db, data }) => {
    const errors = bookingErrors(data, false);
    if (Object.keys(errors).length) return { errors };
    const service = db.services.find((s) => String(s.id) === String(data.service_id));
    const pro = db.professionals.find((p) => String(p.id) === String(data.professional_id)) ?? db.professionals.find((p) => p.serviceIds.includes(service.id));
    const location = db.locations.find((l) => String(l.id) === String(data.location_id)) ?? db.locations[0];
    let customer = db.customers.find((c) => String(c.id) === String(data.central_customer_id));
    if (!customer) {
        const [firstName, ...rest] = String(data.customer.name).trim().split(' ');
        customer = { id: take('customer', db.customers), name: data.customer.name, firstName, lastName: rest.join(' '), email: data.customer.email || null, phone: data.customer.phone || null, origin: 'web', source: 'booking', tags: [], notes: null, active: true, consent: 'unknown', consent_channel: null, consent_note: null, preferred_channel: null, created_at: iso(Date.now()), identities: [] };
        db.customers.push(customer);
    }
    const start = new Date(data.starts_at).getTime();
    const a = {
        id: take('appointment', db.appointments), customer_id: customer.id, service_id: service.id, professional_id: pro.id, location_id: location.id, service_name: service.name, professional_name: pro.name, location_name: location.name,
        price_amount: service.price, price_currency: 'COP', starts_at: iso(start), ends_at: iso(start + service.durationMinutes * MIN), rest_minutes: service.bufferMinutes, status: db.bookingSettings.requires_confirmation ? 'requested' : 'confirmed',
        origin: 'admin', origin_channel: null, customer_confirmed: false, notes: data.notes || null, cancel_reason: null, conversation_id: null, created_at: iso(Date.now()),
    };
    db.appointments.push(a);
    audit(db, `Creó la cita #${a.id} de ${service.name} para ${fullName(customer)}`, 'created');
    return { flash: { success: 'Cita creada correctamente' } };
});

const find = (db, id) => db.appointments.find((a) => String(a.id) === String(id));

reg.mut('bookings.cancel', ({ db, params, data }) => {
    const a = find(db, params.appointment);
    a.status = 'cancelled'; a.cancel_reason = data.reason || 'Cancelada desde la agenda.';
    audit(db, `Canceló la cita #${a.id}`);
    return { flash: { success: 'Cita cancelada correctamente' } };
});
reg.mut('bookings.status', ({ db, params, data }) => {
    const a = find(db, params.appointment);
    if (!['confirmed', 'completed', 'no_show'].includes(data.status)) return { errors: { status: 'Estado no válido.' } };
    a.status = data.status;
    audit(db, `Cambió la cita #${a.id} a «${STATUS_LABEL[a.status]}»`);
    return { flash: { success: `Cita marcada como «${STATUS_LABEL[a.status].toLowerCase()}»` } };
});
reg.mut('bookings.customer-confirmation', ({ db, params }) => { find(db, params.appointment).customer_confirmed = true; return { flash: { success: 'Se registró que el cliente confirmó' } }; });
reg.mut('bookings.reschedule', ({ db, params, data }) => {
    if (!data.starts_at) return { errors: { starts_at: 'Elige un horario libre.' } };
    const a = find(db, params.appointment);
    const length = new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime();
    const start = new Date(data.starts_at).getTime();
    a.starts_at = iso(start); a.ends_at = iso(start + length);
    if (data.professional_id) { const p = db.professionals.find((x) => String(x.id) === String(data.professional_id)); if (p) { a.professional_id = p.id; a.professional_name = p.name; } }
    if (a.status === 'requested') a.status = 'requested';
    audit(db, `Reprogramó la cita #${a.id}`);
    return { flash: { success: 'Cita reprogramada correctamente' } };
});
reg.mut('bookings.refresh', () => ({ flash: { success: 'La agenda de Ava no necesita sincronizarse.' } }));
reg.mut('bookings.settings.update', ({ db, data }) => { Object.assign(db.bookingSettings, data); return { flash: { success: 'Reglas de reserva guardadas' } }; });
reg.mut('bookings.settings.notifications', ({ db, data }) => { Object.assign(db.bookingSettings, { notify_received: data.notify_received, notify_confirmed: data.notify_confirmed, reminders_enabled: data.reminders_enabled, reminder_offsets: data.reminder_offsets ?? db.bookingSettings.reminder_offsets }); return { flash: { success: 'Avisos guardados (simulados: no se envía ningún mensaje real).' } }; });
reg.mut('bookings.settings.rotate-key', () => ({ flash: { success: 'Clave de la página pública renovada (simulada).' } }));

/* ---------------------------- Servicios ---------------------------- */
const serviceRow = (db, s) => ({
    id: s.id, name: s.name, description: s.description, category: db.serviceCategories.find((c) => c.id === s.categoryId)?.name ?? null, categoryId: s.categoryId, durationMinutes: s.durationMinutes, bufferMinutes: s.bufferMinutes,
    price: s.price, isActive: s.isActive, professionalsCount: db.professionals.filter((p) => p.serviceIds.includes(s.id)).length, upcomingCount: db.appointments.filter((a) => a.service_id === s.id && ACTIVE.includes(a.status) && new Date(a.starts_at) > Date.now()).length,
    locationIds: s.locationIds, offeredEverywhere: s.locationIds.length === 0, resourceIds: s.resourceIds, canManage: true,
});

reg.get('services.index', ({ db }) => ({
    component: 'Services/Index',
    props: {
        capabilities: capabilities(), services: db.services.map((s) => serviceRow(db, s)), external: [], externalError: null, resources: db.resources.filter((r) => r.isActive).map((r) => ({ id: r.id, name: r.name })),
        locations: db.locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name })), locationsLimited: false, currency: db.workspace.settings.currency,
        categoryAdmin: { search: '', data: db.serviceCategories.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive, services: db.services.filter((s) => s.categoryId === c.id).length })), possibleDuplicates: [], canCreate: true, canEdit: true },
    },
}));

const serviceErrors = (d) => { const e = {}; if (!String(d.name ?? '').trim()) e.name = 'El nombre es obligatorio.'; if (!(Number(d.duration_minutes) > 0)) e.duration_minutes = 'La duración debe ser mayor que cero.'; return e; };
const applyService = (s, d) => Object.assign(s, { name: d.name.trim(), description: d.description || null, categoryId: d.category_id ? Number(d.category_id) : null, durationMinutes: Number(d.duration_minutes), bufferMinutes: Number(d.buffer_minutes || 0), price: d.price === '' || d.price == null ? null : Number(d.price), locationIds: (d.location_ids ?? []).map(Number), resourceIds: (d.resource_ids ?? []).map(Number) });
reg.mut('services.store', ({ db, data }) => { const e = serviceErrors(data); if (Object.keys(e).length) return { errors: e }; const s = { id: take('service', db.services), isActive: true }; applyService(s, data); db.services.push(s); audit(db, `Creó el servicio «${s.name}»`, 'created'); return { flash: { success: 'Servicio creado correctamente' } }; });
reg.mut('services.update', ({ db, params, data }) => { const e = serviceErrors(data); if (Object.keys(e).length) return { errors: e }; const s = db.services.find((x) => String(x.id) === params.service); applyService(s, data); audit(db, `Actualizó el servicio «${s.name}»`); return { flash: { success: 'Servicio actualizado correctamente' } }; });
reg.mut('services.activate', ({ db, params }) => { db.services.find((x) => String(x.id) === params.service).isActive = true; return { flash: { success: 'Servicio activado correctamente' } }; });
reg.mut('services.deactivate', ({ db, params }) => { db.services.find((x) => String(x.id) === params.service).isActive = false; return { flash: { success: 'Servicio desactivado correctamente' } }; });
reg.mut('services.categories.store', ({ db, data }) => { const name = String(data.name ?? '').trim(); if (!name) return { errors: { name: 'Escribe el nombre de la categoría.' } }; db.serviceCategories.push({ id: take('serviceCategory', db.serviceCategories), name, isActive: true }); return { flash: { success: 'Categoría creada correctamente' } }; });
reg.mut('services.categories.update', ({ db, params, data }) => { const name = String(data.name ?? '').trim(); if (!name) return { errors: { name: 'Escribe el nombre de la categoría.' } }; db.serviceCategories.find((x) => String(x.id) === params.category).name = name; return { flash: { success: 'Categoría actualizada correctamente' } }; });
reg.mut('services.categories.activate', ({ db, params }) => { db.serviceCategories.find((x) => String(x.id) === params.category).isActive = true; return { flash: { success: 'Categoría activada' } }; });
reg.mut('services.categories.deactivate', ({ db, params }) => { db.serviceCategories.find((x) => String(x.id) === params.category).isActive = false; return { flash: { success: 'Categoría desactivada' } }; });

/* -------------------------- Profesionales -------------------------- */
const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [7, 'Domingo']].map(([value, label]) => ({ value, label }));

reg.get('professionals.index', ({ db }) => ({
    component: 'Professionals/Index',
    props: {
        capabilities: capabilities(), days: DAYS, external: [], externalError: null,
        professionals: db.professionals.map((p) => ({ id: p.id, name: p.name, specialty: p.specialty, phone: p.phone, isActive: p.isActive, serviceIds: p.serviceIds, schedule: p.schedule, upcomingCount: db.appointments.filter((a) => a.professional_id === p.id && ACTIVE.includes(a.status) && new Date(a.starts_at) > Date.now()).length })),
        services: db.services.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name })), resources: db.resources.map((r) => ({ id: r.id, name: r.name, isActive: r.isActive })),
        exceptions: db.exceptions, locations: db.locations.map((l) => ({ id: l.id, name: l.name, isActive: l.isActive })),
    },
}));

const applyPro = (p, d) => Object.assign(p, { name: d.name.trim(), specialty: d.specialty || null, phone: d.phone || null, serviceIds: (d.service_ids ?? []).map(Number), schedule: (d.schedule ?? []).map((b) => ({ weekday: Number(b.weekday), startsAt: b.starts_at, endsAt: b.ends_at, locationId: b.location_id ? Number(b.location_id) : null })) });
reg.mut('professionals.store', ({ db, data }) => { if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } }; const p = { id: take('professional', db.professionals), isActive: true }; applyPro(p, data); db.professionals.push(p); audit(db, `Creó al profesional «${p.name}»`, 'created'); return { flash: { success: 'Profesional creado correctamente' } }; });
reg.mut('professionals.update', ({ db, params, data }) => { if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } }; const p = db.professionals.find((x) => String(x.id) === params.professional); applyPro(p, data); audit(db, `Actualizó los horarios del profesional ${p.name}`); return { flash: { success: 'Profesional actualizado correctamente' } }; });
reg.mut('professionals.activate', ({ db, params }) => { db.professionals.find((x) => String(x.id) === params.professional).isActive = true; return { flash: { success: 'Profesional activado correctamente' } }; });
reg.mut('professionals.deactivate', ({ db, params }) => { db.professionals.find((x) => String(x.id) === params.professional).isActive = false; return { flash: { success: 'Profesional desactivado correctamente' } }; });
reg.mut('professionals.resources.store', ({ db, data }) => { const name = String(data.name ?? '').trim(); if (!name) return { errors: { name: 'Escribe el nombre del recurso.' } }; db.resources.push({ id: take('resource', db.resources), name, isActive: true }); return { flash: { success: 'Recurso creado correctamente' } }; });
reg.mut('professionals.resources.update', ({ db, params, data }) => { const name = String(data.name ?? '').trim(); if (!name) return { errors: { name: 'Escribe el nombre del recurso.' } }; db.resources.find((x) => String(x.id) === params.resource).name = name; return { flash: { success: 'Recurso actualizado correctamente' } }; });
reg.mut('professionals.resources.activate', ({ db, params }) => { db.resources.find((x) => String(x.id) === params.resource).isActive = true; return { flash: { success: 'Recurso activado' } }; });
reg.mut('professionals.resources.deactivate', ({ db, params }) => { db.resources.find((x) => String(x.id) === params.resource).isActive = false; return { flash: { success: 'Recurso desactivado' } }; });
const applyException = (db, e, d) => { const pro = db.professionals.find((p) => String(p.id) === String(d.professional_id)); Object.assign(e, { professionalId: pro?.id ?? null, professional: pro?.name ?? null, dateFrom: d.date_from, dateTo: d.date_to || d.date_from, startsAt: d.starts_at || null, endsAt: d.ends_at || null, reason: d.reason || null }); };
reg.mut('professionals.exceptions.store', ({ db, data }) => { if (!data.date_from) return { errors: { date_from: 'Indica la fecha.' } }; const e = { id: take('exception', db.exceptions) }; applyException(db, e, data); db.exceptions.push(e); return { flash: { success: 'Día no laborable guardado' } }; });
reg.mut('professionals.exceptions.update', ({ db, params, data }) => { if (!data.date_from) return { errors: { date_from: 'Indica la fecha.' } }; applyException(db, db.exceptions.find((x) => String(x.id) === params.exception), data); return { flash: { success: 'Día no laborable actualizado' } }; });
reg.mut('professionals.exceptions.destroy', ({ db, params }) => { db.exceptions = db.exceptions.filter((x) => String(x.id) !== params.exception); return { flash: { success: 'Día no laborable eliminado' } }; });

/* ------------------------------ Sedes ------------------------------ */
reg.get('locations.index', ({ db }) => ({
    component: 'Locations/Index',
    props: {
        capabilities: capabilities(), schemaPending: false, services: db.services.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive })),
        locations: db.locations.map((l) => ({ id: l.id, name: l.name, address: l.address, city: l.city, phone: l.phone, notes: l.notes, isActive: l.isActive, offersAllServices: l.offersAllServices, serviceIds: l.serviceIds, hours: l.hours, upcomingCount: db.appointments.filter((a) => a.location_id === l.id && ACTIVE.includes(a.status) && new Date(a.starts_at) > Date.now()).length })),
    },
}));
const applyLocation = (l, d) => Object.assign(l, { name: d.name.trim(), address: d.address || null, city: d.city || null, phone: d.phone || null, notes: d.notes || null, offersAllServices: Boolean(d.offers_all_services), serviceIds: (d.service_ids ?? []).map(Number), hours: (d.hours ?? []).map((h) => ({ weekday: Number(h.weekday), opensAt: h.opens_at ?? h.opensAt, closesAt: h.closes_at ?? h.closesAt })) });
reg.mut('locations.store', ({ db, data }) => { if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } }; const l = { id: take('location', db.locations), isActive: true }; applyLocation(l, data); db.locations.push(l); audit(db, `Creó la sede «${l.name}»`, 'created'); return { flash: { success: 'Sede creada correctamente' } }; });
reg.mut('locations.update', ({ db, params, data }) => { if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } }; const l = db.locations.find((x) => String(x.id) === params.location); applyLocation(l, data); return { flash: { success: 'Sede actualizada correctamente' } }; });
reg.mut('locations.activate', ({ db, params }) => { db.locations.find((x) => String(x.id) === params.location).isActive = true; return { flash: { success: 'Sede activada correctamente' } }; });
reg.mut('locations.deactivate', ({ db, params }) => { db.locations.find((x) => String(x.id) === params.location).isActive = false; return { flash: { success: 'Sede desactivada correctamente' } }; });

export { startOfLocalDay };

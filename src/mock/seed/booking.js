import { DAY, HOUR, MIN, iso, startOfLocalDay } from '../util';

export function seedBooking(db, { now, ago }) {
    const week = (open, close, saturdayClose) => [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: open, closesAt: close })).concat(saturdayClose ? [{ weekday: 6, opensAt: '09:00', closesAt: saturdayClose }] : []);

    db.locations = [
        { id: 1, name: 'Sede Centro', address: 'Calle 72 # 10-34', city: 'Bogotá', phone: '+57 601 000 1001', notes: 'Edificio Demo, piso 3.', isActive: true, offersAllServices: true, serviceIds: [], hours: week('08:00', '18:00', '13:00') },
        { id: 2, name: 'Sede Norte', address: 'Carrera 15 # 100-20', city: 'Bogotá', phone: '+57 601 000 1002', notes: null, isActive: true, offersAllServices: false, serviceIds: [1, 3, 4], hours: week('09:00', '17:00', null) },
    ];
    db.serviceCategories = [{ id: 1, name: 'Higiene', isActive: true }, { id: 2, name: 'Ortodoncia', isActive: true }, { id: 3, name: 'Estética', isActive: true }];
    db.services = [
        { id: 1, name: 'Limpieza dental', description: 'Profilaxis y remoción de placa.', categoryId: 1, durationMinutes: 45, bufferMinutes: 10, price: 90000, isActive: true, locationIds: [1, 2], resourceIds: [1] },
        { id: 2, name: 'Control de ortodoncia', description: 'Revisión y ajuste de brackets.', categoryId: 2, durationMinutes: 30, bufferMinutes: 0, price: 70000, isActive: true, locationIds: [1], resourceIds: [] },
        { id: 3, name: 'Valoración general', description: 'Primera consulta con diagnóstico.', categoryId: 1, durationMinutes: 30, bufferMinutes: 5, price: 50000, isActive: true, locationIds: [1, 2], resourceIds: [] },
        { id: 4, name: 'Blanqueamiento', description: 'Blanqueamiento dental en consultorio.', categoryId: 3, durationMinutes: 60, bufferMinutes: 15, price: 280000, isActive: true, locationIds: [2], resourceIds: [1] },
    ];
    db.resources = [{ id: 1, name: 'Sillón odontológico 1', isActive: true }, { id: 2, name: 'Sala de rayos X', isActive: true }];
    const block = (weekday, startsAt, endsAt, locationId) => ({ weekday, startsAt, endsAt, locationId });
    db.professionals = [
        { id: 1, name: 'Dra. Paula Vega', specialty: 'Ortodoncia', phone: '+57 300 000 2001', isActive: true, serviceIds: [2, 3], schedule: [1, 2, 3, 4, 5].map((d) => block(d, '08:00', '16:00', 1)) },
        { id: 2, name: 'Dr. Iván Castaño', specialty: 'Odontología general', phone: '+57 300 000 2002', isActive: true, serviceIds: [1, 3, 4], schedule: [2, 3, 4, 5].map((d) => block(d, '09:00', '17:00', d % 2 ? 2 : 1)).concat([block(6, '09:00', '13:00', 1)]) },
    ];
    db.exceptions = [
        { id: 1, professionalId: null, professional: null, dateFrom: '2026-12-08', dateTo: '2026-12-08', startsAt: null, endsAt: null, reason: 'Festivo' },
        { id: 2, professionalId: 1, professional: 'Dra. Paula Vega', dateFrom: '2026-11-24', dateTo: '2026-11-25', startsAt: null, endsAt: null, reason: 'Congreso de ortodoncia' },
    ];
    db.bookingSettings = {
        provider: 'internal', requires_confirmation: true, min_notice_minutes: 60, max_advance_days: 60, cancel_notice_hours: 2, slot_step_minutes: 15, require_phone: true, require_email: false, public_enabled: false,
        notify_received: true, notify_confirmed: true, reminders_enabled: true, reminder_offsets: [1440, 120],
    };

    // Appointments: two professionals, weekdays, no overlaps; the past is mostly completed, the future requested/confirmed.
    db.appointments = [];
    const slots = [['09:00', 0], ['10:00', 1], ['11:00', 2], ['14:00', 3], ['15:30', 4]];
    const statusFor = (past, i) => (past ? (['completed', 'completed', 'completed', 'no_show', 'cancelled'][i % 5]) : (['confirmed', 'requested', 'confirmed', 'confirmed', 'cancelled'][i % 5]));
    let id = 1;
    let pick = 0;
    for (let d = -20; d <= 21; d += 1) {
        const dayStart = startOfLocalDay(now + d * DAY);
        const weekday = ((new Date(dayStart + 12 * HOUR).getUTCDay() + 6) % 7) + 1;
        if (weekday > 5) continue;
        db.professionals.forEach((pro, pi) => {
            if (!pro.schedule.some((b) => b.weekday === weekday)) return;
            slots.slice(0, 2 + ((d + pi + 40) % 2)).forEach(([time, k]) => {
                const service = db.services.find((s) => pro.serviceIds.includes(s.id) && s.id === pro.serviceIds[(k + pick) % pro.serviceIds.length]);
                const customer = db.customers[(pick * 3 + pi) % db.customers.length];
                const [h, m] = time.split(':').map(Number);
                const start = dayStart + (h * 60 + m) * MIN;
                const location = db.locations.find((l) => l.id === (pro.schedule.find((b) => b.weekday === weekday)?.locationId ?? 1));
                const status = statusFor(d < 0, pick);
                pick += 1;
                db.appointments.push({
                    id: id++, customer_id: customer.id, service_id: service.id, professional_id: pro.id, location_id: location.id, service_name: service.name, professional_name: pro.name, location_name: location.name,
                    price_amount: service.price, price_currency: 'COP', starts_at: iso(start), ends_at: iso(start + service.durationMinutes * MIN), rest_minutes: service.bufferMinutes, status,
                    origin: pick % 3 === 0 ? 'web' : pick % 3 === 1 ? 'chat' : 'admin', origin_channel: pick % 3 === 1 ? 'whatsapp' : pick % 3 === 0 ? 'web' : null,
                    customer_confirmed: status === 'confirmed' && pick % 2 === 0, notes: null, cancel_reason: status === 'cancelled' ? 'El cliente no podrá asistir.' : null, conversation_id: null,
                    created_at: iso(start - 3 * DAY),
                });
            });
        });
    }

    // The conversation of Valeria (#1, WhatsApp) leads to a requested appointment on Thursday at 09:00 — the story the tour follows.
    const valeria = db.customers[0];
    const nextThursday = (() => { for (let d = 1; d < 8; d += 1) { const t = startOfLocalDay(now + d * DAY); if (new Date(t + 12 * HOUR).getUTCDay() === 4) return t; } return startOfLocalDay(now + DAY); })();
    const start = nextThursday + 9 * HOUR;
    db.appointments = db.appointments.filter((a) => !(a.professional_id === 2 && Math.abs(new Date(a.starts_at).getTime() - start) < HOUR));
    db.appointments.push({
        id: id++, customer_id: valeria.id, service_id: 1, professional_id: 2, location_id: 1, service_name: 'Limpieza dental', professional_name: 'Dr. Iván Castaño', location_name: 'Sede Centro', price_amount: 90000, price_currency: 'COP',
        starts_at: iso(start), ends_at: iso(start + 45 * MIN), rest_minutes: 10, status: 'requested', origin: 'chat', origin_channel: 'whatsapp', customer_confirmed: false, notes: 'Solicitada por el asistente desde WhatsApp.', cancel_reason: null, conversation_id: 1, created_at: ago(11 * MIN),
    });
    db.counters.appointment = id;
}

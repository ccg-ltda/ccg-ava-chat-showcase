import { beforeEach, describe, expect, it } from 'vitest';
import '../mock/handlers';
import { getDb, resetDb } from '../mock/db';
import { mock } from '../mock/server';

const page = (url) => mock.get(url);
const props = (url) => page(url).props;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

beforeEach(() => resetDb());

describe('seed data is coherent', () => {
  it('every record points to something that exists', () => {
    const db = getDb();
    const ids = (rows) => new Set(rows.map((r) => r.id));
    const customers = ids(db.customers);
    const conversations = ids(db.conversations);
    db.conversations.forEach((c) => expect(customers.has(c.customer_id), `conversation ${c.id}`).toBe(true));
    db.messages.forEach((m) => expect(conversations.has(m.conversation_id)).toBe(true));
    db.appointments.forEach((a) => {
      expect(customers.has(a.customer_id), `appointment ${a.id} customer`).toBe(true);
      expect(ids(db.services).has(a.service_id)).toBe(true);
      expect(ids(db.professionals).has(a.professional_id)).toBe(true);
      expect(ids(db.locations).has(a.location_id)).toBe(true);
    });
    db.orders.forEach((o) => expect(o.total).toBe(o.lines.reduce((s, l) => s + l.lineTotal, 0)));
    db.surveyResponses.forEach((s) => expect(conversations.has(s.conversation_id)).toBe(true));
  });

  it('a professional never has two active appointments at the same time', () => {
    const active = getDb().appointments.filter((a) => ['requested', 'confirmed'].includes(a.status));
    for (const a of active) {
      const clash = active.find((b) => b.id !== a.id && b.professional_id === a.professional_id && new Date(a.starts_at) < new Date(b.ends_at) && new Date(b.starts_at) < new Date(a.ends_at));
      expect(clash, `appointments ${a.id}/${clash?.id}`).toBeUndefined();
    }
  });

  it('one customer has a conversation, an appointment, an order and a survey', () => {
    const db = getDb();
    const daniel = db.customers.find((c) => c.name === 'Daniel Ferrer');
    expect(db.conversations.some((c) => c.customer_id === daniel.id)).toBe(true);
    expect(db.orders.some((o) => o.customer_id === daniel.id)).toBe(true);
    expect(db.appointments.some((a) => a.customer_id === daniel.id)).toBe(true);
    expect(db.surveyResponses.some((s) => s.customer_id === daniel.id)).toBe(true);
  });
});

describe('every simulated page answers', () => {
  const urls = ['/dashboard', '/conversations', '/conversations?c=2', '/customers', '/customers/1', '/bookings', '/bookings?days=31', '/services', '/professionals', '/locations', '/orders', '/orders/6', '/catalog', '/catalog/1', '/chatbots', '/chatbots/1', '/reports', '/integrations', '/users', '/audit', '/settings', '/demo/ava-voz', '/demo/escenarios', '/demo/documentacion/introduccion'];
  it.each(urls)('%s renders a component', (url) => {
    const result = page(url);
    expect(result.component, url).toBeTruthy();
    expect(result.component).not.toBe('Demo/NotInDemo');
  });
  it('an unsimulated route says so instead of pretending', () => {
    expect(page('/profile').component).toBe('Demo/NotInDemo');
  });
});

describe('coherent transitions', () => {
  it('resolving a conversation updates the inbox counts and sends a (simulated) survey', () => {
    const before = props('/conversations').counts;
    mock.mutate('post', '/conversations/2/resolve', {});
    const after = props('/conversations').counts;
    expect(after.resolved).toBe(before.resolved + 1);
    expect(after.pending).toBe(before.pending - 1);
    expect(getDb().surveyResponses.some((s) => s.conversation_id === 2 && s.status === 'sent')).toBe(true);
  });

  it('taking a conversation makes it human and assigned to the user', () => {
    mock.mutate('post', '/conversations/2/take', {});
    const selected = props('/conversations?c=2').selected;
    expect(selected.handling).toBe('human');
    expect(selected.assignedUser.isMe).toBe(true);
    expect(selected.can.reply).toBe(true);
  });

  it('an appointment created from the agenda shows up in the agenda and in the customer file', () => {
    const slots = mock.api('get', `/bookings/availability?service_id=3&from=${tomorrow()}&days=7`).json.slots;
    expect(slots.length).toBeGreaterThan(0);
    const out = mock.mutate('post', '/bookings', { service_id: 3, professional_id: slots[0].professionalId, location_id: 1, starts_at: slots[0].startsAt, central_customer_id: 6, notes: '' });
    expect(out.errors).toBeUndefined();
    const list = props(`/bookings?days=31&view=list&from=${slots[0].date}`).appointments;
    expect(list.some((a) => a.startsAt === slots[0].startsAt && a.customer.name.startsWith('Tomás'))).toBe(true);
    expect(props('/customers/6').appointments.some((a) => a.startsAt === slots[0].startsAt)).toBe(true);
  });

  it('a booked slot is no longer offered', () => {
    const slots = () => mock.api('get', `/bookings/availability?service_id=3&from=${tomorrow()}&days=7`).json.slots;
    const first = slots()[0];
    mock.mutate('post', '/bookings', { service_id: 3, professional_id: first.professionalId, location_id: 1, starts_at: first.startsAt, central_customer_id: 6 });
    expect(slots().some((s) => s.startsAt === first.startsAt && s.professionalId === first.professionalId)).toBe(false);
  });

  it('order moves follow the real transition table and refuse the rest', () => {
    const order = getDb().orders.find((o) => o.status === 'received');
    const refused = mock.mutate('post', `/orders/${order.id}/status`, { status: 'delivered' });
    expect(refused.flash.error).toBeTruthy();
    expect(getDb().orders.find((o) => o.id === order.id).status).toBe('received');
    mock.mutate('post', `/orders/${order.id}/status`, { status: 'confirmed' });
    expect(props(`/orders/${order.id}`).order.status).toBe('confirmed');
    expect(props('/orders').counts.confirmed).toBeGreaterThan(0);
  });

  it('cancelling an order needs a reason', () => {
    const order = getDb().orders.find((o) => o.status === 'received');
    expect(mock.mutate('post', `/orders/${order.id}/status`, { status: 'cancelled' }).errors.reason).toBeTruthy();
  });

  it('a delivered order feeds the economics of Reportes', () => {
    const before = props('/reports').economics.orders.data.kpis.income.value;
    const o = getDb().orders.find((x) => x.status === 'dispatched');
    mock.mutate('post', `/orders/${o.id}/status`, { status: 'delivered' });
    expect(props('/reports').economics.orders.data.kpis.income.value).toBe(before + o.total);
  });

  it('forms validate before saving', () => {
    expect(mock.mutate('post', '/customers', { first_name: '' }).errors.first_name).toBeTruthy();
    expect(mock.mutate('post', '/users', { name: 'X', email: 'no-es-correo', role: 'agente' }).errors.email).toBeTruthy();
  });

  it('the AI script books an appointment and hands over when asked for a person', () => {
    mock.mutate('post', '/conversations/1/simulate/incoming', { body: 'quiero una cita' });
    expect(getDb().appointments.some((a) => a.conversation_id === 1 && a.status === 'requested' && a.notes.includes('simulación'))).toBe(true);
    mock.mutate('post', '/conversations/1/simulate/incoming', { body: 'necesito hablar con una persona' });
    expect(getDb().conversations.find((c) => c.id === 1).handling).toBe('pending');
  });

  it('restoring brings the initial data back', () => {
    mock.mutate('post', '/conversations/2/resolve', {});
    const total = getDb().customers.length;
    mock.mutate('post', '/customers', { first_name: 'Nueva', last_name: 'Persona', email: 'n@ejemplo.test', source: 'manual', marketing_consent: 'unknown', tags: [], identities: [] });
    expect(getDb().customers.length).toBe(total + 1);
    mock.reset();
    expect(getDb().customers.length).toBe(total);
    expect(props('/conversations').counts.pending).toBeGreaterThan(0);
  });
});

import { reg } from '../server';
import { take } from '../db';
import { includes, iso, listPage, PER_PAGE_OPTIONS } from '../util';
import { audit } from './conversations';
import { fullName } from './customers';

const STATUSES = { received: 'Recibido', confirmed: 'Confirmado', preparing: 'En preparación', ready: 'Listo', dispatched: 'Despachado', delivered: 'Entregado', cancelled: 'Cancelado' };
const METHODS = { pickup: 'Recogida', delivery: 'Entrega a domicilio' };
const TRANSITIONS = { received: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['dispatched', 'delivered', 'cancelled'], dispatched: ['delivered', 'cancelled'], delivered: [], cancelled: [] };
const METHOD_MOVES = { 'ready>dispatched': 'delivery', 'ready>delivered': 'pickup' };
const FINAL = ['delivered', 'cancelled'];

/* -------------------------------- Pedidos -------------------------------- */
const orderSummary = (o) => ({ id: o.id, number: o.number, customerName: o.customer_name, total: o.total, currency: o.currency, status: o.status, statusLabel: STATUSES[o.status], method: o.delivery_method, methodLabel: METHODS[o.delivery_method], location: o.location_name, createdAt: o.created_at, statusChangedAt: o.status_changed_at, final: FINAL.includes(o.status) });

const formOptions = (db) => ({
    products: db.products.filter((p) => p.isActive).map((p) => ({ id: p.id, sku: p.sku, name: p.name, price: p.price, locationIds: p.locationIds, stock: p.tracksInventory ? Object.fromEntries(p.stocks.map((s) => [s.locationId ?? 'general', s.quantity])) : null })),
    locations: db.locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name })),
    customers: db.customers.filter((c) => c.active).map((c) => ({ id: c.id, name: fullName(c), phone: c.phone, email: c.email })),
});

reg.get('orders.index', ({ db, query }) => {
    const filters = { search: (query.search ?? '').trim(), status: STATUSES[query.status] ? query.status : '', method: METHODS[query.method] ? query.method : '' };
    const term = filters.search.replace(/^#/, '');
    const rows = db.orders.filter((o) => (!filters.status || o.status === filters.status) && (!filters.method || o.delivery_method === filters.method) && (!term || includes(o.number, term) || includes(o.customer_name, term) || includes(o.customer_phone, term)))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { page, perPage } = listPage(rows, query, 'orders');
    const counts = {};
    db.orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return {
        component: 'Orders/Index',
        props: { schemaPending: false, statuses: STATUSES, methods: METHODS, currency: db.workspace.settings.currency, notifier: false, orders: { data: page.data.map(orderSummary), meta: page.meta }, filters: { ...filters, perPage }, perPageOptions: PER_PAGE_OPTIONS, counts, form: formOptions(db), canDetail: true },
    };
});

reg.get('orders.show', ({ db, params }) => {
    const o = db.orders.find((x) => String(x.id) === params.order);
    const moves = TRANSITIONS[o.status].filter((to) => { const need = METHOD_MOVES[`${o.status}>${to}`]; return !need || need === o.delivery_method; }).map((to) => ({ status: to, label: STATUSES[to] }));
    return {
        component: 'Orders/Show',
        props: {
            order: { ...orderSummary(o), customerPhone: o.customer_phone, customerEmail: o.customer_email, customerId: o.customer_id, address: o.delivery_address, city: o.delivery_city, reference: o.delivery_reference, recipientName: o.recipient_name, recipientPhone: o.recipient_phone, notes: o.notes, cancelReason: o.cancel_reason, lines: o.lines, history: o.history },
            moves, canEdit: !['dispatched', 'delivered', 'cancelled'].includes(o.status), statuses: STATUSES, methods: METHODS, notifier: false, customersModule: true, payment: null,
        },
    };
});

reg.mut('orders.store', ({ db, data }) => {
    const errors = {};
    const lines = (data.lines ?? []).filter((l) => l.product_id);
    if (!lines.length) errors.lines = 'Agrega al menos un producto.';
    if (!data.customer_id && !String(data.customer_name ?? '').trim()) errors.customer_name = 'El nombre del cliente es obligatorio.';
    if (data.delivery_method === 'delivery' && !String(data.delivery_address ?? '').trim()) errors.delivery_address = 'La dirección es obligatoria para entregas a domicilio.';
    if (Object.keys(errors).length) return { errors };
    const customer = db.customers.find((c) => String(c.id) === String(data.customer_id));
    const loc = db.locations.find((l) => String(l.id) === String(data.location_id)) ?? db.locations[0];
    let lineId = take('orderLine', db.orders.flatMap((o) => o.lines));
    const built = lines.map((l) => { const p = db.products.find((x) => String(x.id) === String(l.product_id)); const q = Math.max(1, Number(l.quantity) || 1); return { id: lineId++, product_id: p.id, name: p.name, sku: p.sku, unitPrice: p.price, quantity: q, lineTotal: p.price * q }; });
    const id = take('order', db.orders);
    const o = {
        id, number: `PD-${String(80 + id).padStart(4, '0')}`, customer_id: customer?.id ?? null, customer_name: customer ? fullName(customer) : data.customer_name, customer_phone: customer?.phone ?? data.customer_phone ?? null, customer_email: customer?.email ?? data.customer_email ?? null,
        delivery_method: data.delivery_method, delivery_address: data.delivery_address || null, delivery_city: data.delivery_city || null, delivery_reference: data.delivery_reference || null, recipient_name: data.recipient_name || null, recipient_phone: data.recipient_phone || null,
        location_id: loc.id, location_name: loc.name, notes: data.notes || null, cancel_reason: null, status: 'received', currency: db.workspace.settings.currency, total: built.reduce((s, l) => s + l.lineTotal, 0), created_at: iso(Date.now()), status_changed_at: iso(Date.now()), conversation_id: null, lines: built,
        history: [{ id: 1, from: null, to: 'received', by: 'Laura Méndez', reason: null, at: iso(Date.now()) }],
    };
    db.orders.push(o);
    audit(db, `Creó el pedido ${o.number}`, 'created');
    return { redirect: `/orders/${o.id}`, flash: { success: 'Pedido creado' } };
});

reg.mut('orders.update', ({ db, params, data }) => {
    const o = db.orders.find((x) => String(x.id) === params.order);
    Object.assign(o, { customer_phone: data.customer_phone ?? o.customer_phone, customer_email: data.customer_email ?? o.customer_email, delivery_address: data.delivery_address ?? o.delivery_address, delivery_city: data.delivery_city ?? o.delivery_city, delivery_reference: data.delivery_reference ?? o.delivery_reference, recipient_name: data.recipient_name ?? o.recipient_name, recipient_phone: data.recipient_phone ?? o.recipient_phone, notes: data.notes ?? o.notes });
    return { flash: { success: 'Pedido actualizado' } };
});

reg.mut('orders.transition', ({ db, params, data }) => {
    const o = db.orders.find((x) => String(x.id) === params.order);
    if (!TRANSITIONS[o.status].includes(data.status)) return { flash: { error: 'Ese cambio de estado no está permitido desde el estado actual.' } };
    if (data.status === 'cancelled' && !String(data.reason ?? '').trim()) return { errors: { reason: 'Escribe el motivo de la cancelación.' } };
    const from = o.status;
    o.history.push({ id: o.history.length + 1, from, to: data.status, by: 'Laura Méndez', reason: data.reason || null, at: iso(Date.now()) });
    o.status = data.status; o.status_changed_at = iso(Date.now());
    if (data.status === 'cancelled') o.cancel_reason = data.reason;
    audit(db, `Movió el pedido ${o.number} a «${STATUSES[o.status]}»`);
    return { flash: { success: `Pedido ${STATUSES[o.status].toLowerCase()}` } };
});

/* ------------------------------- Catálogo -------------------------------- */
const placeOf = (db, value) => {
    if (value === 'general') return { id: null, general: true, value: 'general', label: 'Inventario general' };
    const l = db.locations.find((x) => String(x.id) === String(value));
    return l ? { id: l.id, general: false, value: String(l.id), label: l.name } : { id: null, general: false, value: '', label: 'todas las sedes' };
};
const levelOf = (s) => (s.quantity <= 0 ? 'out' : s.quantity <= s.min ? 'low' : 'ok');

function stockView(db, p, place) {
    if (!p.tracksInventory) return { tracked: false, stocks: [], selected: null, total: null, level: null };
    const offered = p.locationIds;
    const rows = p.stocks.filter((s) => !offered.length || offered.includes(s.locationId)).map((s) => ({ locationId: s.locationId, location: s.locationId ? db.locations.find((l) => l.id === s.locationId)?.name ?? 'Sede inactiva' : 'Inventario general', quantity: s.quantity, min: s.min, level: levelOf(s) }));
    const consulted = rows.filter((r) => (place.id === null && !place.general) || r.locationId === place.id);
    const selected = place.id !== null || place.general ? consulted[0] ?? null : null;
    const sum = consulted.reduce((t, r) => t + r.quantity, 0);
    const level = !consulted.length ? null : sum <= 0 ? 'out' : consulted.some((r) => r.level === 'low') ? 'low' : 'ok';
    return { tracked: true, stocks: rows, selected, total: { scope: place.id === null && !place.general ? 'all' : 'place', quantity: sum }, level };
}

function productRow(db, p, place) {
    return {
        id: p.id, sku: p.sku, name: p.name, category: db.productCategories.find((c) => c.id === p.categoryId)?.name ?? null, categoryId: p.categoryId, price: p.price, isActive: p.isActive, imageUrl: null,
        needsLocation: false, offersAllLocations: p.locationIds.length === 0, openOrders: db.orders.filter((o) => !FINAL.includes(o.status) && o.lines.some((l) => l.product_id === p.id)).length, stock: stockView(db, p, place),
        description: p.description, cost: p.cost, locationIds: p.locationIds, tracksInventory: p.tracksInventory,
    };
}

reg.get('catalog.index', ({ db, query }) => {
    const filters = { search: (query.search ?? '').trim(), category: query.category ?? '', status: query.status ?? '', availability: query.availability ?? '' };
    const place = placeOf(db, query.place ?? '');
    let rows = db.products.filter((p) => (!filters.search || includes(p.name, filters.search) || includes(p.sku, filters.search)) && (!filters.category || String(p.categoryId) === String(filters.category)) && (!filters.status || (filters.status === 'active' ? p.isActive : !p.isActive)));
    if (filters.availability) rows = rows.filter((p) => { const v = stockView(db, p, place); return filters.availability === 'untracked' ? !v.tracked : v.tracked && (v.level === filters.availability || (filters.availability === 'pending' && v.level === null)); });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const { page, perPage } = listPage(rows, query, 'products');
    const tracked = db.products.filter((p) => p.tracksInventory && p.isActive).map((p) => stockView(db, p, place));
    return {
        component: 'Catalog/Index',
        props: {
            schemaPending: false, products: { data: page.data.map((p) => productRow(db, p, place)), meta: page.meta }, filters: { ...filters, perPage, place: place.value }, perPageOptions: PER_PAGE_OPTIONS,
            categories: db.productCategories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })), locations: db.locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name })), locationsLimited: false,
            currency: db.workspace.settings.currency, total: db.products.length,
            inventory: { ready: true, canView: true, canAdjust: true, summary: { tracked: tracked.length, units: tracked.reduce((t, v) => t + (v.total?.quantity ?? 0), 0), low: tracked.filter((v) => v.level === 'low').length, out: tracked.filter((v) => v.level === 'out').length, unconfigured: tracked.filter((v) => v.level === null).length }, place: place.value, placeLabel: place.label, config: { maxKb: 2048 } },
            categoryAdmin: { search: '', data: db.productCategories.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive, products: db.products.filter((p) => p.categoryId === c.id).length })), possibleDuplicates: [], canCreate: true, canEdit: true },
        },
    };
});

const applyProduct = (p, d) => Object.assign(p, { sku: d.sku, name: d.name.trim(), description: d.description || null, price: Number(d.price || 0), cost: d.cost === '' || d.cost == null ? null : Number(d.cost), categoryId: d.category_id ? Number(d.category_id) : null, locationIds: (d.location_ids ?? []).map(Number), tracksInventory: Boolean(d.tracks_inventory) });
const productErrors = (d) => { const e = {}; if (!String(d.name ?? '').trim()) e.name = 'El nombre es obligatorio.'; if (!String(d.sku ?? '').trim()) e.sku = 'El SKU es obligatorio.'; if (d.price === '' || d.price == null || Number(d.price) < 0) e.price = 'Indica un precio válido.'; return e; };
reg.mut('catalog.store', ({ db, data }) => { const e = productErrors(data); if (db.products.some((p) => p.sku === data.sku)) e.sku = 'Ya existe un producto con ese SKU.'; if (Object.keys(e).length) return { errors: e }; const p = { id: take('product', db.products), isActive: true, imageUrl: null, stocks: [] }; applyProduct(p, data); db.products.push(p); audit(db, `Creó el producto «${p.name}»`, 'created'); return { flash: { success: 'Producto creado correctamente' } }; });
reg.mut('catalog.update', ({ db, params, data }) => { const e = productErrors(data); if (Object.keys(e).length) return { errors: e }; const p = db.products.find((x) => String(x.id) === params.product); applyProduct(p, data); audit(db, `Actualizó el producto «${p.name}»`); return { flash: { success: 'Producto actualizado correctamente' } }; });
reg.mut('catalog.activate', ({ db, params }) => { db.products.find((x) => String(x.id) === params.product).isActive = true; return { flash: { success: 'Producto activado correctamente' } }; });
reg.mut('catalog.deactivate', ({ db, params }) => { db.products.find((x) => String(x.id) === params.product).isActive = false; return { flash: { success: 'Producto desactivado correctamente' } }; });
reg.mut('catalog.categories.store', ({ db, data }) => { const name = String(data.name ?? '').trim(); if (!name) return { errors: { name: 'Escribe el nombre de la categoría.' } }; db.productCategories.push({ id: take('productCategory', db.productCategories), name, isActive: true }); return { flash: { success: 'Categoría creada correctamente' } }; });
reg.mut('catalog.categories.update', ({ db, params, data }) => { const name = String(data.name ?? '').trim(); if (!name) return { errors: { name: 'Escribe el nombre de la categoría.' } }; db.productCategories.find((x) => String(x.id) === params.category).name = name; return { flash: { success: 'Categoría actualizada correctamente' } }; });
reg.mut('catalog.categories.activate', ({ db, params }) => { db.productCategories.find((x) => String(x.id) === params.category).isActive = true; return { flash: { success: 'Categoría activada' } }; });
reg.mut('catalog.categories.deactivate', ({ db, params }) => { db.productCategories.find((x) => String(x.id) === params.category).isActive = false; return { flash: { success: 'Categoría desactivada' } }; });

const stockRow = (p, locationId) => { const id = locationId === '' || locationId == null || locationId === 'general' ? null : Number(locationId); let row = p.stocks.find((s) => s.locationId === id); if (!row) { row = { locationId: id, quantity: 0, min: 5 }; p.stocks.push(row); } return row; };
const move = (p, row, type, typeLabel, after, reason) => { p.movements = p.movements ?? []; const before = row.quantity; row.quantity = after; p.movements.push({ id: p.movements.length + 1, type, typeLabel, change: after - before, before, after, locationId: row.locationId, reason: reason || null, user: 'Laura Méndez', createdAt: iso(Date.now()) }); };
reg.mut('catalog.stock.adjust', ({ db, params, data }) => { const p = db.products.find((x) => String(x.id) === params.product); const row = stockRow(p, data.location_id); move(p, row, 'adjustment', 'Ajuste', Math.max(0, Number(data.quantity ?? 0)), data.reason); return { flash: { success: 'Existencias ajustadas' } }; });
reg.mut('catalog.stock.receive', ({ db, params, data }) => { const p = db.products.find((x) => String(x.id) === params.product); const row = stockRow(p, data.location_id); move(p, row, 'entry', 'Entrada', row.quantity + Math.max(0, Number(data.quantity ?? 0)), data.reason); return { flash: { success: 'Entrada de existencias registrada' } }; });
reg.mut('catalog.stock.control', ({ db, params, data }) => { db.products.find((x) => String(x.id) === params.product).tracksInventory = Boolean(data.tracks_inventory); return { flash: { success: 'Control de inventario actualizado' } }; });
reg.mut('catalog.stock.minimum', ({ db, params, data }) => { stockRow(db.products.find((x) => String(x.id) === params.product), data.location_id).min = Math.max(0, Number(data.min_quantity ?? 0)); return { flash: { success: 'Mínimo actualizado' } }; });

reg.get('catalog.show', ({ db, params, query }) => {
    const p = db.products.find((x) => String(x.id) === params.product);
    const place = { id: null, general: false, value: '' };
    const movementPlace = query.movement_place ?? '';
    const moves = (p.movements ?? []).filter((m) => !movementPlace || String(m.locationId ?? 'general') === movementPlace).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const { page } = listPage(moves, query, 'movements');
    return {
        component: 'Catalog/Show',
        props: {
            product: productRow(db, p, place), locations: db.locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name })),
            movements: { data: page.data.map((m) => ({ id: m.id, type: m.type, typeLabel: m.typeLabel, change: m.change, before: m.before, after: m.after, location: m.locationId ? db.locations.find((l) => l.id === m.locationId)?.name : 'Inventario general', reason: m.reason, user: m.user, orderId: null, orderNumber: null, createdAt: m.createdAt })), meta: page.meta },
            movementPlace, categories: db.productCategories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })), perPageOptions: PER_PAGE_OPTIONS, currency: db.workspace.settings.currency,
            inventory: { ready: true, canView: true, canAdjust: true, config: { maxKb: 2048 } }, can: { edit: true, activate: true },
        },
    };
});

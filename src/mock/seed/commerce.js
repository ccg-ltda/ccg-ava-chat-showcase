import { DAY, HOUR, MIN } from '../util';

export function seedCommerce(db, { ago }) {
    db.productCategories = [{ id: 1, name: 'Ropa', isActive: true }, { id: 2, name: 'Accesorios', isActive: true }, { id: 3, name: 'Cuidado personal', isActive: true }];
    const stock = (centro, norte, min = 5) => [{ locationId: 1, quantity: centro, min }, { locationId: 2, quantity: norte, min }].filter((s) => s.quantity !== null);
    db.products = [
        { id: 1, sku: 'CAM-001', name: 'Camiseta básica', description: 'Algodón peinado, talla S a XL.', price: 45000, cost: 22000, categoryId: 1, isActive: true, imageUrl: null, tracksInventory: true, locationIds: [1, 2], stocks: stock(24, 8) },
        { id: 2, sku: 'CAM-002', name: 'Camiseta estampada', description: 'Edición limitada.', price: 59000, cost: 28000, categoryId: 1, isActive: true, imageUrl: null, tracksInventory: true, locationIds: [1, 2], stocks: stock(0, 12) },
        { id: 3, sku: 'GOR-010', name: 'Gorra clásica', description: 'Ajustable, varios colores.', price: 35000, cost: 15000, categoryId: 2, isActive: true, imageUrl: null, tracksInventory: true, locationIds: [1, 2], stocks: stock(15, 3) },
        { id: 4, sku: 'MOC-020', name: 'Mochila urbana', description: 'Resistente al agua, 20 L.', price: 120000, cost: 61000, categoryId: 2, isActive: true, imageUrl: null, tracksInventory: true, locationIds: [1], stocks: stock(6, null) },
        { id: 5, sku: 'CUI-030', name: 'Kit de higiene dental', description: 'Cepillo, crema e hilo dental.', price: 28000, cost: 11000, categoryId: 3, isActive: true, imageUrl: null, tracksInventory: false, locationIds: [1, 2], stocks: [] },
        { id: 6, sku: 'CUI-031', name: 'Blanqueador en gel', description: 'Uso en casa, 14 días.', price: 76000, cost: 30000, categoryId: 3, isActive: false, imageUrl: null, tracksInventory: true, locationIds: [2], stocks: stock(null, 0) },
    ];

    db.orders = [];
    const line = (product, quantity, id) => ({ id, product_id: product.id, name: product.name, sku: product.sku, unitPrice: product.price, quantity, lineTotal: product.price * quantity });
    let lineId = 1;
    const make = (n, customer, method, status, createdAgo, items, extra = {}) => {
        const lines = items.map(([productId, qty]) => line(db.products.find((p) => p.id === productId), qty, lineId++));
        const loc = db.locations.find((l) => l.id === (extra.location_id ?? 2));
        const o = {
            id: n, number: `PD-${String(80 + n).padStart(4, '0')}`, customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone, customer_email: customer.email, delivery_method: method,
            delivery_address: method === 'delivery' ? 'Calle 85 # 14-20, apto 502' : null, delivery_city: method === 'delivery' ? 'Bogotá' : null, delivery_reference: method === 'delivery' ? 'Portería principal' : null,
            recipient_name: null, recipient_phone: null, location_id: loc.id, location_name: loc.name, notes: null, cancel_reason: null, status, currency: 'COP', total: lines.reduce((s, l) => s + l.lineTotal, 0),
            created_at: ago(createdAgo), status_changed_at: ago(createdAgo / 2), conversation_id: null, lines, history: [{ id: 1, from: null, to: 'received', by: null, reason: null, at: ago(createdAgo) }], ...extra,
        };
        db.orders.push(o);
        return o;
    };
    const c = db.customers;
    make(1, c[3], 'delivery', 'delivered', 9 * DAY, [[1, 2]]);
    make(2, c[5], 'pickup', 'delivered', 7 * DAY, [[3, 1], [1, 1]]);
    make(3, c[6], 'delivery', 'cancelled', 6 * DAY, [[4, 1]], { cancel_reason: 'El cliente se arrepintió de la compra.' });
    make(4, c[7], 'pickup', 'ready', 2 * DAY, [[2, 1]]);
    make(5, c[8], 'delivery', 'dispatched', 30 * HOUR, [[5, 3]]);
    make(6, c[3], 'delivery', 'dispatched', 5 * HOUR, [[1, 2]], { conversation_id: 4, number: 'PD-0087' });
    make(7, c[1], 'delivery', 'preparing', 4 * HOUR, [[4, 1]]);
    make(8, c[2], 'pickup', 'received', 40 * MIN, [[2, 1], [3, 1]], { conversation_id: 3 });
    db.orders[5].number = 'PD-0087';
    db.orders[6].number = 'PD-0088';
    db.orders[7].number = 'PD-0089';
    db.counters.order = db.orders.length + 1;
    db.counters.orderLine = lineId;
}

import { reg } from '../server';
import { take } from '../db';

/** Notifications bell and saved filters: small endpoints every module shares. */
const bell = (db) => ({ unread: db.notifications.filter((n) => !n.read).length, items: db.notifications.slice(0, 20).map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, read: n.read, createdAt: n.created_at })) });

reg.api('notifications.index', ({ db }) => bell(db));
reg.api('notifications.read', ({ db, params }) => { const n = db.notifications.find((x) => String(x.id) === params.notification); if (n) n.read = true; return bell(db); });
reg.api('notifications.read-all', ({ db }) => { db.notifications.forEach((n) => { n.read = true; }); return bell(db); });

reg.mut('saved-filters.store', ({ db, params, data }) => {
    if (!String(data.name ?? '').trim()) return { errors: { name: 'Escribe un nombre para el filtro.' } };
    db.savedFilters.push({ id: take('savedFilter', db.savedFilters), scope: params.scope, name: data.name.trim(), criteria: data.criteria ?? {} });
    return { flash: { success: 'Filtro guardado' } };
});
reg.mut('saved-filters.update', ({ db, params, data }) => {
    const f = db.savedFilters.find((x) => String(x.id) === params.filter);
    if (data.name) f.name = data.name; if (data.criteria) f.criteria = data.criteria;
    return { flash: { success: 'Filtro actualizado' } };
});
reg.mut('saved-filters.destroy', ({ db, params }) => { db.savedFilters = db.savedFilters.filter((x) => String(x.id) !== params.filter); return { flash: { success: 'Filtro eliminado' } }; });

/** There is no session in the showcase: «Cerrar sesión» explains it instead of pretending to sign out. */
reg.mut('logout', () => ({ redirect: '/dashboard', flash: { warning: 'Demostración: no hay sesión real que cerrar. Usa «Demo → Restaurar datos iniciales» para empezar de cero.' } }));

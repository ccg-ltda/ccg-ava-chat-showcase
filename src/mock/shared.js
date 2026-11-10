/** Props every page receives (HandleInertiaRequests::share in AVA Platform). */
import permissions from './permissions.json';
import { fmtDateTime } from './util';

const MODULES = ['dashboard', 'assistants', 'conversations', 'reports', 'audit', 'settings', 'integrations', 'users_roles', 'service_catalog', 'locations', 'product_catalog', 'orders', 'professionals', 'bookings', 'calendar_providers', 'customers'];

const FAQ = [
    { group: 'Módulos y permisos', items: [
        { q: 'No veo un módulo en el menú', a: 'El menú solo muestra lo que tu Workspace tiene contratado en su plan y lo que tu rol permite. Son dos condiciones distintas.', steps: ['Si el módulo no está en tu plan, contacta a soporte para ampliarlo.', 'Si está en tu plan pero tu rol no tiene permiso, pide a un administrador que lo revise.'], avoid: ['Escribir la dirección a mano no abre un módulo que no tienes: el servidor lo rechaza.'] },
    ] },
    { group: 'Pantallas y datos', items: [
        { q: 'Una pantalla se queda en blanco', a: 'Suele ser una versión antigua de la página guardada en el navegador.', steps: ['Recarga con Ctrl+F5 (Cmd+Shift+R en Mac).'], avoid: [] },
    ] },
];

export function sharedProps(db, flash) {
    const user = db.users.find((u) => u.id === db.me);
    const unread = db.notifications.filter((n) => !n.read).length;
    return {
        auth: { user: { id: user.id, name: user.name, email: user.email, permissions, roles: [user.role], photoUrl: null } },
        brand: 'Zonno Platform by CCG',
        brandShort: 'Zonno by CCG',
        skeleton: { paths: { dashboard: 'dashboard', reports: 'reports', conversations: 'conversations', orders: 'orders', catalog: 'table', customers: 'tabbed_table', campaigns: 'table', reminders: 'tabbed_table', users: 'table', audit: 'table', bookings: 'agenda', services: 'table', professionals: 'table', locations: 'table', plans: 'table', integrations: 'cards', chatbots: 'cards', settings: 'form', profile: 'form' }, default: 'table', delay: 300, giveUp: 20000 },
        flash: { success: flash?.success ?? null, error: flash?.error ?? null, warning: flash?.warning ?? null },
        modules: MODULES,
        help: { chat: false, chatState: 'unavailable', supportEmail: null, mailto: null, manuals: [], faq: FAQ },
        supportChat: null,
        supportDesk: null,
        conversationAlerts: null,
        notifications: { unread, items: db.notifications.slice(0, 20).map((n) => ({ ...n, createdAt: fmtDateTime(n.created_at) })) },
        platform: false,
        platformAccess: { plans: false, modules: false },
        workspace: { code: db.workspace.code, name: db.workspace.name, organization: db.workspace.organization, settings: db.workspace.settings },
    };
}

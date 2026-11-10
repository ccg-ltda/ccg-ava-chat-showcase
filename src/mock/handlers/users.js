import { reg } from '../server';
import { take } from '../db';
import { fmtDate, includes, iso, listPage, PER_PAGE_OPTIONS } from '../util';
import { audit } from './conversations';
import catalog from '../permissionCatalog.json';

/** Permission names come from AVA Platform's catalog (config/permissions.php). Which role holds which is a SAMPLE rule for the demo. */
const ALL = Object.keys(catalog.permissions).filter((n) => !catalog.permissions[n].platform);
const GRANTS = {
    admin: ALL,
    supervisor: ALL.filter((n) => /^(view|take|reply|release|resolve|manage-conversations|create-bookings|edit-bookings|cancel-bookings|process-orders|use-conversation)/.test(n) || n === 'view-dashboard'),
    agente: ALL.filter((n) => /^(view-(dashboard|conversations|customers|bookings|orders)|take-conversations|reply-conversations|release-conversations|resolve-conversations)$/.test(n)),
    cliente: [],
};
const ROLES = ['admin', 'supervisor', 'agente', 'cliente'];
const SYSTEM_ROLES = ['admin', 'cliente'];

const OTHER_WORKSPACES = [
    { id: 2, code: 'TND-DEMO', name: 'Tienda Demo', organization: 'Grupo Salud Demo', isActive: true, membersCount: 2 },
];

const meta = (page) => page.meta;

function usersPage(db, query) {
    const search = (query.search ?? '').trim();
    const status = ['active', 'inactive'].includes(query.status) ? query.status : 'all';
    const rows = db.users.filter((u) => (!search || includes(u.name, search) || includes(u.email, search)) && (status === 'all' || (status === 'active' ? u.active : !u.active))).sort((a, b) => a.name.localeCompare(b.name));
    const { page, perPage } = listPage(rows, query, 'users');
    return {
        users: { data: page.data.map((u) => ({ id: u.id, name: u.name, email: u.email, roles: [u.role], grants: GRANTS[u.role] ?? [], created_at: fmtDate(db.seededAt - 90 * 86400000), identityLocked: false, isActive: u.active, canToggleStatus: u.id !== db.me })), meta: meta(page) },
        filters: { search, status, perPage },
    };
}

reg.get('users.index', ({ db, query }) => {
    const { users, filters } = usersPage(db, query);
    const roleRows = ROLES.map((name, i) => ({ id: i + 1, name, permissions: GRANTS[name], protected: SYSTEM_ROLES.includes(name), usersInWorkspace: db.users.filter((u) => u.role === name).length }));
    const roles = listPage(roleRows, query, 'roles');
    const group = (query.permission_group ?? '').trim();
    const q = (query.permission_q ?? '').trim();
    const names = ALL.filter((n) => (!group || catalog.permissions[n].group === group) && (!q || includes(`${catalog.permissions[n].label} ${catalog.permissions[n].description}`, q)));
    const perms = listPage(names.map((name) => ({ name, roles: ROLES.filter((r) => GRANTS[r].includes(name)) })), query, 'permissions');
    const wsRows = [{ id: db.workspace.id, code: db.workspace.code, name: db.workspace.name, organization: db.workspace.organization, isActive: true, membersCount: db.users.length }, ...OTHER_WORKSPACES];
    const ws = listPage(wsRows, query, 'workspaces');
    const selected = Number(query.workspace) === db.workspace.id ? {
        id: db.workspace.id, name: db.workspace.name, assignableRoles: ['supervisor', 'agente', 'cliente'], canInvite: false, invitations: [],
        members: { data: db.users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.active, isSelf: u.id === db.me, canManage: u.id !== db.me })), meta: { current_page: 1, last_page: 1, per_page: 10, total: db.users.length, from: 1, to: db.users.length } },
    } : null;
    return {
        component: 'Users/Index',
        props: {
            users, filters, perPageOptions: PER_PAGE_OPTIONS,
            createTargets: [{ id: db.workspace.id, name: db.workspace.name, code: db.workspace.code, organization: db.workspace.organization, isCurrent: true, roles: ['supervisor', 'agente', 'cliente'] }],
            roles: { data: roles.page.data, meta: roles.page.meta },
            permissions: { data: perms.page.data, meta: perms.page.meta, filters: { group, q }, total: ALL.length },
            permissionNames: ALL,
            permissionCatalog: { groups: catalog.groups, items: ALL.map((name) => ({ name, label: catalog.permissions[name].label, description: catalog.permissions[name].description, group: catalog.permissions[name].group, platform: false, requires: null })) },
            permissionRoles: ROLES.map((name, i) => ({ id: i + 1, name })), canManageRoles: false,
            invite: { roles: ['supervisor', 'agente', 'cliente'], invitations: db.invitations ?? [] },
            workspaces: { list: { data: ws.page.data, meta: ws.page.meta }, organizationOptions: [], canManage: false, canAssign: true, selected },
            organizations: null,
        },
    };
});

const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e ?? '');

reg.mut('users.store', ({ db, data }) => {
    const errors = {};
    if (!String(data.name ?? '').trim()) errors.name = 'El nombre es obligatorio.';
    if (!emailOk(data.email)) errors.email = 'Escribe un correo válido.';
    else if (db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) errors.email = 'Ya existe una persona con ese correo en este Workspace.';
    if (!ROLES.includes(data.role)) errors.role = 'Elige un rol.';
    if (Object.keys(errors).length) return { errors };
    db.users.push({ id: take('user', db.users), name: data.name.trim(), email: data.email.trim(), role: data.role, active: true, last_login: null, locations: [] });
    audit(db, `Creó el usuario ${data.name.trim()} con el rol ${data.role}`, 'created');
    return { flash: { success: 'Usuario creado correctamente (demostración: no se envía ningún correo).' } };
});
reg.mut('users.update', ({ db, params, data }) => {
    const u = db.users.find((x) => String(x.id) === params.user);
    if (!String(data.name ?? '').trim()) return { errors: { name: 'El nombre es obligatorio.' } };
    Object.assign(u, { name: data.name.trim(), email: data.email ?? u.email, role: ROLES.includes(data.role) ? data.role : u.role });
    audit(db, `Actualizó al usuario ${u.name}`);
    return { flash: { success: 'Usuario actualizado correctamente' } };
});
reg.mut('users.activate', ({ db, params }) => { db.users.find((x) => String(x.id) === params.user).active = true; return { flash: { success: 'Usuario activado correctamente' } }; });
reg.mut('users.deactivate', ({ db, params }) => { db.users.find((x) => String(x.id) === params.user).active = false; return { flash: { success: 'Usuario desactivado correctamente' } }; });
reg.mut('users.invitations.store', ({ db, data }) => {
    if (!emailOk(data.email)) return { errors: { email: 'Escribe un correo válido.' } };
    db.invitations = db.invitations ?? [];
    db.invitations.unshift({ id: take('invitation', db.invitations), email: data.email, role: data.role, status: 'pending', expiresAt: iso(Date.now() + 7 * 86400000), acceptedAt: null });
    return { flash: { success: 'Invitación creada (demostración: no se envía ningún correo).' } };
});
reg.mut('users.invitations.destroy', ({ db, params }) => { db.invitations = (db.invitations ?? []).filter((x) => String(x.id) !== params.invitation); return { flash: { success: 'Invitación cancelada' } }; });
reg.mut('users.invitations.resend', () => ({ flash: { success: 'Invitación reenviada (simulada).' } }));

reg.api('workspaces.search', ({ db }) => ({ data: [{ id: db.workspace.id, name: db.workspace.name, code: db.workspace.code, organization: db.workspace.organization }, ...OTHER_WORKSPACES.map((w) => ({ id: w.id, name: w.name, code: w.code, organization: w.organization }))] }));

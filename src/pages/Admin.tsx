import { useState } from 'react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, Card, Note, PageHeader, SimBadge, Table, Td } from '../components/ui';
import { MODULES, SECTION_LABEL } from '../data/modules';

const ROLES = ['admin', 'supervisor', 'agente', 'cliente'];
const PERMS = ['view-conversations', 'reply-conversations', 'manage-users', 'view-bookings', 'create-bookings', 'view-orders', 'manage-integrations'];
const GRANT: Record<string, string[]> = {
  admin: PERMS, supervisor: ['view-conversations', 'reply-conversations', 'view-bookings', 'view-orders'],
  agente: ['view-conversations', 'reply-conversations'], cliente: [],
};
const PLANS: Record<string, string[]> = {
  'Plan ejemplo A (atención)': ['dashboard', 'assistants', 'conversations', 'customers', 'reports'],
  'Plan ejemplo B (reservas)': ['dashboard', 'assistants', 'conversations', 'customers', 'services', 'bookings', 'reminders', 'reports'],
};

export default function Admin() {
  const [plan, setPlan] = useState(Object.keys(PLANS)[0]);
  const [role, setRole] = useState('agente');
  const included = PLANS[plan];
  return (
    <>
      <PageHeader title="Administración" subtitle="Organizaciones, Workspaces, usuarios, roles, permisos, módulos y planes." actions={<SimBadge>Datos ficticios</SimBadge>} />
      <ModuleIntro moduleKey="users" />
      <Card>
        <h2 className="font-semibold">Jerarquía multi-tenant</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-line p-3"><strong>Organización</strong><br />Grupo Salud Demo<br /><span className="text-xs text-ink-muted">Agrupa Workspaces</span></div>
          <div className="rounded-lg border border-line p-3"><strong>Workspaces</strong><br />Clínica Demo · Tienda Demo<br /><span className="text-xs text-ink-muted">Frontera de datos y de plan</span></div>
          <div className="rounded-lg border border-line p-3"><strong>Membresías</strong><br />Laura (admin) · Andrés (agente)<br /><span className="text-xs text-ink-muted">Rol por Workspace</span></div>
        </div>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Roles y permisos (muestra)</h2>
          <label className="mt-2 block text-sm font-medium">Rol
            <select className="mt-1 w-full rounded-lg border border-field bg-card px-2 py-1.5" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </label>
          <ul className="mt-3 space-y-1 text-sm">{PERMS.map((p) => <li key={p} className="flex items-center justify-between"><code>{p}</code>{GRANT[role].includes(p) ? <Badge tone="green">Permitido</Badge> : <Badge>Sin permiso</Badge>}</li>)}</ul>
          <p className="mt-2 text-xs text-ink-muted">Los nombres de rol son los reales (<code>RolesAndPermissionsSeeder</code>); la matriz es una muestra reducida.</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Plan y módulos</h2>
          <label className="mt-2 block text-sm font-medium">Plan
            <select className="mt-1 w-full rounded-lg border border-field bg-card px-2 py-1.5" value={plan} onChange={(e) => setPlan(e.target.value)}>{Object.keys(PLANS).map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">{MODULES.filter((m) => m.section !== 'platform').map((m) => <li key={m.key}>{included.includes(m.key) ? '✔' : '✖'} {m.name}</li>)}</ul>
          <div className="mt-3"><Note>Disponibilidad (plan) ≠ autorización (rol): el servidor exige las dos en cada ruta. Los planes de aquí son inventados.</Note></div>
        </Card>
      </div>
      <h2 className="mb-2 mt-5 font-semibold">Catálogo de módulos</h2>
      <Table head={['Módulo', 'Sección', 'Estado']}>
        {MODULES.map((m) => <tr key={m.key}><Td>{m.name}</Td><Td>{SECTION_LABEL[m.section]}</Td><Td>{m.maturity === 'implemented' ? 'Implementado' : m.maturity === 'partial' ? 'Parcial' : 'Pendiente'}</Td></tr>)}
      </Table>
    </>
  );
}

import { useState } from 'react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, Btn, Card, PageHeader, SimBadge, Table, Td, inputCls, useToast } from '../components/ui';
import { APPOINTMENTS, APPT_LABEL, PROFESSIONALS, SERVICES, money, type Appt, type ApptStatus } from '../data/demo';

const TONE: Record<ApptStatus, 'blue' | 'green' | 'gray' | 'red' | 'amber'> = { requested: 'amber', confirmed: 'blue', completed: 'green', no_show: 'red', cancelled: 'gray', failed: 'red' };
const DAYS = [10, 11, 12, 13, 14, 15, 16];

export default function Agenda() {
  const toast = useToast();
  const [items, setItems] = useState<Appt[]>(APPOINTMENTS);
  const [form, setForm] = useState({ customer: 'Valeria Núñez', service: SERVICES[0].name, day: 12, time: '10:00' });
  const set = (id: number, status: ApptStatus) => { setItems((s) => s.map((a) => (a.id === id ? { ...a, status } : a))); toast(`Cita #${id}: ${APPT_LABEL[status]}. Recordatorio simulado reprogramado.`); };
  const create = () => {
    const id = Math.max(...items.map((a) => a.id)) + 1;
    setItems((s) => [...s, { id, customer: form.customer, service: form.service, professional: PROFESSIONALS[0].name, location: 'Sede Centro', day: Number(form.day), time: form.time, status: 'requested', origin: 'admin' }]);
    toast(`Cita #${id} creada (solicitada). Recordatorio simulado programado 24 h antes.`);
  };
  return (
    <>
      <PageHeader title="Agenda" subtitle="Calendario, servicios, profesionales, citas y recordatorios." actions={<SimBadge>Acciones simuladas</SimBadge>} />
      <ModuleIntro moduleKey="bookings" />
      <Card>
        <h2 className="font-semibold">Semana del 10 al 16 de noviembre (ficticia)</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {DAYS.map((d) => (
            <div key={d} className="min-h-24 rounded-lg border border-line p-2">
              <p className="text-xs font-bold text-ink-muted">{d} nov</p>
              {items.filter((a) => a.day === d && a.status !== 'cancelled').map((a) => <p key={a.id} className="mt-1 rounded bg-primary-soft px-1 py-0.5 text-[11px]"><strong>{a.time}</strong> {a.customer.split(' ')[0]}</p>)}
            </div>
          ))}
        </div>
      </Card>
      <h2 className="mb-2 mt-5 font-semibold">Citas</h2>
      <Table head={['#', 'Cliente', 'Servicio', 'Profesional / sede', 'Fecha', 'Estado', 'Acciones']}>
        {items.map((a) => (
          <tr key={a.id}>
            <Td>{a.id}</Td><Td>{a.customer}</Td><Td>{a.service}</Td><Td>{a.professional}<div className="text-xs text-ink-muted">{a.location}</div></Td>
            <Td>{a.day} nov · {a.time}</Td><Td><Badge tone={TONE[a.status]}>{APPT_LABEL[a.status]}</Badge></Td>
            <Td><span className="flex flex-wrap gap-1">
              {a.status === 'requested' && <Btn kind="ghost" onClick={() => set(a.id, 'confirmed')}>Confirmar</Btn>}
              {(a.status === 'requested' || a.status === 'confirmed') && <Btn kind="ghost" onClick={() => set(a.id, 'cancelled')}>Cancelar</Btn>}
            </span></Td>
          </tr>
        ))}
      </Table>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Nueva cita (formulario de ejemplo)</h2>
          <div className="mt-2 space-y-2 text-sm">
            <label className="block">Cliente<input className={inputCls} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
            <label className="block">Servicio<select className={inputCls} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>{SERVICES.map((s) => <option key={s.name}>{s.name}</option>)}</select></label>
            <div className="flex gap-2">
              <label className="block flex-1">Día<select className={inputCls} value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>{DAYS.map((d) => <option key={d} value={d}>{d} nov</option>)}</select></label>
              <label className="block flex-1">Hora<input className={inputCls} type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
            </div>
            <Btn onClick={create}>Crear cita simulada</Btn>
          </div>
        </Card>
        <div className="lg:col-span-2">
          <Table head={['Servicio', 'Duración', 'Precio', 'Sedes']}>
            {SERVICES.map((s) => <tr key={s.name}><Td>{s.name}</Td><Td>{s.minutes} min</Td><Td>{money(s.price)}</Td><Td>{s.locations}</Td></tr>)}
          </Table>
          <div className="mt-3"><Table head={['Profesional', 'Servicios', 'Horario']}>
            {PROFESSIONALS.map((p) => <tr key={p.name}><Td>{p.name}</Td><Td>{p.services}</Td><Td>{p.schedule}</Td></tr>)}
          </Table></div>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-muted">Recordatorios en AVA: módulo aparte (<code>reminders</code>), por correo o plantilla de WhatsApp aprobada, con reglas y motivos de omisión. Aquí solo se muestran como notificación simulada.</p>
    </>
  );
}

import ModuleIntro from '../components/ModuleIntro';
import { Card, MaturityBadge, PageHeader, SimBadge } from '../components/ui';
import type { Maturity } from '../lib/types';

const ITEMS: { name: string; type: string; maturity: Maturity; text: string; note: string }[] = [
  { name: 'Web', type: 'Canal', maturity: 'implemented', text: 'Widget embebible; entrega por consulta periódica (pull).', note: 'Probado en local.' },
  { name: 'WhatsApp', type: 'Canal (Meta)', maturity: 'partial', text: 'Webhooks firmados, refresco de tokens, plantillas, botones de respuesta rápida.', note: 'Sin ciclo real validado con Meta.' },
  { name: 'Instagram', type: 'Canal (Meta OAuth)', maturity: 'partial', text: 'Conexión OAuth y suscripción implementadas.', note: 'Requiere la app de Meta de la plataforma.' },
  { name: 'Messenger', type: 'Canal (Meta OAuth)', maturity: 'partial', text: 'Conexión OAuth y suscripción implementadas.', note: 'Requiere la app de Meta de la plataforma.' },
  { name: 'n8n', type: 'Automatización', maturity: 'partial', text: 'Contrato firmado AVA → n8n, token por asistente, contexto, traspaso, actividad técnica.', note: 'Sin prueba real de punta a punta; el catálogo de flujos está vacío por defecto.' },
  { name: 'Booker', type: 'Agenda externa', maturity: 'partial', text: 'Disponibilidad y reserva simuladas; registro unificado de reservas externas.', note: 'Supuestos sin confirmar; sin credenciales de Staging.' },
  { name: 'HTTP / REST genérica', type: 'Conexión', maturity: 'implemented', text: 'Métodos, autenticación (API key, Bearer, Basic) y protección contra destinos inseguros.', note: 'WooCommerce se conecta por esta vía; sin tienda de prueba aún.' },
  { name: 'Wompi', type: 'Pasarela', maturity: 'partial', text: 'Webhook firmado, idempotencia, estados.', note: 'Pruebas con dobles; sin Sandbox real.' },
  { name: 'CardNET', type: 'Pasarela', maturity: 'planned', text: 'Tarjeta de configuración y núcleo de pagos listos.', note: 'Protocolo no implementado: falta la guía oficial.' },
  { name: 'AZUL', type: 'Pasarela', maturity: 'planned', text: 'Configuración por Workspace.', note: 'Aplazado.' },
];

export default function Integrations() {
  return (
    <>
      <PageHeader title="Integraciones" subtitle="Qué se conecta, y en qué estado real está cada conexión." actions={<SimBadge>Sin conexiones reales</SimBadge>} />
      <ModuleIntro moduleKey="integrations" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((i) => (
          <Card key={i.name}>
            <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{i.name}</h2><MaturityBadge value={i.maturity} /></div>
            <p className="text-xs text-ink-muted">{i.type}</p>
            <p className="mt-2 text-sm">{i.text}</p>
            <p className="mt-2 text-xs text-ink-muted">Estado: {i.note}</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-muted">Esta demostración no se conecta a ninguno de estos servicios.</p>
    </>
  );
}

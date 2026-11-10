import ModuleIntro from '../components/ModuleIntro';
import { Badge, Card, MaturityBadge, Note, PageHeader, SimBadge } from '../components/ui';

/** PaymentStatus enum of AVA Platform (app/Payments/Gateways/PaymentStatus.php). */
const STATES = ['pending', 'processing', 'approved', 'declined', 'cancelled', 'expired', 'refund_pending', 'refunded', 'verification_required'];

export default function Payments() {
  return (
    <>
      <PageHeader title="Pagos" subtitle="Estructura conceptual. No procesa ni simula cobros reales." actions={<SimBadge>Solo conceptual</SimBadge>} />
      <ModuleIntro moduleKey="payments" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Dos mundos separados</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li><strong>Pagos de la plataforma:</strong> lo que cobra CCG por el servicio (planes y suscripciones). En AVA no existe aún: renovaciones y cobros recurrentes están pendientes de reglas comerciales.</li>
            <li><strong>Pagos del Workspace:</strong> lo que un negocio cobra a sus clientes con su propia pasarela (p. ej. pedidos). Es el núcleo que sí existe: transacciones, estados, idempotencia y conciliación.</li>
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Pasarelas por Workspace</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex items-center justify-between">Wompi <MaturityBadge value="partial" /></li>
            <li className="flex items-center justify-between">CardNET <MaturityBadge value="planned" /></li>
            <li className="flex items-center justify-between">AZUL <MaturityBadge value="planned" /></li>
          </ul>
          <p className="mt-2 text-xs text-ink-muted">Las credenciales se guardan cifradas y de solo escritura; nunca se muestran. Aquí no hay ninguna.</p>
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="font-semibold">Estados de una transacción (resumen)</h2>
        <p className="mt-2 flex flex-wrap gap-1.5">{STATES.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</p>
        <p className="mt-2 text-xs text-ink-muted">Un pago que no se puede confirmar pasa a verificación, nunca a rechazo automático.</p>
      </Card>
      <div className="mt-4"><Note tone="amber">Ninguna pasarela tiene validación real registrada. No se procesan pagos desde esta demostración.</Note></div>
    </>
  );
}

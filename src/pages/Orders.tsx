import { useState } from 'react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, Btn, Card, PageHeader, SimBadge, Table, Td, useToast } from '../components/ui';
import { ORDERS, ORDER_LABEL, ORDER_NEXT, money, type OrderStatus } from '../data/demo';

export default function Orders() {
  const toast = useToast();
  const [items, setItems] = useState(ORDERS);
  const [sel, setSel] = useState(ORDERS[0].number);
  const o = items.find((x) => x.number === sel)!;
  const move = (to: OrderStatus) => { setItems((s) => s.map((x) => (x.number === o.number ? { ...x, status: to } : x))); toast(`Pedido ${o.number}: ${ORDER_LABEL[to]}. (AVA todavía no avisa al cliente.)`); };
  return (
    <>
      <PageHeader title="Pedidos" subtitle="Listado, detalle y flujo de estados." actions={<SimBadge>Acciones simuladas</SimBadge>} />
      <ModuleIntro moduleKey="orders" />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Table head={['Pedido', 'Cliente', 'Entrega', 'Total', 'Estado']}>
            {items.map((x) => (
              <tr key={x.number} className={sel === x.number ? 'bg-primary-soft' : ''}>
                <Td><button type="button" className="font-semibold text-primary-strong hover:underline" onClick={() => setSel(x.number)}>{x.number}</button></Td>
                <Td>{x.customer}</Td><Td>{x.method}</Td><Td>{money(x.total)}</Td><Td><Badge tone={x.status === 'cancelled' ? 'red' : x.status === 'delivered' ? 'green' : 'blue'}>{ORDER_LABEL[x.status]}</Badge></Td>
              </tr>
            ))}
          </Table>
        </div>
        <Card className="lg:col-span-2">
          <h2 className="font-semibold">Detalle {o.number}</h2>
          <ul className="mt-2 text-sm">{o.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <p className="mt-2 text-sm">Total: <strong>{money(o.total)}</strong></p>
          <h3 className="mt-3 text-sm font-semibold">Siguiente estado permitido</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {ORDER_NEXT[o.status].length === 0 ? <span className="text-sm text-ink-muted">Estado final.</span> : ORDER_NEXT[o.status].map((n) => <Btn key={n} kind={n === 'cancelled' ? 'danger' : 'ghost'} onClick={() => move(n)}>{ORDER_LABEL[n]}</Btn>)}
          </div>
          <p className="mt-3 text-xs text-ink-muted">Las transiciones son las de <code>config/orders.php</code>. El asistente de IA nunca mueve ni cancela un pedido.</p>
        </Card>
      </div>
    </>
  );
}

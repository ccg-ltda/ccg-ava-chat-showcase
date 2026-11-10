import { useState } from 'react';
import ModuleIntro from '../components/ModuleIntro';
import { Badge, PageHeader, SimBadge, Table, Td, inputCls } from '../components/ui';
import { PRODUCTS, money } from '../data/demo';

export default function Catalog() {
  const [cat, setCat] = useState('Todas');
  const cats = ['Todas', ...new Set(PRODUCTS.map((p) => p.category))];
  const rows = PRODUCTS.filter((p) => cat === 'Todas' || p.category === cat);
  return (
    <>
      <PageHeader title="Catálogo e inventario" subtitle="Productos y existencias por sede. Los servicios están en Agenda." actions={<SimBadge>Datos ficticios</SimBadge>} />
      <ModuleIntro moduleKey="catalog" />
      <label className="mb-3 block max-w-xs text-sm font-medium">Categoría
        <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <Table head={['SKU', 'Producto', 'Categoría', 'Precio', 'Centro', 'Norte']}>
        {rows.map((p) => (
          <tr key={p.sku}>
            <Td>{p.sku}</Td><Td>{p.name}</Td><Td>{p.category}</Td><Td>{money(p.price)}</Td>
            {(['Centro', 'Norte'] as const).map((l) => <Td key={l}>{p.stock[l] === 0 ? <Badge tone="red">Agotado</Badge> : p.stock[l] < 5 ? <Badge tone="amber">{p.stock[l]} (bajo)</Badge> : p.stock[l]}</Td>)}
          </tr>
        ))}
      </Table>
    </>
  );
}

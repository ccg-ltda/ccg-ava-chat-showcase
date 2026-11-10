import { Link } from 'react-router-dom';
import { Empty, PageHeader } from '../components/ui';

export default function NotFound() {
  return (
    <>
      <PageHeader title="Página no encontrada" />
      <Empty title="Esta ruta no existe en la demostración" text="Vuelve al inicio para navegar por los módulos." />
      <p className="mt-4 text-center"><Link to="/dashboard" className="font-semibold text-primary-strong underline">Ir al Dashboard</Link></p>
    </>
  );
}

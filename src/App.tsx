import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Assistants from './pages/Assistants';
import Chatbots from './pages/Chatbots';
import Conversations from './pages/Conversations';
import Customers from './pages/Customers';
import Agenda from './pages/Agenda';
import Catalog from './pages/Catalog';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import Admin from './pages/Admin';
import Payments from './pages/Payments';
import Scenarios from './pages/Scenarios';
import Docs from './pages/Docs';
import Voice from './pages/Voice';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="asistentes" element={<Assistants />} />
        <Route path="chatbots" element={<Chatbots />} />
        <Route path="conversaciones" element={<Conversations />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="catalogo" element={<Catalog />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="integraciones" element={<Integrations />} />
        <Route path="administracion" element={<Admin />} />
        <Route path="pagos" element={<Payments />} />
        <Route path="escenarios" element={<Scenarios />} />
        <Route path="documentacion/:section?" element={<Docs />} />
        <Route path="ava-voz" element={<Voice />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

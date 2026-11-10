import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3, BookOpen, Bot, Boxes, Building2, CalendarDays, CreditCard, LayoutDashboard, Menu, MessageSquare, MessagesSquare, Moon, Package,
  Phone, PlayCircle, Plug, Sun, Users, X, ShieldAlert, type LucideIcon,
} from 'lucide-react';

interface Item { to: string; label: string; icon: LucideIcon }
const GROUPS: { label: string; items: Item[] }[] = [
  { label: 'General', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/asistentes', label: 'Asistentes IA', icon: Bot },
    { to: '/chatbots', label: 'Chatbots', icon: MessagesSquare },
    { to: '/conversaciones', label: 'Conversaciones', icon: MessageSquare },
  ] },
  { label: 'Operación', items: [
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/catalogo', label: 'Catálogo e inventario', icon: Boxes },
    { to: '/pedidos', label: 'Pedidos', icon: Package },
    { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  ] },
  { label: 'Administración', items: [
    { to: '/integraciones', label: 'Integraciones', icon: Plug },
    { to: '/administracion', label: 'Organizaciones y roles', icon: Building2 },
    { to: '/pagos', label: 'Pagos', icon: CreditCard },
  ] },
  { label: 'Guía', items: [
    { to: '/escenarios', label: 'Escenarios simulados', icon: PlayCircle },
    { to: '/documentacion', label: 'Documentación', icon: BookOpen },
    { to: '/ava-voz', label: 'AVA Chat → AVA Voz', icon: Phone },
  ] },
];

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('showcase-theme', next ? 'dark' : 'light'); } catch { /* storage may be blocked */ }
  };
  return { dark, toggle };
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-dvh">
      <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-3 py-1.5 text-center text-xs font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-200">
        <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
        Demostración de referencia de AVA Chat · datos ficticios · sin servicios productivos · no es una implementación de AVA Voz
      </div>
      <header className="brand-surface sticky top-0 z-30 flex h-14 items-center gap-3 px-4 text-white">
        <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-white/10 md:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
          <Menu className="size-5" />
        </button>
        <img src="/brand/mascota-celular.png" alt="" className="h-9 w-auto" />
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-wide">AVA CHAT SHOWCASE</p>
          <p className="hidden text-xs text-white/75 sm:block">Workspace ficticio · Clínica y Tienda Demo</p>
        </div>
        <div className="ml-auto">
          <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} className="grid size-9 place-items-center rounded-full hover:bg-white/10">
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
      </header>

      <div className="flex">
        <div className={`fixed inset-0 z-40 bg-black/50 md:hidden ${open ? '' : 'hidden'}`} onClick={() => setOpen(false)} aria-hidden="true" />
        <aside
          aria-label="Navegación principal"
          className={`brand-surface fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto px-3 py-4 text-white transition-transform md:sticky md:top-14 md:z-10 md:h-[calc(100dvh-3.5rem)] md:translate-x-0 md:self-start ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <button type="button" className="mb-2 grid size-9 place-items-center rounded-full hover:bg-white/10 md:hidden" aria-label="Cerrar menú" onClick={() => setOpen(false)}><X className="size-5" /></button>
          <nav className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wider text-white/65">{g.label}</p>
                <ul className="space-y-0.5">
                  {g.items.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink to={to} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-white/10 ${isActive ? 'bg-white/20 font-semibold' : ''}`}>
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 overflow-x-clip px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

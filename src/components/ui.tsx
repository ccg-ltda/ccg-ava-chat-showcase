import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { FlaskConical, Info } from 'lucide-react';
import { MATURITY_LABEL, type Maturity } from '../lib/types';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card border border-line bg-card p-4 shadow-card ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

const TONES: Record<string, string> = {
  blue: 'bg-primary-soft text-primary-strong',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

const MATURITY_TONE: Record<Maturity, keyof typeof TONES> = { implemented: 'green', partial: 'amber', planned: 'gray', proposal: 'violet' };
export function MaturityBadge({ value }: { value: Maturity }) {
  return <Badge tone={MATURITY_TONE[value]}>{MATURITY_LABEL[value]}</Badge>;
}

/** Marks everything on screen that is a simulation inside the showcase. */
export function SimBadge({ children = 'Simulado' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet px-2 py-0.5 text-xs font-semibold text-violet">
      <FlaskConical className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}

export function Note({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'amber' | 'violet' }) {
  const cls = { blue: 'border-primary/40 bg-primary-soft', amber: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/40', violet: 'border-violet/50 bg-violet-50 dark:bg-violet-950/40' }[tone];
  return (
    <div className={`flex gap-2 rounded-lg border p-3 text-sm ${cls}`} role="note">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </Card>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-ink-muted">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className = '' }: { children: ReactNode; className?: string }) => <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-card border border-dashed border-line p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{text}</p>
    </div>
  );
}

export function Btn({ children, onClick, kind = 'primary', disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit' }) {
  const cls = { primary: 'bg-primary text-white hover:bg-primary-strong dark:text-slate-900', ghost: 'border border-field hover:bg-canvas', danger: 'bg-danger text-white dark:text-slate-900' }[kind];
  return <button type={type} disabled={disabled} onClick={onClick} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}>{children}</button>;
}

export const inputCls = 'w-full rounded-lg border border-field bg-card px-3 py-1.5 text-sm';

/* ---- Toasts: every simulated notification is labelled as such ---- */
interface Toast { id: number; text: string }
const ToastCtx = createContext<(text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="rounded-lg border border-violet bg-card p-3 text-sm shadow-card">
            <SimBadge>Notificación simulada</SimBadge>
            <p className="mt-1">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

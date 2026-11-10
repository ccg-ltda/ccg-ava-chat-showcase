import { MODULES } from '../data/modules';
import { Card, MaturityBadge, Note } from './ui';

/** Honest header of every module page: real status in AVA, repository evidence, and known limits. */
export default function ModuleIntro({ moduleKey }: { moduleKey: string }) {
  const m = MODULES.find((x) => x.key === moduleKey);
  if (!m) return null;
  return (
    <Card className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <MaturityBadge value={m.maturity} />
        <span className="text-sm text-ink-muted">{m.summary}</span>
      </div>
      <p className="mt-2 break-words text-xs text-ink-muted">
        Evidencia en el repositorio: {m.evidence.map((e) => <code key={e} className="mr-1.5 inline-block max-w-full break-all rounded bg-canvas px-1 py-0.5">{e}</code>)}
      </p>
      {m.limits && <div className="mt-3"><Note tone="amber"><strong>Límite actual:</strong> {m.limits}</Note></div>}
    </Card>
  );
}

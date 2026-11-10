/** How a capability relates to the real AVA Platform code base. */
export type Maturity = 'implemented' | 'partial' | 'planned' | 'proposal';

export const MATURITY_LABEL: Record<Maturity, string> = {
  implemented: 'Implementado en AVA',
  partial: 'Parcial en AVA',
  planned: 'Planificado / pendiente',
  proposal: 'Propuesta AVA Voz',
};

export interface ModuleInfo {
  key: string;
  name: string;
  path: string;
  section: 'general' | 'operation' | 'administration' | 'platform';
  maturity: Maturity;
  summary: string;
  /** Repository evidence (config keys, models, services). Never secrets. */
  evidence: string[];
  limits?: string;
}

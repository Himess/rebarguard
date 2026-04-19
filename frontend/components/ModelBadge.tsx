import type { AgentDef } from '@/lib/agents';

type Props = {
  agent?: AgentDef | null;
  model?: string | null;
};

function classOfModel(model: string | null | undefined): string {
  if (!model) return '';
  if (model.includes('kimi')) return 'blue';
  if (model.toLowerCase().includes('hermes')) return 'amber';
  return '';
}

export function ModelBadge({ agent, model }: Props) {
  const label = agent?.model ?? model ?? null;
  if (!label) return null;
  const cls = agent?.modelClass ?? classOfModel(label);
  return (
    <span
      className={`chip ${cls}`}
      style={{ height: 18, fontSize: 10, padding: '0 6px', letterSpacing: '0.06em' }}
    >
      {label}
    </span>
  );
}

export function Dot({ hueVar, size = 8 }: { hueVar: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 999,
        background: `var(${hueVar})`,
        boxShadow: `0 0 0 2px color-mix(in oklch, var(${hueVar}) 20%, transparent)`,
      }}
    />
  );
}

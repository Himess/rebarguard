'use client';

import type { AgentDef } from '@/lib/agents';
import { ModelBadge } from './ModelBadge';

export type BubbleMessage = {
  t: string;
  text: string;
  flag?: 'fail' | 'warn' | 'synth' | null;
  evidence?: Record<string, unknown> | null;
  model?: string | null;
};

function flagColor(flag: BubbleMessage['flag']): string | null {
  if (flag === 'fail') return 'var(--red)';
  if (flag === 'warn') return 'var(--yellow)';
  if (flag === 'synth') return 'var(--hazard)';
  return null;
}

export function Bubble({ agent, msg }: { agent: AgentDef | undefined; msg: BubbleMessage }) {
  if (!agent) return null;
  const isMod = agent.id === 'mod';
  const fc = flagColor(msg.flag);
  return (
    <div
      className="bubble-fadein"
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr',
        gap: 12,
        padding: isMod ? '12px 14px' : '10px 12px',
        background: isMod
          ? 'color-mix(in oklch, var(--hazard) 8%, var(--bg-2))'
          : 'var(--bg-2)',
        border: `1px solid ${isMod ? 'var(--hazard-ring)' : 'var(--line-1)'}`,
        borderLeft: `3px solid var(${agent.hueVar})`,
        borderRadius: 3,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `color-mix(in oklch, var(${agent.hueVar}) 18%, var(--bg-3))`,
          color: `var(${agent.hueVar})`,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        {agent.short.slice(0, 2)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>
            {agent.name}
          </span>
          <ModelBadge agent={agent} model={msg.model} />
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--text-3)',
              letterSpacing: '0.08em',
              marginLeft: 'auto',
            }}
          >
            +{msg.t}
          </span>
          {fc && (
            <span
              className="chip"
              style={{
                color: fc,
                borderColor: fc,
                background: 'transparent',
                height: 18,
                fontSize: 9,
              }}
            >
              {msg.flag?.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: 'var(--text-1)' }}>
          {msg.text}
        </div>
        {msg.evidence && (
          <details
            className="mono"
            style={{
              marginTop: 8,
              padding: '6px 8px',
              background: 'var(--bg-0)',
              border: '1px solid var(--line-1)',
              borderRadius: 2,
              fontSize: 10,
              color: 'var(--text-2)',
              letterSpacing: '0.02em',
            }}
          >
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>evidence</summary>
            <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(msg.evidence, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

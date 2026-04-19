'use client';

import { useEffect, useRef } from 'react';
import { AGENTS, AGENT_BY_ID, type AgentId } from '@/lib/agents';
import { Bubble, type BubbleMessage } from './Bubble';
import { Dot } from './ModelBadge';

export type DebateItem = BubbleMessage & { agent: AgentId };

type Props = {
  messages: DebateItem[];
  total?: number;
  thinkingAgent?: AgentId | null;
};

export function DebateStream({ messages, total = 8, thinkingAgent }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wrapRef.current) wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
  }, [messages.length]);

  const nextThinkingId = thinkingAgent ?? AGENTS[messages.length % AGENTS.length].id;
  const thinking = messages.length < total ? AGENT_BY_ID[nextThinkingId] : null;

  return (
    <div
      ref={wrapRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '14px 20px',
        background: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {messages.map((m, i) => {
        const agent = AGENT_BY_ID[m.agent];
        return <Bubble key={i} agent={agent} msg={m} />;
      })}

      {thinking && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', opacity: 0.6 }}>
          <Dot hueVar={thinking.hueVar} />
          <span
            className="mono"
            style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}
          >
            {thinking.name.toUpperCase()} · THINKING
            <span className="typing-dots" style={{ marginLeft: 6 }}>●●●</span>
          </span>
        </div>
      )}

      {messages.length === 0 && !thinking && (
        <div
          className="mono"
          style={{
            display: 'grid',
            placeItems: 'center',
            height: '100%',
            color: 'var(--text-3)',
            fontSize: 11,
            letterSpacing: '0.1em',
          }}
        >
          AGENTS IDLE — CLICK <span style={{ color: 'var(--hazard)', margin: '0 4px' }}>START</span> TO BEGIN
        </div>
      )}
    </div>
  );
}

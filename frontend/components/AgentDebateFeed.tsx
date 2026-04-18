'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { AgentMessage } from '@/lib/api';

const AGENT_LABELS: Record<AgentMessage['agent'], { name: string; color: string; icon: string }> = {
  plan_parser: { name: 'Proje Ayrıştırıcı', color: '#38bdf8', icon: '📐' },
  geometry: { name: 'Geometri Ajanı', color: '#a78bfa', icon: '📏' },
  code: { name: 'TBDY/TS500 Kodu', color: '#f472b6', icon: '📜' },
  fraud: { name: 'Sahtecilik Ajanı', color: '#ef4444', icon: '🕵️' },
  risk: { name: 'Deprem Riski', color: '#f97316', icon: '⚠️' },
  material: { name: 'Malzeme Ajanı', color: '#10b981', icon: '🔩' },
  cover: { name: 'Paspayı Ajanı', color: '#60a5fa', icon: '📐' },
  moderator: { name: 'Moderatör', color: '#f59e0b', icon: '⚖️' },
};

const KIND_STYLE: Record<AgentMessage['kind'], string> = {
  observation: 'border-white/10',
  challenge: 'border-red-400/40',
  rebuttal: 'border-yellow-400/40',
  verdict: 'border-[var(--color-accent)]/60',
};

export default function AgentDebateFeed({ messages }: { messages: AgentMessage[] }) {
  return (
    <div className="scrollbar-thin flex h-full flex-col gap-3 overflow-y-auto pr-2">
      <AnimatePresence initial={false}>
        {messages.map((m) => {
          const meta = AGENT_LABELS[m.agent];
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`rounded-lg border bg-[var(--color-panel-2)] p-3 ${KIND_STYLE[m.kind]}`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span>{meta.icon}</span>
                  <span className="font-medium" style={{ color: meta.color }}>
                    {meta.name}
                  </span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                    {m.kind}
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)]">
                  {new Date(m.timestamp).toLocaleTimeString('tr-TR')}
                </span>
              </div>
              <div className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
                {m.content}
              </div>
              {m.evidence && (
                <details className="mt-2 text-xs text-[var(--color-text-muted)]">
                  <summary className="cursor-pointer hover:text-white">Kanıt (JSON)</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-[10px]">
                    {JSON.stringify(m.evidence, null, 2)}
                  </pre>
                </details>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {messages.length === 0 && (
        <div className="grid h-full place-items-center text-sm text-[var(--color-text-muted)]">
          Ajan tartışması burada görünecek...
        </div>
      )}
    </div>
  );
}

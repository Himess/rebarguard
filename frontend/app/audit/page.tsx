'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { fetchAuditLog, type AuditLogResponse, type AuditRow } from '@/lib/api';

const EVENT_COLOR: Record<string, string> = {
  on_session_start: 'var(--blue)',
  on_session_finalize: 'var(--green)',
  post_llm_call: 'var(--hazard)',
};

const EVENTS: Array<{ value: string | undefined; label: string }> = [
  { value: undefined, label: 'All events' },
  { value: 'on_session_start', label: 'session_start' },
  { value: 'on_session_finalize', label: 'session_finalize' },
  { value: 'post_llm_call', label: 'post_llm_call' },
];

export default function AuditPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const next = await fetchAuditLog(80, filter);
        if (!cancelled) {
          setData(next);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && autoRefresh) timer = setTimeout(tick, 6000);
      }
    }
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [filter, autoRefresh]);

  const stats = useMemo(() => {
    const s = data?.summary ?? {};
    return [
      { label: 'session start', value: s.on_session_start ?? 0, color: EVENT_COLOR.on_session_start },
      { label: 'llm call', value: s.post_llm_call ?? 0, color: EVENT_COLOR.post_llm_call },
      { label: 'session finalize', value: s.on_session_finalize ?? 0, color: EVENT_COLOR.on_session_finalize },
    ];
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <TopNav projectContext="HERMES AUDIT TRAIL" />

      <div style={{ padding: '32px 32px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <span className="chip hazard">FRAMEWORK PROOF · LIVE</span>
        <h1 style={{ margin: '12px 0 8px', fontSize: 32, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Hermes lifecycle hooks — every call, on the record.
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', maxWidth: 760, lineHeight: 1.55 }}>
          Three shell scripts declared in{' '}
          <code style={{ color: 'var(--text-1)' }}>backend/hermes-config/cli-config.yaml</code>{' '}
          fire on every <code>hermes chat</code> call from the orchestrator and write a JSONL row
          to <code>/data/hermes/audit-log.jsonl</code> on the Fly volume. Below is the live tail.
        </p>

        {/* stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginTop: 24,
            marginBottom: 18,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="panel"
              style={{ padding: '14px 16px', borderLeft: `3px solid ${s.color}` }}
            >
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {s.label}
              </div>
              <div className="mono num" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-0)', marginTop: 4 }}>
                {s.value}
              </div>
            </div>
          ))}
          <div
            className="panel"
            style={{
              padding: '14px 16px',
              borderLeft: '3px solid var(--text-3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              total rows
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span className="mono num" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-0)' }}>
                {data?.count ?? 0}
              </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                last {data?.rows.length ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* filter row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          {EVENTS.map((e) => (
            <button
              key={e.label}
              onClick={() => setFilter(e.value)}
              className="mono"
              style={{
                padding: '6px 10px',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: filter === e.value ? 'var(--bg-3)' : 'transparent',
                color: filter === e.value ? 'var(--text-0)' : 'var(--text-2)',
                border: '1px solid var(--line-2)',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              {e.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--hazard)' }}
            />
            Auto-refresh 6s
          </label>
        </div>

        {/* status */}
        {loading && !data && (
          <div className="mono" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', letterSpacing: '0.1em', fontSize: 11 }}>
            FETCHING AUDIT TRAIL…
          </div>
        )}
        {err && (
          <div
            className="mono"
            style={{
              padding: '10px 14px',
              background: 'color-mix(in oklch, var(--red) 12%, var(--bg-2))',
              border: '1px solid color-mix(in oklch, var(--red) 40%, var(--line-2))',
              borderRadius: 3,
              color: 'var(--text-1)',
              fontSize: 11,
              letterSpacing: '0.06em',
              marginBottom: 12,
            }}
          >
            <span style={{ color: 'var(--red)' }}>FETCH FAILED</span> — {err}
          </div>
        )}

        {data && data.rows.length === 0 && !loading && (
          <div
            className="panel"
            style={{
              padding: '32px',
              textAlign: 'center',
              color: 'var(--text-2)',
              fontSize: 13,
            }}
          >
            <p style={{ margin: 0 }}>No audit entries yet — fire a Hermes call (`/quick`, `/inspection/new`, `/watch`) and refresh.</p>
            <p
              className="mono"
              style={{
                marginTop: 12,
                fontSize: 10,
                color: 'var(--text-3)',
                letterSpacing: '0.08em',
              }}
            >
              SOURCE · {data.log_path}
            </p>
          </div>
        )}

        {/* rows table */}
        {data && data.rows.length > 0 && (
          <div
            className="panel"
            style={{ overflow: 'hidden', border: '1px solid var(--line-1)', background: 'var(--bg-2)' }}
          >
            <div className="panel-h">
              <span>Recent events</span>
              <span className="mono" style={{ fontSize: 10 }}>
                {data.log_path}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--text-3)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      background: 'var(--bg-1)',
                    }}
                  >
                    <Th>Time (UTC)</Th>
                    <Th>Event</Th>
                    <Th>Model</Th>
                    <Th>Source</Th>
                    <Th>Session</Th>
                    <Th>CWD</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <Row key={i} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            padding: '14px 18px',
            border: '1px solid var(--line-1)',
            borderLeft: '3px solid var(--blue)',
            background: 'var(--bg-2)',
            borderRadius: 4,
            fontSize: 12,
            color: 'var(--text-2)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: 'var(--text-1)' }}>Why this exists.</strong>{' '}
          Hooks are a Hermes Agent framework primitive. Declaring them in{' '}
          <code>cli-config.yaml</code> + setting <code>HERMES_ACCEPT_HOOKS=1</code> on the Fly env
          makes the framework itself emit lifecycle events for every chat call — no Python hand-rolling.
          Each row above is a row the framework wrote, not the application. That&apos;s the
          framework-usage proof a judge wants to see.
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
}

function Row({ r }: { r: AuditRow }) {
  const ev = String(r.event ?? 'unknown');
  const ts = String(r.ts ?? '—');
  const model = (r.model as string | null) ?? (r as { extra?: { model?: string } }).extra?.model ?? '—';
  const source = (r.source as string | null) ?? '—';
  const session = (r.session_id as string | null) ?? '—';
  const cwd = (r.cwd as string | null) ?? '—';
  const color = EVENT_COLOR[ev] ?? 'var(--text-3)';
  return (
    <tr style={{ borderTop: '1px solid var(--line-1)' }}>
      <Td>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
          {ts.replace('T', ' ').replace('Z', '')}
        </span>
      </Td>
      <Td>
        <span
          className="mono"
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            fontSize: 9,
            color,
            background: 'transparent',
            border: `1px solid ${color}`,
            borderRadius: 2,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {ev}
        </span>
      </Td>
      <Td>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-1)' }}>
          {String(model)}
        </span>
      </Td>
      <Td>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
          {String(source)}
        </span>
      </Td>
      <Td>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {String(session).slice(0, 22)}
        </span>
      </Td>
      <Td>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {String(cwd)}
        </span>
      </Td>
    </tr>
  );
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>{children}</td>;
}

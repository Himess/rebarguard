'use client';

import { useMemo, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { ArticleModal } from '@/components/ArticleModal';
import { analyzeQuickPhoto, BACKEND_URL, type QuickFinding } from '@/lib/api';

type DisplayFinding = QuickFinding & {
  cx: number;
  cy: number;
  r: number;
};

function bboxToCircle(f: QuickFinding): DisplayFinding {
  const cx = f.bbox.x + f.bbox.w / 2;
  const cy = f.bbox.y + f.bbox.h / 2;
  const r = Math.max(20, Math.min(72, Math.max(f.bbox.w, f.bbox.h) * 100 * 4.5));
  return { ...f, cx, cy, r };
}

const colorFor = (s: QuickFinding['severity']) =>
  s === 'fail' ? 'var(--red)' : s === 'warn' ? 'var(--yellow)' : 'var(--blue)';

export default function QuickScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [findings, setFindings] = useState<QuickFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [model, setModel] = useState<string>('moonshotai/kimi-k2.6');
  const [err, setErr] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);

  const display: DisplayFinding[] = useMemo(
    () => findings.map(bboxToCircle),
    [findings],
  );

  async function onPick(f: File | null) {
    if (url) URL.revokeObjectURL(url);
    setFile(f);
    setUrl(f ? URL.createObjectURL(f) : null);
    setErr(null);
    setHovered(null);
    setFindings([]);
    setHasResult(false);
    setElapsed(null);
    if (!f) return;
    setLoading(true);
    try {
      const result = await analyzeQuickPhoto(f);
      setFindings(result.findings);
      setElapsed(result.elapsed_s);
      setModel(result.model);
      setHasResult(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const meta = useMemo(() => {
    if (!file) return 'NO PHOTO LOADED';
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return `${file.name.toUpperCase()} · ${sizeMb} MB`;
  }, [file]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <ArticleModal code={openArticle} onClose={() => setOpenArticle(null)} />
      <TopNav projectContext="PROJ · QUICK SCAN" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 0,
          minHeight: 'calc(100vh - 52px)',
        }}
      >
        <div
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--bg-1)',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Quick scan</h2>
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}
              >
                {meta}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                className="mono"
                title="Vision model used for this scan"
                style={{
                  padding: '4px 8px',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--blue)',
                  background: 'color-mix(in oklch, var(--blue) 12%, transparent)',
                  border: '1px solid color-mix(in oklch, var(--blue) 40%, var(--line-2))',
                  borderRadius: 2,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                MODEL · {model}
              </span>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                {file ? 'Replace photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
              <button className="btn sm" disabled>
                Export report
              </button>
              <button className="btn primary sm" disabled={!file}>
                Promote to full inspection →
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              position: 'relative',
              border: '1px solid var(--line-2)',
              borderRadius: 4,
              overflow: 'hidden',
              background: '#000',
              minHeight: 380,
            }}
          >
            {url ? (
              <img
                src={url}
                alt={file ? `Site photo ${file.name}` : 'Uploaded site photo'}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  filter: 'saturate(0.9) brightness(0.95)',
                }}
              />
            ) : (
              <PhotoPlaceholder />
            )}

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
              {display.map((f, idx) => {
                const c = colorFor(f.severity);
                const active = hovered === `f${idx}`;
                const rU = f.r / 10;
                return (
                  <g
                    key={idx}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(`f${idx}`)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <circle cx={f.cx * 100} cy={f.cy * 100} r={rU * 1.4} fill={c} opacity={active ? 0.14 : 0.06} />
                    <circle cx={f.cx * 100} cy={f.cy * 100} r={rU} fill="none" stroke={c} strokeWidth="0.25" opacity="0.9" />
                    <circle cx={f.cx * 100} cy={f.cy * 100} r={rU * 0.35} fill={c} />
                    <line x1={f.cx * 100 - rU * 1.4} y1={f.cy * 100} x2={f.cx * 100 - rU * 0.7} y2={f.cy * 100} stroke={c} strokeWidth="0.2" />
                    <line x1={f.cx * 100 + rU * 0.7} y1={f.cy * 100} x2={f.cx * 100 + rU * 1.4} y2={f.cy * 100} stroke={c} strokeWidth="0.2" />
                  </g>
                );
              })}
            </svg>

            {display.map((f, idx) => {
              const c = colorFor(f.severity);
              const labelRight = f.cx < 0.5;
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: `calc(${f.cx * 100}% + ${labelRight ? f.r : -f.r}px)`,
                    top: `calc(${f.cy * 100}% - ${f.r * 0.9}px)`,
                    transform: labelRight ? 'translateX(8px)' : 'translateX(calc(-100% - 8px))',
                    pointerEvents: 'auto',
                  }}
                >
                  <div
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(14,16,22,0.92)',
                      border: `1px solid ${c}`,
                      borderRadius: 3,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.04em',
                      color: c,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')} · {f.title}
                  </div>
                </div>
              );
            })}

            <div
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                display: 'flex',
                gap: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.72)',
                letterSpacing: '0.08em',
              }}
            >
              <span style={{ padding: '3px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                LIVE KIMI K2.6
              </span>
              {elapsed != null && (
                <span style={{ padding: '3px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {elapsed.toFixed(1)}s TOTAL
                </span>
              )}
              {!file && (
                <span
                  style={{
                    padding: '3px 6px',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-3)',
                  }}
                >
                  AWAITING PHOTO
                </span>
              )}
            </div>

            <div style={{ position: 'absolute', right: 12, top: 12 }}>
              <span className="chip blue">{model.toUpperCase()} · VISION</span>
            </div>

            {loading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.35)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  color: 'var(--hazard)',
                }}
              >
                KIMI K2.6 ANALYZING…
              </div>
            )}

            {!url && !loading && (
              <label
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '68%',
                  transform: 'translateX(-50%)',
                  padding: '10px 18px',
                  border: '1px dashed var(--line-3)',
                  background: 'rgba(14,16,22,0.85)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'var(--text-1)',
                  cursor: 'pointer',
                  borderRadius: 3,
                }}
              >
                CLICK TO UPLOAD SITE PHOTO
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-2)',
              letterSpacing: '0.06em',
            }}
          >
            {[
              { label: 'FAIL', c: 'var(--red)' },
              { label: 'WARN', c: 'var(--yellow)' },
              { label: 'INFO', c: 'var(--blue)' },
            ].map((l) => (
              <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: l.c }} />
                {l.label}
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>
              {findings.length} FINDINGS{elapsed != null ? ` · ${elapsed.toFixed(1)}s` : ''} · VIA{' '}
              {BACKEND_URL.replace(/^https?:\/\//, '')}
            </span>
          </div>

          {err && (
            <div
              style={{
                padding: '8px 12px',
                background: 'color-mix(in oklch, var(--red) 10%, var(--bg-2))',
                border: '1px solid color-mix(in oklch, var(--red) 40%, var(--line-2))',
                color: 'var(--text-1)',
                fontSize: 12,
                borderRadius: 3,
              }}
            >
              <span className="mono" style={{ color: 'var(--red)' }}>BACKEND UNAVAILABLE</span>{' '}
              · {err}
            </div>
          )}
        </div>

        <div
          style={{
            borderLeft: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="panel-h" style={{ borderBottom: '1px solid var(--line-1)' }}>
            <span>Findings</span>
            <span style={{ color: 'var(--text-1)' }}>{findings.length}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {findings.length === 0 && (
              <div
                className="mono"
                style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--text-3)',
                  letterSpacing: '0.08em',
                }}
              >
                {!file
                  ? 'UPLOAD A PHOTO TO SCAN'
                  : loading
                    ? 'KIMI K2.6 ANALYZING…'
                    : hasResult
                      ? 'NO DEFECTS DETECTED'
                      : 'AWAITING ANALYSIS'}
              </div>
            )}
            {findings.map((f, idx) => {
              const c = colorFor(f.severity);
              const active = hovered === `f${idx}`;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHovered(`f${idx}`)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--line-1)',
                    background: active ? 'var(--bg-2)' : 'transparent',
                    borderLeft: `2px solid ${active ? c : 'transparent'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</span>
                    </div>
                    <span className="chip" style={{ color: c, borderColor: c, background: 'transparent' }}>
                      {f.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>
                    {f.detail}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    {f.ref ? (
                      <button
                        className="mono"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenArticle(f.ref);
                        }}
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.06em',
                          padding: '3px 8px',
                          background: 'var(--bg-2)',
                          border: '1px solid var(--line-2)',
                          color: 'var(--text-0)',
                          borderRadius: 2,
                          cursor: 'pointer',
                        }}
                        title="Open article text"
                      >
                        REF · {f.ref} ↗
                      </button>
                    ) : (
                      <span
                        className="mono"
                        style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}
                      >
                        NO REF
                      </span>
                    )}
                    <ConfidenceChip value={f.confidence} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--line-1)' }}>
            <button className="btn" style={{ width: '100%' }} disabled={!file || !hasResult}>
              Add to inspection report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.8 ? 'var(--green)' : value >= 0.6 ? 'var(--yellow)' : 'var(--red)';
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: '0.06em',
        padding: '3px 6px',
        border: `1px solid ${color}`,
        color,
        borderRadius: 2,
        textTransform: 'uppercase',
      }}
      title={`Kimi confidence ${pct}%`}
    >
      {pct}% CONF
    </span>
  );
}

function PhotoPlaceholder() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          repeating-linear-gradient(45deg, #1a1f28 0 2px, transparent 2px 12px),
          repeating-linear-gradient(-45deg, #141821 0 1px, transparent 1px 18px),
          radial-gradient(ellipse at 30% 60%, #2a3140 0%, #0a0d12 70%)
        `,
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
        {[...Array(8)].map((_, i) => (
          <line key={'v' + i} x1={12 + i * 11} y1="5" x2={12 + i * 11} y2="95" stroke="#8a9cb0" strokeWidth="0.4" />
        ))}
        {[...Array(6)].map((_, i) => (
          <line key={'h' + i} x1="5" y1={15 + i * 14} x2="95" y2={15 + i * 14} stroke="#8a9cb0" strokeWidth="0.3" strokeDasharray="0.8 0.4" />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        [ upload a site photo to begin ]
      </div>
    </div>
  );
}

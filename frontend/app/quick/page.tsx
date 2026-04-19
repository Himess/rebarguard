'use client';

import { useMemo, useRef, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { BACKEND_URL } from '@/lib/api';

type Finding = {
  id: string;
  x: number;
  y: number;
  r: number;
  severity: 'fail' | 'warn' | 'info';
  title: string;
  detail: string;
  ref?: string;
};

const DEMO_FINDINGS: Finding[] = [
  { id: 'f1', x: 0.28, y: 0.42, r: 48, severity: 'fail',  title: 'Cover < 25mm',         detail: '22mm measured at bottom-left corner. TS 500 minimum violated.',   ref: 'TBDY 7.3.4.2' },
  { id: 'f2', x: 0.62, y: 0.34, r: 36, severity: 'warn',  title: 'Stirrup spacing drift', detail: 'Ø10 stirrup pitch 140mm, spec 100mm in confinement zone.',         ref: 'TBDY 7.3.6' },
  { id: 'f3', x: 0.48, y: 0.72, r: 28, severity: 'info',  title: 'Splice length OK',      detail: '40Ø splice verified against S-04 sheet.',                           ref: 'TS 500 7.2' },
  { id: 'f4', x: 0.78, y: 0.60, r: 32, severity: 'warn',  title: 'Spacer missing',        detail: 'No plastic spacer visible — potential cover drop.',                  ref: 'TS 500 7.4' },
];

const colorFor = (s: Finding['severity']) =>
  s === 'fail' ? 'var(--red)' : s === 'warn' ? 'var(--yellow)' : 'var(--blue)';

export default function QuickScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const findings = DEMO_FINDINGS; // TODO day 6: call POST /api/quick/analyze
  const surfaceRef = useRef<HTMLDivElement>(null);

  const meta = useMemo(() => {
    if (!file) return 'IMG_PLACEHOLDER · PRE-POUR · 3.2 MB';
    return `${file.name.toUpperCase()} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  }, [file]);

  function onPick(f: File | null) {
    setFile(f);
    if (url) URL.revokeObjectURL(url);
    setUrl(f ? URL.createObjectURL(f) : null);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <TopNav />

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
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                Replace photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
              <button className="btn sm" disabled>Export report</button>
              <button className="btn primary sm" disabled={!file}>
                Promote to full inspection →
              </button>
            </div>
          </div>

          <div
            ref={surfaceRef}
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
                alt=""
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
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {findings.map((f) => {
                const c = colorFor(f.severity);
                const active = hovered === f.id;
                const rU = f.r / 10;
                return (
                  <g
                    key={f.id}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(f.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <circle
                      cx={f.x * 100}
                      cy={f.y * 100}
                      r={rU * 1.4}
                      fill={c}
                      opacity={active ? 0.12 : 0.05}
                    />
                    <circle
                      cx={f.x * 100}
                      cy={f.y * 100}
                      r={rU}
                      fill="none"
                      stroke={c}
                      strokeWidth="0.25"
                      opacity="0.9"
                    />
                    <circle cx={f.x * 100} cy={f.y * 100} r={rU * 0.35} fill={c} />
                    <line
                      x1={f.x * 100 - rU * 1.4}
                      y1={f.y * 100}
                      x2={f.x * 100 - rU * 0.7}
                      y2={f.y * 100}
                      stroke={c}
                      strokeWidth="0.2"
                    />
                    <line
                      x1={f.x * 100 + rU * 0.7}
                      y1={f.y * 100}
                      x2={f.x * 100 + rU * 1.4}
                      y2={f.y * 100}
                      stroke={c}
                      strokeWidth="0.2"
                    />
                  </g>
                );
              })}
            </svg>

            {findings.map((f, idx) => {
              const c = colorFor(f.severity);
              const labelRight = f.x < 0.5;
              return (
                <div
                  key={f.id}
                  style={{
                    position: 'absolute',
                    left: `calc(${f.x * 100}% + ${labelRight ? f.r : -f.r}px)`,
                    top: `calc(${f.y * 100}% - ${f.r * 0.9}px)`,
                    transform: labelRight
                      ? 'translateX(8px)'
                      : 'translateX(calc(-100% - 8px))',
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
                41.02°N 28.97°E
              </span>
              <span style={{ padding: '3px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                18 APR 14:22
              </span>
              <span style={{ padding: '3px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                MARKER OK
              </span>
            </div>

            <div style={{ position: 'absolute', right: 12, top: 12 }}>
              <span className="chip blue">KIMI-K2.5 · VISION</span>
            </div>

            {!url && (
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
              <span
                key={l.label}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: l.c,
                  }}
                />
                {l.label}
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>
              {findings.length} FINDINGS · 1.8s TOTAL · VIA {BACKEND_URL.replace(/^https?:\/\//, '')}
            </span>
          </div>
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
            {findings.map((f, idx) => {
              const c = colorFor(f.severity);
              const active = hovered === f.id;
              return (
                <div
                  key={f.id}
                  onMouseEnter={() => setHovered(f.id)}
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
                    <span
                      className="chip"
                      style={{ color: c, borderColor: c, background: 'transparent' }}
                    >
                      {f.severity.toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--text-2)',
                      lineHeight: 1.45,
                    }}
                  >
                    {f.detail}
                  </div>
                  {f.ref && (
                    <div
                      className="mono"
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        color: 'var(--text-3)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      REF · {f.ref}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--line-1)' }}>
            <button className="btn" style={{ width: '100%' }} disabled={!file}>
              Add to inspection report
            </button>
          </div>
        </div>
      </div>
    </div>
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
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}
      >
        {[...Array(8)].map((_, i) => (
          <line key={'v' + i} x1={12 + i * 11} y1="5" x2={12 + i * 11} y2="95" stroke="#8a9cb0" strokeWidth="0.4" />
        ))}
        {[...Array(6)].map((_, i) => (
          <line
            key={'h' + i}
            x1="5"
            y1={15 + i * 14}
            x2="95"
            y2={15 + i * 14}
            stroke="#8a9cb0"
            strokeWidth="0.3"
            strokeDasharray="0.8 0.4"
          />
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
        [ site photo · pre-pour ]
      </div>
    </div>
  );
}

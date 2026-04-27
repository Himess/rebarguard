import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RebarGuard — 9 AI agents auditing rebar before concrete pours';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const HAZARD = '#FF6A1F';
const BG = '#0E1116';
const INK = '#F4F6FA';
const MUTED = '#6C7884';
const LINE = '#262C36';

const AGENTS = [
  { id: 'PLAN', x: 600, y: 90, c: '#3B7FD8' },
  { id: 'GEOM', x: 870, y: 195, c: '#E0A93D' },
  { id: 'CODE', x: 970, y: 410, c: '#E0A93D' },
  { id: 'FRAUD', x: 850, y: 555, c: '#E0A93D' },
  { id: 'SEISM', x: 600, y: 595, c: '#E0A93D' },
  { id: 'MATL', x: 350, y: 555, c: '#3B7FD8' },
  { id: 'COVER', x: 230, y: 410, c: '#3B7FD8' },
  { id: 'MOD', x: 330, y: 195, c: HAZARD },
];

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          background: BG,
          display: 'flex',
          padding: '64px 72px',
          color: INK,
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* faint blueprint grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
            opacity: 0.35,
            display: 'flex',
          }}
        />

        {/* left: copy */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '650px',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 14,
                height: 14,
                background: HAZARD,
                display: 'flex',
              }}
            />
            <div
              style={{
                fontSize: 16,
                letterSpacing: 2,
                color: HAZARD,
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              REBARGUARD · PRE-POUR INSPECTION
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                fontSize: 60,
                lineHeight: 1.0,
                fontWeight: 700,
                letterSpacing: -1.5,
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'flex' }}>Once concrete pours,</span>
            </div>
            <div
              style={{
                fontSize: 60,
                lineHeight: 1.0,
                fontWeight: 700,
                letterSpacing: -1.5,
                color: HAZARD,
                display: 'flex',
              }}
            >
              the rebar is invisible.
            </div>
            <div
              style={{
                fontSize: 22,
                color: MUTED,
                lineHeight: 1.4,
                marginTop: 6,
                display: 'flex',
              }}
            >
              9 AI agents · Kimi K2.6 vision · Hermes 4 70B reasoning · TBDY 2018 / TS 500
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 16,
              color: MUTED,
              fontFamily: 'monospace',
              letterSpacing: 1,
            }}
          >
            <span style={{ color: HAZARD, display: 'flex' }}>●</span>
            <span style={{ display: 'flex' }}>HERMES AGENT</span>
            <span style={{ display: 'flex' }}>·</span>
            <span style={{ display: 'flex' }}>KIMI K2.6</span>
            <span style={{ display: 'flex' }}>·</span>
            <span style={{ display: 'flex' }}>HACKATHON 2026</span>
          </div>
        </div>

        {/* right: agent ring */}
        <div
          style={{
            position: 'absolute',
            right: 60,
            top: 30,
            width: 540,
            height: 570,
            display: 'flex',
          }}
        >
          <svg width="540" height="570" viewBox="0 0 1100 700">
            {/* ring */}
            <circle cx="600" cy="350" r="260" fill="none" stroke={LINE} strokeWidth="1.5" />
            <circle cx="600" cy="350" r="200" fill="none" stroke={LINE} strokeWidth="1" strokeDasharray="4 6" />
            {/* center MOD */}
            <circle cx="600" cy="350" r="48" fill={BG} stroke={HAZARD} strokeWidth="2" />
            <text
              x="600"
              y="358"
              fontSize="22"
              fill={HAZARD}
              textAnchor="middle"
              fontWeight="700"
              fontFamily="monospace"
            >
              9
            </text>
            {/* agent dots */}
            {AGENTS.map((a) => (
              <g key={a.id}>
                <line x1="600" y1="350" x2={a.x} y2={a.y} stroke={LINE} strokeWidth="0.8" />
                <circle cx={a.x} cy={a.y} r="36" fill={BG} stroke={a.c} strokeWidth="2" />
                <text
                  x={a.x}
                  y={a.y + 5}
                  fontSize="14"
                  fill={a.c}
                  textAnchor="middle"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {a.id}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    ),
    size,
  );
}

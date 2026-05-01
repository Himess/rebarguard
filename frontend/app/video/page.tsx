'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { ArticleModal } from '@/components/ArticleModal';
import { SampleVideoStrip } from '@/components/SamplePicker';
import {
  analyzeVideo,
  fetchVideoDemo,
  type VideoFinding,
  type VideoScanResult,
} from '@/lib/api';

const SEVERITY_COLOR: Record<VideoFinding['severity'], string> = {
  fail: 'var(--red)',
  warn: 'var(--yellow)',
  info: 'var(--blue)',
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<VideoScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [activeFinding, setActiveFinding] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  const duration = result?.duration_s ?? videoRef.current?.duration ?? null;

  // Load the canned demo on first mount so the page is never empty.
  useEffect(() => {
    (async () => {
      try {
        const demo = await fetchVideoDemo();
        setResult(demo);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  function onPick(f: File | null) {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(f);
    setVideoUrl(f ? URL.createObjectURL(f) : null);
    setErr(null);
    setActiveFinding(null);
    setCurrentTime(0);
    if (!f) return;
    setLoading(true);
    analyzeVideo(f)
      .then((res) => setResult(res))
      .catch((e) => {
        setErr((e as Error).message);
      })
      .finally(() => setLoading(false));
  }

  function seekTo(idx: number, ts: number) {
    setActiveFinding(idx);
    if (videoRef.current) {
      videoRef.current.currentTime = ts;
      videoRef.current.play().catch(() => {
        /* user-gesture or no-source: ignore */
      });
    }
  }

  function onTimeUpdate() {
    setCurrentTime(videoRef.current?.currentTime ?? 0);
  }

  const findingMarkers = useMemo(() => {
    if (!result || !duration) return [];
    return result.findings.map((f, i) => ({
      i,
      ts: f.timestamp_s,
      pct: Math.min(99.5, Math.max(0.5, (f.timestamp_s / duration) * 100)),
      severity: f.severity,
    }));
  }, [result, duration]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <ArticleModal code={openArticle} onClose={() => setOpenArticle(null)} />
      <TopNav projectContext="VIDEO ANALYSIS · KIMI K2.6" />

      <div style={{ padding: '32px 28px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 22 }}>
          <span className="chip hazard">VIDEO ANALYSIS · BETA</span>
          <h1
            style={{
              margin: '12px 0 8px',
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Walk the cage. <span style={{ color: 'var(--hazard)' }}>Kimi watches.</span>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', maxWidth: 720, lineHeight: 1.55 }}>
            Pan a phone over the rebar cage for 30 to 90 seconds, upload the MP4. Kimi K2.6
            ingests video natively and emits <strong>time-stamped findings</strong> — cover
            shortage, stirrup spacing drift, missing spacers, formwork debris. Click any
            finding to seek the video to that frame.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 380px',
            gap: 22,
          }}
        >
          {/* LEFT — video player + scrubber */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Site walkthrough</h2>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  {result?.source === 'live'
                    ? 'LIVE KIMI K2.6'
                    : 'DEMO TRANSCRIPT'}{' '}
                  · {result?.model ?? 'kimi-k2.6'}
                </span>
              </div>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                {file ? 'Replace video' : '+ Upload video'}
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {!file && !loading && <SampleVideoStrip onPick={onPick} limit={3} />}

            <div
              style={{
                position: 'relative',
                aspectRatio: '16 / 9',
                background: '#000',
                border: '1px solid var(--line-2)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  preload="metadata"
                  onTimeUpdate={onTimeUpdate}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
              ) : (
                <div
                  className="hatch"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'rgba(255,255,255,0.55)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    padding: 24,
                  }}
                >
                  Upload a site-walk MP4
                  <br />
                  or scrub the demo transcript below
                </div>
              )}

              {loading && (
                <div
                  className="mono"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--text-0)',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                  }}
                >
                  KIMI K2.6 IS WATCHING…
                </div>
              )}
            </div>

            {/* Custom scrubber bar with finding markers */}
            {duration && findingMarkers.length > 0 && (
              <div
                style={{
                  position: 'relative',
                  height: 38,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line-1)',
                  borderRadius: 3,
                  padding: '8px 10px 6px',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    height: 4,
                    background: 'var(--line-2)',
                    borderRadius: 2,
                    marginTop: 8,
                  }}
                >
                  {duration > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -3,
                        left: `${Math.min(100, (currentTime / duration) * 100)}%`,
                        width: 2,
                        height: 10,
                        background: 'var(--text-0)',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}
                  {findingMarkers.map((m) => (
                    <button
                      key={m.i}
                      type="button"
                      onClick={() =>
                        seekTo(m.i, result!.findings[m.i].timestamp_s)
                      }
                      title={`${fmt(m.ts)} · ${result!.findings[m.i].title}`}
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: `${m.pct}%`,
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        background: SEVERITY_COLOR[m.severity],
                        border: '2px solid var(--bg-2)',
                        transform: 'translateX(-50%)',
                        cursor: 'pointer',
                        padding: 0,
                        opacity: activeFinding === m.i ? 1 : 0.85,
                        boxShadow:
                          activeFinding === m.i
                            ? `0 0 0 4px color-mix(in oklch, ${SEVERITY_COLOR[m.severity]} 30%, transparent)`
                            : 'none',
                      }}
                    />
                  ))}
                </div>
                <div
                  className="mono"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 9,
                    color: 'var(--text-3)',
                    letterSpacing: '0.08em',
                    marginTop: 4,
                  }}
                >
                  <span>{fmt(currentTime)}</span>
                  <span>
                    {findingMarkers.length} findings · KIMI K2.6 NATIVE VIDEO
                  </span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>
            )}

            {err && (
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--red)',
                  letterSpacing: '0.06em',
                }}
              >
                ERROR · {err.slice(0, 200)}
              </div>
            )}

            {(result?.summary_en || result?.summary_tr) && (
              <div
                className="panel"
                style={{ padding: '12px 14px', borderLeft: '3px solid var(--hazard)' }}
              >
                {result.summary_en && (
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-1)' }}>
                    <span
                      className="mono"
                      style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', marginRight: 6 }}
                    >
                      EN
                    </span>
                    {result.summary_en}
                  </p>
                )}
                {result.summary_tr && (
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text-2)',
                      fontStyle: 'italic',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        color: 'var(--hazard)',
                        letterSpacing: '0.08em',
                        marginRight: 6,
                        fontStyle: 'normal',
                      }}
                    >
                      TR
                    </span>
                    {result.summary_tr}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — findings list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--text-3)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              Time-coded findings ({result?.findings.length ?? 0})
            </div>
            {result?.findings.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => seekTo(i, f.timestamp_s)}
                className="panel"
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderLeft: `3px solid ${SEVERITY_COLOR[f.severity]}`,
                  background: activeFinding === i ? 'var(--bg-3)' : 'var(--bg-2)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span
                    className="mono num"
                    style={{
                      fontSize: 12,
                      color: SEVERITY_COLOR[f.severity],
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmt(f.timestamp_s)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 600, flex: 1 }}>
                    {f.title}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      color: 'var(--text-3)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {Math.round(f.confidence * 100)}%
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {f.detail}
                </div>
                {f.ref && (
                  <div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenArticle(f.ref!);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpenArticle(f.ref!);
                        }
                      }}
                      className="mono"
                      style={{
                        display: 'inline-block',
                        fontSize: 9,
                        padding: '2px 6px',
                        letterSpacing: '0.04em',
                        color: 'var(--hazard)',
                        background: 'transparent',
                        border: '1px solid var(--hazard-ring, var(--line-2))',
                        borderRadius: 2,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      {f.ref}
                    </span>
                  </div>
                )}
              </button>
            ))}
            {result && result.findings.length === 0 && (
              <div
                className="panel"
                style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-2)' }}
              >
                Kimi clean reading — no findings to flag.
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
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
          <strong style={{ color: 'var(--text-1)' }}>Note.</strong> Video analysis uses Kimi K2.6&apos;s
          native video input via the Moonshot direct API (subscription path doesn&apos;t relay
          video). When <code>MOONSHOT_API_KEY</code> isn&apos;t configured this page falls back to
          the curated demo transcript labelled <em>DEMO TRANSCRIPT</em> in the badge above. For
          single-photo or 9-agent pre-pour debate, see{' '}
          <Link href="/quick" style={{ color: 'var(--hazard)' }}>
            /quick
          </Link>{' '}
          and{' '}
          <Link href="/inspection/new" style={{ color: 'var(--hazard)' }}>
            /inspection/new
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

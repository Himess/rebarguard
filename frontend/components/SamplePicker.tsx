'use client';

import { useState } from 'react';
import {
  SAMPLE_PHOTOS,
  SAMPLE_VIDEOS,
  type SamplePhoto,
  type SampleVideo,
  fetchSamplePhotoFile,
  fetchSampleVideoFile,
  samplePhotoUrl,
  sampleVideoUrl,
} from '@/lib/sample-media';

type PhotoProps = {
  onPick: (file: File) => void;
  /** Hide the chip when this filter returns false. */
  filter?: (p: SamplePhoto) => boolean;
  limit?: number;
  label?: string;
};

export function SamplePhotoStrip({ onPick, filter, limit = 6, label = 'Try a sample' }: PhotoProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const items = (filter ? SAMPLE_PHOTOS.filter(filter) : SAMPLE_PHOTOS).slice(0, limit);

  async function pick(p: SamplePhoto) {
    if (busy) return;
    setBusy(p.filename);
    try {
      const file = await fetchSamplePhotoFile(p);
      onPick(file);
    } catch {
      /* swallow */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label} · Fıstık Ağacı project · click to load
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map((p) => (
          <button
            key={p.filename}
            type="button"
            onClick={() => pick(p)}
            disabled={busy === p.filename}
            title={p.hint}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: 0,
              background: 'transparent',
              border: '1px solid var(--line-2)',
              borderRadius: 4,
              cursor: busy === p.filename ? 'wait' : 'pointer',
              overflow: 'hidden',
              width: 96,
              opacity: busy && busy !== p.filename ? 0.5 : 1,
            }}
          >
            <img
              src={samplePhotoUrl(p)}
              alt={p.title}
              loading="lazy"
              style={{
                width: 96,
                height: 64,
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.04em',
                color: 'var(--text-2)',
                padding: '2px 4px',
                textAlign: 'left',
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {p.element}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

type VideoProps = {
  onPick: (file: File) => void;
  limit?: number;
  label?: string;
};

export function SampleVideoStrip({ onPick, limit = 3, label = 'Try a sample clip' }: VideoProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const items = SAMPLE_VIDEOS.slice(0, limit);

  async function pick(v: SampleVideo) {
    if (busy) return;
    setBusy(v.filename);
    try {
      const file = await fetchSampleVideoFile(v);
      onPick(file);
    } catch {
      /* swallow */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label} · Fıstık Ağacı site walks
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map((v) => (
          <button
            key={v.filename}
            type="button"
            onClick={() => pick(v)}
            disabled={busy === v.filename}
            title={v.hint}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: 0,
              background: 'transparent',
              border: '1px solid var(--line-2)',
              borderRadius: 4,
              cursor: busy === v.filename ? 'wait' : 'pointer',
              overflow: 'hidden',
              width: 160,
              opacity: busy && busy !== v.filename ? 0.5 : 1,
            }}
          >
            <video
              src={sampleVideoUrl(v)}
              muted
              preload="metadata"
              playsInline
              style={{
                width: 160,
                height: 90,
                objectFit: 'cover',
                background: '#000',
                display: 'block',
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.04em',
                color: 'var(--text-2)',
                padding: '3px 6px',
                textAlign: 'left',
                lineHeight: 1.25,
              }}
            >
              {v.title} · {v.duration_s.toFixed(1)}s
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

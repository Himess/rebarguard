'use client';

import { useEffect, useState } from 'react';
import { fetchArticle, type RegulationArticle } from '@/lib/api';

export function ArticleModal({
  code,
  onClose,
}: {
  code: string | null;
  onClose: () => void;
}) {
  const [article, setArticle] = useState<RegulationArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'tr'>('en');

  useEffect(() => {
    if (!code) return;
    setArticle(null);
    setErr(null);
    setLoading(true);
    fetchArticle(code)
      .then(setArticle)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (code) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [code, onClose]);

  if (!code) return null;

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'color-mix(in oklch, black 72%, transparent)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        animation: 'fadeIn 200ms ease-out both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          maxHeight: '82vh',
          overflow: 'auto',
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          borderLeft: '4px solid var(--hazard)',
          boxShadow: 'var(--shadow-2)',
          padding: '28px 32px 22px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 10,
          }}
        >
          <span className="chip hazard" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
            {code}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['en', 'tr'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="mono"
                style={{
                  height: 22,
                  padding: '0 8px',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  background: lang === l ? 'var(--bg-3)' : 'transparent',
                  color: lang === l ? 'var(--text-0)' : 'var(--text-3)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div
            className="mono"
            style={{
              padding: '40px 10px',
              textAlign: 'center',
              color: 'var(--text-3)',
              letterSpacing: '0.1em',
              fontSize: 11,
            }}
          >
            FETCHING ARTICLE…
          </div>
        )}

        {err && (
          <div
            style={{
              padding: '12px 14px',
              background: 'color-mix(in oklch, var(--red) 12%, var(--bg-2))',
              border: '1px solid color-mix(in oklch, var(--red) 40%, var(--line-2))',
              color: 'var(--text-1)',
              fontSize: 12,
              borderRadius: 3,
              margin: '10px 0',
            }}
          >
            <span className="mono" style={{ color: 'var(--red)' }}>
              LOOKUP FAILED
            </span>
            — {err}
          </div>
        )}

        {article && (
          <>
            <div
              style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}
              className="mono"
            >
              {article.document} · {article.chapter}
            </div>
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {lang === 'en' ? article.title_en : article.title_tr}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--text-1)',
              }}
            >
              {lang === 'en' ? article.text_en : article.text_tr}
            </p>

            <div
              style={{
                marginTop: 20,
                paddingTop: 14,
                borderTop: '1px solid var(--line-1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="mono"
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--line-1)',
                      borderRadius: 2,
                      color: 'var(--text-2)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {article.source === 'summary' && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--yellow)',
                    letterSpacing: '0.06em',
                  }}
                  title="TS 500 is behind the TSE paywall; this is a curated academic summary of the official article."
                >
                  SUMMARY · NOT OFFICIAL TEXT
                </span>
              )}
            </div>
          </>
        )}

        <div
          className="mono"
          style={{
            position: 'absolute',
            top: 10,
            right: 14,
            fontSize: 10,
            color: 'var(--text-3)',
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          ESC · CLOSE
        </div>
      </div>
    </div>
  );
}

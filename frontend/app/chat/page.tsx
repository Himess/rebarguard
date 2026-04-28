'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import {
  resetChat,
  sendChatMessage,
  type ChatMeta,
  type ChatStreamEvent,
} from '@/lib/api';

type ChatTurn = {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  photoUrl?: string;
  meta?: ChatMeta;
  model?: string;
  pending?: boolean;
};

const SEVERITY_COLOR: Record<ChatMeta['severity'], string> = {
  ok: 'var(--green)',
  moderate: 'var(--yellow)',
  high: 'var(--red)',
};
const SEVERITY_LABEL: Record<ChatMeta['severity'], string> = {
  ok: 'OK',
  moderate: 'AT RISK',
  high: 'HIGH RISK',
};

const SUGGESTIONS = [
  'My contractor wants to pour concrete before finishing the cage — can you check this photo?',
  'Concrete cover at the base of the column looks like ~1 cm; is that a problem?',
  'I want to file a complaint about my contractor. Can you help?',
];

export default function ChatPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'sys-0',
      role: 'system',
      text:
        'RebarGuard chat hotline · Hermes 4 70B + Kimi K2.6 vision. ' +
        'Type a question or attach a site photo. Multi-turn — agent remembers previous replies.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  function pushTurn(t: ChatTurn) {
    setTurns((prev) => [...prev, t]);
  }
  function patchLastAgent(patch: Partial<ChatTurn>) {
    setTurns((prev) => {
      const idx = [...prev].reverse().findIndex((t) => t.role === 'agent' && t.pending);
      if (idx < 0) return prev;
      const realIdx = prev.length - 1 - idx;
      const next = [...prev];
      next[realIdx] = { ...next[realIdx], ...patch, pending: false };
      return next;
    });
  }

  function onPhoto(f: File | null) {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(f);
    setPhotoUrl(f ? URL.createObjectURL(f) : null);
  }

  async function send(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || streaming) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: message,
      photoUrl: photoUrl ?? undefined,
    };
    const pendingAgent: ChatTurn = {
      id: `a-${Date.now()}`,
      role: 'agent',
      text: '',
      pending: true,
    };
    pushTurn(userTurn);
    pushTurn(pendingAgent);
    setDraft('');
    const sentPhoto = photo;
    onPhoto(null);
    setStreaming(true);
    setErr(null);

    cancelRef.current = sendChatMessage(message, (e: ChatStreamEvent) => {
      if (e.kind === 'meta' && 'conversation_id' in e) {
        setConversationId(e.conversation_id);
      } else if (e.kind === 'message' && 'content' in e) {
        patchLastAgent({
          text: e.content,
          meta: e.meta,
          model: e.model,
        });
      } else if (e.kind === 'error' && 'error' in e) {
        patchLastAgent({
          text: 'Agent unavailable — please retry in a moment.',
          meta: { severity: 'moderate', suggest_complaint: false },
        });
        setErr(e.error);
      }
    }, {
      conversationId: conversationId ?? undefined,
      photo: sentPhoto,
      onError: (e) => {
        patchLastAgent({
          text: 'Network error talking to RebarGuard. Try again.',
          meta: { severity: 'moderate', suggest_complaint: false },
        });
        setErr(e.message);
        setStreaming(false);
      },
      onDone: () => setStreaming(false),
    });
  }

  async function onReset() {
    cancelRef.current();
    if (conversationId) await resetChat(conversationId).catch(() => {});
    setConversationId(null);
    setTurns([
      {
        id: `sys-${Date.now()}`,
        role: 'system',
        text: 'New conversation. Previous context cleared.',
      },
    ]);
    setStreaming(false);
    setErr(null);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <TopNav projectContext="CITIZEN CHAT · LIVE HERMES" />

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <span className="chip hazard">CITIZEN HOTLINE · BETA</span>
            <h1
              style={{ margin: '10px 0 6px', fontSize: 32, fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              Got a suspicious site photo? Talk to us.
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', maxWidth: 640, lineHeight: 1.55 }}>
              Multi-turn agent · Hermes 4 70B reasons, Kimi K2.6 sees, TBDY 2018 / TS 500 grounded.
              Attach a site photo any time. RebarGuard remembers everything you&apos;ve said in
              this thread until you reset.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mono"
            style={{
              fontSize: 11,
              padding: '6px 10px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'transparent',
              color: 'var(--text-2)',
              border: '1px solid var(--line-2)',
              borderRadius: 2,
              cursor: 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            Reset chat
          </button>
        </div>

        <div
          ref={scrollRef}
          style={{
            height: 'min(62vh, 580px)',
            overflowY: 'auto',
            border: '1px solid var(--line-1)',
            background: 'var(--bg-2)',
            borderRadius: 4,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {turns.map((t) => (
            <Bubble key={t.id} t={t} />
          ))}
          {streaming && (
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--text-3)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                paddingLeft: 4,
              }}
            >
              Agent thinking…
            </div>
          )}
        </div>

        {err && (
          <div
            className="mono"
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--red)',
              letterSpacing: '0.06em',
            }}
          >
            ERROR · {err}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-2)',
            borderRadius: 4,
            padding: 12,
          }}
        >
          {photoUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg-1)',
                padding: '6px 10px',
                borderRadius: 3,
              }}
            >
              <img
                src={photoUrl}
                alt="Attached photo preview"
                style={{
                  width: 56,
                  height: 56,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid var(--line-2)',
                }}
              />
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', flex: 1 }}>
                {photo?.name?.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => onPhoto(null)}
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--red)',
                  background: 'transparent',
                  border: '1px solid var(--line-2)',
                  borderRadius: 2,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                }}
              >
                REMOVE
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything. Enter sends, Shift+Enter for a new line."
              rows={2}
              maxLength={4000}
              disabled={streaming}
              style={{
                flex: 1,
                background: 'var(--bg-1)',
                border: '1px solid var(--line-2)',
                borderRadius: 3,
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--text-0)',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: 60,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                className="btn ghost sm"
                style={{ cursor: 'pointer', textAlign: 'center', height: 36 }}
              >
                {photo ? '✓' : '+ Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                type="button"
                onClick={() => send()}
                disabled={!draft.trim() || streaming}
                className="btn primary sm"
                style={{ height: 36, padding: '0 14px' }}
              >
                Send
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={streaming}
                className="mono"
                style={{
                  fontSize: 10,
                  padding: '4px 8px',
                  letterSpacing: '0.04em',
                  background: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px dashed var(--line-2)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  textTransform: 'none',
                }}
              >
                {s.length > 64 ? s.slice(0, 61) + '…' : s}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: '12px 16px',
            border: '1px solid var(--line-1)',
            borderLeft: '3px solid var(--blue)',
            background: 'var(--bg-2)',
            borderRadius: 4,
            fontSize: 12,
            color: 'var(--text-2)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: 'var(--text-1)' }}>Legal notice.</strong> This chat is an
          AI-assisted preliminary review. It carries no legal weight. For an official process you
          need an independent licensed building-control firm, or file a{' '}
          <Link href="/watch" style={{ color: 'var(--hazard)' }}>
            CIMER petition
          </Link>{' '}
          (Turkey&apos;s state complaint portal).
        </div>
      </div>
    </div>
  );
}

function Bubble({ t }: { t: ChatTurn }) {
  if (t.role === 'system') {
    return (
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '4px 8px',
          alignSelf: 'center',
          background: 'var(--bg-1)',
          borderRadius: 999,
          border: '1px solid var(--line-1)',
          maxWidth: '90%',
          textAlign: 'center',
        }}
      >
        {t.text}
      </div>
    );
  }

  const isUser = t.role === 'user';
  const sevColor = t.meta ? SEVERITY_COLOR[t.meta.severity] : 'var(--line-2)';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
        maxWidth: '78%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 9,
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {isUser ? 'YOU' : 'AGENT'}
        {t.model && !isUser ? ` · ${t.model}` : ''}
      </div>
      {t.photoUrl && (
        <img
          src={t.photoUrl}
          alt="Attached site photo"
          style={{
            maxWidth: 220,
            maxHeight: 180,
            borderRadius: 4,
            border: '1px solid var(--line-2)',
          }}
        />
      )}
      <div
        style={{
          padding: '10px 14px',
          background: isUser ? 'color-mix(in oklch, var(--hazard) 14%, var(--bg-1))' : 'var(--bg-1)',
          border: `1px solid ${isUser ? 'color-mix(in oklch, var(--hazard) 40%, var(--line-2))' : 'var(--line-2)'}`,
          borderLeft: !isUser && t.meta ? `3px solid ${sevColor}` : undefined,
          borderRadius: 6,
          fontSize: 14,
          color: 'var(--text-0)',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {t.pending ? (
          <span className="typing-dots">●●●</span>
        ) : (
          t.text || ''
        )}
      </div>
      {t.meta && !isUser && !t.pending && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span
            className="mono"
            style={{
              fontSize: 9,
              padding: '2px 6px',
              letterSpacing: '0.06em',
              color: sevColor,
              background: 'transparent',
              border: `1px solid ${sevColor}`,
              borderRadius: 2,
              textTransform: 'uppercase',
            }}
          >
            {SEVERITY_LABEL[t.meta.severity]}
          </span>
          {t.meta.suggest_complaint && (
            <Link
              href="/watch"
              className="mono"
              style={{
                fontSize: 9,
                padding: '2px 6px',
                letterSpacing: '0.06em',
                color: 'var(--hazard)',
                background: 'transparent',
                border: '1px solid var(--hazard)',
                borderRadius: 2,
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}
            >
              Start CIMER petition →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

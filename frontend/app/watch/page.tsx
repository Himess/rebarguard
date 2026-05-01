'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { ArticleModal } from '@/components/ArticleModal';
import { SamplePhotoStrip } from '@/components/SamplePicker';
import {
  analyzeQuickPhoto,
  downloadComplaintPdf,
  submitComplaint,
  type ComplaintAddress,
  type ComplaintSubmitResponse,
  type QuickFinding,
} from '@/lib/api';

type DisplayFinding = QuickFinding & { cx: number; cy: number; r: number };

function bboxToCircle(f: QuickFinding): DisplayFinding {
  const cx = f.bbox.x + f.bbox.w / 2;
  const cy = f.bbox.y + f.bbox.h / 2;
  const r = Math.max(20, Math.min(72, Math.max(f.bbox.w, f.bbox.h) * 100 * 4.5));
  return { ...f, cx, cy, r };
}

const colorFor = (s: QuickFinding['severity']) =>
  s === 'fail' ? 'var(--red)' : s === 'warn' ? 'var(--yellow)' : 'var(--blue)';

function gradeOf(findings: QuickFinding[]): number {
  if (findings.length === 0) return 95;
  // Severity-weighted: each fail -20, warn -8, info -2, scaled by confidence.
  let score = 100;
  for (const f of findings) {
    const weight = f.severity === 'fail' ? 20 : f.severity === 'warn' ? 8 : 2;
    score -= weight * (0.4 + 0.6 * f.confidence);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeBand(g: number): { label: string; color: string; band: string } {
  if (g >= 80) return { label: 'OK', color: 'var(--green)', band: 'A' };
  if (g >= 60) return { label: 'AT RISK', color: 'var(--yellow)', band: 'C' };
  return { label: 'HIGH RISK', color: 'var(--red)', band: 'F' };
}

export default function WatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [findings, setFindings] = useState<QuickFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [scanErr, setScanErr] = useState<string | null>(null);

  const [address, setAddress] = useState<ComplaintAddress>({
    parcel_no: '',
    district: '',
    city: 'Istanbul',
    full_address: '',
    contractor_name: '',
    apartment_no: '',
  });
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitResponse, setSubmitResponse] = useState<ComplaintSubmitResponse | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const grade = useMemo(() => gradeOf(findings), [findings]);
  const band = useMemo(() => gradeBand(grade), [grade]);

  const display: DisplayFinding[] = useMemo(
    () => findings.map(bboxToCircle),
    [findings],
  );

  async function onPick(f: File | null) {
    if (url) URL.revokeObjectURL(url);
    setFile(f);
    setUrl(f ? URL.createObjectURL(f) : null);
    setScanErr(null);
    setSubmitResponse(null);
    setSubmitErr(null);
    setFindings([]);
    setHasResult(false);
    if (!f) return;
    setLoading(true);
    try {
      const result = await analyzeQuickPhoto(f);
      setFindings(result.findings);
      setHasResult(true);
    } catch (e) {
      setScanErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function buildDraft() {
    return {
      findings,
      address: {
        parcel_no: address.parcel_no?.trim() || null,
        district: address.district?.trim() || null,
        city: address.city || 'Istanbul',
        full_address: address.full_address?.trim() || null,
        contractor_name: address.contractor_name?.trim() || null,
        apartment_no: address.apartment_no?.trim() || null,
      },
      grade,
      note: note.trim(),
      citizen_name: citizenName.trim() || null,
      citizen_contact: citizenContact.trim() || null,
    };
  }

  async function onDownloadPdf() {
    setPdfBusy(true);
    try {
      const blob = await downloadComplaintPdf(buildDraft());
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      const parcel = (address.parcel_no || 'rebarguard').replace(/\s+/g, '-').toLowerCase();
      a.download = `ihbar-dilekce-${parcel}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  }

  async function onSubmit() {
    setSubmitting(true);
    setSubmitErr(null);
    setSubmitResponse(null);
    // Theatrical delay so the user sees the "iletiliyor..." status briefly.
    const minWait = new Promise((r) => setTimeout(r, 1200));
    try {
      const [resp] = await Promise.all([submitComplaint(buildDraft()), minWait]);
      setSubmitResponse(resp);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <ArticleModal code={openArticle} onClose={() => setOpenArticle(null)} />
      <TopNav projectContext="CITIZEN WATCH" />

      <div style={{ padding: '40px 32px 64px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <span className="chip hazard">CITIZEN WATCH · BETA</span>
          <h1
            style={{
              margin: '12px 0 10px',
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              maxWidth: 920,
            }}
          >
            Got an apartment under construction?{' '}
            <span style={{ color: 'var(--hazard)' }}>Audit your contractor.</span>
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)', maxWidth: 760, lineHeight: 1.55 }}>
            58,500 buildings collapsed in the 2023 Kahramanmaraş earthquake — many of them had rebar
            on paper but not in the formwork. If you can visit the site, snap a photo before the
            pour: 9 AI agents grade the cage, <strong>0–100 score</strong>, and if anything is off
            we draft the <strong>official CIMER petition</strong> (Turkey&apos;s state complaint
            portal) for you.
          </p>
        </div>

        {/* 3-step explainer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginBottom: 32,
          }}
        >
          {[
            { n: '01', t: 'Snap a photo', d: 'Upload the rebar cage + formwork before the pour begins.' },
            { n: '02', t: 'Let Kimi inspect', d: 'Kimi K2.6 + TBDY 2018 + TS 500 references, in real time.' },
            { n: '03', t: 'Draft your petition', d: 'Download the PDF or run the mock İBB submission flow.' },
          ].map((s) => (
            <div key={s.n} className="panel" style={{ padding: '14px 16px' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--hazard)', letterSpacing: '0.1em' }}>
                {s.n}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-0)', margin: '4px 0 4px' }}>
                {s.t}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 380px',
            gap: 24,
          }}
        >
          {/* LEFT — photo + findings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Site photo</h2>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--text-3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {hasResult ? 'live kimi k2.6' : 'awaiting photo'}
                </span>
              </div>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                {file ? 'Replace photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div
              style={{
                position: 'relative',
                aspectRatio: '4 / 3',
                background: '#000',
                border: '1px solid var(--line-2)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              {url ? (
                <img
                  src={url}
                  alt={file ? `Site photo ${file.name}` : 'Site photo'}
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
                <div
                  className="hatch"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Click upload to begin
                </div>
              )}

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                {display.map((f, idx) => {
                  const c = colorFor(f.severity);
                  const rU = f.r / 10;
                  return (
                    <g key={idx}>
                      <circle cx={f.cx * 100} cy={f.cy * 100} r={rU * 1.4} fill={c} opacity="0.06" />
                      <circle cx={f.cx * 100} cy={f.cy * 100} r={rU} fill="none" stroke={c} strokeWidth="0.25" opacity="0.9" />
                      <circle cx={f.cx * 100} cy={f.cy * 100} r={rU * 0.35} fill={c} />
                    </g>
                  );
                })}
              </svg>

              {loading && (
                <div
                  className="mono"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--text-0)',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                  }}
                >
                  KIMI ANALYZING…
                </div>
              )}
            </div>

            {scanErr && (
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--red)',
                  letterSpacing: '0.06em',
                }}
              >
                ANALYSIS ERROR · {scanErr}
              </div>
            )}

            {!file && !loading && (
              <SamplePhotoStrip onPick={onPick} limit={6} />
            )}

            <div className="panel" style={{ padding: '12px 14px' }}>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}
              >
                Findings detected ({findings.length})
              </div>
              {findings.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {!file
                    ? 'Upload a photo to begin analysis.'
                    : loading
                      ? 'Kimi K2.6 is analyzing the photo…'
                      : hasResult
                        ? 'Photo looks clean — no defects detected.'
                        : 'Awaiting analysis.'}
                </div>
              )}
              {findings.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr auto',
                    gap: 10,
                    padding: '8px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: colorFor(f.severity),
                      display: 'inline-block',
                      marginTop: 5,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 600 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{f.detail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    {f.ref && (
                      <button
                        type="button"
                        onClick={() => setOpenArticle(f.ref!)}
                        className="mono"
                        style={{
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
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — score + form + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              className="panel"
              style={{
                padding: '20px',
                borderLeft: `3px solid ${hasResult ? band.color : 'var(--line-2)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: `2px solid ${hasResult ? band.color : 'var(--line-2)'}`,
                  flexShrink: 0,
                }}
              >
                <div
                  className="mono num"
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: hasResult ? band.color : 'var(--text-3)',
                  }}
                >
                  {hasResult ? grade : '—'}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: hasResult ? band.color : 'var(--text-3)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {hasResult ? `Class ${band.band} · ${band.label}` : 'Awaiting analysis'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.4 }}>
                  {hasResult
                    ? 'AI preliminary assessment. Carries no legal weight — a licensed building-control firm is required for definitive findings.'
                    : 'Upload a site photo above to receive a 0–100 score and a draft petition.'}
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Location & contractor (optional)
              </div>
              <Field
                label="Parcel"
                value={address.parcel_no || ''}
                placeholder="e.g. 1340 Ada 43 Parsel"
                onChange={(v) => setAddress({ ...address, parcel_no: v })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field
                  label="District"
                  value={address.district || ''}
                  placeholder="Kadıköy"
                  onChange={(v) => setAddress({ ...address, district: v })}
                />
                <Field
                  label="City"
                  value={address.city || 'Istanbul'}
                  placeholder="Istanbul"
                  onChange={(v) => setAddress({ ...address, city: v })}
                />
              </div>
              <Field
                label="Street address"
                value={address.full_address || ''}
                placeholder="Street, number…"
                onChange={(v) => setAddress({ ...address, full_address: v })}
              />
              <Field
                label="Contractor"
                value={address.contractor_name || ''}
                placeholder="e.g. Demo İnşaat A.Ş."
                onChange={(v) => setAddress({ ...address, contractor_name: v })}
              />
              <Field
                label="Apartment no."
                value={address.apartment_no || ''}
                placeholder="optional"
                onChange={(v) => setAddress({ ...address, apartment_no: v })}
              />
            </div>

            <div className="panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Signatory info
              </div>
              <Field
                label="Full name"
                value={citizenName}
                placeholder="will appear on the petition"
                onChange={setCitizenName}
              />
              <Field
                label="Contact"
                value={citizenContact}
                placeholder="email or phone"
                onChange={setCitizenContact}
              />
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  Note
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="How many times you've visited the site, observations…"
                  style={{
                    width: '100%',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--line-2)',
                    borderRadius: 3,
                    padding: '8px 10px',
                    fontSize: 13,
                    color: 'var(--text-0)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </label>
            </div>

            {submitResponse ? (
              <SubmittedCard resp={submitResponse} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn primary"
                  onClick={onSubmit}
                  disabled={submitting || pdfBusy || !hasResult}
                  style={{ height: 44, fontSize: 14 }}
                >
                  {submitting ? 'Submitting to İBB Building Control…' : 'Submit to municipality (mock)'}
                </button>
                <button
                  className="btn ghost"
                  onClick={onDownloadPdf}
                  disabled={submitting || pdfBusy || !hasResult}
                  style={{ height: 40, fontSize: 13 }}
                >
                  {pdfBusy ? 'Preparing PDF…' : 'Download petition PDF'}
                </button>
                {submitErr && (
                  <span className="mono" style={{ fontSize: 10, color: 'var(--red)', letterSpacing: '0.06em' }}>
                    {submitErr}
                  </span>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-3)',
                    lineHeight: 1.5,
                    paddingTop: 6,
                    borderTop: '1px dashed var(--line-1)',
                    marginTop: 4,
                  }}
                >
                  <strong style={{ color: 'var(--text-2)' }}>Mock notice:</strong> This demo build
                  does <em>not</em> file a real petition with the municipality. Download the PDF
                  and attach it on e-Devlet → CIMER yourself. Anonymous reports may be insufficient
                  for the legal process.
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
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
          <strong style={{ color: 'var(--text-1)' }}>Note.</strong> If you&apos;re a contractor,{' '}
          <Link href="/quick" style={{ color: 'var(--hazard)' }}>
            /quick
          </Link>{' '}
          fits better — same analysis, no petition flow. For a full audit, the{' '}
          <Link href="/inspection/new" style={{ color: 'var(--hazard)' }}>
            /inspection/new
          </Link>{' '}
          flow runs the 9-agent + Municipality Agent debate end-to-end.
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        className="mono"
        style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 3,
          padding: '8px 10px',
          fontSize: 13,
          color: 'var(--text-0)',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}

function SubmittedCard({ resp }: { resp: ComplaintSubmitResponse }) {
  return (
    <div
      className="panel"
      style={{
        padding: '18px 20px',
        borderLeft: '3px solid var(--green)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 10, color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        Mock submitted · İBB Building Control Dept.
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-0)' }}>
        Petition no: <span className="mono">{resp.tracking_id}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
        Estimated response time <strong>{resp.eta_days} business days</strong>. Status:{' '}
        <span className="mono" style={{ color: 'var(--text-1)' }}>
          {resp.status}
        </span>
        .
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-3)',
          lineHeight: 1.55,
          paddingTop: 8,
          borderTop: '1px dashed var(--line-1)',
        }}
      >
        {resp.message}
      </div>
    </div>
  );
}

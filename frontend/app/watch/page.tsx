'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { ArticleModal } from '@/components/ArticleModal';
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

const DEMO_FALLBACK: QuickFinding[] = [
  { title: 'Cover < 25mm',         severity: 'fail', bbox: { x: 0.22, y: 0.36, w: 0.12, h: 0.10 }, detail: '22mm measured at bottom-left corner. TS 500 minimum violated.', ref: 'TS 500 7.3',  confidence: 0.88 },
  { title: 'Stirrup spacing drift', severity: 'warn', bbox: { x: 0.55, y: 0.28, w: 0.09, h: 0.08 }, detail: 'Ø10 stirrup pitch 140mm, spec 100mm in confinement zone.',         ref: 'TBDY 7.3.6', confidence: 0.76 },
  { title: 'Spacer missing',        severity: 'warn', bbox: { x: 0.72, y: 0.55, w: 0.08, h: 0.07 }, detail: 'No plastic spacer visible — potential cover drop.',                  ref: 'TS 500 7.6', confidence: 0.71 },
];

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
  if (g >= 60) return { label: 'RİSKLİ', color: 'var(--yellow)', band: 'C' };
  return { label: 'AĞIR RİSK', color: 'var(--red)', band: 'F' };
}

export default function WatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [findings, setFindings] = useState<QuickFinding[]>(DEMO_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [usingDemo, setUsingDemo] = useState(true);
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
    if (!f) {
      setFindings(DEMO_FALLBACK);
      setUsingDemo(true);
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeQuickPhoto(f);
      setFindings(result.findings.length > 0 ? result.findings : []);
      setUsingDemo(false);
    } catch (e) {
      setScanErr((e as Error).message);
      setFindings(DEMO_FALLBACK);
      setUsingDemo(true);
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
          <span className="chip hazard">VATANDAŞ DENETİMİ · BETA</span>
          <h1
            style={{
              margin: '12px 0 10px',
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              maxWidth: 920,
            }}
          >
            Kat karşılığı dairen mi var? <span style={{ color: 'var(--hazard)' }}>Müteahhitini denetle.</span>
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)', maxWidth: 760, lineHeight: 1.55 }}>
            Kahramanmaraş&apos;ta 58 500 bina yıkıldı; içlerinin çoğunda demir kâğıtta vardı, kalıpta yoktu.
            Sahaya gidiyorsan beton dökülmeden önce bir foto çek — 9 yapay zeka ajanı projeni denetlesin,
            <strong> 0–100 puan ver</strong>, eksiklik varsa CIMER&apos;e ileteceğin <strong>resmi
            dilekçe taslağını</strong> üretsin.
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
            { n: '01', t: 'Foto çek', d: 'Beton dökülmeden önce kalıp + donatı fotosunu yükle.' },
            { n: '02', t: 'Kimi denetlesin', d: 'Kimi K2.6 + TBDY 2018 + TS 500 referansları, gerçek zamanlı.' },
            { n: '03', t: 'Dilekçeni hazırla', d: 'PDF indir veya mock İBB gönderim akışını çalıştır.' },
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
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Saha fotoğrafı</h2>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--text-3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {usingDemo ? 'demo data' : 'live kimi k2.6'}
                </span>
              </div>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                {file ? 'Fotoyu değiştir' : 'Foto yükle'}
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
                  alt={file ? `Saha fotoğrafı ${file.name}` : 'Saha fotoğrafı'}
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
                  Foto yüklemek için sağdaki butona bas
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
                  KIMI ANALİZ EDİYOR…
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
                ANALİZ HATASI · {scanErr}
              </div>
            )}

            <div className="panel" style={{ padding: '12px 14px' }}>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}
              >
                Tespit edilen bulgular ({findings.length})
              </div>
              {findings.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Foto temiz görünüyor.</div>
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
                borderLeft: `3px solid ${band.color}`,
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
                  border: `2px solid ${band.color}`,
                  flexShrink: 0,
                }}
              >
                <div className="mono num" style={{ fontSize: 28, fontWeight: 600, color: band.color }}>
                  {grade}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: band.color,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Sınıf {band.band} · {band.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.4 }}>
                  AI ön değerlendirmesi. Hukuki bağlayıcılığı yoktur — kesin tespit için lisanslı yapı denetim firması gerekir.
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Konum & müteahhit (opsiyonel)
              </div>
              <Field
                label="Parsel no"
                value={address.parcel_no || ''}
                placeholder="örn. 1340 Ada 43 Parsel"
                onChange={(v) => setAddress({ ...address, parcel_no: v })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field
                  label="İlçe"
                  value={address.district || ''}
                  placeholder="Kadıköy"
                  onChange={(v) => setAddress({ ...address, district: v })}
                />
                <Field
                  label="Şehir"
                  value={address.city || 'Istanbul'}
                  placeholder="Istanbul"
                  onChange={(v) => setAddress({ ...address, city: v })}
                />
              </div>
              <Field
                label="Açık adres"
                value={address.full_address || ''}
                placeholder="Sokak, no…"
                onChange={(v) => setAddress({ ...address, full_address: v })}
              />
              <Field
                label="Müteahhit firma"
                value={address.contractor_name || ''}
                placeholder="örn. Demo İnşaat A.Ş."
                onChange={(v) => setAddress({ ...address, contractor_name: v })}
              />
              <Field
                label="Daire no"
                value={address.apartment_no || ''}
                placeholder="opsiyonel"
                onChange={(v) => setAddress({ ...address, apartment_no: v })}
              />
            </div>

            <div className="panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                İmza bilgileri
              </div>
              <Field
                label="Ad — Soyad"
                value={citizenName}
                placeholder="dilekçeye yazılır"
                onChange={setCitizenName}
              />
              <Field
                label="İletişim"
                value={citizenContact}
                placeholder="e-posta veya telefon"
                onChange={setCitizenContact}
              />
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  Not
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Sahaya kaç kez gittiğin, gözlemler…"
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
                  disabled={submitting || pdfBusy}
                  style={{ height: 44, fontSize: 14 }}
                >
                  {submitting ? 'İBB Yapı Kontrol\'e iletiliyor…' : 'Belediyeye gönder (mock)'}
                </button>
                <button
                  className="btn ghost"
                  onClick={onDownloadPdf}
                  disabled={submitting || pdfBusy}
                  style={{ height: 40, fontSize: 13 }}
                >
                  {pdfBusy ? 'PDF hazırlanıyor…' : 'Dilekçe PDF\'ini indir'}
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
                  <strong style={{ color: 'var(--text-2)' }}>Mock uyarı:</strong> Bu demo build&apos;de
                  belediyeye <em>gerçek</em> başvuru yapılmıyor. PDF&apos;i indir, e-Devlet → CIMER&apos;e
                  ek olarak yükle. Anonim ihbarlar yasal süreç için yetersiz olabilir.
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
          <strong style={{ color: 'var(--text-1)' }}>Not.</strong> Müteahhitsen{' '}
          <Link href="/quick" style={{ color: 'var(--hazard)' }}>
            /quick
          </Link>{' '}
          sayfası daha uygun: aynı analiz, dilekçe akışı yok. Tam denetim için{' '}
          <Link href="/inspection/new" style={{ color: 'var(--hazard)' }}>
            /inspection/new
          </Link>{' '}
          akışında 9 ajan + Belediye Agent &apos;tartışması&apos; çalışır.
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
        Mock İletildi · İBB Yapı Kontrol Daire Bşk.
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-0)' }}>
        İhbar No: <span className="mono">{resp.tracking_id}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
        Tahmini yanıt süresi <strong>{resp.eta_days} iş günü</strong>. Kayıt durumu:{' '}
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

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-[var(--color-accent)]" />
          <span className="text-lg font-semibold tracking-tight">RebarGuard</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-[var(--color-text-muted)]">
          <Link href="/upload" className="hover:text-white">Upload</Link>
          <Link href="/dashboard" className="hover:text-white">Municipality</Link>
          <a href="https://github.com/nousresearch/hermes-agent" className="hover:text-white">Hermes Agent</a>
          <a href="https://platform.moonshot.ai" className="hover:text-white">Kimi K2.5</a>
        </div>
      </nav>

      <section className="mt-24 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          Hermes Agent Creative Hackathon 2026
        </div>
        <h1 className="text-5xl font-semibold leading-tight tracking-tight">
          Once concrete pours, the steel inside is invisible forever.
          <br />
          <span className="text-[var(--color-accent)]">
            Seven agents check it before the pour.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--color-text-muted)]">
          RebarGuard takes the approved structural drawing and site photos; a{' '}
          <b>7-agent inspection team</b> powered by Hermes Agent and Kimi K2.5 analyzes rebar
          workmanship against seismic codes. Score ≥ 85 gates municipal approval; anything less
          returns a detailed, evidence-backed report.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/upload"
            className="rounded bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-black hover:opacity-90"
          >
            Start an inspection →
          </Link>
          <Link
            href="/dashboard"
            className="rounded border border-[var(--color-border)] px-5 py-3 text-sm font-medium hover:border-white/30"
          >
            Pending inspections
          </Link>
        </div>
      </section>

      <section className="mt-24 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: 'Phase 1 — Project',
            body: 'The approved reinforced-concrete PDF is parsed by Kimi K2.5 into a structured column schedule.',
          },
          {
            title: 'Phase 2 — Site',
            body: 'Site photos are analyzed by 7 agents: Geometry, Code, Fraud, Risk, Material, Cover, and Moderator.',
          },
          {
            title: 'Phase 3 — Approval',
            body: 'If the score passes the threshold, the pour is approved. Otherwise a detailed rejection with causes.',
          },
        ].map((p) => (
          <div
            key={p.title}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-6"
          >
            <div className="text-sm font-medium text-[var(--color-accent)]">{p.title}</div>
            <div className="mt-2 text-sm text-[var(--color-text-muted)]">{p.body}</div>
          </div>
        ))}
      </section>

      <footer className="mt-24 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-muted)]">
        Built on{' '}
        <a href="https://github.com/nousresearch/hermes-agent" className="hover:text-white">
          Hermes Agent (Nous Research)
        </a>{' '}
        +{' '}
        <a href="https://github.com/MoonshotAI/Kimi-VL" className="hover:text-white">
          Kimi K2.5 (Moonshot)
        </a>
        . Referencing TBDY 2018 (Turkish Building Earthquake Code) and TS 500. Research prototype
        — does not replace a licensed structural engineer&apos;s sign-off.
      </footer>
    </main>
  );
}

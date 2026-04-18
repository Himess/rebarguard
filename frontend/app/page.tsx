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
          <Link href="/upload" className="hover:text-white">Yükle</Link>
          <Link href="/dashboard" className="hover:text-white">Belediye Paneli</Link>
          <a href="https://github.com/nousresearch/hermes-agent" className="hover:text-white">Hermes</a>
          <a href="https://platform.moonshot.ai" className="hover:text-white">Kimi-VL</a>
        </div>
      </nav>

      <section className="mt-24 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          Hermes Agent Creative Hackathon 2026
        </div>
        <h1 className="text-5xl font-semibold leading-tight tracking-tight">
          Beton döküldükten sonra demir görünmez.
          <br />
          <span className="text-[var(--color-accent)]">
            Dökülmeden önce yedi ajan kontrol eder.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--color-text-muted)]">
          RebarGuard, onaylı betonarme projeyi ve saha fotoğraflarını alır; Hermes 4 ve Kimi-VL
          üzerine kurulu <b>7 ajanlı bir denetim ekibi</b> demir işçiliğini TBDY 2018 ve TS 500&apos;e
          göre analiz eder. Skor &gt;= 85 ise belediye onayı; aksi halde detaylı rapor ve düzeltme
          talebi.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/upload"
            className="rounded bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-black hover:opacity-90"
          >
            Denetime başla →
          </Link>
          <Link
            href="/dashboard"
            className="rounded border border-[var(--color-border)] px-5 py-3 text-sm font-medium hover:border-white/30"
          >
            Bekleyen Denetimler
          </Link>
        </div>
      </section>

      <section className="mt-24 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: 'Faz 1 — Proje',
            body: 'Onaylı betonarme PDF projeyi Kimi-VL okur, kolon şemasını JSON&apos;a çevirir.',
          },
          {
            title: 'Faz 2 — Saha',
            body: 'Saha fotoğrafları 7 ajan tarafından analiz edilir: Geometri, Kod, Sahtecilik, Risk, Malzeme, Paspayı, Moderatör.',
          },
          {
            title: 'Faz 3 — Onay',
            body: 'Skor eşiği aşılırsa beton dökümü onaylanır. Aksi halde detaylı gerekçeli red.',
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
          Kimi-VL (Moonshot)
        </a>
        . TBDY 2018 / TS 500 referanslıdır. Araştırma prototipi; insan mühendis onayının yerine
        geçmez.
      </footer>
    </main>
  );
}

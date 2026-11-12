import { useEffect, useState } from 'react'

/* Two pure-visual pages for SENSE: a one-page explainer and a two-slide pitch.
   Status labels are honest: "Built" means code and tests exist and run on invented Makati data.
   Nothing here claims real market findings. */

const BUCKETS = [
  { name: 'Scout', verb: 'Discover', q: 'What is moving?' },
  { name: 'SENSE', verb: 'Understand', q: 'What is missing?', hero: true },
  { name: 'Orchestrate', verb: 'Coordinate', q: 'What do we do about it?' },
  { name: 'Create', verb: 'Produce', q: 'What do we make?' },
  { name: 'Publish', verb: 'Distribute', q: 'Where does it go?' },
  { name: 'Measure', verb: 'Learn', q: 'Did it work?' },
]

type Status = 'built' | 'next'
const CAPS: { name: string; line: string; status: Status }[] = [
  { name: 'Friction mining', line: 'Comments sorted into 8 kinds of struggle, with the quote', status: 'built' },
  { name: 'Demand ghosts', line: 'Demand matched against supply, each with its own confidence', status: 'built' },
  { name: 'Supply evidence', line: 'Shops, menus, hours, prices. Missing is never "none"', status: 'built' },
  { name: 'Explainable score', line: 'Can answer "insufficient evidence"', status: 'built' },
  { name: 'Dossier + test', line: 'Evidence, doubts, and one way to test it', status: 'built' },
  { name: 'Opportunity Explorer', line: 'Barangay tiles and ranked cards at /sense.html', status: 'built' },
  { name: 'Real data', line: 'Everything shown today is invented. Privacy check comes first', status: 'next' },
  { name: 'Cultural Radar', line: 'Weak signals before they peak', status: 'next' },
  { name: 'Contradiction Engine', line: 'What a business believes vs what customers say', status: 'next' },
  { name: 'Opportunity Genome', line: 'Graph linking needs, shops, places', status: 'next' },
  { name: 'Validation Lab', line: 'Run the test, measure the answer', status: 'next' },
]

const FLOW = ['Comments', 'Friction', 'Demand ghost', 'Score', 'Dossier', 'Test']

function Chip({ status }: { status: Status }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        status === 'built' ? 'bg-[var(--color-green)] text-black' : 'border border-[var(--color-line-strong)] text-[var(--color-mute)]'
      }`}
    >
      {status === 'built' ? 'Built' : 'Not yet'}
    </span>
  )
}

function Buckets({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={`grid gap-2 ${compact ? 'grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}`}>
      {BUCKETS.map((b, i) => (
        <li
          key={b.name}
          className={`relative rounded-2xl border p-4 ${
            b.hero
              ? 'border-[var(--color-orange)] bg-[color-mix(in_srgb,var(--color-orange)_14%,var(--color-card))]'
              : 'border-[var(--color-line)] bg-[var(--color-card)]'
          }`}
        >
          <p className="text-xs tabular-nums text-[var(--color-dim)]">{i + 1}</p>
          <p className={`font-[var(--font-display)] text-xl font-semibold ${b.hero ? 'text-[var(--color-orange)]' : ''}`}>{b.name}</p>
          <p className="text-sm text-[var(--color-mute)]">{b.verb}</p>
          <p className="mt-3 text-sm font-medium">{b.q}</p>
          {b.hero && (
            <span className="absolute -top-2 right-3 rounded-full bg-[var(--color-orange)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">New</span>
          )}
        </li>
      ))}
    </ol>
  )
}

function Contrast() {
  const rows = [
    ['A coffee drink is trending', 'People near one area keep asking for cheap late coffee, and no shop lists it'],
    ['A product gets high engagement', 'Buyers like it, but keep complaining about price and stock'],
  ]
  return (
    <div className="grid gap-2">
      {rows.map(([scout, sense]) => (
        <div key={scout} className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1.3fr]">
          <p className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-3 text-sm">
            <b className="mr-1 text-[var(--color-mute)]">Scout</b> {scout}
          </p>
          <span aria-hidden="true" className="hidden place-items-center text-[var(--color-orange)] sm:grid">
            →
          </span>
          <p className="rounded-xl border border-[var(--color-orange)] bg-[color-mix(in_srgb,var(--color-orange)_8%,transparent)] p-3 text-sm">
            <b className="mr-1 text-[var(--color-orange)]">SENSE</b> {sense}
          </p>
        </div>
      ))}
    </div>
  )
}

function Flow() {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {FLOW.map((f, i) => (
        <li key={f} className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-sm font-medium">{f}</span>
          {i < FLOW.length - 1 && (
            <span aria-hidden="true" className="text-[var(--color-orange)]">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

function Label({ children }: { children: string }) {
  return <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-mute)]">{children}</h2>
}

export function OnePager() {
  const built = CAPS.filter((c) => c.status === 'built').length
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[var(--color-orange)]">Speculara · SENSE</p>
          <h1 className="mt-1 font-[var(--font-display)] text-4xl font-semibold sm:text-5xl">Find what the market is missing.</h1>
          <p className="mt-2 text-lg text-[var(--color-mute)]">Scout finds what is moving. SENSE finds what is missing.</p>
        </div>
        <nav className="flex gap-2 text-sm font-semibold">
          <a className="ctl min-h-11 rounded-full px-4 leading-[2.75rem]" href="/slides.html">
            2 slides
          </a>
          <a className="ctl min-h-11 rounded-full px-4 leading-[2.75rem]" href="/sense.html">
            Live prototype
          </a>
        </nav>
      </header>

      <section aria-label="Six buckets" className="mb-8">
        <Label>Five buckets, plus one</Label>
        <Buckets />
      </section>

      <section aria-label="Scout versus SENSE" className="mb-8">
        <Label>How SENSE differs from Scout</Label>
        <Contrast />
      </section>

      <section aria-label="How it works" className="mb-8">
        <Label>How it works</Label>
        <Flow />
        <p className="mt-3 text-sm text-[var(--color-mute)]">
          Demand and supply keep separate confidence. A shop missing from a list is never treated as proof that nobody sells the thing.
        </p>
      </section>

      <section aria-label="What is built" className="mb-8">
        <Label>{`What is built today: ${built} of ${CAPS.length}`}</Label>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((c) => (
            <li
              key={c.name}
              className={`rounded-xl border p-3 ${c.status === 'built' ? 'border-[var(--color-line-strong)] bg-[var(--color-card)]' : 'border-dashed border-[var(--color-line)]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{c.name}</p>
                <Chip status={c.status} />
              </div>
              <p className="mt-1 text-sm text-[var(--color-mute)]">{c.line}</p>
            </li>
          ))}
        </ul>
      </section>

      <p role="note" className="rounded-xl border border-dashed border-[var(--color-orange)] p-4 text-sm">
        <strong className="mr-2 rounded-full bg-[var(--color-orange)] px-2 py-0.5 text-xs font-bold uppercase text-black">Illustrative data</strong>
        The prototype runs on invented Makati coffee shop data. No real market finding is claimed.
      </p>
    </main>
  )
}

/* ---------- Two slides ---------- */

function Slide({ children, title, kicker }: { children: React.ReactNode; title: string; kicker: string }) {
  return (
    <section className="flex aspect-video w-full flex-col justify-between rounded-3xl border border-[var(--color-line-strong)] bg-[var(--color-card)] p-[4%] shadow-[var(--shadow-md)]">
      <div>
        <p className="text-[clamp(0.7rem,1.4vw,1rem)] font-semibold tracking-wide text-[var(--color-orange)]">{kicker}</p>
        <h1 className="font-[var(--font-display)] text-[clamp(1.4rem,4vw,3rem)] font-semibold leading-tight">{title}</h1>
      </div>
      {children}
    </section>
  )
}

function MiniCard() {
  return (
    <div className="rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-canvas)] p-4 text-[clamp(0.7rem,1.3vw,1rem)]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">
          <span className="mr-2 text-[var(--color-orange)]">#1</span>Price in a sample barangay
        </p>
        <span className="rounded-full border border-[var(--color-line-strong)] px-2 py-0.5 text-[0.8em] font-semibold">◆ Candidate gap</span>
      </div>
      <p className="mt-2 border-l-2 border-[var(--color-orange)] pl-3 text-[var(--color-fog)]">“Is there any cheap coffee open late around here?”</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[0.85em]">
        <p><span className="block text-[var(--color-mute)]">Score</span><b className="text-[1.6em] tabular-nums">74</b></p>
        <p><span className="block text-[var(--color-mute)]">Demand</span><b>Medium</b></p>
        <p><span className="block text-[var(--color-mute)]">Supply</span><b>Unknown</b></p>
      </div>
      <p className="mt-3 text-[0.85em] text-[var(--color-mute)]">Test: offer a late-night price pack for two weeks and count inquiries.</p>
      <p className="mt-2 text-[0.7em] font-bold uppercase text-[var(--color-orange)]">Illustrative data</p>
    </div>
  )
}

export function Slides() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setI((n) => Math.min(1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main id="main" className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-4 px-4 py-6 sm:px-6">
      {i === 0 ? (
        <Slide kicker="Speculara · SENSE" title="Five buckets find what is moving. SENSE finds what is missing.">
          <Buckets compact />
          <Flow />
        </Slide>
      ) : (
        <Slide kicker="The prototype" title="From a comment to a testable opportunity">
          <div className="grid items-center gap-[3%] sm:grid-cols-[1fr_1.2fr]">
            <ul className="grid gap-2 text-[clamp(0.75rem,1.5vw,1.1rem)]">
              {['Comments become named struggles', 'Demand is matched against shops and menus', 'Every card shows its doubts', 'Every card suggests one test'].map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden="true" className="text-[var(--color-orange)]">✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <MiniCard />
          </div>
          <a href="/sense.html" className="ctl min-h-11 w-fit rounded-full px-5 text-sm font-semibold leading-[2.75rem]">
            Open the live prototype →
          </a>
        </Slide>
      )}
      <div className="flex items-center justify-between text-sm">
        <a href="/sense-onepager.html" className="underline">One-pager</a>
        <div className="flex items-center gap-2">
          <button type="button" className="ctl min-h-11 rounded-full px-4 font-semibold" disabled={i === 0} onClick={() => setI(0)}>
            Back
          </button>
          <span className="tabular-nums text-[var(--color-mute)]">{i + 1} / 2</span>
          <button type="button" className="ctl min-h-11 rounded-full px-4 font-semibold" disabled={i === 1} onClick={() => setI(1)}>
            Next
          </button>
        </div>
      </div>
    </main>
  )
}

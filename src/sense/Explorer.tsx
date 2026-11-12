import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

/* Opportunity Explorer (SENSE phase 2.7). Shows the dossier for Makati coffee shops.
   Today it only ever shows invented data, and says so on the page. */

type Opportunity = {
  rank: number | null
  barangay: string
  theme: string
  score: number | null
  verdict: string
  demand_confidence: string
  supply_confidence: string
  supply_status: string
  evidence: string[]
  uncertainty: string[]
  validation_test: string
  labels: string[]
}
type Tile = { barangay: string; demand: number; shops: number; gaps: number; has_data: boolean }
type Step = { agent: string; job: string; received: number; produced: number; note: string }
type Payload = {
  label: string
  notice: string
  headline: string
  opportunities: Opportunity[]
  insufficient_evidence: Opportunity[]
  trace: Step[]
  map: Tile[]
  map_note: string
}
type Layer = 'demand' | 'supply' | 'gaps'

const LAYERS: { key: Layer; label: string; unit: string }[] = [
  { key: 'demand', label: 'Demand', unit: 'comments' },
  { key: 'supply', label: 'Supply', unit: 'shops listed' },
  { key: 'gaps', label: 'Gaps', unit: 'candidate gaps' },
]

const VERDICT: Record<string, { glyph: string; text: string }> = {
  'candidate gap': { glyph: '◆', text: 'Candidate gap' },
  covered: { glyph: '✓', text: 'Covered' },
  'supply unknown': { glyph: '?', text: 'Supply unknown' },
  'demand only': { glyph: '○', text: 'Demand only' },
  'insufficient evidence': { glyph: '–', text: 'Insufficient evidence' },
}

const THEME_LABEL: Record<string, string> = {
  compatibility: 'Dietary or drink needs',
  affordability: 'Price',
  availability: 'Availability',
  discovery: 'Finding the shop',
  accessibility: 'Getting there',
  trust: 'Trust and hygiene',
  quality: 'Taste and quality',
  experience: 'Service and atmosphere',
}

const valueOf = (t: Tile, layer: Layer) => (layer === 'demand' ? t.demand : layer === 'supply' ? t.shops : t.gaps)

export default function Explorer() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [layer, setLayer] = useState<Layer>('gaps')
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    api<Payload>('/api/sense/demo')
      .then(setData)
      .catch((e: Error) => setError(e.message || 'The explorer could not load.'))
  }, [])

  const max = useMemo(() => Math.max(1, ...(data?.map ?? []).map((t) => valueOf(t, layer))), [data, layer])
  const shown = useMemo(() => {
    if (!data) return []
    return picked ? data.opportunities.filter((o) => o.barangay === picked) : data.opportunities
  }, [data, picked])
  const shownInsufficient = useMemo(() => {
    if (!data) return []
    return picked ? data.insufficient_evidence.filter((o) => o.barangay === picked) : data.insufficient_evidence
  }, [data, picked])
  const layerInfo = LAYERS.find((l) => l.key === layer)!

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-6">
        <p className="text-sm font-semibold tracking-wide text-[var(--color-orange)]">SENSE · Makati coffee shops</p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-semibold sm:text-4xl">Opportunity Explorer</h1>
        {data && <p className="mt-3 max-w-3xl text-lg text-[var(--color-snow)]">{data.headline}</p>}
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-[var(--color-wine)] p-4">
          {error} Check that the analysis service is running, then reload.
        </p>
      )}
      {!data && !error && <p role="status">Loading the explorer…</p>}

      {data && (
        <>
          <p
            role="note"
            className="mb-8 rounded-xl border border-dashed border-[var(--color-orange)] bg-[color-mix(in_srgb,var(--color-orange)_8%,transparent)] p-4"
          >
            <strong className="mr-2 rounded-full bg-[var(--color-orange)] px-2 py-0.5 text-xs font-bold uppercase text-black">
              Illustrative data
            </strong>
            {data.notice}
          </p>

          <section aria-labelledby="map-title" className="mb-10">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h2 id="map-title" className="text-xl font-semibold">
                Barangays
              </h2>
              <div role="group" aria-label="Map layer" className="flex gap-2">
                {LAYERS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    aria-pressed={layer === l.key}
                    onClick={() => setLayer(l.key)}
                    className={`ctl min-h-11 rounded-full px-4 text-sm font-semibold ${layer === l.key ? 'is-selected' : ''}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-3 text-sm text-[var(--color-mute)]">
              Showing {layerInfo.unit} per barangay. {data.map_note}
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {data.map.map((t) => {
                const v = valueOf(t, layer)
                const strength = t.has_data ? Math.round((v / max) * 70) : 0
                // Spoken after the visible text, so the accessible name starts with what is shown.
                const spoken = t.has_data
                  ? ` ${layerInfo.unit}. All layers: ${t.demand} comments, ${t.shops} shops listed, ${t.gaps} candidate gaps.`
                  : ' yet. This is not zero demand.'
                return (
                  <li key={t.barangay}>
                    <button
                      type="button"
                      aria-pressed={picked === t.barangay}
                      onClick={() => setPicked(picked === t.barangay ? null : t.barangay)}
                      style={t.has_data ? { background: `color-mix(in srgb, var(--color-orange) ${strength}%, var(--color-card))` } : undefined}
                      className={`flex min-h-[4.5rem] w-full flex-col justify-between rounded-xl border p-2 text-left text-sm transition-colors ${
                        t.has_data ? 'border-[var(--color-line-strong)]' : 'border-dashed border-[var(--color-line-strong)] text-[var(--color-mute)]'
                      } ${strength >= 40 ? 'text-black' : ''} ${picked === t.barangay ? 'outline outline-2 outline-offset-2 outline-[var(--color-snow)]' : ''}`}
                    >
                      <span className="font-medium leading-tight">{t.barangay}</span>
                      <span className="tabular-nums">
                        {t.has_data ? v : 'No data'}
                        <span className="sr-only">{spoken}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {picked && (
              <p className="mt-3 text-sm">
                Showing {picked} only.{' '}
                <button type="button" onClick={() => setPicked(null)} className="underline">
                  Show all barangays
                </button>
              </p>
            )}
          </section>

          <section aria-labelledby="ranked-title" className="mb-10">
            <h2 id="ranked-title" className="mb-3 text-xl font-semibold">
              Ranked opportunities
            </h2>
            {shown.length === 0 && <p className="text-[var(--color-mute)]">{picked ? `No ranked opportunity in ${picked}.` : 'Nothing is ranked yet.'}</p>}
            <ol className="grid gap-4 lg:grid-cols-2">
              {shown.map((o) => (
                <OpportunityCard key={`${o.barangay}-${o.theme}`} o={o} />
              ))}
            </ol>
          </section>

          {shownInsufficient.length > 0 && (
            <section aria-labelledby="insufficient-title" className="mb-10">
              <h2 id="insufficient-title" className="mb-1 text-xl font-semibold">
                Insufficient evidence
              </h2>
              <p className="mb-3 text-sm text-[var(--color-mute)]">These are not ranked. There is not enough evidence to say anything yet.</p>
              <ul className="grid gap-4 lg:grid-cols-2">
                {shownInsufficient.map((o) => (
                  <OpportunityCard key={`${o.barangay}-${o.theme}`} o={o} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="trace-title">
            <details>
              <summary id="trace-title" className="min-h-11 cursor-pointer py-2 text-xl font-semibold">
                How this was made
              </summary>
              <ol className="mt-3 grid gap-3">
                {data.trace.map((s, i) => (
                  <li key={s.agent} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
                    <p className="font-semibold">
                      {i + 1}. {s.agent}
                    </p>
                    <p className="text-[var(--color-mute)]">{s.job}</p>
                    <p className="mt-1 tabular-nums">
                      {s.received} in, {s.produced} out. {s.note}
                    </p>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        </>
      )}
    </main>
  )
}

function OpportunityCard({ o }: { o: Opportunity }) {
  const v = VERDICT[o.verdict] ?? { glyph: '•', text: o.verdict }
  const heading = `${THEME_LABEL[o.theme] ?? o.theme} in ${o.barangay}`
  return (
    <li className="rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {o.rank ? <span className="mr-2 tabular-nums text-[var(--color-orange)]">#{o.rank}</span> : null}
          {heading}
        </h3>
        <span className="rounded-full border border-[var(--color-line-strong)] px-3 py-1 text-sm font-semibold">
          <span aria-hidden="true">{v.glyph} </span>
          {v.text}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-[var(--color-mute)]">Score</dt>
          <dd className="tabular-nums text-xl font-semibold">{o.score === null ? '—' : Math.round(o.score)}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-mute)]">Demand confidence</dt>
          <dd className="capitalize">{o.demand_confidence}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-mute)]">Supply confidence</dt>
          <dd className="capitalize">{o.supply_confidence}</dd>
        </div>
      </dl>
      {o.evidence.length > 0 && (
        <>
          <h4 className="mt-4 text-sm font-semibold">What people said</h4>
          <ul className="mt-1 grid gap-1">
            {o.evidence.map((q, i) => (
              <li key={i} className="border-l-2 border-[var(--color-orange)] pl-3 text-[var(--color-fog)]">
                “{q}”
              </li>
            ))}
          </ul>
        </>
      )}
      <h4 className="mt-4 text-sm font-semibold">What we are not sure about</h4>
      <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm text-[var(--color-fog)]">
        {o.uncertainty.map((u, i) => (
          <li key={i}>{u}</li>
        ))}
      </ul>
      <h4 className="mt-4 text-sm font-semibold">One way to test it</h4>
      <p className="mt-1 text-sm text-[var(--color-fog)]">{o.validation_test}</p>
      {o.labels.includes('illustrative') && <p className="mt-3 text-xs font-semibold uppercase text-[var(--color-orange)]">Illustrative data</p>}
    </li>
  )
}

/* The challenge: four buckets, one pick. Content is set exactly as supplied.
   The bracketed mono labels and the prize lines are the source's own structure, so they stay. */

const BUCKETS = [
  {
    n: "01",
    prize: "Best Content · ₱10,000",
    name: "Content",
    line: "Make the work people actually stop for.",
    body: "Feeds are full. A studio needs hooks, craft and payoff that hold attention, made fast and on brand.",
    projects: [
      "A tool that turns one idea into ten distinct short videos",
      "A hook writer that tests Taglish openers",
      "Brand-safe image or voice variations with automatic checks",
    ],
  },
  {
    n: "02",
    prize: "Best Craftsmanship · ₱10,000",
    name: "Craftsmanship",
    line: "Build something that looks and feels finished.",
    body: "Most hackathon projects work but feel rough. This bucket is for the product people enjoy using: great UI and UX, end to end.",
    projects: [
      "A dashboard a creator would open every morning",
      "A mobile-first tool with a flow that needs no explanation",
      "A polished front end for an AI workflow that is usually a terminal",
    ],
  },
  {
    n: "03",
    prize: "Most Unique Use of Agents · ₱10,000",
    name: "Agents",
    line: "Hand agents a job nobody else thought to give them.",
    body: "Everyone builds a chatbot. This bucket is for agents that plan, act, check each other and get real work done on their own.",
    projects: [
      "Agents that run a small online shop end to end",
      "A team of agents where one reviews and fixes the others’ work",
      "An agent that uses a phone or browser the way a person would",
    ],
  },
  {
    n: "04",
    prize: "Most Useful for the PH Community · ₱10,000",
    name: "PH Community",
    line: "Build what helps Filipinos most, starting tomorrow.",
    body: "The best tools solve a problem people here actually have. This bucket is for builds that make life or work in the Philippines easier.",
    projects: [
      "A helper for government requirements and paperwork",
      "A tool for sari-sari stores and small sellers",
      "Something that saves commuters, OFW families or students time",
    ],
  },
] as const;

export default function ChallengeSection() {
  return (
    <section id="challenge" aria-labelledby="challenge-title" className="scroll-mt-6 border-t border-border-default py-16 sm:py-24">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-600">The challenge</p>
      <h2 id="challenge-title" className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-6xl">
        Four buckets. Pick one.
      </h2>
      <div className="mt-6 max-w-2xl space-y-3 text-base leading-relaxed text-slate-700 sm:text-lg">
        <p>
          Each bucket has its own ₱10,000 prize, and Best in Show (₱50,000) can come from any of them. Choose one and build
          it your way, with any stack and any AI tools.
        </p>
        <p className="text-slate-600">ParallelOS is how Parallel solves them. You’ll see it in the keynote; you won’t build on it.</p>
      </div>

      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {BUCKETS.map((b) => (
          <li key={b.n}>
            <article
              aria-labelledby={`bucket-${b.n}`}
              className="group flex h-full flex-col rounded-3xl border border-border-default bg-card p-6 transition-colors duration-200 hover:border-line-strong sm:p-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.14em]">
                <span className="text-ink">[ bucket {b.n} ]</span>
                <span className="text-slate-600">Prize: {b.prize}</span>
              </div>
              <h3 id={`bucket-${b.n}`} className="mt-8 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
                {b.name}
              </h3>
              <p className="mt-3 text-lg font-semibold leading-snug text-ink">{b.line}</p>
              <p className="mt-2 leading-relaxed text-slate-700">{b.body}</p>
              <div className="mt-auto pt-8">
                <p className="border-t border-border-default pt-5 font-mono text-xs uppercase tracking-[0.14em] text-slate-600">
                  Projects you could build
                </p>
                <ul className="mt-3 space-y-2.5">
                  {b.projects.map((p) => (
                    <li key={p} className="relative pl-5 text-sm leading-relaxed text-slate-800 before:absolute before:left-0 before:top-[0.62em] before:h-px before:w-3 before:bg-line-strong">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-xl font-mono text-sm leading-relaxed text-slate-700">
        These are starting points, not limits. If your idea fits a bucket, it counts.
      </p>
    </section>
  );
}

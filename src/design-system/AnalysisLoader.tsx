/* Waiting state while a file is analyzed. The circles drift apart and back (searching, then focusing).
   It is honest: there is no fake percentage, because the service does not report progress.
   Screen readers already get the real status message from the upload card, so this block is hidden from them. */
import { AnimatedMark } from "./AnimatedMark";

export function AnalysisLoader() {
  return (
    <div aria-hidden="true" className="surface mb-6 flex items-center gap-5 rounded-2xl p-5">
      <AnimatedMark size={56} mode="loop" />
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-ink">Reading your data</p>
        <p className="text-sm text-slate-600">Checking columns, then working out your totals and trends.</p>
        <div className="skeleton-pulse mt-3 flex gap-2">
          <div className="skeleton-bar h-3 w-24" />
          <div className="skeleton-bar h-3 w-16" />
          <div className="skeleton-bar h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

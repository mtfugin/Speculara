/** Axis top that splits into four round steps (1, 2, 2.5, 5 x 10^n) and leaves a little headroom. */
export function niceMax(value: number) {
  const target = Math.max(value, Number.MIN_VALUE) * 1.05 / 4;
  const power = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= target)!;
  return step * 4;
}

/** Display-only ticks: exact labels and every value stay with their bars and tables. */
export function chartTicks(labels: string[], dates: boolean, width: number) {
  const count = Math.min(labels.length, Math.max(2, Math.floor(width / 64)));
  return Array.from({ length: count }, (_, tick) => {
    const index = count === 1 ? 0 : Math.round(tick * (labels.length - 1) / (count - 1));
    const label = labels[index];
    let text = label;
    if (dates && /^\d{4}-\d{2}-\d{2}$/.test(label)) {
      const date = new Date(`${label}T00:00:00Z`);
      if (!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === label) {
        text = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
      }
    }
    return { index, text };
  });
}

# Speculara brand and design system

Living reference: run the app and open `/?brand` (the brand sheet renders the real components and tokens, so it cannot drift).

| Document | What it covers |
| --- | --- |
| [01 Audit and strategy](01-audit-and-strategy.md) | Where the product started, the brand idea, decisions |
| [02 Brand guide](02-brand-guide.md) | Positioning, personality, logo family and rules, typography |
| [03 Design system](03-design-system.md) | Tokens, spacing, shape, components and states, responsive, accessibility, file map |
| [04 Icons, patterns, illustrations](04-icons-patterns-illustrations.md) | The visual language beyond the logo |
| [05 Motion specification](05-motion-spec.md) | Motion philosophy, tokens, signature animation, every animation, reduced motion |

Screens: `screens/home-desktop.png`, `screens/results-desktop.png`, `screens/home-mobile.png`, `screens/brand-sheet-mobile.png`.

Backup before the redesign: git tag `backup-before-redesign-2026-11-12`, branch `backup/before-redesign-2026-11-12`.

## Overhaul (owner decision, 2026-11-12)

The earlier light "ink and ivory" identity was replaced by the dark system from the supplied Responsive Hero Banner template, applied to the whole app. Documents 02 to 05 describe the current system; where they mention the earlier brand it is marked as superseded. The old values are in git tag `backup-before-redesign-2026-11-12` and in the commits before the overhaul.

| | Before | Now |
| --- | --- | --- |
| Surfaces | White cards on pale gray, ink navy accent | Zinc: canvas #09090b, card #18181b, raised #27272a, hairlines #2e2e33 |
| Text | Navy ink, slate gray | White #fafafa, zinc 300 #d4d4d8 and 400 #a1a1aa |
| Controls | 10px radius, navy primary | Pills, white primary button with dark text, hairline secondary |
| Headings | Sora | Instrument Serif (one weight) |
| Body and numbers | Manrope | Inter |
| Logo wordmark | Sora Bold | Sora Bold (unchanged); mark is white and sky on dark, `onLight` tone for white pages |
| Overlays | White with shadow | Glass: translucent zinc, blur, white hairline |
| Accent | Navy | None for chrome. Sky is the data color, soft red (`wine` token, #f87171) is caution |

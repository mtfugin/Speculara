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

Rule that applies to everything here: **colors are never changed by brand work.** Every color is an existing token in `tokens/speculara.json` (one token, `sky-deep`, was added earlier for chart contrast).

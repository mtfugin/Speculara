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

## Current direction (owner decisions, 2026-11-12)

1. The light "ink and ivory" identity was replaced by a dark, Apple-grade system, applied to the whole app.
2. The hero photo, the serif headline and the partner and badge filler were removed. The hero is one screen: the headline (with a mirrored last phrase) and actions on the left, and a live dashboard on the right that measures the synthetic demo (or your data once loaded): headline counts with weekly change, a trend chart with hover values, and a next-day estimate. The upload section sits right below.
3. New logo: three bars and their reflection (the mirror). A 1.5 second loading screen plays the bars rising and the reflection answering.
4. The challenge text (four buckets) is the hackathon brief, not site content, so it is not on the page.
5. The accent is orange (no blue). The chat is a message sheet: glass panel, bubbles, suggestion chips, pill input with an arrow send button, and a switch for AI answers.

Earlier looks are in git tag `backup-before-redesign-2026-11-12` and the earlier commits on branch `redesign`.


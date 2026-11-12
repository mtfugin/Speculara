# 02 Brand guide

## Idea

Speculara comes from *speculum*, Latin for mirror. The product holds up a mirror to your marketing numbers and says what it sees, how sure it is, and one thing to try. The visual identity is an **optical instrument**: two circles, the lens between them, thin precise lines, light that comes into focus.

**Positioning.** The clear, honest instrument for marketing numbers.
**Tagline.** Honest numbers. Plain words.
**Personality.** Lucid, calm, precise, warm. A good optician or a friendly accountant, not a dashboard that shouts.
**Principles.** Number first, then the plain meaning. Say what is measured and what is a guess. One primary action per screen. Structure from space and thin lines, not shadows. Motion explains cause and effect after something is real. Recognizable without the logo.

## Logo

**Mark.** Two equal circles, white and sky on dark (`onLight`: near-black and a deeper sky), offset on the diagonal. The lens where they overlap is cut away. It stands for a thing and its reflection, and the overlap is where insight happens. The cut is a mask, so the mark is transparent in the middle and works on any background.

**Wordmark.** "Speculara" in Sora Bold, tracking -0.02em. It is the original product typography, unchanged. In static files it is converted to outlines (kerned) so it renders identically without the font.

**Geometry.** Mark grid 48 x 48. Circles r 15 at (19,19) and (29,29). Below 20px the circles move 3 units further apart so the lens stays open. Horizontal lockup: mark, gap of 0.25 x mark width, wordmark centered on the mark. Stacked lockup: mark above wordmark, centered.

**Clear space.** Half the mark width on every side. **Minimum size.** Mark 16px. Horizontal lockup 96px wide. Use the favicon file below 20px.

**Family** (`src/assets/branding/logos/`, each in color, `-mono-dark`, `-mono-light`, `-reversed`): `mark`, `wordmark`, `logo-horizontal`, `logo-stacked`, `logo-horizontal-tagline`. Plus `favicon.svg`, `app-icon.svg`. PNG exports: `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/icon-512.png`, `deliverables/speculara-logo.png`.

| Background | Use |
| --- | --- |
| The dark interface (canvas, card, photo) | Default and reversed logo: white circle, sky circle, white wordmark |
| White pages, print | `onLight` tone, or the static `logo-*` files without a suffix |
| Any single-color context | Mono dark or mono light |
| App icon | Near-black rounded square with the white and sky mark. The favicon switches between near-black and white by the browser theme |

**Responsive behavior.** Header shows the horizontal lockup at 32px mark. Under 20px use the favicon mark. In-app code uses the `Logo`, `LogoMark` and `Wordmark` components in `src/design-system/Logo.tsx`.

**Do not.** Stretch, rotate, recolor outside the palette, add shadows, outlines or gradients, close the lens, or place on busy imagery.

## Color

Dark zinc, taken from the hero template (`tokens/speculara.json`). Surfaces: canvas `#09090b`, card `#18181b`, raised `#27272a`. Lines: `#2e2e33`, strong `#52525b`. Text: snow `#fafafa`, fog `#e4e4e7`, subtle `#d4d4d8`, mute `#a1a1aa`. Accent: sky `#38bdf8` for data only. Caution: `#f87171`. Primary action is a white pill with dark text. Contrast is tested: body and secondary text 7:1 or better, focus ring 3:1 or better.

## Typography

| Role | Typeface | Notes |
| --- | --- | --- |
| Headings and the hero headline | Instrument Serif | One weight (400). Never faux bold. Sizes run larger than sans because the face is condensed |
| Text, interface, every number | Inter (variable) | Numbers are Inter because Instrument Serif digits read badly (a 1 looks like an l) |
| Wordmark | Sora Bold | Unchanged logo typography |
| Statistics (r, p, IDs) | JetBrains Mono | Only where exact characters matter |

All faces are self-hosted through Fontsource.

| Style | Size / line | Face and weight |
| --- | --- | --- |
| Hero | 56 to 72 / tight | Instrument Serif 400 |
| Section heading | 36 to 48 | Instrument Serif 400 |
| Card heading | 30 | Instrument Serif 400 |
| Key number | 30 to 36 | Inter 600 |
| Data sentence, list titles | 18 to 30 | Inter 500 to 600 |
| Body | 16 / 24 | Inter 400 |
| Small, caption | 14, 12 | Inter 400 to 600 |

Hierarchy comes from size, face and contrast. Headings use `text-wrap: balance`. Prefer wrapping to truncation.

## Voice

Plain English, short sentences, say "you". Explain what a number means in real life. Never promise results. Always say what was counted versus what is a guess. No em dashes in product text.

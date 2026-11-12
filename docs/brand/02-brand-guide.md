# 02 Brand guide

## Idea

Speculara comes from *speculum*, Latin for mirror. The product holds up a mirror to your marketing numbers and says what it sees, how sure it is, and one thing to try. The visual identity is an **optical instrument**: two circles, the lens between them, thin precise lines, light that comes into focus.

**Positioning.** The clear, honest instrument for marketing numbers.
**Tagline.** Honest numbers. Plain words.
**Personality.** Lucid, calm, precise, warm. A good optician or a friendly accountant, not a dashboard that shouts.
**Principles.** Number first, then the plain meaning. Say what is measured and what is a guess. One primary action per screen. Structure from space and thin lines, not shadows. Motion explains cause and effect after something is real. Recognizable without the logo.

## Logo

**Mark.** Two equal circles, ink and sky, offset on the diagonal. The lens where they overlap is cut away. It stands for a thing and its reflection, and the overlap is where insight happens. The cut is a mask, so the mark is transparent in the middle and works on any background.

**Wordmark.** "Speculara" in Sora Bold, tracking -0.02em. It is the original product typography, unchanged. In static files it is converted to outlines (kerned) so it renders identically without the font.

**Geometry.** Mark grid 48 x 48. Circles r 15 at (19,19) and (29,29). Below 20px the circles move 3 units further apart so the lens stays open. Horizontal lockup: mark, gap of 0.25 x mark width, wordmark centered on the mark. Stacked lockup: mark above wordmark, centered.

**Clear space.** Half the mark width on every side. **Minimum size.** Mark 16px. Horizontal lockup 96px wide. Use the favicon file below 20px.

**Family** (`src/assets/branding/logos/`, each in color, `-mono-dark`, `-mono-light`, `-reversed`): `mark`, `wordmark`, `logo-horizontal`, `logo-stacked`, `logo-horizontal-tagline`. Plus `favicon.svg`, `app-icon.svg`. PNG exports: `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/icon-512.png`, `deliverables/speculara-logo.png`.

| Background | Use |
| --- | --- |
| White, mist, cream | Color logo |
| Ink, primary (dark) | Reversed logo (white circle, sky circle, white wordmark) |
| Any single-color context | Mono dark or mono light |
| App icon | Ink rounded square with the reversed mark |

**Responsive behavior.** Header shows the horizontal lockup at 32px mark. Under 20px use the favicon mark. In-app code uses the `Logo`, `LogoMark` and `Wordmark` components in `src/design-system/Logo.tsx`.

**Do not.** Stretch, rotate, recolor outside the palette, add shadows, outlines or gradients, close the lens, or place on busy imagery.

## Typography

| Role | Typeface | Notes |
| --- | --- | --- |
| Display and headings, wordmark | Sora (variable) | Geometric and round, echoes the circles |
| Text and interface | Manrope (variable) | Open, readable at small sizes |
| Statistics (r, p, IDs) | JetBrains Mono | Only where exact characters matter |

All three are self-hosted through Fontsource (no third-party request). Numbers in tables, charts and cards use tabular figures.

| Style | Size / line | Weight |
| --- | --- | --- |
| Display | 56 / 60 | 700 |
| H1 | 40 / 48 | 700 |
| H2 | 32 / 40 | 700 |
| H3 | 24 / 32 | 600 |
| H4 | 20 / 28 | 600 |
| H5 | 18 / 28 | 600 |
| Body large | 16 / 24 | 400 |
| Body | 14 / 20 | 400 |
| Caption | 12 / 16 | 400 to 600 |

Hierarchy comes from weight and size together, never size alone. Headings use `text-wrap: balance`. Prefer wrapping to truncation. Line length stays under about 75 characters.

## Voice

Plain English, short sentences, say "you". Explain what a number means in real life. Never promise results. Always say what was counted versus what is a guess. No em dashes in product text.

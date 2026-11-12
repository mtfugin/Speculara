# 02 Brand guide

## Idea

Speculara comes from *speculum*, Latin for mirror. The product holds a mirror up to your marketing numbers: the bars you measured, and the reflection that tells you what they mean. The identity is that one picture, kept plain and precise, in the dark, premium register of a system app.

**Positioning.** The clear, honest instrument for marketing numbers.
**Tagline.** Honest numbers. Plain words.
**Principles.** Number first, then the plain meaning. Say what is measured and what is a guess. One primary action per screen. Structure from space and hairlines. Motion explains cause and effect after something is real.

## Logo

**Mark.** Three rising bars above a mirror line, and their reflection below. White bars and an orange reflection on the dark interface (`onLight`: near-black bars and a deep orange reflection). It reads at 16px, works in one color (the reflection drops to 45% opacity), and animates naturally: the bars rise, then the reflection answers.

**Wordmark.** "Speculara" in Sora Bold, tracking -0.02em. Live text in the app, kerned outlines in the static files.

**Geometry.** 48 x 48 grid. Bars 8 wide with 4 between them, heights 8, 14 and 20, bottoms at y = 21. Mirror axis at y = 24 with a 3 unit gap each side, reflections start at y = 27 with the same heights. Corner radius 3. Horizontal lockup: mark, gap of 0.25 x mark width, wordmark centered on the mark. Stacked lockup: mark above wordmark.

**Clear space.** Half the mark width on every side. **Minimum size.** Mark 16px, horizontal lockup 96px wide.

**Family** (`src/assets/branding/logos/`): `mark`, `wordmark`, `logo-horizontal`, `logo-stacked`, `logo-horizontal-tagline`, each as plain (for white pages), `-mono-dark`, `-mono-light` and `-reversed` (for the dark interface). Plus `favicon.svg` and `app-icon.svg`. PNG exports: `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/icon-512.png`, `deliverables/speculara-logo.png`.

| Background | Use |
| --- | --- |
| The dark interface | `Logo tone="reversed"` (or the default tone, which follows the tokens): white bars, orange reflection, white wordmark |
| White pages, print | `tone="onLight"`, or the plain `logo-*` files |
| Any single color | Mono dark or mono light |
| App icon | Near-black rounded square with the white and sky mark. The favicon switches between near-black and near-white by the browser theme |

**Do not.** Stretch, rotate, recolor outside the palette, add shadows, outlines or gradients, change the bar heights, or drop the reflection (use mono if one color is needed).

## Color

Apple-grade dark: layered near-black surfaces, one orange accent, system red for caution (`tokens/speculara.json`).

| Role | Value |
| --- | --- |
| Canvas, card, raised | `#09090b`, `#141417`, `#1c1c1f` |
| Hairline, strong hairline | `#2a2a2f`, `#48484f` |
| Text: primary, secondary, tertiary | `#f5f5f7`, `#d2d2d7`, `#a1a1a6` |
| Accent and data color | Orange `#ff9f0a` (text, highlights, charts). Filled controls (chat bubble, send, launcher) are orange with near-black text, 9:1 |
| On white pages | Deep orange `#ea580c` |
| Positive sentiment | Green `#30d158` |
| Caution | Red `#ff453a` |
| Chat sheet | Translucent `#1c1c1e` at 74%, 40px blur, 180% saturation |

The primary action is a white pill with dark text. Contrast is tested in the browser: body and secondary text 7:1 or better, focus ring 3:1 or better, plus axe scans on every screen.

## Typography

| Role | Typeface | Notes |
| --- | --- | --- |
| Headings, hero headline | Bricolage Grotesque (variable) | Weight 700 to 800, tracking -0.03 to -0.04em, tight leading |
| Text, interface, numbers | Inter (variable) | Close to the system face; numbers are tabular |
| Labels, prizes, tags | JetBrains Mono | Uppercase with wide tracking, for the bracket labels `[ bucket 01 ]` and prize lines |
| Wordmark | Sora Bold | Logo only |

All faces are self-hosted through Fontsource.

| Style | Size | Face and weight |
| --- | --- | --- |
| Hero headline | 42 to 70 | Bricolage 800 |
| Section heading | 36 to 60 | Bricolage 800 |
| Card heading | 30 | Bricolage 700 |
| Key number | 30 to 36 | Inter 600 |
| Body | 16 to 18 | Inter 400 |
| Label | 12 | JetBrains Mono, uppercase |

The hero headline repeats its last word as a faint reflection below it (`-webkit-box-reflect`, where supported). It is the one place the mirror idea shows in type.

## Voice

Plain English, short sentences, say "you". Explain what a number means in real life. Never promise results. Always say what was counted versus what is a guess. No em dashes in product text.

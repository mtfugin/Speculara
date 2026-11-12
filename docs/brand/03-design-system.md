# 03 Design system

## Where things live

| Path | What |
| --- | --- |
| `tokens/speculara.json` | Source of truth for every token. Run `npm run tokens:build` after editing |
| `src/tokens.css` | Generated Tailwind theme. Never edit by hand (a test checks it is current) |
| `src/index.css` | Surfaces, controls, motion classes and keyframes, all built only from tokens |
| `src/design-system/` | `ui` (Card, Well, H, Fact, KeyNumber, Numbers, Pills), `Logo`, `Icon`, `patterns`, `illustrations`, `AnimatedMark`, `Splash`, `AnalysisLoader`, `motion`, `BrandSheet` |
| `src/assets/branding/logos/` | Static logo family (SVG) |
| `docs/brand/` | This documentation |

## Tokens

The dark system lives in the token file (colors, fonts, radius, elevation). Token groups:

| Group | Tokens |
| --- | --- |
| Type | `--text-xs` to `--text-5xl` each with `--line-height`, weights 400 to 700, `--tracking-*` |
| Fonts | `--font-display` (Bricolage Grotesque), `--font-sans` (Inter), `--font-wordmark` (Sora), `--font-mono` (JetBrains Mono) |
| Radius | 4, 6, 8, 12 (lg), 16 (xl), 24 (2xl and 3xl, cards). Controls are pills (9999px) |
| Border | `--border-width` 1px, `--border-focus-width` 3px |
| Elevation | Black-based `--shadow-xs`, `--shadow-sm`, `--shadow-md` (overlays) |
| Layout | `--layout-app` 1120px, `--layout-reading` 680px, `--layout-gutter` 20px |
| Layers | `--z-header` 20, `--z-overlay` 30, `--z-modal` 40, `--z-toast` 50, `--z-skip` 100 |
| Icons | `--size-icon-sm` 16, md 20, lg 24, xl 32, stroke 1.75 |
| Targets | `--size-target` 44px |
| Motion | `--motion-*` durations, `--ease-*` curves (see 05) |

Spacing uses Tailwind's 4px scale. Roles: control padding 12 to 16, gaps 8 to 12, card padding 20 to 24, section spacing 40 to 64, page gutter 20.

## Shape

Pills and large soft cards. Controls, chips and buttons are fully round, cards are 24px. Surfaces are zinc with a 1px hairline and almost no shadow. Overlays (chat) are glass: translucent zinc, 18px blur, white hairline.

## Components (classes and React)

| Piece | Class or component | Notes |
| --- | --- | --- |
| Card | `.surface` or `<Card>` | Card zinc, 1px hairline, xs shadow |
| Nested group | `.panel` or `<Well>` | Hairline only, no fill. Rule: line, not box |
| Labelled fact | `<Fact label>` | Small muted label above a plain sentence. Replaces "Label: text" runs |
| Key number | `<KeyNumber>` and `Stat` | Large tabular figure, quiet note |
| Inset group | `.well` | Mist fill, 1px line |
| Overlay | `.overlay` | Glass panel: chat, menus |
| Secondary control, pill, tab | `.ctl` (+ `.is-selected` or `aria-pressed="true"`) | |
| Primary button | `.btn-primary` | White pill, dark text. One per area |
| Badge | `.chip` | |
| Logo | `<Logo variant tone size tagline />` | horizontal, stacked, mark, wordmark |
| Icon | `<Icon name size label />` | 26 named icons |
| Illustration | `<Illustration name />` | 8 scenes |
| Patterns | `<RingsPattern />`, `<DotGrid />`, `<LensTile />` | |
| Loader | `<AnalysisLoader />`, `<AnimatedMark mode="loop" />` | |

States, defined once in `index.css` and shared by every control:

| State | Treatment |
| --- | --- |
| Default | Card fill, 1px hairline |
| Hover | Line turns white (200ms) |
| Focus | 3px white outline, 3px offset, always visible, wins over utilities |
| Active | Scale 0.97 in 120ms |
| Selected | White-tinted fill, white line |
| Disabled | 55% opacity, not-allowed cursor, `disabled` attribute |
| Loading | Disabled plus the real status text (never a fake percentage) |
| Error | Wine text, `role="alert"`, specific message with a way to recover |

Keyboard: every control is a native `button`, `a`, `input` or `summary`. Tab order follows the visual order. Escape closes the chat and returns focus to its launcher.

## Responsive

Mobile first. Breakpoints use Tailwind's `sm` 640, `md` 768, `lg` 1024. The home layout is one column on phones (headline, upload card, then module cards), two columns from `md`, and the module grid goes 1, 2, 3 columns. Touch targets are at least 44px. Illustrations and patterns scale with their container. Chart controls wrap instead of scrolling sideways. No horizontal page scroll at 320px (tested).

## Accessibility

Automated axe-core scans (WCAG 2 A and AA) run on the home screen, all six module results, the chat panel and the brand sheet, and must show no serious or critical violations (`tests/browser/a11y.spec.ts`). Contrast is also tested in the browser (primary button label 7:1 or better, focus ring 3:1). Decorative icons and illustrations are `aria-hidden`. Color never carries meaning alone (strength meter, direction arrows and status badges all have text). Reduced motion is honored centrally (see 05). Skip link, landmarks and labelled regions are kept.

## Implementing something new

1. Need a color, size or duration? Use a token. If none fits, add it to `tokens/speculara.json`, run `npm run tokens:build`, then use it. Never add a raw value in a component.
2. Reach for `.surface`, `.well`, `.ctl`, `.btn-primary`, `.chip` before writing new styles.
3. New icon: add it to the `ICONS` map in `Icon.tsx`, same grid and stroke.
4. New animation: use the motion tokens and the rules in 05. Add it to the brand sheet.
5. Run `npm run typecheck`, `npm test`, `npm run test:e2e`.

## shadcn-style structure and the Responsive Hero Banner

The project is shadcn compatible without running the shadcn CLI:

| Piece | Where |
| --- | --- |
| Config | `components.json` (style new-york, Tailwind v4, css at `src/index.css`, lucide icons) |
| Alias | `@/*` maps to `src/*` (`tsconfig.json` and `vite.config.ts`) |
| UI components | `src/components/ui/`, the folder the shadcn CLI installs into, so `npx shadcn@latest add <name>` and pasted components land in the right place |
| Class helper | `src/lib/utils.ts` (`cn`, built on `clsx` and `tailwind-merge`) |

The hero (`src/components/ui/responsive-hero-banner.tsx`) started from the supplied template and was reworked on request:

| Template | Now |
| --- | --- |
| Full-screen Unsplash photo | No photo and no third-party image request. A fading dot grid, one soft blue light, and the logo's bars drawn as a blueprint outline |
| Badge, partner row | Removed |
| Instrument Serif headline | Bricolage Grotesque 800, with the last word reflected |
| Centered text over a photo | Two columns that fit one viewport: headline and actions, then the upload card (glass) |
| Mobile toggle with no menu | A real menu (Escape and link choice close it) |
| Link-only actions | Link or button (`onCtaClick`, `onPrimaryClick`, `onSecondaryClick`); the page starts the demo or focuses the upload box |

`aside` takes the content beside the headline. `tests/browser/landing.spec.ts` checks that the first screen fits at 1440x810, 1280x720 and 1024x768.

Chat styles `.ios-sheet` and `.typing-dot` are in `src/index.css`.

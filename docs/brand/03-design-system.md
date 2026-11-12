# 03 Design system

## Where things live

| Path | What |
| --- | --- |
| `tokens/speculara.json` | Source of truth for every token. Run `npm run tokens:build` after editing |
| `src/tokens.css` | Generated Tailwind theme. Never edit by hand (a test checks it is current) |
| `src/index.css` | Surfaces, controls, motion classes and keyframes, all built only from tokens |
| `src/design-system/` | `Logo`, `Icon`, `patterns`, `illustrations`, `AnimatedMark`, `Splash`, `AnalysisLoader`, `motion`, `BrandSheet` |
| `src/assets/branding/logos/` | Static logo family (SVG) |
| `docs/brand/` | This documentation |

## Tokens

Colors are untouched. New and replaced token groups:

| Group | Tokens |
| --- | --- |
| Type | `--text-xs` to `--text-5xl` each with `--line-height`, weights 400 to 700, `--tracking-*` |
| Fonts | `--font-display` (Sora), `--font-sans` (Manrope), `--font-mono` |
| Radius | 4, 6, 8 (lg), 10 (xl, controls), 16 (2xl and 3xl, cards) |
| Border | `--border-width` 1px, `--border-focus-width` 3px |
| Elevation | `--shadow-xs` cards, `--shadow-sm`, `--shadow-md` overlays only (replaces the embossed shadows) |
| Layout | `--layout-app` 1120px, `--layout-reading` 680px, `--layout-gutter` 20px |
| Layers | `--z-header` 20, `--z-overlay` 30, `--z-modal` 40, `--z-toast` 50, `--z-skip` 100 |
| Icons | `--size-icon-sm` 16, md 20, lg 24, xl 32, stroke 1.75 |
| Targets | `--size-target` 44px |
| Motion | `--motion-*` durations, `--ease-*` curves (see 05) |

Spacing uses Tailwind's 4px scale. Roles: control padding 12 to 16, gaps 8 to 12, card padding 20 to 24, section spacing 40 to 64, page gutter 20.

## Shape

Circle and soft rectangle only. Controls 10px, cards 16px, chips and avatars fully round. Surfaces are white with a 1px line (`--color-border-default`) and almost no shadow. Only overlays (chat, menus) use `--shadow-md`.

## Components (classes and React)

| Piece | Class or component | Notes |
| --- | --- | --- |
| Card | `.surface` | White, 1px line, xs shadow |
| Inset group | `.well` | Mist fill, 1px line |
| Overlay | `.overlay` | Chat panel, menus |
| Secondary control, pill, tab | `.ctl` (+ `.is-selected` or `aria-pressed="true"`) | |
| Primary button | `.btn-primary` | One per area |
| Badge | `.chip` | |
| Logo | `<Logo variant tone size tagline />` | horizontal, stacked, mark, wordmark |
| Icon | `<Icon name size label />` | 26 named icons |
| Illustration | `<Illustration name />` | 8 scenes |
| Patterns | `<RingsPattern />`, `<DotGrid />`, `<LensTile />` | |
| Loader | `<AnalysisLoader />`, `<AnimatedMark mode="loop" />` | |

States, defined once in `index.css` and shared by every control:

| State | Treatment |
| --- | --- |
| Default | White fill, 1px line |
| Hover | Line turns ink (200ms) |
| Focus | 3px ink outline, 3px offset, always visible, wins over utilities |
| Active | Scale 0.97 in 120ms |
| Selected | Ink-tinted fill, ink line |
| Disabled | 55% opacity, not-allowed cursor, `disabled` attribute |
| Loading | Disabled plus the real status text (never a fake percentage) |
| Error | Wine text, `role="alert"`, specific message with a way to recover |

Keyboard: every control is a native `button`, `a`, `input` or `summary`. Tab order follows the visual order. Escape closes the chat and returns focus to its launcher.

## Responsive

Mobile first. Breakpoints use Tailwind's `sm` 640, `md` 768, `lg` 1024. The home layout is one column on phones (headline, upload card, then module cards), two columns from `md`, and the module grid goes 1, 2, 3 columns. Touch targets are at least 44px. Illustrations and patterns scale with their container. Chart controls wrap instead of scrolling sideways. No horizontal page scroll at 320px (tested).

## Accessibility

Contrast is tested in the browser (primary button label 7:1 or better, focus ring 3:1). Decorative icons and illustrations are `aria-hidden`. Color never carries meaning alone (strength meter, direction arrows and status badges all have text). Reduced motion is honored centrally (see 05). Skip link, landmarks and labelled regions are kept.

## Implementing something new

1. Need a color, size or duration? Use a token. If none fits, add it to `tokens/speculara.json`, run `npm run tokens:build`, then use it. Never add a raw value in a component.
2. Reach for `.surface`, `.well`, `.ctl`, `.btn-primary`, `.chip` before writing new styles.
3. New icon: add it to the `ICONS` map in `Icon.tsx`, same grid and stroke.
4. New animation: use the motion tokens and the rules in 05. Add it to the brand sheet.
5. Run `npm run typecheck`, `npm test`, `npm run test:e2e`.

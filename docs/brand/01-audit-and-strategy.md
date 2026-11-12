# Speculara brand: Phase 01, audit and strategy

Status: approved and implemented (see 02 to 05). Decisions: colors stay locked, the logo mark was fully remade (two circles and a lens) while the wordmark typography stayed unchanged, Sora and Manrope self-hosted plus a small mono, lucide-react icons, GSAP for sequences, no Lottie, and a global skill after the system is proven. Original proposal below. Work happens on branch `redesign`. Backup: tag `backup-before-redesign-2026-11-12`, branch `backup/before-redesign-2026-11-12`, folder `Speculara-backup-2026-11-12`.

## 1. What the product is

- **Name idea:** "speculum" is Latin for mirror, and "specular" describes light reflecting off a surface. The product holds up a mirror to your marketing numbers.
- **Job:** turn views, saves, comments and sales into a plain-language decision. Upload a file (or, opt-in, analyze a profile on this computer), then read six modules: Predict, Recommend, Charts, Correlation, Sentiment, Demand. A chat answers in everyday words.
- **Users:** marketers and small business owners who are not data people. First audience is the ManilaHack demo, so the first impression must be strong and the first screen must be clear.
- **Promise that must show in the design:** honest. It says what was counted, what is a guess, and that a link between numbers does not prove a cause.

## 2. Audit of the current build

| Area | Finding |
| --- | --- |
| Stack | React 19, Vite 8, Tailwind v4, TypeScript. No router: one page with modules. No animation or icon library. Keep this stack. |
| Structure | `src/App.tsx` is 2,103 lines holding about 30 components. This is the main obstacle to a design system. |
| Tokens | Good base: `tokens/speculara.json` generates `src/tokens.css` with colors, shadows, fonts, motion, one size. Missing: type scale, spacing, radius, z-index, layout, icon sizes, easing set. |
| Color (locked) | ink #29348f, mist #f1f5f9, sky #38bdf8, cream #f9f5f1, wine #8f2934, primary #1e2761, secondary #465468, track, shadow-dark, white. I added one token earlier, `sky-deep` #0284c7, so chart bars reach 3:1 contrast. See decision 1. |
| Type | Sora (display) and Manrope (body), loaded from Google Fonts by CSS import. Sizes are ad hoc: `text-sm` 75 times, `text-xs` 18 times, six heading sizes used once or twice. |
| Shape | Neumorphic: raised and inset shadows, radius from 12px to 32px mixed freely. 44 uses of embossed classes. This is the "ugly" you described. It also lowers contrast between a control and its background. |
| Logo | Six-blade iris inside a ring (ink and sky blades, cream ring, small highlight). Drawn as `Logo()` in App.tsx and as a gradient and drop-shadow version in `deliverables/speculara-logo.svg`. Recognizable but heavy, and there is no small-size or one-color version. Favicon is a PNG. |
| Icons | None as a system. A chat bubble, arrows, a close X and arrow glyphs are inline SVGs with different stroke widths. |
| Motion | Basic and recent: ease-out token, press scale, stagger, bar grow, chat opens from its launcher, skeleton. No signature moment, no page or tab continuity, no real-progress loader. Reduced motion is honored by one global rule. |
| Patterns, illustration | None. Empty and loading states are text and a gray skeleton. |
| Risk | 11 browser spec files with about 228 locator uses depend on visible text and roles. Restyling is safe. Renaming labels or moving structure needs care. |

## 3. Brand strategy

**Positioning.** Speculara is the clear, honest instrument for marketing numbers: it shows you what happened, how sure it is, and one thing to try next.

**Personality.** Lucid, calm, precise, warm. A good optician or a friendly accountant, not a dashboard that shouts.

**Attributes.** Clear, honest, grounded, quietly confident, human.

**Design principles.**
1. Show the number first, then the plain meaning.
2. Say what is measured and what is a guess, always visibly.
3. One thing to do per screen. One primary action.
4. Structure comes from space and thin lines, not from shadows.
5. Motion explains cause and effect, and only after something is real.
6. Recognizable without the logo.

**Visual direction: "optical instrument".** The logo is an aperture. Everything derives from it: circles, concentric rings, six-fold geometry (60 degree and 30 degree angles), thin precise lines, light passing through. Generous white space, one strong ink accent, sky used for data and highlights, wine reserved for caution.

**Shape language.** Circle and soft rectangle only. Radius scale 6, 10, 16 and full. Borders are 1px lines using existing color tokens. Elevation is rare: one subtle shadow for overlays only.

**Typography direction.** Keep Sora for display (geometric, round, matches the iris) and Manrope for text (open and readable). Add a small mono (JetBrains Mono, only for statistics like r and p). Self-host through fontsource, which removes the Google request, speeds first load and avoids layout shift. Tabular numbers everywhere numbers sit in columns. Scale (px): display 56, h1 40, h2 32, h3 24, h4 20, body 16, small 14, caption 12, with weights 400, 500, 600, 700 doing the hierarchy.

**Logo strategy.** Keep the six-blade iris. Redraw it flat (no gradients, no drop shadow) so it holds at 16px and prints in one color. Family: horizontal, stacked, mark, wordmark, mono dark, mono light, reversed, app icon, favicon (simplified to 3 blades plus ring at small sizes), compact, tagline lockup "Honest numbers. Plain words." Clear space is half the mark's width. Minimum size 16px for the mark, 96px for the horizontal lockup. Colors come only from existing tokens.

**Graphic language and patterns.** Three families, no more: (1) concentric rings (lens ripples) for hero and loading, (2) six-fold blade tiling for dividers and covers, (3) fine dot grid behind charts and empty states. All SVG, low opacity, cropped by the container, never behind body text.

**Illustration direction.** Minimal flat geometric: circles, bars, one thin line, two or three palette colors. Motifs: lens, bar stack, connected dots. No text inside artwork. Set of 8: welcome, upload, processing, empty module, success, error, needs more data, chat.

**Iconography.** One set: rounded outline, 24px grid, 1.75px stroke, round caps and joins. Adopt `lucide-react` (ISC license, tree-shaken) wrapped in one `Icon` component, plus 3 custom brand glyphs (aperture, lens ring, focus). About 24 icons, only those the product uses (upload, file, chart, trend, link, comment, heart, bag, search, check, warning, info, close, download, copy, refresh, chat, send, sign-in, lock, play, plus, arrow, menu).

**Motion philosophy: "coming into focus".** Things arrive sharp and decisive, then settle. No bounce in everyday UI. The signature idea is an aperture that opens: the iris blades rotate open to reveal content, and numbers resolve to their value. Principles I will apply, informed by Emil Kowalski's design-engineering guidance and your playbook:
- Custom ease-out curves for entrances, ease-in-out for moves, exits about 20% shorter than entrances.
- Never start from scale(0); start near 0.95 with opacity. Set transform-origin at the trigger.
- Keep UI motion under about 300ms. Press feedback in 100 to 150ms. Stagger 30 to 50ms with a cap.
- Do not animate things people do many times a minute or by keyboard (for example focus movement, typing, tab through fields).
- Animate transform and opacity only. Respect reduced motion with a real alternative (crossfade or instant), not just removal.
- Overshoot easing is allowed only for the logo reveal and the success check, once.
- A result animates only after the operation has really succeeded. The loader shows true stages (reading file, checking columns, calculating) instead of an endless spinner.

**Tooling for motion.** CSS transitions and keyframes for micro-interactions (no library). One animation library for sequences: GSAP (timelines, SVG, scroll-free) for the signature iris, logo reveal and data-resolve sequences. Framer Motion not needed. Lottie not needed because SVG plus GSAP covers it (see decision 4).

**Signature animation, storyboard (1.4s, with static fallback).**
1. 0ms: a thin ring is drawn on a cream field (stroke draw, 300ms, ease-out).
2. 300ms: six blades slide in from the ring edge toward the center, staggered 40ms, ink and sky alternating.
3. 700ms: blades rotate 60 degrees and open to a small aperture (emphasis easing, once).
4. 1000ms: wordmark "Speculara" fades and rises 8px beside the mark.
5. 1400ms: final lockup. Reduced motion shows step 5 immediately.
Reuse: first-load splash, analysis loader (blades open as stages complete), presentation opener.

## 4. Proposed implementation order, adapted to this project

| Phase | What happens | Visible result |
| --- | --- | --- |
| 02 Logo | Flat redraw, full family as SVG files and a `Logo` component, favicon and app icon | Logo sheet |
| 03 and 04 Typography and tokens | Add type, spacing, radius, border, elevation, layout, z-index, easing and duration tokens to the JSON, regenerate CSS | Token page |
| 05 Components | Move shared UI out of App.tsx into `src/design-system/` (Button, Card, Field, Tabs, Badge, Meter, Dialog, Toast, Skeleton, Table), neumorphism removed, every state defined | Component gallery |
| 06 Icons | `Icon` component and the 24-icon set | Icon sheet |
| 07 and 08 Patterns and illustrations | 3 patterns, 8 illustrations as SVG | Applied to hero and empty states |
| 09 Motion | Motion tokens, signature animation, loaders, micro-interactions, tab and result transitions, reduced-motion strategy | Motion spec page |
| 10 and 11 Integration | Restyle every screen mobile-first, keep tests green, update tests that depend on removed styles | Full app |
| 12 QA and docs | Contrast, keyboard, 320px, console, performance, brand guide in `docs/brand/` | Guide and report |

Each phase ends with: what changed, files touched, a screenshot, decisions, what is unfinished, and a full test run.

## 5. Out of scope unless you ask

Marketing videos, social templates, a Lottie export pipeline and print collateral. The presentation opener and slide cover can reuse the logo and pattern files, but I would not build video.

## 6. Decisions needed

1. **Color lock.** Keep every existing color exactly. Keep my added `sky-deep` for chart contrast, or remove it and accept 2:1 bars?
2. **Logo.** Redraw flat but keep the same six-blade idea. Okay?
3. **Fonts and icons.** Sora, Manrope, small mono, self-hosted, plus `lucide-react`. Okay?
4. **"Little files".** I read this as Lottie files. I recommend skipping Lottie, since GSAP and SVG do the job without a runtime. Okay, or did you mean something else?
5. **GSAP.** One new dependency, used only for the signature sequences. Okay?
6. **Global skill.** After this design system is proven on Speculara, I extract it into one personal skill in `~/.claude/skills/` for all projects (your master prompt, the motion rules, GSAP patterns, the audit checklist). Do that at the end of Phase 12?

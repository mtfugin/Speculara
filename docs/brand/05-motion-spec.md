# 05 Motion specification

## Philosophy: coming into focus

Things arrive sharp and decisive, then settle. Nothing bounces in everyday UI. The signature idea is the logo: two circles that drift in and meet, and the lens opens. Numbers and bars resolve to their value. Informed by Emil Kowalski's design-engineering guidance and the project's animation playbook:

- Entrances ease out. Moves between positions ease in and out. Exits are about 20% shorter than entrances.
- Never animate from scale 0. Start near 0.95 with opacity. Put the transform origin at the trigger.
- UI motion stays under about 300ms. Press feedback is 100 to 150ms. Stagger rows 30ms, capped.
- Do not animate things people do many times a minute or by keyboard.
- Only `transform` and `opacity` move. No layout animation, no blur.
- Overshoot easing (`--ease-emphasis`) is allowed only for the logo reveal.
- A result animates only after the operation really succeeded. Waiting states are honest: no fake percentages.

## Tokens (`tokens/speculara.json`)

| Token | Value | Use |
| --- | --- | --- |
| `--motion-instant` | 120ms | Press feedback |
| `--motion-micro` | 200ms | Hover, focus, toggles |
| `--motion-standard` | 280ms | Tabs, reveals |
| `--motion-component` | 380ms | Chat, cards |
| `--motion-page` | 480ms | Page and result changes |
| `--motion-sequence` | 900ms | Multi-step sequences |
| `--motion-brand` | 1400ms | Logo reveal |
| `--motion-ambient` | 2400ms | Loader cycle |
| `--motion-exit` | 160ms | Exits |
| `--motion-stagger` | 30ms | Row delay |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | Moves |
| `--ease-enter` | cubic-bezier(0, 0, 0.2, 1) | Arrivals |
| `--ease-exit` | cubic-bezier(0.4, 0, 1, 1) | Departures |
| `--ease-emphasis` | cubic-bezier(0.34, 1.56, 0.64, 1) | Logo reveal only |
| `--ease-out` | cubic-bezier(0.22, 1, 0.36, 1) | General entrances |

## Tooling

CSS transitions and keyframes handle every micro-interaction (no library). GSAP handles timelines only (logo reveal, loader). It loads on demand as its own 27 kB (gzip) chunk, so it never delays first paint. When the splash will play, the chunk is requested at startup (`preloadMotion`) so the reveal starts on time. Frame by frame check: circles at 0.3s, meeting at 0.8s, lens open by 0.9s, wordmark rising at 1.0s, full lockup by 1.5s.

## Signature animation: logo reveal (1.4s, plus fade out)

Storyboard (`AnimatedMark mode="reveal"`, wrapped by `Splash`):

| Time | Event |
| --- | --- |
| 0.00s | Two circles fade in 9 units apart on the diagonal (ink top left, sky bottom right) |
| 0.10 to 0.65s | They move together, `power3.inOut` |
| 0.62 to 0.76s | Scale to 1.06, `power2.out` |
| 0.76 to 1.06s | Settle to 1.0, `back.out(2.2)` (the one allowed overshoot) |
| 1.00s | Wordmark rises 8px and fades in (380ms, `--ease-enter`) |
| 1.70s | Whole screen fades out in 240ms, then is removed |

The lens cut moves with the circles (mask and clip animate together), so the logo is never distorted. Plays once per browser session, can be skipped with a click, tap or Esc, never plays for reduced motion or automated test browsers (add `?splash=1` to force it).

## Animation catalogue

| Name | Purpose | Trigger | Duration and easing | Reduced motion |
| --- | --- | --- | --- | --- |
| Press | Acknowledge a click | Pointer down on `.ctl` or `.btn-primary` | Scale 0.97, 120ms `--ease-enter` | Instant, no scale |
| Hover and focus | Show interactivity | Hover, keyboard focus | Border color 200ms `--ease-standard` | Instant |
| Result arrive | Show new content | Result renders | Translate 8px and fade, 420ms `--ease-out` | Content simply appears |
| Row stagger | Cohesive list reveal | List mounts | Same as result arrive, delay 30ms x index (max 8) | No delay |
| Bar grow | Data resolves from the baseline | Chart renders | scaleY 0 to 1, 420ms, delay 30ms x index (max 12), transform only | Bars appear at full height |
| Selection pop | Confirm a tab choice | Tab selected | Scale 0.98 to 1, 220ms | None |
| Chat open and close | Spatial continuity with the launcher | Launcher, Esc | In 220ms from 0.95 scale, origin bottom right. Out 160ms | Instant |
| Loader | Honest waiting | File being analyzed | Circles drift apart and back, 2.4s sine cycle | Static mark |
| Logo reveal | Brand moment | First visit per session | See storyboard, 1.4s | Not shown |
| Skeleton pulse | Placeholder shimmer | Content pending | Opacity 0.55 to 1, 1.4s | Static |
| Toast | Confirm a quick action (copy, download, reset) | Action completes | Fades and scales in from 0.96 in 380ms `--ease-enter`, stays 4.5s, then is removed. Bottom left, never steals focus, `role="status"` | Appears instantly |
| Bar value reveal | Exact value on hover | Pointer over a bar | Value label fades in 150ms, bar darkens 10% | Instant |
| Ring drift | Optional ambient backdrop | Reserved | 2.4s linear rotation | Removed |

AI answers show a "Writing an answer" status that changes to "Still working. AI answers can take up to a minute." after 8 seconds. This is text, not a decorative animation.

## Reduced motion strategy (central)

One rule in `src/index.css` under `prefers-reduced-motion: reduce` sets every transition to about 0 duration and removes every keyframe animation. Content then appears in its final state, so every state change stays visible and no function depends on motion. `AnimatedMark` and `Splash` check the preference in JavaScript as well: the mark renders static and the splash is skipped. A browser test covers this.

## Performance and accessibility rules

Animate only `transform` and `opacity`. No animation of large DOM areas. Nothing flashes. No parallax. No continuous motion except the loader while real work is happening. Animation never blocks input: the splash lets keys and clicks through to skip, and the app underneath is ready.

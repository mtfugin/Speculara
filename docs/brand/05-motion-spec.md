# 05 Motion specification

## Philosophy: measure, then reflect

Things arrive decisively and settle. Nothing bounces in everyday UI. The signature idea is the logo: bars rise from the mirror line, then the reflection answers below. Data does the same: bars grow from their baseline, numbers appear when they are real. Principles (Emil Kowalski's guidance and the project playbook):

- Entrances ease out. Exits are about 20% shorter than entrances.
- Never animate from scale 0. Start near 0.95 with opacity. Put the transform origin at the trigger.
- UI motion stays under about 300ms. Press feedback is 100 to 150ms. Stagger rows 30ms, capped.
- Do not animate things people do many times a minute or by keyboard.
- Only `transform` and `opacity` move. No layout animation.
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

## Signature animation: the loading screen (1.5 seconds)

`Splash` plays it on every load. `AnimatedMark mode="reveal"` draws the mark.

| Time | Event |
| --- | --- |
| 0.00s | Black screen |
| 0.08 to 0.7s | The three bars rise from the mirror line, 90ms apart (`power3.out`, 0.5s each) |
| 0.45 to 1.0s | The reflection answers below, same stagger (`power2.out`), fading to 90% |
| 0.85 to 1.17s | The wordmark rises 8px and fades in (320ms `--ease-enter`) |
| 1.25 to 1.50s | The screen fades out (250ms) and is removed at 1.50s |

Click, tap or Esc skips it (it fades in 250ms). It never plays with reduced motion or in automated browsers (add `?splash=1` to force it), and a test measures that it lasts about 1.5 seconds. The loader (`AnimatedMark mode="loop"`) is the same bars breathing like a level meter, shown only while a file is really being analyzed.

## Animation catalogue

| Name | Purpose | Trigger | Duration and easing | Reduced motion |
| --- | --- | --- | --- | --- |
| Press | Acknowledge a click | Pointer down on `.ctl` or `.btn-primary` | Scale 0.97, 120ms `--ease-enter` | Instant, no scale |
| Hover and focus | Show interactivity | Hover, keyboard focus | Border color 200ms `--ease-standard` | Instant |
| Result arrive | Show new content | Result renders | Translate 8px and fade, 420ms `--ease-out` | Content simply appears |
| Row stagger | Cohesive list reveal | List mounts | Same as result arrive, delay 30ms x index (max 8) | No delay |
| Bar grow | Data resolves from the baseline | Chart renders | scaleY 0 to 1, 420ms, delay 30ms x index (max 12), transform only | Bars appear at full height |
| Selection pop | Confirm a tab choice | Tab selected | Scale 0.98 to 1, 220ms | None |
| Chat sheet open and close | Spatial continuity with the launcher | Launcher, Esc | In 220ms from 0.95 scale, origin bottom right. Out 160ms. Messages fade and scale in 380ms | Instant |
| Typing dots | AI answer is being written | AI mode, waiting | Three dots rise 3px in turn, 1.1s loop | Static dots |
| Loader | Honest waiting | File being analyzed | Bars breathe like a level meter, 0.7s sine, mirrored reflection | Static mark |
| Loading screen | Brand moment | Every load | See storyboard, 1.5s | Not shown |
| Skeleton pulse | Placeholder shimmer | Content pending | Opacity 0.55 to 1, 1.4s | Static |
| Toast | Confirm a quick action (copy, download, reset) | Action completes | Fades and scales in from 0.96 in 380ms `--ease-enter`, stays 4.5s, then is removed. Bottom left, never steals focus, `role="status"` | Appears instantly |
| Bar value reveal | Exact value on hover | Pointer over a bar | Value label fades in 150ms, bar darkens 10% | Instant |
| Scroll edges | Text magnifies and ripples like looking through water as it slides out of and into view | Scrolling | Two fixed 112px bands: an SVG displacement lens (a convex magnifier, about 46px push at the very edge, fading inward) with a slow water wobble (14s), then five blur layers from 0.6px to 10px. The top band fades in after 24px of scroll; the bottom band fades out at the end of the page (240ms). The lens needs a Chromium browser; others get the blur only | Lens stays, wobble stops |
| Rolling numbers | Numbers arrive by counting | A key number first scrolls into view | Each digit scrolls two turns of 0 to 9, then settles, 1.25s, 70ms between digits. Real text stays in the page | Final number appears |
| Line flow | Loading screen backdrop | During the 1.5s loading screen | A faint 64px grid; orange and white lines of light glide along grid lines and fade at both ends, about 5x faster than a slow drift | Loading screen is skipped |
| Ring drift | Optional ambient backdrop | Reserved | 2.4s linear rotation | Removed |

AI answers show a "Writing an answer" status that changes to "Still working. AI answers can take up to a minute." after 8 seconds. This is text, not a decorative animation.

## Reduced motion strategy (central)

One rule in `src/index.css` under `prefers-reduced-motion: reduce` sets every transition to about 0 duration and removes every keyframe animation. Content then appears in its final state, so every state change stays visible and no function depends on motion. `AnimatedMark` and `Splash` check the preference in JavaScript as well: the mark renders static and the splash is skipped. A browser test covers this.

## Performance and accessibility rules

Animate only `transform` and `opacity`. No animation of large DOM areas. Nothing flashes. No parallax. No continuous motion except the loader while real work is happening. Animation never blocks input: the splash lets keys and clicks through to skip, and the app underneath is ready.

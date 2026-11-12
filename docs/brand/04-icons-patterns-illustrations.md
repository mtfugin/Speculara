# 04 Icons, patterns, illustrations

## Icons

**Direction.** Rounded outline on a 24px grid, 1.75px stroke, round caps and joins, 2px internal padding. One family only. Lucide (ISC license) supplies the glyphs through a single wrapper, so stroke and size can never drift. One brand glyph, `lens` (two overlapping outlined circles), follows the same rules.

**Implementation.** `src/design-system/Icon.tsx`: `<Icon name="check" size="sm|md|lg|xl" label? />`. Decorative icons are hidden from assistive technology. Pass `label` only when an icon stands alone. Sizes come from `--size-icon-*`.

| Category | Icons in use |
| --- | --- |
| Modules | predict, recommend, charts, correlation, sentiment, demand |
| Actions | upload, download, copy, send, refresh, signin, close, next |
| Content | file |
| Status | check, success, warning, error, info, lock |
| Direction | up, down, flat |
| Conversation | chat |
| Brand | lens |

Only icons the product uses are included. Add more to the `ICONS` map when a screen needs them.

**Interaction.** Press feedback is the control's 0.97 scale, not an icon animation. Direction arrows are static and always paired with words. No icon loops.

## Patterns

All derived from the logo, all SVG, all inherit `currentColor` so they follow the palette.

| Pattern | Geometry | Where |
| --- | --- | --- |
| Rings | 7 concentric circles, 26px spacing, 14% opacity | Home hero backdrop, loading backdrops |
| Dot grid | 1.1px dots every 16px, 35% opacity | Behind charts and empty states |
| Lens tile | Two overlapping circles per 56px cell, 12% opacity | Dividers, covers, presentation backgrounds |

Rules: cropped by the container, never behind body text, never animated except the single ring drift reserved for loading backdrops, hidden under reduced motion.

## Illustrations

**Direction.** Minimal flat geometry: circles, the lens, bars, one thin line. Palette only (ink, sky, track, white, and wine for caution). Shared frame 240 x 160. No text inside artwork. All decorative (`aria-hidden`).

| Name | Used for |
| --- | --- |
| welcome | Onboarding, first screen |
| upload | Upload and drop moments |
| processing | Analysis in progress |
| empty | Nothing here yet |
| success | A completed, verified result |
| error | Something failed, with recovery text beside it |
| needsData | A module that needs more data (in use in every module's empty state) |
| chat | Conversation moments |

Illustrations are components in `src/design-system/illustrations.tsx`. Add new ones to the same file, on the same frame, in the same style.

## Applications

Home hero also shows an "Example of an answer" card (sample bars and one sentence, labelled as sample numbers) so people see the product before they upload. It is decorative and hidden from assistive technology.

Hero (rings), module empty states (needsData), loading (animated mark), file previews and the favicon (logo family), presentation covers (lens tile plus reversed logo). Social templates and video are out of scope.

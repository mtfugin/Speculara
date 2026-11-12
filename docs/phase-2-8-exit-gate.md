# Phase 2.8: Stage 2 exit gate

Checked on commit `cece41b` (branch `redesign`). Gate from the roadmap: a real or clearly labeled dataset run end to end, tests green, demo script written.

## Result: met, with the dataset labeled illustrative

| Check | Result |
| --- | --- |
| Dataset run end to end | Yes, on invented Makati data (27 comments, 4 shops, 4 menu rows). Five agent steps, one dossier. Every output carries the label "illustrative". |
| Backend tests (`unittest discover -s backend/tests`) | 214 passed. This count includes tests from uncommitted work in the folder. |
| App tests (`pytest app/tests`) | 64 passed |
| Unit tests (`npm test`) | 23 passed |
| Collector tests (`npm run collector:test`) | 12 passed |
| Type check (`tsc --noEmit`) | No errors |
| Browser tests (`npx playwright test`), clean committed code in a separate worktree | 72 passed, 0 failed. Includes 7 Opportunity Explorer tests with accessibility checks at 320 and 1280 pixels. |
| Demo script | `docs/sense-demo-script.md` |

## Not clean: the working folder

The same browser suite run against the working folder, with uncommitted edits to `src/App.tsx`, `src/analysis.ts`, `src/polish.ts`, `src/index.css` and others, gave 52 passed and 20 failed. Two examples: the "Profile link" label now matches two elements, and the Sentiment text changed. The committed code passes, so these failures come from that unfinished work. They need to be fixed or the tests updated before that work is committed.

## What the gate does not cover

- No real data was collected. Real collection stays blocked on the privacy checklist in `phase-2-1-scope-and-data.md` (lawyer questions, platform terms, retention).
- Phase 2.1 is not closed for the same reason.
- The map is alphabetical tiles, not geography. Real boundaries need a license check.
- Scoring weights and caps are judgment calls, not calibrated on real data.
- The friction miner can still count one comment under two frictions when it really shows two (for example price and slow service). A question that names a specific need ("meron bang oat milk?") is now counted once, as that need, not also as availability. The map counts a comment once; the scorer counts observations.
- Only compatibility, affordability and availability can be checked against menus and hours. Five other frictions are reported as demand only.
- The "agents" are plain code, not language models.
- Agent-written code (friction mining, scoring) was checked by running its tests, not read line by line.

## Sign-off

- [ ] Owner has reviewed the Opportunity Explorer and the demo script.
- [ ] Owner accepts the illustrative-only result for Stage 2, or sets a date for the privacy review.

# Phase 1.1: collector audit

Status: offline audit done. Live TikTok run done (below). Instagram and Facebook not run yet.

## Offline findings (no network, no sign-in)
- The collector is a Node worker (`integrations/socialmonitor/worker.mjs`, Playwright) started by `backend/app/collector.py`. Actions: `login`, `collect`, `smoke`, `cancel`, `finish_login`.
- `npm run collector:test`: 12 of 12 pass. These use fake browsers, so they prove the control flow, not the live pages.
- The collector's own dependencies are **not installed** on this machine (`integrations/socialmonitor/node_modules` is absent, so `status().installed` is false). Needs `npm run collector:setup` then `npm run collector:browser` (downloads Chromium).
- `backend/app/tests/test_collector.py` cannot run here: `pytest` is missing from the venv, so that second backend suite (`backend/app`) has never been part of our test runs. Fix in phase 1.4.
- Platform behavior in code: Facebook refuses to run without sign-in. Instagram works signed out for public counts but comment text needs sign-in. TikTok is collected signed out. Limit is 5 to 40 posts (default 20), up to 8 comments per post, 180 s collection timeout.

## Problems already visible in the code (to fix in 1.2 and 1.3)
1. `normalize()` writes unknown likes, comments, shares and views as `0` and only lists them in `unavailable_metrics`. Zeros can leak into totals, deltas and charts. Unknown must stay blank.
2. There is no per-row provenance (collected-at, method, completeness). Only a profile-level note exists.
3. Posts that fail to parse are counted in a note but their reason is lost.
4. All failures after a timeout surface as one generic message; sign-in expired, private account, rate limit and layout change are not told apart.
5. The two backends (`backend/main.py` and `backend/app`) overlap; confirm which one serves the collector before hardening.

## Live audit checklist (run once per platform, by hand, with consent)
Use only an account the person owns or has permission to analyze.

| Check | Instagram | Facebook | TikTok |
| --- | --- | --- | --- |
| Setup commands run, `status().installed` true | | | |
| Sign-in window opens and closes cleanly | | n/a | n/a |
| Public profile returns posts signed out | | expected to refuse | |
| Posts returned with dates, captions, type | | | |
| Likes, comments, shares, views present or blank | | | |
| Comment text returned (count, authors, links) | | | |
| Cancel works mid-collection | | | |
| Private or missing profile gives a clear error | | | |
| Run time and post count reached | | | |
| Anything the platform's rules disallow | | | |

Record results and screenshots here before starting phase 1.2. Do not rotate accounts, solve CAPTCHAs or work around blocks.

## Live result: TikTok, public company account, signed out (run 1)
Setup: `npm run collector:setup` and `collector:browser` installed; browser smoke test passed. One collection, limit 5, no sign-in.

| Check | Result |
| --- | --- |
| Setup, `status().installed` | Pass |
| Posts returned | 5 of 5 requested, in 36 seconds |
| Dates, captions, type | Present. Types seen: video and photo. Dates look current |
| Likes, comments, shares, views | Present on all 3 posts inspected (for example 836 likes, 134 comments, 25 shares, 24.6K views) |
| Comment text | Returned: 35 to 44 comment rows per post on the 3 posts inspected, signed out |
| Cancel mid-collection | Not tested |
| Private or missing profile error | Not tested |
| Blocks, challenges | None seen in this run |

Notes:
- The run printed a Unicode crash only in my test printout (Windows console encoding), not in the collector. Captions contain non-ASCII characters (a curly apostrophe), so the app must keep UTF-8 end to end; check in 1.4.
- The worker returns up to about 44 comments per post, but `normalize()` keeps only 8 per post. Decide in 1.3 whether 8 is enough for friction mining in stage 2.
- Thumbnail URLs carry signed, expiring tokens. Do not store them as long-lived data.
- Only 3 of 5 posts were inspected in this printout; the rest were not logged. Re-run with a saved fixture in 1.4.

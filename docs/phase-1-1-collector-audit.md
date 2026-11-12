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
| Cancel mid-collection | Works: cancelled at 12 s, finished at 24.6 s, collector free afterwards. See notes |
| Private or missing profile error | Missing profile: fails in about 10 s with 503 "did not load". Private profile not tested (no private account available) |
| Blocks, challenges | None seen in this run |

Notes:
- The run printed a Unicode crash only in my test printout (Windows console encoding), not in the collector. Captions contain non-ASCII characters (a curly apostrophe), so the app must keep UTF-8 end to end; check in 1.4.
- The worker returns up to about 44 comments per post, but `normalize()` keeps only 8 per post. Decide in 1.3 whether 8 is enough for friction mining in stage 2.
- Thumbnail URLs carry signed, expiring tokens. Do not store them as long-lived data.
- Only 3 of 5 posts were inspected in this printout; the rest were not logged. Re-run with a saved fixture in 1.4.

## Live result: cancel and error cases (TikTok, run 2)
| Case | Result |
| --- | --- |
| Link to another site | Rejected before any browser starts, clear message |
| Link to a single video | Rejected, message tells the person to paste the profile link |
| Empty input | Rejected, clear message |
| Profile that does not exist | `CollectorError`, status 503, message "the profile @name did not load" after about 10 s |
| Cancel while collecting | Cancel call returned `cancelled: true`; the collection then raised "Collection cancelled." |
| Busy flag and progress after cancel and after errors | Reset correctly (not busy, "Ready to collect."); a new run started right after |

Problems to fix in 1.2:
1. A missing profile returns 503 (server unavailable). It should be a 404 style "profile not found or private", in plain words. Private and missing cannot be told apart yet.
2. A cancel is reported as an error (503 "Collection cancelled."). It should be its own non-error outcome, and the UI should not show a failure.
3. The cancel call blocked for about 12 seconds before returning, because it waits up to 12 s for the worker to stop. The UI needs to show "Cancelling" meanwhile.
4. Checked: the "Please wait" message is TikTok's own script check. The collector first asks from Node, and when TikTok answers with that page it opens a normal logged-out browser page, which runs the check by itself (`vendor/collect/tiktok.ts`). A captcha is not solved: the code throws a `Challenge` error and stops. That is acceptable. Keep it that way, and keep a test that a captcha stops the run.

Still untested: private profile, expired Instagram sign-in, rate limiting, TikTok layout change.

## Phase 1.2 fixes (done, checked live on TikTok)
- Worker errors are sorted into kinds with plain messages and honest statuses (`classify_error` in `backend/app/collector.py`): not found or private (404), sign-in needed (401), rate limited (429), platform check or captcha (403), cancelled (409), timeout (504), anything else (502). Missing profile now returns 404, not 503.
- Cancel returns in at most 3 seconds with "Cancelling. The browser is closing." and then closes only this worker's browser if it has not stopped within about 7 more seconds. Live: cancel at 12 s ended the run at 22.7 s (before the first fix, a plain cancel took 90 s).
- Still not covered: telling private from missing (the page looks the same signed out), an expired Instagram session, and a TikTok layout change. These need Instagram and Facebook runs and a recorded fixture (1.4).
- Backend tests: 101 pass (3 new for error kinds, 404 on a missing profile, and fast cancel).

## Phase 1.3: provenance (done)
- Unknown metrics were already blank in the analysis table (`posts_to_frame`); a stale note said they use zero placeholders and was corrected. An observed zero stays a real zero.
- Each collected post now records `collected_at`, `method` ("playwright browser, signed in or out"), `observed_metrics` and `comments_seen` (comment rows read before the cap of 8 per post).
- `/api/profile/analyze` returns a `provenance` block: source, handle, collector, method, collected-at, post count, observed versus blank per metric, comments read versus kept, and `inferred: false`.
- Collected values are only observed values. Nothing in this path is model inferred; any later inferred field must be marked as such.
- Not done: showing the provenance in the screen (a small "Where this came from" panel) and the comment cap decision for SENSE. Both go to 1.6 and stage 2.

## Phase 1.4: collector test harness (done)
- Fixtures in `backend/tests/fixtures/` follow the real worker output shape captured from a live TikTok run, with invented text and handles (no real people or comments are stored). They cover: non-ASCII captions, a duplicate post, a bad date, a post with no counts, an observed zero, comment text over the cap, and an Instagram signed-out page.
- Tests run them through `normalize` and through `/api/profile/analyze` with no network. Backend suite: 111 tests pass.
- The second backend suite (`backend/app`) needs the extras: `cd backend` then `python -m pytest app/tests` in an environment with `requirements-extras.txt`. 63 tests pass there. It is not part of the default `unittest` run; decide in 1.7 whether to add it to the check.
- Opt-in live check: `SPECULARA_LIVE_URL=<profile> npm run collector:live`. It does nothing without the variable, prints counts and timing only, and saves nothing. Live result on the TikTok company page: 20 posts in 90 s, all four counts observed on every post, 902 comment rows read (160 kept after the cap of 8 per post).
- Not covered by fixtures: the Node parsing of raw TikTok and Instagram pages (needs recorded pages, which hold third party data); a captcha stopping the run; a layout change. The Node worker tests (12) still cover control flow.

## Phase 1.5: Measure correctness (done)
- **Bug found and fixed:** on a collected profile, the table has one row per post plus one text-only row per comment. Comment rows have blank counts, so the 7-day comparison said "Missing likes values" and the forecast was unavailable for every collected profile, and each metric warned about "missing values" that were only comment rows. `analyze()` now leaves text-only rows (text present, every metric blank) out of the metric checks. Rows with text and counts, and rows with nothing, behave as before.
- **Hand-checked sample** (`backend/tests/test_measure_verification.py`, worked out in the file header): 30 days of one post a day through the same path a collected profile takes. Totals 5325 views, 765 likes, 60 comments. Latest 7 days against the prior 7: views 1645 vs 1400 (+17.5%), likes 259 vs 210 (+23.33%), comments 14 vs 14 (0%). Views and likes rise in step, so r = 1 and rho = 1 with n = 30. Forecast follows the straight line: 255 to 285 for 2026-10-01 to 2026-10-07. A separate worked example gives r = 6 / sqrt(60) = 0.7746 for n = 5, flagged as a small sample.
- **Honest blanks:** one post with no counts is left out of totals, reported as missing (not zero), and blocks the 7-day comparison and forecast with a reason. With only 10 days, both say they need 14 calendar dates.
- The screen already shows each reason and the "exploratory small sample" label; no screen change needed.
- Suites: backend 119, unit 23, browser 56, all pass.
- Not checked by hand yet: ratios (sales and saves per view) and category and post rankings. Collected profiles have no sales or saves, so they only apply to uploads; the existing tests cover their rules.

## Phase 1.6: collection experience (done)
- While a profile is being collected, the panel shows what the collector is doing (it asks the server every 1.5 s) and a Cancel button. The progress line is scrolled into view so it is not under the bottom edge blur.
- Cancel shows "Cancelling. The browser is closing…" and then "Cancelled. Nothing was kept." It is not treated as a failure and offers no retry.
- After a failure the panel shows the plain message plus **Try again**. A timeout (or a 504) also offers **Try with fewer posts (10)**. A wrong link, a sign-in problem or a profile that was not found shows the message only, since a retry would not help.
- `/api/profile/analyze` accepts `limit` (5 to 40 posts, default 20); anything else is a 422.
- Checked live: real TikTok collection from the screen, progress text shown, Cancel worked end to end.
- Partial results are not possible yet: the worker returns posts only when it finishes, so a cancelled or timed out run keeps nothing. Fewer posts is the way to a result sooner. Streaming partial posts would need a worker change; decide in 1.7 or leave for later.
- Tests: 120 backend, 23 unit, 59 browser (3 new for progress and Cancel, timeout retry, not-found with no retry).

## Phase 1.7: Stage 1 exit gate
Real end-to-end run from the app (TikTok company page, signed out): Analyze this profile, then Use this dataset. 10 posts in 51 seconds became 90 rows (10 post rows and 80 kept comment rows), 3 metrics, all six modules open with no horizontal overflow. Totals 6,098,200 views, 132,151 likes, 31,206 comments. Weekly comparison and forecast correctly say they need two full weeks of dated posts, because the posts are not daily.

Changes made during the gate:
- The app now collects 10 posts by default (the server default is still 20) because 20-post runs took from 90 seconds to over four minutes on the same day. The smaller retry is 5 posts.
- The tests for this changed with it (limits 10 then 5).

Known issues carried forward (not blockers for Stage 2 planning):
1. A 20-post run once ran well past the 210-second limit the server sets, so the timeout may not always stop a slow run. Needs a reproduction and a forced stop of the browser tree.
2. The summary line says "Uploaded dataset: tiktok.com/@tiktok" for collected data. It should say it was collected, with the time and method from the provenance block, and the "Collected from a public TikTok profile" note is not visible without opening About this data.
3. No partial results: a cancelled or timed out run keeps nothing.
4. Instagram and Facebook collectors have not been run live; private versus missing profiles cannot be told apart signed out; raw page parsing and a layout change have no recorded fixtures.
5. The `backend/app` suite is run by hand (needs the extras), not by `npm run check`.
6. Kept comments are capped at 8 per post while the page returns about 40. Revisit for friction mining in Stage 2.

Decision on the `backend/app` suite: leave it out of the default check (it needs scikit-learn, statsmodels and supabase) and document the command in the README. Revisit if that API is kept.

## After the exit gate: collected data screens (done)
Feedback from a real run drove a screen pass. What changed:
- **Upload preview** is a card with the profile picture, name, followers and a source line ("Collected from TikTok @handle, signed out, time"), a strip of posts, comments and missing counts, the latest posts as cards (thumbnail, date, category, views, likes, comments) instead of a wide table (no sideways scrolling), and a clear row of actions: Use this dataset, Download data (CSV), Download profile picture, Cancel.
- **Data**: comment rows now carry the post's category; up to 40 comments are kept per post (it was 8), so sentiment and demand read far more of the conversation; video thumbnails and the profile card (name, picture, followers) come with the analysis; the picture is fetched once by the server from the platform's own picture hosts and is never stored.
- **Counts** show Views, Likes, Comments, Saves, Questions and Sales as tiles with an icon, one fixed value size and the same position for label, value and note. "Not Supplied" is the same size as a number. A value wider than its tile is cut and slides sideways on hover or focus.
- **Posts in this analysis** is a gallery of video thumbnails with views, opening each post in a new tab.
- **Sticky module rail**: once the question cards scroll out of view, the six modules stay reachable as icons at the side.
- **Unique cards**: each module has its own header colour and layout. Predict leads with a large estimate, Sentiment is one stacked bar plus sized word chips, Demand shows how much of the conversation is asking, Recommend keeps numbered steps.
- **Emphasis**: numbers and the phrases a person must not miss (needs more data, does not, estimate, early finding) are bold and underlined.
- **Scrolling**: the edge blur cost most of the scroll time. It now uses two blur layers, still noise instead of an animated one, and the water lens rests while the page is moving. Frame time while scrolling fell from about 122 ms to 50 ms in the same test machine.
- Tests: 124 backend, 23 unit, 69 browser including new ones for the preview, downloads, tiles, the rail and scroll behaviour.
- Answer to "is sentiment from only one video?": no. It reads every kept comment from every collected post (up to 40 per post).

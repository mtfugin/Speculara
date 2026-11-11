# Speculara

ManilaHack 2026, Bucket 05: Measure. Turn views, saves, and sales into the next decision.

This is the existing Figma Make prototype, upgraded in place. Its React shell, six modules, chat, logo, colors and neumorphic styling remain. Figma-specific runtime plugins and simulated results are removed. Python dependencies are pinned through `backend/requirements-lock.txt`. Original App and Vite configuration are preserved in `docs/baseline/` for design comparison.

## Run locally (Windows PowerShell)

Requires Node 22.12+ (Node 24 recommended) and Python 3.12.

```powershell
npm ci
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt
.venv/Scripts/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Keep the backend running. In another terminal, use the existing Vite server if available; otherwise:

```powershell
npm run dev
```

Open http://localhost:8443. Vite proxies `/api` to port 8000. Upload CSV/XLSX, review detected columns and module availability, then choose **Use this dataset**. Cancel keeps existing results. **Try synthetic demo data** opens clearly labeled fictional records immediately. No API keys, database, social login or LLM are required.

## Data contract

CSV must be UTF-8. XLSX uses the first worksheet and cached cell values. Export formulas as values first. Limits: 5 MB upload, 30 MB expanded workbook, 20,000 data rows, 50 columns.

Use one row per observation. Supported optional columns:

| Column | Meaning |
| --- | --- |
| date | ISO date, recommended `YYYY-MM-DD`; dates aggregate in UTC |
| post_id | Observation/post identifier |
| post_url | Optional supplied HTTP(S) post link; never fetched or treated as a connected account |
| category, region | Group labels |
| views, likes, saves, comments, sales | Finite nonnegative counts; blanks mean unknown |
| text | Individual comment/review, used for heuristic sentiment and inquiry signals |

At least one numeric metric or `text` is required. Header case and whitespace normalize automatically. Aliases include impressions/views, orders/sales, purchases/sales, post_date/date, comment_text/text and post_type/category. Duplicate normalized headers are rejected. Invalid numeric values reject the file. Duplicate rows are retained with a warning.

Never repeat full post totals for each individual comment. Use the separate text demo to show sentiment without double-counting metrics. Unknown columns are listed but not analyzed. No currency or percent interpretation is inferred.

## Modules

- **Predict:** seven-day selected-baseline projection for sales, otherwise the first supported metric by priority. Requires 14 to 365 complete consecutive daily observations. A three-day holdout MAE reports error in metric units. No accuracy percentage, confidence band, trend lifespan or seasonal model.
- **Recommend:** measured evidence paired with a proposed test. No guaranteed lift, collaborative filtering or basket mining.
- **Charts:** real totals and grouped sums, paginated charts and exact data tables.
- **Correlation:** Pearson and Spearman coefficients, pair counts and unadjusted p-values. Constant columns and insufficient pairs are excluded.
- **Sentiment:** limited English/Filipino lexicon, keyword occurrences and explicit caveats. Not validated NLP or emotion detection.
- **Demand:** observed sales, saves and text question/request counts. No inferred market size or unique buyers.

Ask Speculara routes supported questions to the current result using fixed rules. Unsupported questions return a scope explanation. Changing or clearing data resets chat. Reports download as Markdown, including findings, limitations and full results; JSON export is also available.

## Optional AI answers (off by default)

The chat uses fixed rules and sends nothing anywhere. A server owner can add AI-written answers, but both steps are required:

1. On the backend set `ENABLE_AI_CHAT=1` and `GEMMA_API_KEY=<your Google AI Studio key>` (optionally `GEMMA_MODEL`). Keep the key in the backend environment only, never in the front end or in git.
2. In the chat, the person ticks **Use AI answers**. It starts off every time, and the chat says what is sent.

Only a summary goes to Google: totals, relationships, forecast, counts and recommendations. Uploaded rows, the preview table, post links and comment text are never sent (`backend/ai_chat.py`, covered by `backend/tests/test_ai_chat.py`). If the AI call fails, the chat falls back to the built-in answer. Without the two settings the tick box does not appear and `/api/ai/chat` returns 403.

## Optional profile link analysis (off by default, this computer only)

An owner can analyze an Instagram, Facebook or TikTok profile instead of uploading a file. It drives a browser on the same computer, so it is meant for a local run, and it must respect each platform's rules and the account owner's consent.

1. One-time setup: `npm run collector:setup`, then `npm run collector:browser` if Chrome is not installed.
2. Start the backend with `ENABLE_PROFILE_COLLECTOR=1`. Requests from other computers are refused.
3. In the app, open **Analyze a profile link**, tick the permission box, sign in inside the browser window that opens (Instagram and Facebook), click **Done signing in**, paste the profile link and analyze.

Collected posts become the same table an upload produces (one row per post, one row per comment with only its text, unknown metrics left blank), so every module, chart, report and the chat work unchanged. Nothing is saved by Speculara, and the sign-in lives in a browser profile under `backend/.socialmonitor`, which is git-ignored. Tests fake the collector; the live collectors have not been exercised in this repository's tests.

The imported `backend/app` API (its own Gemma research, Supabase history and its own endpoints) is still separate and is not started by default; only its collector is reused above. See `backend/README.md` and `backend/requirements-extras.txt`.

## Verify

```powershell
.venv/Scripts/python -m unittest discover -s backend/tests -v
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests require both local servers running.

Deployment references: [Netlify Vite guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/) and [Render FastAPI guide](https://render.com/docs/deploy-fastapi).

Demo data regeneration: `.venv/Scripts/python backend/generate_demo.py`. All demo records are fictional and labeled. Files live in `public/demo/`.

## Deployment preparation

Configuration is supplied; nothing is deployed automatically.

1. Render: use `render.yaml` or create a Python web service from this folder. Build: `pip install -r backend/requirements.txt`. Start: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. Health: `/api/health`.
2. Set Render `ALLOWED_ORIGINS` to your exact Netlify HTTPS origin. Multiple origins may be comma separated. Add preview origins explicitly when needed.
3. Netlify: use `netlify.toml`, publish `dist`, Node 24. Set `VITE_API_BASE_URL` to the actual Render HTTPS origin before building. This is public configuration, not a secret.
4. Check backend health and browser CORS preflight. Upload both demo formats, inspect all modules, ask chat and download a report. Verify a malformed file fails clearly.
5. Free Render services can sleep. Warm the health endpoint before presenting. The UI times out after 60 seconds and permits retry.

Do not ship the frontend without a working production API URL. The local Vite proxy does not exist in the production static bundle. Uploaded bodies are parsed only in server memory; there is no application disk persistence or server-side history, and no external AI call unless AI answers are switched on (see Optional AI answers). The response includes up to five bounded sample rows for browser preview. Hosting platform access logs still exist. This MVP has no authentication or distributed rate limiting and is intended for a bounded hackathon demonstration.

See `docs/architecture.md`, `docs/mvp-scope.md`, `docs/team-workflow.md`, and `docs/demo-script.md`.


## Schema 2 calculation contract

Only schema_version 2 is consumed. Available sections use reason=null; explanations use notes. Unavailable sections carry a reason. Unknown numeric values remain null.

Sales/view and saves/view percentages divide paired sums, not mean row percentages. Both values must be known; excluded rows, complete pairs and known zero-view rows are disclosed. Zero-view rows remain in overall sums; zero summed views make the ratio unavailable. Rates above 100% remain visible with a scope warning. These are proxies, not attributed conversion.

Category rankings require three complete positive-view rows and 1,000 views; unique nonblank post IDs require at least 100 views per complete post. Repeated IDs disable post rankings because snapshots and increments cannot be distinguished. Lists return at most ten, descending rate then ascending label. Thresholds are product heuristics, not significance guarantees. Category experiments need two eligible categories and a strict winner. The post experiment needs four eligible unique posts, 1,000 summed views, at least the linear-interpolated 75th percentile exposure, and rate below the overall paired rate; highest views then ID wins. No causal effectiveness or uplift is inferred.

Demand compares the latest seven UTC calendar dates with the preceding seven, anchored on the latest valid date. Exact start/end dates, totals, absolute count change and percent change are shown. All 14 dates must be represented; invalid dates block membership and missing counts within windows block that metric. Older missing values outside windows do not block it. Missing dates are not zeros. A zero prior total leaves percentage change null with an explanation, including zero-to-zero.

Pearson r/p and Spearman rho/p use the same nonconstant complete pairs (minimum three). n<10 is exploratory small sample. P-values are unadjusted and assume independent rows; no causal claim. Spearman uses SciPy default tied ranks.

Forecasts require 14–365 consecutive complete UTC daily dates, no invalid dates; priority sales, views, saves, likes, comments. Linear (clipped at zero) and last-observed-value baselines train before the same final three dates. Lowest unrounded MAE selects the model; ties choose last_value. Both errors in target count units, holdout dates and selected model are shown. Winner refits all days for seven projected dates. This is one small holdout comparison, not validated generalization performance. No accuracy percentage, confidence band, seasonality or trend lifespan is claimed.

Sentiment is unchanged: small English/Filipino lexicon, negation treated neutral; unsupported sarcasm, context and validated multilingual NLP. Counts/keywords are heuristic observations; question/request rows may overlap and are not unique buyers. No raw representative comments or new NLP dependency.

Six modules, deterministic chat and full Markdown/JSON exports share computed results. Specific growth, rate and ranking intents precede generic forecast/trend/next/sales routing. Text-only uploads show explicit unavailable numeric sections. Processing stays stateless and in memory; upload limits remain 5 MB, 20,000 rows, 50 columns and 30 MB expanded XLSX. Production hardening and NLP evaluation remain deferred.

## Repository contents

Local-only assistant records, Figma export metadata, dependencies, build output and private environment files are excluded from GitHub. `.env.example` contains public configuration placeholders. Demo CSV/XLSX files and screenshots contain synthetic data only.

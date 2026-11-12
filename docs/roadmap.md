# Roadmap: two stages

Stage 1 makes Measure real. Stage 2 builds SENSE on top of it. Stage 2 does not start until Stage 1's exit gate is met, because SENSE reads the same data pipeline.

Starting point (already in the repo): upload and demo data, analysis modules, charts, chat with optional AI answers, and a local-only profile collector (`backend/app/collector.py`, driven by Playwright) whose live collectors have never been exercised in tests.

## Stage 1: Measure, with Playwright collection

Goal: a person can point Speculara at an account they own or are permitted to analyze, get real posts and comments, and see numbers they can trust and trace.

| Phase | Name | Done when |
| --- | --- | --- |
| 1.1 | Collector audit | Each platform collector (Instagram, Facebook, TikTok) is run live once, by hand, with the owner's consent. A written list of what works, what breaks and what each platform's rules allow. |
| 1.2 | Collector hardening | Selectors and waits are fixed from 1.1. Clear errors for sign-in expired, private account, rate limit and layout change. No account rotation, no CAPTCHA bypass, no access-control circumvention. |
| 1.3 | Provenance | Every row keeps source, collected-at, collection method, completeness and whether a value was observed or inferred. Unknown metrics stay blank, never zero. |
| 1.4 | Collector test harness | Recorded page fixtures run through the real parsing code in CI (no network). One opt-in live smoke test, skipped by default. |
| 1.5 | Measure correctness | Every metric, delta, forecast and correlation is checked against a hand-computed sample. Small-sample and missing-data cases say so on screen. |
| 1.6 | Measure experience | Collection progress, cancel, retry and partial results in the UI. Chat and reports use the collected table unchanged. |
| 1.7 | Exit gate | Full suites green, one real account analyzed end to end with screenshots, README and verification docs updated, redesign merged into main. |

## Stage 2: SENSE (opportunity discovery)

Goal: one complete workflow, for one industry in one city, that ends in an evidence-backed opportunity dossier and can say "insufficient evidence".

| Phase | Name | Done when |
| --- | --- | --- |
| 2.1 | Scope and data decision (in progress, see `phase-2-1-scope-and-data.md`) | Industry and city chosen (decided: coffee shops, all of Makati City). Data sources agreed and permitted, including a check against NPC Advisory No. 2026-01 on scraping public personal data. Data labeled real or illustrative. |
| 2.2 | Evidence model | Observations carry demand or supply type, location, source, confidence and provenance. Observed and model-inferred are stored apart. |
| 2.3 | Friction mining | Comments classified into discovery, affordability, availability, accessibility, trust, quality, experience and compatibility, in English and Filipino languages, each with its original quote. |
| 2.4 | Supply side | Business listings, menus, hours and prices loaded, each with its own confidence. A missing listing is never treated as proof of no supply. |
| 2.5 | Demand ghosts | Demand themes matched against supply, producing candidate gaps with separate demand and supply confidence. |
| 2.6 | Opportunity scoring | Explainable score from intensity, growth, pain, supply, persistence and independent sources, with stated normalization and missing-data rules. |
| 2.7 | Dossier and validation | Ranked dossier with evidence, uncertainty and one suggested validation test. Opportunity Explorer screen built in the current design system. |
| 2.8 | Exit gate | Real or clearly labeled dataset run end to end, tests green, demo script written. |

Later, only after 2.8: Cultural Radar, Market Contradiction Engine, Opportunity Genome (knowledge graph), Validation Lab.

## Rules for both stages
- Respect each platform's terms, privacy and access limits.
- Separate observed from inferred, interest from purchase intent, correlation from cause.
- One phase at a time: build, test, commit, then move on.

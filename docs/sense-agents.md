# SENSE agents and the orchestrator

SENSE runs as eight named steps. A planner picks the next step from the steps that are ready. Two steps can use a language model. Everything works without one.

## The steps

| Step | Agent | Uses a model? | What it does |
| --- | --- | --- | --- |
| 1 | friction miner | no | Sorts comments into eight frictions with a word list. Keeps the original quote. |
| 2 | supply loader | no | Turns shop and menu rows into supply evidence. |
| 3 | model reader | **optional** | Second opinion on comments the word list could not sort. |
| 4 | ghost finder | no | Matches demand against supply, with separate confidence for each. |
| 5 | scorer | no | Explainable score per barangay and need, or "insufficient evidence". |
| 6 | dossier writer | no | Ranks, attaches quotes and doubts, suggests one test. |
| 7 | model narrator | **optional** | A short plain summary per ranked opportunity. |
| 8 | critic | no | Plain-code review of the whole run. Always last. |

## The planner

- **Rule planner:** a fixed order. Always available.
- **Model planner:** asks a model which ready step to run next. It sees step names and counts, never comment text. If its answer is not a ready step, the rule planner decides and the trace says so.
- **What no planner can do:** invent a step, repeat one, skip a required one, or run the critic early. Every step runs at most once.

## What the model may and may not do

| Rule | How it is enforced |
| --- | --- |
| Real data never goes to a model | `check_policy` in `llm.py` refuses before any call, unless `SENSE_ALLOW_MODEL_ON_REAL=1`. Until the privacy review is done, leave that off. |
| Contact details are removed before sending | `scrub` removes emails and phone numbers. |
| Comments are data, not instructions | Sent as JSON. The model has no tools. Every answer is validated. |
| Model answers are never repaired | An invalid answer is dropped. An invented category is not mapped to a real one. |
| Quotes are always the original comment | The reader never stores model text as a quote. |
| Model readings are labeled and kept apart | Stored as inferred, low confidence. The scorer ignores them. |
| Summaries must match the facts | Rejected if they contain a number that is not the score, omit the barangay, call a non-gap a gap, or overstate ("proven"). A rejected summary is replaced by fixed wording. |
| The critic has the last word | It checks quotes against the original comments, labels, supply honesty and every model summary, and replaces what fails. |

## Turning it on

- **Off by default.** The Explorer asks for the model only with `?model=on` (for example `/sense.html?size=large&model=on`).
- It runs only if the server has `ENABLE_AI_CHAT=1` and `GEMMA_API_KEY` (the same setup as the chat).
- It uses real model calls, so each run costs a few calls (one reading call, up to 8 summaries, and a few planner calls).
- With no model, a failed call or a policy block, the same steps run without it and the trace says why.

## Tests

`backend/tests/test_sense_agents.py` uses a scripted fake model, so tests never call a real model. It covers the policy gate, every kind of bad model answer, the planner limits, fallbacks, and the critic.

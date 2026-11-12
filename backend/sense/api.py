"""SENSE API. Serves a run on invented Makati data only.

Real data stays out of this endpoint until the privacy checklist in docs/phase-2-1-scope-and-data.md
is closed. Everything returned is labeled illustrative and says so.
"""
from dataclasses import asdict
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Query

from backend import supply
from backend.sense.demo_data import illustrative_comments
from backend.sense.llm import default_client
from backend.sense.orchestrator import run_agents
from backend.sense.pipeline import SenseRun
from backend.supply import MAKATI_BARANGAYS

router = APIRouter()
FIXTURES = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
BARANGAYS = sorted(MAKATI_BARANGAYS)


def _display(name: str) -> str:
    return " ".join(part.capitalize() if part not in ("del", "de") else part for part in name.replace("-", "- ").split()).replace("- ", "-")


def barangay_map(run: SenseRun) -> list[dict]:
    """One row per Makati barangay. A barangay with no evidence says so: no data is not zero demand."""
    demand, shops, gaps = {}, {}, {}
    comments: dict[str, set] = {}
    for obs in run.store.select(kind="demand"):
        # one comment can show two needs (id d-<comment>-<friction>); count the comment once
        base = obs.id[:-len(obs.theme) - 1] if obs.id.endswith("-" + obs.theme) else obs.id
        comments.setdefault(obs.barangay.casefold(), set()).add(base)
    demand = {key: len(ids) for key, ids in comments.items()}
    for obs in run.store.select(kind="supply"):
        if obs.shop_id:
            shops.setdefault(obs.barangay.casefold(), set()).add(obs.shop_id)
    for opp in run.dossier["opportunities"]:
        if opp.verdict == "candidate gap":
            gaps[opp.barangay.casefold()] = gaps.get(opp.barangay.casefold(), 0) + 1
    rows = []
    for key in BARANGAYS:
        d, s, g = demand.get(key, 0), len(shops.get(key, ())), gaps.get(key, 0)
        rows.append({"barangay": _display(key), "demand": d, "shops": s, "gaps": g, "has_data": bool(d or s)})
    return rows


def sense_payload(today: date, size: str = "small", use_model: bool = False, client=None) -> dict:
    """use_model asks for the model agents. They run only if a model is configured (or a client is passed, as the
    tests do) and the data is allowed to go to one; otherwise the same steps run without it and the trace says why."""
    suffix = "_large" if size == "large" else ""
    data = supply.load_supply(FIXTURES / f"makati_shops_illustrative{suffix}.csv", FIXTURES / f"makati_menu_illustrative{suffix}.csv")
    if use_model and client is None:
        client = default_client()
    run = run_agents(illustrative_comments(today, size), data, data_label="illustrative", today=today,
                     client=client if use_model else None, planner="model" if use_model and client else "rules")
    dossier = run.dossier
    model_steps = [s.agent for s in run.trace if s.mode == "model"]
    if not use_model:
        model_note = "Model agents are off. Add ?model=on to the page address to use them."
    elif client is None:
        model_note = "No model is configured (it needs ENABLE_AI_CHAT=1 and a key on the server), so the steps ran without one."
    else:
        model_note = run.model_note or ("The model took part in: " + ", ".join(model_steps) if model_steps else "The model was available but had nothing to do.")
    return {
        "label": "illustrative",
        "notice": "Every shop, comment and number on this page is invented for development. It says nothing about real shops or people.",
        "headline": dossier["headline"],
        "opportunities": [asdict(o) for o in dossier["opportunities"]],
        "insufficient_evidence": [asdict(o) for o in dossier["insufficient_evidence"]],
        "trace": [asdict(step) for step in run.trace],
        "agents": {"planner": run.planner, "model_requested": use_model, "model_name": run.model_name, "model_steps": model_steps,
                   "model_note": model_note, "issues": run.issues, "fixes": run.fixes},
        "map": barangay_map(run),
        "map_note": "Tiles are in alphabetical order. This is not a geographic map; real boundaries need a license check first.",
    }


@router.get("/api/sense/demo")
def sense_demo(size: str = Query("small", pattern="^(small|large)$"), model: bool = False):
    """size=large serves the bigger invented dataset (12 barangays). model=true asks for the model agents."""
    return sense_payload(date.today(), size, use_model=model)

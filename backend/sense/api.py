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
from backend.sense.pipeline import SenseRun, run_sense
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


def sense_payload(today: date, size: str = "small") -> dict:
    suffix = "_large" if size == "large" else ""
    data = supply.load_supply(FIXTURES / f"makati_shops_illustrative{suffix}.csv", FIXTURES / f"makati_menu_illustrative{suffix}.csv")
    run = run_sense(illustrative_comments(today, size), data, data_label="illustrative", today=today)
    dossier = run.dossier
    return {
        "label": "illustrative",
        "notice": "Every shop, comment and number on this page is invented for development. It says nothing about real shops or people.",
        "headline": dossier["headline"],
        "opportunities": [asdict(o) for o in dossier["opportunities"]],
        "insufficient_evidence": [asdict(o) for o in dossier["insufficient_evidence"]],
        "trace": [asdict(step) for step in run.trace],
        "map": barangay_map(run),
        "map_note": "Tiles are in alphabetical order. This is not a geographic map; real boundaries need a license check first.",
    }


@router.get("/api/sense/demo")
def sense_demo(size: str = Query("small", pattern="^(small|large)$")):
    """size=large serves the bigger invented dataset (12 barangays); the default is the small one."""
    return sense_payload(date.today(), size)

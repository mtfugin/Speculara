"""Phase 2.7 dossier: a ranked list of opportunities with the evidence, the doubts and one test to run.

It only joins what the earlier stages produced (ghosts from 2.5, scores from 2.6). It adds no new
claims. Pairs without enough evidence are listed apart as "insufficient evidence" and never ranked.
"""
from dataclasses import dataclass, field

from backend.sense.ghosts import Ghost
from backend.sense.scoring import OpportunityScore

# One cheap way to find out if the need is real, per friction. Plain language, no jargon.
VALIDATION_TESTS = {
    "compatibility": "Ask 20 nearby coffee drinkers if they would switch for this option. Then offer it at one shop for two weeks and count orders.",
    "affordability": "Offer one entry-priced drink at one shop for two weeks. Compare orders with the usual menu.",
    "availability": "Check opening hours against the times people ask about. Trial one extended day at one shop and count walk-ins.",
    "discovery": "Post once in a local group asking where people look for coffee here. Count answers that name no shop.",
    "accessibility": "Visit during a busy hour and note the barriers people mention. Ask 10 customers which matters most.",
    "trust": "Ask 10 customers what would make them trust a new shop. Compare with what the shops already show.",
    "quality": "Run a blind tasting with 10 people between two shops in the area and record the preference.",
    "experience": "Time the wait at three shops at the same hour and ask 10 customers what slows them down.",
}


@dataclass
class Opportunity:
    rank: int | None
    barangay: str
    theme: str
    score: float | None
    verdict: str                    # "candidate gap", "covered", "supply unknown", "demand only", "insufficient evidence"
    demand_confidence: str
    supply_confidence: str
    supply_status: str
    evidence: list[str] = field(default_factory=list)       # original quotes, no authors
    uncertainty: list[str] = field(default_factory=list)
    validation_test: str = ""
    labels: list[str] = field(default_factory=list)


def build_dossier(ghosts: list[Ghost], scores: list[OpportunityScore]) -> dict:
    by_pair = {(s.barangay, s.theme): s for s in scores}
    ranked, insufficient = [], []
    for ghost in ghosts:
        score = by_pair.get((ghost.barangay, ghost.theme))
        uncertainty = [ghost.note]
        if score:
            uncertainty += score.reasons
        labels = sorted(ghost.labels | (score.data_labels if score else set()))
        entry = Opportunity(None, ghost.barangay, ghost.theme, score.score if score else None, ghost.verdict,
                            ghost.demand_confidence, ghost.supply_confidence, ghost.supply_status,
                            list(ghost.quotes), uncertainty, VALIDATION_TESTS[ghost.theme], labels)
        if score is None or score.verdict == "insufficient evidence":
            entry.verdict = "insufficient evidence"
            insufficient.append(entry)
        else:
            ranked.append(entry)
    # candidate gaps first, then by score; evidence that is only demand or supply-unknown follows
    priority = {"candidate gap": 0, "covered": 3, "supply unknown": 1, "demand only": 2}
    ranked.sort(key=lambda o: (priority[o.verdict], -(o.score or 0), o.barangay, o.theme))
    for number, entry in enumerate(ranked, start=1):
        entry.rank = number
    insufficient.sort(key=lambda o: (o.barangay, o.theme))
    labels = sorted({label for o in ranked + insufficient for label in o.labels})
    return {
        "opportunities": ranked,
        "insufficient_evidence": insufficient,
        "labels": labels,
        "headline": _headline(ranked, insufficient, labels),
    }


def _headline(ranked: list[Opportunity], insufficient: list[Opportunity], labels: list[str]) -> str:
    gaps = [o for o in ranked if o.verdict == "candidate gap"]
    if not ranked:
        text = "Insufficient evidence: no barangay and need has enough observations yet to rank an opportunity."
    elif not gaps:
        text = "No candidate gaps found. Some needs have unknown or unassessed supply, so this is not proof there are none."
    else:
        top = gaps[0]
        text = (f"{len(gaps)} candidate gap(s). Strongest: {top.theme} in {top.barangay} "
                f"(score {top.score:.0f}, demand confidence {top.demand_confidence}, supply confidence {top.supply_confidence}).")
    if "illustrative" in labels:
        text += " Built on illustrative data, so these are not findings about real shops or people."
    return text

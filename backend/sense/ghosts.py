"""Phase 2.5 demand ghosts: demand that has no visible supply answering it, kept honest.

For each barangay and friction with observed demand we report:
- demand: how many observations, how many sources, and its own confidence
- supply: a separate status and confidence. Statuses:
    "unknown"       no supply evidence at all for that barangay, so nothing can be said
    "not assessed"  the friction cannot be checked from menus (discovery, trust and similar)
    "covered"       listed supply answers this friction
    "not seen"      we hold supply evidence for the barangay but none answers this friction
- verdict: "candidate gap" only for "not seen". Everything else is not a gap claim.
"Not seen" means not seen among the shops we have listed. It is never proof that nothing is served.
A candidate gap can be saved as inferred evidence that names this model and the demand it rests on.
"""
from dataclasses import dataclass, field

from backend.sense.model import CONFIDENCE, EvidenceStore, Observation
from backend.sense.offerings import CHECKABLE

MODEL = "demand-ghosts-v1"
MIN_DEMAND = 3        # fewer demand observations than this is not reported as a gap
SUPPLY_LISTED_FOR_MEDIUM = 3   # shops listed in the barangay before "not seen" is medium confidence
QUOTES_SHOWN = 3


@dataclass
class Ghost:
    barangay: str
    theme: str
    demand_count: int
    demand_sources: int
    demand_confidence: str
    supply_status: str
    supply_confidence: str
    supply_listed: int
    verdict: str
    quotes: list[str] = field(default_factory=list)
    demand_ids: list[str] = field(default_factory=list)
    labels: set[str] = field(default_factory=set)
    latest: str = ""   # newest collected_at among the demand it rests on
    note: str = ""


def _demand_confidence(count: int, sources: int, high_share: float) -> str:
    if count >= 8 and sources >= 3 and high_share >= 0.3:
        return "high"
    if count >= 4 and sources >= 2:
        return "medium"
    return "low"


def find_ghosts(store: EvidenceStore) -> list[Ghost]:
    groups: dict[tuple[str, str], list[Observation]] = {}
    for obs in store.select(kind="demand"):
        groups.setdefault((obs.barangay, obs.theme), []).append(obs)
    ghosts = []
    for (barangay, theme), demand in sorted(groups.items()):
        supply = store.select(kind="supply", barangay=barangay)
        listed = len({s.shop_id for s in supply if s.shop_id})
        sources = len({d.source for d in demand})
        high = sum(1 for d in demand if d.confidence == "high") / len(demand)
        d_conf = _demand_confidence(len(demand), sources, high)
        if theme not in CHECKABLE:
            status, s_conf, verdict = "not assessed", "low", "demand only"
            note = "Shop listings and menus cannot show whether this need is met, so supply was not assessed."
        elif not supply:
            status, s_conf, verdict = "unknown", "low", "supply unknown"
            note = f"No supply evidence for {barangay} yet. This is missing data, not a gap."
        elif any(theme in (s.extra.get("frictions") or []) for s in supply):
            status, s_conf, verdict = "covered", "medium", "covered"
            note = "At least one listed shop answers this need."
        else:
            status = "not seen"
            s_conf = "medium" if listed >= SUPPLY_LISTED_FOR_MEDIUM else "low"
            verdict = "candidate gap" if len(demand) >= MIN_DEMAND else "too little demand"
            note = (f"Not seen among the {listed} shop(s) we have listed in {barangay}. "
                    "This is not proof that nothing is served there.")
        ghosts.append(Ghost(barangay, theme, len(demand), sources, d_conf, status, s_conf, listed, verdict,
                            quotes=[d.quote for d in demand][:QUOTES_SHOWN], demand_ids=[d.id for d in demand],
                            labels={d.data_label for d in demand} | {s.data_label for s in supply},
                            latest=max(d.collected_at for d in demand), note=note))
    order = {"candidate gap": 0, "covered": 1, "supply unknown": 2, "demand only": 3, "too little demand": 4}
    return sorted(ghosts, key=lambda g: (order[g.verdict], -g.demand_count, g.barangay, g.theme))


def save_gaps_as_inferred(store: EvidenceStore, ghosts: list[Ghost]) -> int:
    """Store each candidate gap as inferred evidence that points at the observed demand it rests on."""
    count = 0
    for ghost in ghosts:
        if ghost.verdict != "candidate gap":
            continue
        slug = ghost.barangay.casefold().replace(" ", "-")
        store.add(Observation(
            id=f"g-{slug}-{ghost.theme}", kind="demand", basis="inferred", theme=ghost.theme, barangay=ghost.barangay,
            source="demand ghosts model", collected_at=ghost.latest,
            # a conclusion is only as sure as its weaker side (CONFIDENCE runs high to low)
            confidence=max(ghost.demand_confidence, ghost.supply_confidence, key=CONFIDENCE.index),
            data_label="real" if ghost.labels == {"real"} else "illustrative", model=MODEL, derived_from=ghost.demand_ids,
            extra={"supply_status": ghost.supply_status, "supply_listed": ghost.supply_listed},
        ))
        count += 1
    return count

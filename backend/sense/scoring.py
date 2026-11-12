"""Phase 2.6 opportunity scoring.

One explainable score for each (barangay, friction theme) pair, built from observed evidence only
(pass basis="both" to include inferred evidence on purpose). Every component shows its raw value, its
0 to 1 value, its weight, a status and a plain note. Nothing is hidden in a single number.

Rules:
- Missing is not zero. A component with no usable data has status "missing" and is left out; the
  weights of the components that are "ok" are renormalized to add up to 1.
- Missing supply data never raises the score. Supply only counts when the barangay has supply
  evidence at all. No supply evidence at all means the component is missing, not "no competition".
- A pair is "insufficient evidence" (score None) when it has fewer than MIN_OBSERVATIONS observations,
  fewer than MIN_OK_COMPONENTS ok components, or fewer than MIN_SOURCES independent sources.
- Illustrative data is never hidden: labels are carried through and a reason is added.
- Observations dated after `today` are ignored. `today` is always passed in, never read from a clock.

Normalization (each is value capped, then scaled to 0..1):
- intensity    = min(n, INTENSITY_CAP) / INTENSITY_CAP
- growth       = clamp(0.5 + ratio / (2 * GROWTH_CAP), 0, 1), ratio = (recent - earlier) / earlier.
                 No change is 0.5, +GROWTH_CAP (+100%) or more is 1, a full drop is 0.
                 Recent window = the RECENT_DAYS days ending on `today` (today - RECENT_DAYS < date <= today).
                 Earlier window = the RECENT_DAYS days before that. Missing unless both hold at least
                 MIN_WINDOW_OBS observations.
- pain         = share of the pair's demand observations with confidence "high". This is only a
                 stand-in for strong, specific complaints, not a measure of pain itself.
- supply       = 1 - min(covering, SUPPLY_CAP) / SUPPLY_CAP, where covering is the number of supply
                 observations in the barangay that cover the theme (supply theme equals the friction, or
                 the friction is listed in extra["frictions"]). Low coverage means high opportunity.
- persistence  = min(distinct ISO calendar weeks, PERSISTENCE_CAP) / PERSISTENCE_CAP
- independence = min(distinct sources, INDEPENDENCE_CAP) / INDEPENDENCE_CAP
"""
from dataclasses import dataclass, field
from datetime import date, timedelta

from .model import EvidenceStore, Observation

MIN_OBSERVATIONS = 5
MIN_OK_COMPONENTS = 3
MIN_SOURCES = 2

INTENSITY_CAP = 20
RECENT_DAYS = 28
MIN_WINDOW_OBS = 2
GROWTH_CAP = 1.0
SUPPLY_CAP = 5
PERSISTENCE_CAP = 8
INDEPENDENCE_CAP = 4

WEIGHTS = {
    "intensity": 0.25,
    "growth": 0.15,
    "pain": 0.15,
    "supply": 0.20,
    "persistence": 0.15,
    "independence": 0.10,
}

# Confidence thresholds (illustrative data is always capped at "low").
HIGH_CONF_OBS = 15
HIGH_CONF_SOURCES = 3
HIGH_CONF_OK = 5
MEDIUM_CONF_OBS = 8
MEDIUM_CONF_OK = 4

INSUFFICIENT = "insufficient evidence"
SCORE = "score"


@dataclass
class Component:
    name: str
    raw: float | None
    normalized: float | None
    weight: float                  # the nominal weight
    status: str                    # "ok" or "missing"
    note: str
    effective_weight: float = 0.0  # after renormalizing over ok components; 0 when missing


@dataclass
class OpportunityScore:
    barangay: str
    theme: str
    score: float | None
    components: dict[str, Component]
    verdict: str
    reasons: list[str]
    confidence: str
    data_labels: set[str] = field(default_factory=set)


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def _covers(obs: Observation, theme: str) -> bool:
    frictions = obs.extra.get("frictions", []) if isinstance(obs.extra, dict) else []
    return obs.theme == theme or theme in frictions


def _components(demand: list[Observation], supply: list[Observation], theme: str, today: date) -> dict[str, Component]:
    n = len(demand)
    out: dict[str, Component] = {}

    def add(name, raw, norm, note):
        status = "ok" if norm is not None else "missing"
        out[name] = Component(name, raw, norm, WEIGHTS[name], status, note)

    # intensity
    add("intensity", n, _clamp(n / INTENSITY_CAP),
        f"{n} observed demand observations (full marks at {INTENSITY_CAP}).")

    # growth
    recent_start = today - timedelta(days=RECENT_DAYS)
    earlier_start = today - timedelta(days=2 * RECENT_DAYS)
    recent = sum(1 for o in demand if recent_start < date.fromisoformat(o.collected_at) <= today)
    earlier = sum(1 for o in demand if earlier_start < date.fromisoformat(o.collected_at) <= recent_start)
    if recent >= MIN_WINDOW_OBS and earlier >= MIN_WINDOW_OBS:
        ratio = (recent - earlier) / earlier
        add("growth", ratio, _clamp(0.5 + ratio / (2 * GROWTH_CAP)),
            f"{recent} observations in the last {RECENT_DAYS} days against {earlier} in the {RECENT_DAYS} days before.")
    else:
        add("growth", None, None,
            f"Not enough data: {recent} recent and {earlier} earlier observations; each {RECENT_DAYS} day window needs at least {MIN_WINDOW_OBS}.")

    # pain
    if n:
        high = sum(1 for o in demand if o.confidence == "high")
        add("pain", high / n, high / n,
            f"{high} of {n} observations have high confidence; this is a stand-in for strong, specific complaints.")
    else:
        add("pain", None, None, "No demand observations.")

    # supply
    if supply:
        covering = sum(1 for o in supply if _covers(o, theme))
        add("supply", covering, _clamp(1 - min(covering, SUPPLY_CAP) / SUPPLY_CAP),
            f"{covering} of {len(supply)} supply observations in this barangay cover this theme; less coverage means more opportunity.")
    else:
        add("supply", None, None,
            "No supply evidence for this barangay. That is unknown, not zero supply, so it is left out.")

    # persistence
    weeks = {date.fromisoformat(o.collected_at).isocalendar()[:2] for o in demand}
    add("persistence", len(weeks), _clamp(len(weeks) / PERSISTENCE_CAP),
        f"Observations fall in {len(weeks)} distinct calendar weeks (full marks at {PERSISTENCE_CAP}).")

    # independence
    sources = {o.source for o in demand}
    add("independence", len(sources), _clamp(len(sources) / INDEPENDENCE_CAP),
        f"{len(sources)} distinct sources (full marks at {INDEPENDENCE_CAP}).")
    return out


def score_pair(store: EvidenceStore, barangay: str, theme: str, *, today: date, basis: str = "observed") -> OpportunityScore:
    """Score one (barangay, theme) pair. `today` is a datetime.date; basis "observed" ignores inferred evidence."""
    demand = [o for o in store.select(kind="demand", theme=theme, barangay=barangay, basis=basis)
              if date.fromisoformat(o.collected_at) <= today]
    supply = [o for o in store.select(kind="supply", barangay=barangay, basis=basis)
              if date.fromisoformat(o.collected_at) <= today]
    comps = _components(demand, supply, theme, today)

    ok = [c for c in comps.values() if c.status == "ok"]
    total_w = sum(c.weight for c in ok)
    for c in ok:
        c.effective_weight = c.weight / total_w if total_w else 0.0

    labels = {o.data_label for o in demand}
    if comps["supply"].status == "ok":
        labels |= {o.data_label for o in supply}

    reasons: list[str] = []
    n_sources = len({o.source for o in demand})
    failures = []
    if len(demand) < MIN_OBSERVATIONS:
        failures.append(f"Only {len(demand)} observations; at least {MIN_OBSERVATIONS} are needed.")
    if len(ok) < MIN_OK_COMPONENTS:
        failures.append(f"Only {len(ok)} components have data; at least {MIN_OK_COMPONENTS} are needed.")
    if n_sources < MIN_SOURCES:
        failures.append(f"Only {n_sources} independent source; at least {MIN_SOURCES} are needed.")

    if failures:
        reasons = failures + ["No score is given, because a number here would look more certain than the evidence is."]
        verdict, score, confidence = INSUFFICIENT, None, "low"
    else:
        verdict = SCORE
        score = round(100 * sum(c.effective_weight * c.normalized for c in ok), 2)
        for c in comps.values():
            if c.status == "missing":
                reasons.append(f"{c.name.capitalize()} is missing and left out, and the other weights were rescaled. {c.note}")
        if len(demand) >= HIGH_CONF_OBS and n_sources >= HIGH_CONF_SOURCES and len(ok) >= HIGH_CONF_OK:
            confidence = "high"
        elif len(demand) >= MEDIUM_CONF_OBS and len(ok) >= MEDIUM_CONF_OK:
            confidence = "medium"
        else:
            confidence = "low"
        top = max(ok, key=lambda c: (c.effective_weight * c.normalized, c.name))
        reasons.append(f"Largest contribution: {top.name}. {top.note}")

    if "illustrative" in labels:
        reasons.append("Part or all of this rests on illustrative data, not real observations, so treat it as a demonstration only.")
        confidence = "low"

    return OpportunityScore(barangay, theme, score, comps, verdict, reasons, confidence, labels)


def score_all(store: EvidenceStore, *, today: date, basis: str = "observed") -> list[OpportunityScore]:
    """Score every (barangay, theme) pair that has demand evidence. Highest score first, insufficient last."""
    names: dict[tuple[str, str], str] = {}
    for o in store.select(kind="demand", basis=basis):
        key = (o.barangay.casefold(), o.theme)
        if key not in names or o.barangay < names[key]:
            names[key] = o.barangay
    results = [score_pair(store, names[k], k[1], today=today, basis=basis) for k in names]
    results.sort(key=lambda r: (r.score is None, -(r.score or 0.0), r.barangay.casefold(), r.theme))
    return results

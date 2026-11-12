"""Phase 2.2 evidence model.

An Observation is one piece of evidence about demand (what people want or struggle with) or supply
(what shops offer). Everything carries where it came from, when, how sure we are, and whether it
is real or illustrative.

Observed and inferred evidence are stored apart. Observed means read from a source. Inferred means
a model or rule produced it, so it must name the model and the observed evidence it came from.
Customer authors are never stored: an Observation has no author field and the store refuses one.
"""
import json
from dataclasses import asdict, dataclass, field
from datetime import date
from pathlib import Path

KINDS = ("demand", "supply")
BASES = ("observed", "inferred")
CONFIDENCE = ("high", "medium", "low")
DATA_LABELS = ("real", "illustrative")
FRICTIONS = ("discovery", "affordability", "availability", "accessibility", "trust", "quality", "experience", "compatibility")
LANGUAGES = ("en", "fil", "mixed", "unknown")
FORBIDDEN_FIELDS = ("author", "username", "handle", "profile_url", "avatar", "user")


@dataclass
class Observation:
    id: str
    kind: str                      # demand or supply
    basis: str                     # observed or inferred
    theme: str                     # a friction for demand, an offering such as "oat milk" for supply
    barangay: str
    source: str                    # e.g. "TikTok comment on a shop post", "shop menu"
    collected_at: str              # ISO date
    confidence: str                # high, medium, low
    data_label: str                # real or illustrative
    quote: str = ""                # original words, no author; required for observed demand
    language: str = "unknown"
    shop_id: str | None = None
    lat: float | None = None
    lon: float | None = None
    model: str | None = None       # inferred only: which model or rule made it
    derived_from: list[str] = field(default_factory=list)  # inferred only: observed ids it rests on
    extra: dict = field(default_factory=dict)

    def validate(self) -> None:
        def one_of(name, value, allowed):
            if value not in allowed:
                raise ValueError(f"{self.id}: {name} must be one of {', '.join(allowed)}, got {value!r}")

        for name in FORBIDDEN_FIELDS:
            if name in self.extra:
                raise ValueError(f"{self.id}: {name} is personal data and is not stored")
        if not self.id:
            raise ValueError("observation id is required")
        one_of("kind", self.kind, KINDS)
        one_of("basis", self.basis, BASES)
        one_of("confidence", self.confidence, CONFIDENCE)
        one_of("data_label", self.data_label, DATA_LABELS)
        one_of("language", self.language, LANGUAGES)
        if self.kind == "demand":
            one_of("theme", self.theme, FRICTIONS)
            if self.basis == "observed" and not self.quote.strip():
                raise ValueError(f"{self.id}: observed demand needs its original quote")
        if not (self.barangay and self.source):
            raise ValueError(f"{self.id}: barangay and source are required")
        try:
            date.fromisoformat(self.collected_at)
        except ValueError:
            raise ValueError(f"{self.id}: collected_at must be an ISO date") from None
        if (self.lat is None) != (self.lon is None):
            raise ValueError(f"{self.id}: give both lat and lon, or neither")
        if self.lat is not None and not (14.0 < self.lat < 15.0 and 120.5 < self.lon < 121.5):
            raise ValueError(f"{self.id}: coordinates are outside the Metro Manila area")
        if self.basis == "inferred" and not (self.model and self.derived_from):
            raise ValueError(f"{self.id}: inferred evidence must name its model and the observed ids it came from")
        if self.basis == "observed" and (self.model or self.derived_from):
            raise ValueError(f"{self.id}: observed evidence has no model or derived_from")


class EvidenceStore:
    """Holds observed and inferred evidence in two separate lists and saves them as JSON."""

    def __init__(self) -> None:
        self._observed: dict[str, Observation] = {}
        self._inferred: dict[str, Observation] = {}

    def add(self, obs: Observation) -> None:
        obs.validate()
        if obs.id in self._observed or obs.id in self._inferred:
            raise ValueError(f"duplicate observation id {obs.id}")
        if obs.basis == "inferred":
            missing = [i for i in obs.derived_from if i not in self._observed]
            if missing:
                raise ValueError(f"{obs.id}: derived_from names unknown observed ids {missing}")
            self._inferred[obs.id] = obs
        else:
            self._observed[obs.id] = obs

    @property
    def observed(self) -> list[Observation]:
        return list(self._observed.values())

    @property
    def inferred(self) -> list[Observation]:
        return list(self._inferred.values())

    def select(self, *, kind=None, theme=None, barangay=None, basis="observed", data_label=None) -> list[Observation]:
        """Filter evidence. Defaults to observed only, so inferred never mixes in by accident."""
        pool = {"observed": self.observed, "inferred": self.inferred, "both": self.observed + self.inferred}[basis]
        return [o for o in pool
                if (kind is None or o.kind == kind) and (theme is None or o.theme == theme)
                and (barangay is None or o.barangay.casefold() == barangay.casefold())
                and (data_label is None or o.data_label == data_label)]

    def labels(self) -> set[str]:
        return {o.data_label for o in self.observed + self.inferred}

    def to_json(self) -> str:
        return json.dumps({"observed": [asdict(o) for o in self.observed],
                           "inferred": [asdict(o) for o in self.inferred]}, ensure_ascii=False, indent=2)

    @classmethod
    def from_json(cls, text: str) -> "EvidenceStore":
        raw = json.loads(text)
        store = cls()
        for row in raw.get("observed", []) + raw.get("inferred", []):
            store.add(Observation(**row))
        return store

    def save(self, path: Path) -> None:
        Path(path).write_text(self.to_json(), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "EvidenceStore":
        return cls.from_json(Path(path).read_text(encoding="utf-8"))

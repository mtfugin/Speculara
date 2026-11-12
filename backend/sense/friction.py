"""Phase 2.3 friction mining.

Sorts short customer comments (English, Filipino and Taglish) into the eight frictions of the
SENSE model. Each classified comment becomes an observed demand Observation that keeps the
original words. A comment that fits no friction is listed as unclassified and is never forced
into a category.

Rules, no models: plain word lists, negation handling, and a confidence rule that never gives
"high" on a single cue. Customer authors are never read: only id, text, barangay, source and
collected_at are taken from an input comment, every other key is ignored.
"""
import re
from dataclasses import dataclass, field

from .model import DATA_LABELS, FRICTIONS, Observation

# --------------------------------------------------------------------------------------
# Cue lexicons. Plain data. Phrases are lowercase, hyphens are written as spaces, and a
# phrase matches whole words only. Add new cues here, not in the code below.
# --------------------------------------------------------------------------------------
LEXICON: dict[str, tuple[str, ...]] = {
    # Affordability: the price is too high for the person, or value is questioned.
    "affordability": (
        "mahal", "sobrang mahal", "mamahalin", "pricey", "expensive", "overpriced", "over priced",
        "hindi sulit", "not worth", "budget", "mas mura", "cheaper", "too much for", "pricier",
        "sulit", "worth it",  # these two only count when negated or asked about, see NEEDS_NEGATION
    ),
    # Availability: the item or the shop is not there when the person wants it.
    "availability": (
        "sold out", "walang stock", "no stock", "ubos na", "ubos", "out of stock", "closed", "sarado",
        "walang available", "not available", "unavailable", "ran out", "run out", "naubusan",
    ),
    # Accessibility: getting to the shop or using the space is hard (distance, parking, wifi,
    # disability access).
    "accessibility": (
        "walang parking", "no parking", "hirap puntahan", "hard to get to", "hard to reach", "far",
        "malayo", "no wifi", "walang wifi", "wheelchair", "stairs", "hagdan", "no ramp", "walang ramp",
        "no outlet", "walang saksakan", "hirap mag park", "traffic", "hirap hanapin ang parking",
    ),
    # Discovery: the person cannot find out that a shop or product exists, or where it is.
    "discovery": (
        "hidden", "di ko alam", "hindi ko alam", "saan ba", "san ba", "saan may", "saan meron",
        "new to me", "where is", "where can i", "where to find", "ngayon ko lang nalaman",
        "ngayon lang nalaman", "walang nakakaalam", "nobody knows", "recommend", "pa recommend",
    ),
    # Trust: doubts about cleanliness, honesty or safety.
    "trust": (
        "hygiene", "madumi", "dirty", "unsanitary", "fake", "scam", "legit ba", "is it legit",
        "hindi malinis", "not clean", "ipis", "cockroach", "expired", "food poisoning", "overcharged",
        "niloko", "sketchy",
    ),
    # Quality: the drink or food itself is not good.
    "quality": (
        "bitter", "mapait", "sunog", "burnt", "cold", "weak coffee", "watery", "matabang", "walang lasa",
        "pangit ang lasa", "panget ang lasa", "pangit ang kape", "panget ang kape", "too sweet",
        "sobrang tamis", "stale", "lukewarm", "maligamgam", "bland", "tasteless", "sour", "maasim",
        "diluted", "overcooked", "undercooked",
    ),
    # Experience: waiting, staff manners, noise, crowding and seating.
    "experience": (
        "slow", "tagal", "mabagal", "rude", "ingay", "maingay", "noisy", "loud", "crowded", "siksikan",
        "masikip", "bad service", "poor service", "terrible service", "worst service",
        "pangit ang service", "panget ang service", "pangit ng service", "panget ng service",
        "suplada", "suplado", "masungit", "long wait", "long line", "mahabang pila", "no seats",
        "walang upuan", "walang table",
    ),
    # Compatibility: diet, belief or health needs (milk alternatives, vegan, halal, sugar, allergy).
    # Only counted when the comment shows a need, see NEED_SIGNALS.
    "compatibility": (
        "oat milk", "soy milk", "almond milk", "vegan", "plant based", "decaf", "sugar free", "no sugar",
        "no dairy", "dairy free", "non dairy", "halal", "lactose", "lactose free", "gluten free", "keto",
        "vegetarian", "allergy", "allergic", "walang gatas", "diabetic", "low sugar", "unsweetened",
    ),
}

# Cues that praise or neutral talk would also use. They count only when negated ("hindi sulit")
# or when the comment is a question ("sulit ba?").
NEEDS_NEGATION = {"sulit", "worth it"}

# Frictions whose cues count only when the comment shows a need or asks something.
GATED_FRICTIONS = {"compatibility"}
NEED_SIGNALS = (
    "?", "no", "walang", "wala", "sana", "need", "wish", "hope", "looking for", "hanap", "hinahanap",
    "please", "pls", "pwede", "can you", "can i", "do you", "meron", "mayroon", "add", "limited",
    "kulang", "hard to find", "not available", "unavailable", "paki", "dagdagan", "missing", "cant",
    "can't", "cannot",
)

# Plain words that make a nearby cue NOT a complaint ("not expensive", "hindi mahal").
NEGATORS = {"not", "isn't", "isnt", "wasn't", "wasnt", "aren't", "arent", "never", "hindi", "di",
            "don't", "dont", "doesn't", "doesnt", "ain't"}
NEGATION_WINDOW = 3  # tokens before the cue, inside the same clause
# A cue that already begins with one of these is itself a complaint ("no wifi"): never negated.
NEGATION_EXEMPT_STARTS = {"no", "walang", "wala", "not", "hindi", "di"}

# Phrases that contain a cue word but mean something else. Blanked out before matching.
MASKED_PHRASES = ("so far", "as far as", "cold brew", "budget friendly", "far from home")

# A plain request for something: "meron bang oat milk?" means demand for availability.
# Each entry is (regex, needs a question mark).
REQUEST_PATTERNS: tuple[tuple[str, bool], ...] = (
    (r"meron\s+bang", False), (r"meron\s+ba", False), (r"mayroon\s+ba", False), (r"available\s+ba", False),
    (r"sana\s+(?:may|magkaroon|meron)", False), (r"(?:please|pls)\s+add", False), (r"can\s+you\s+add", False),
    (r"pwede\s+ba", False), (r"do\s+you\s+(?:guys\s+)?(?:have|offer|sell)", True),
    (r"is\s+there", True), (r"are\s+there", True),
)
REQUEST_CUE = "(asks if available)"

# Small word lists for the language guess. Neutral words (coffee, wifi, halal...) are left out.
FIL_WORDS = frozenset("""ang ng mga sa ako ko mo na naman po ba hindi di wala walang meron mayroon sobra sobrang
lang yung ito iyon dito doon saan kasi pero para sana pwede lagi masarap mahal sulit ubos sarado hirap puntahan
madumi tagal mabagal ingay maingay lasa sunog pait mapait matabang malayo hagdan ipis suplada suplado masungit
siksikan masikip pangit panget gatas kape may nga talaga namin natin kayo ikaw siya""".split())
EN_WORDS = frozenset("""the is are and to it this that very not too was were for my have has you your of in here so
but they there with at on be can could would should i me we our its just really always never no it's don't
pricey expensive overpriced sold out closed far hidden hygiene fake scam bitter cold weak slow rude crowded stairs
parking where new need please add milk good bad""".split())

_TOKEN = re.compile(r"[\w']+")
_CLAUSE_BREAK = ".,;!?:"
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_PHONE = re.compile(
    r"(?<!\w)(?:\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}"       # international with +
    r"|(?:0|63)9\d{2}[\s.-]?\d{3}[\s.-]?\d{4}"                              # PH mobile
    r"|\(?0\d{1,2}\)?[\s.-]?\d{3,4}[\s.-]?\d{4})(?!\w)")                    # PH landline
_EMAIL_PHONE_MARK = "[removed]"


@dataclass(frozen=True)
class Match:
    friction: str
    cues: tuple[str, ...]
    language: str

    @property
    def confidence(self) -> str:
        """High needs two distinct cues. One cue is only medium."""
        return "high" if len(self.cues) >= 2 else "medium"


@dataclass
class MiningResult:
    observations: list[Observation] = field(default_factory=list)
    unclassified: list[str] = field(default_factory=list)


def _normalise(text: str) -> str:
    """Lowercase, straight apostrophes, hyphens as spaces. Same length as the input."""
    return text.lower().replace("’", "'").replace("‘", "'").replace("-", " ")


def _phrase_regex(phrase: str) -> re.Pattern:
    return re.compile(r"(?<!\w)" + r"\s+".join(re.escape(p) for p in phrase.split()) + r"(?!\w)")


_CUE_REGEX = {f: [(c, _phrase_regex(c)) for c in cues] for f, cues in LEXICON.items()}
_MASK_REGEX = [_phrase_regex(p) for p in MASKED_PHRASES]
_NEED_REGEX = [_phrase_regex(s) for s in NEED_SIGNALS if s != "?"]
_REQUEST_REGEX = [(re.compile(r"(?<!\w)" + p + r"(?!\w)"), q) for p, q in REQUEST_PATTERNS]


def remove_contact_details(text: str) -> str:
    """Replace emails and phone numbers with [removed]. Nothing else is changed."""
    return _PHONE.sub(_EMAIL_PHONE_MARK, _EMAIL.sub(_EMAIL_PHONE_MARK, text))


def detect_language(text: str) -> str:
    """Rough guess from small word lists: en, fil, mixed or unknown."""
    tokens = _TOKEN.findall(_normalise(text))
    fil = sum(1 for t in tokens if t in FIL_WORDS)
    en = sum(1 for t in tokens if t in EN_WORDS)
    if fil and en:
        return "mixed"
    return "fil" if fil else "en" if en else "unknown"


def _is_negated(norm: str, start: int) -> bool:
    clause = re.split(r"[.,;!?:]", norm[:start])[-1]
    return any(t in NEGATORS for t in _TOKEN.findall(clause)[-NEGATION_WINDOW:])


def _cues_for(friction: str, norm: str) -> list[str]:
    found = []
    for cue, rx in _CUE_REGEX[friction]:
        found += [(m.start(), m.end(), cue) for m in rx.finditer(norm)]
    found.sort(key=lambda h: h[0] - h[1])  # longest first, so "sobrang mahal" beats "mahal"
    taken: list[tuple[int, int, str]] = []
    for start, end, cue in found:
        if not any(start < e and s < end for s, e, _ in taken):
            taken.append((start, end, cue))
    cues: list[str] = []
    for start, end, cue in sorted(taken):
        negated = _is_negated(norm, start)
        if cue in NEEDS_NEGATION:
            keep = negated or "?" in norm
        else:
            keep = cue.split()[0] in NEGATION_EXEMPT_STARTS or not negated
        if keep and cue not in cues:
            cues.append(cue)
    return cues


def classify_text(text: str) -> list[Match]:
    """Return every friction the comment shows, with the cues that matched. Empty if none."""
    clean = remove_contact_details(text or "")
    norm = _normalise(clean)
    for rx in _MASK_REGEX:
        norm = rx.sub(lambda m: " " * len(m.group()), norm)
    has_question = "?" in norm
    language = detect_language(clean)
    needs_shown = has_question or any(rx.search(norm) for rx in _NEED_REGEX)
    requested = any(rx.search(norm) and (not q or has_question) for rx, q in _REQUEST_REGEX)

    matches = []
    for friction in FRICTIONS:
        cues = _cues_for(friction, norm)
        if friction in GATED_FRICTIONS and not (needs_shown or requested):
            cues = []
        if friction == "availability" and requested:
            cues.append(REQUEST_CUE)
        if cues:
            matches.append(Match(friction, tuple(cues), language))
    matches.sort(key=lambda m: -len(m.cues))  # stable: ties keep FRICTIONS order
    return matches


def mine_comments(comments, *, data_label: str) -> MiningResult:
    """Classify comments into observed demand Observations. Authors and other keys are ignored."""
    if data_label not in DATA_LABELS:
        raise ValueError(f"data_label must be one of {', '.join(DATA_LABELS)}, got {data_label!r}")
    result = MiningResult()
    seen: set[str] = set()
    for comment in comments:
        cid = str(comment.get("id", "")).strip()
        if not cid:
            raise ValueError("every comment needs an id")
        if cid in seen:
            raise ValueError(f"duplicate comment id {cid}")
        seen.add(cid)
        quote = remove_contact_details(str(comment.get("text") or "")).strip()
        matches = classify_text(quote)
        if not matches:
            result.unclassified.append(cid)
            continue
        for m in matches:
            obs_id = f"d-{cid}" if len(matches) == 1 else f"d-{cid}-{m.friction}"
            obs = Observation(
                id=obs_id, kind="demand", basis="observed", theme=m.friction,
                barangay=comment.get("barangay", ""), source=comment.get("source", ""),
                collected_at=comment.get("collected_at", ""), confidence=m.confidence,
                data_label=data_label, quote=quote, language=m.language,
                extra={"cues": list(m.cues)})
            obs.validate()
            result.observations.append(obs)
    return result

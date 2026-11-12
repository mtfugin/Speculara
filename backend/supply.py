"""Supply side of SENSE: coffee shops in Makati and what they sell, loaded from CSV files.

Shop level facts only: name, barangay, hours, menu items and prices. No customer data lives here.
Every row says where it came from, when, how sure we are, and whether it is real or illustrative.
A missing shop is never proof that nothing is served somewhere (phase 2.4), so this module only
ever reports what it was given.

Prices are whole centavos (integers), never floats.
"""
import csv
import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

DATA_LABELS = ("real", "illustrative")
CONFIDENCE = ("high", "medium", "low")
# how a value was obtained decides the default confidence
METHODS = {"observed": "high", "manual": "medium", "inferred": "low"}

MAKATI_BARANGAYS = frozenset(
    name.casefold()
    for name in (
        "Bangkal, Bel-Air, Carmona, Cembo, Comembo, Dasmariñas, East Rembo, Forbes Park, Guadalupe Nuevo, "
        "Guadalupe Viejo, Kasilawan, La Paz, Magallanes, Olympia, Palanan, Pembo, Pinagkaisahan, Pio del Pilar, "
        "Pitogo, Poblacion, Post Proper Northside, Post Proper Southside, Rizal, San Antonio, San Isidro, "
        "San Lorenzo, Santa Cruz, Singkamas, South Cembo, Tejeros, Urdaneta, Valenzuela, West Rembo"
    ).split(", ")
)

SHOP_REQUIRED = ("shop_id", "shop_name", "barangay", "source", "collected_at", "method", "data_label")
MENU_REQUIRED = ("shop_id", "item", "price", "source", "collected_at", "method", "data_label")
_TIME = re.compile(r"^\d{1,2}:\d{2}$")


@dataclass
class Shop:
    shop_id: str
    shop_name: str
    barangay: str
    source: str
    collected_at: str
    method: str
    data_label: str
    confidence: str
    hours: str | None = None
    notes: list[str] = field(default_factory=list)


@dataclass
class MenuItem:
    shop_id: str
    item: str
    price_centavos: int | None
    source: str
    collected_at: str
    method: str
    data_label: str
    confidence: str


@dataclass
class SupplyData:
    shops: list[Shop]
    menu: list[MenuItem]
    warnings: list[str]

    @property
    def labels(self) -> set[str]:
        return {s.data_label for s in self.shops} | {m.data_label for m in self.menu}


def price_to_centavos(text: str) -> int | None:
    """'145', '145.50', '₱145.50' or 'PHP 1,450' to whole centavos. Blank stays unknown (None)."""
    cleaned = (text or "").strip().replace(",", "").replace("₱", "").replace("PHP", "").replace("php", "").strip()
    if not cleaned:
        return None
    if not re.fullmatch(r"\d+(\.\d{1,2})?", cleaned):
        raise ValueError(f"not a price: {text!r}")
    whole, _, cents = cleaned.partition(".")
    return int(whole) * 100 + int((cents + "00")[:2])


def _read(path: Path, required: tuple[str, ...]) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        missing = [c for c in required if c not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"{path.name}: missing column(s) {', '.join(missing)}")
        return [{k: (v or "").strip() for k, v in row.items()} for row in reader]


def _common(row: dict, where: str) -> tuple[str, str]:
    """Validate the provenance columns shared by shops and menu rows. Returns (confidence, error)."""
    if row["data_label"] not in DATA_LABELS:
        raise ValueError(f"{where}: data_label must be one of {', '.join(DATA_LABELS)}")
    if row["method"] not in METHODS:
        raise ValueError(f"{where}: method must be one of {', '.join(METHODS)}")
    try:
        date.fromisoformat(row["collected_at"])
    except ValueError:
        raise ValueError(f"{where}: collected_at must be a date like 2026-11-12") from None
    if not row["source"]:
        raise ValueError(f"{where}: source is required")
    confidence = row.get("confidence") or METHODS[row["method"]]
    if confidence not in CONFIDENCE:
        raise ValueError(f"{where}: confidence must be one of {', '.join(CONFIDENCE)}")
    return confidence, ""


def load_supply(shops_csv: Path, menu_csv: Path | None = None) -> SupplyData:
    """Load shops, and optionally their menu. Bad rows raise with the file and row number.

    A barangay we do not recognize is kept and reported as a warning, not rejected, because
    people write villages and streets there. A menu row whose shop is not listed is an error.
    """
    shops, menu, warnings, seen = [], [], [], set()
    for number, row in enumerate(_read(Path(shops_csv), SHOP_REQUIRED), start=2):
        where = f"{Path(shops_csv).name} row {number}"
        for column in ("shop_id", "shop_name", "barangay"):
            if not row[column]:
                raise ValueError(f"{where}: {column} is required")
        if row["shop_id"] in seen:
            raise ValueError(f"{where}: duplicate shop_id {row['shop_id']}")
        seen.add(row["shop_id"])
        confidence, _ = _common(row, where)
        notes = []
        if row["barangay"].casefold() not in MAKATI_BARANGAYS:
            notes.append("barangay not recognized")
            warnings.append(f"{where}: {row['barangay']!r} is not a Makati barangay name; check the spelling or use the barangay, not the village")
        hours = row.get("hours") or None
        if hours:
            for part in re.split(r"[-–]", hours.split(";")[0]):
                if part.strip() and not _TIME.match(part.strip()):
                    notes.append("hours not in HH:MM-HH:MM form")
                    warnings.append(f"{where}: hours {hours!r} should look like 07:00-21:00")
                    break
        shops.append(Shop(row["shop_id"], row["shop_name"], row["barangay"], row["source"], row["collected_at"],
                          row["method"], row["data_label"], confidence, hours, notes))
    if menu_csv:
        for number, row in enumerate(_read(Path(menu_csv), MENU_REQUIRED), start=2):
            where = f"{Path(menu_csv).name} row {number}"
            if row["shop_id"] not in seen:
                raise ValueError(f"{where}: shop_id {row['shop_id']!r} is not in the shops file")
            if not row["item"]:
                raise ValueError(f"{where}: item is required")
            confidence, _ = _common(row, where)
            try:
                price = price_to_centavos(row["price"])
            except ValueError as error:
                raise ValueError(f"{where}: {error}") from None
            menu.append(MenuItem(row["shop_id"], row["item"], price, row["source"], row["collected_at"],
                                 row["method"], row["data_label"], confidence))
    return SupplyData(shops, menu, warnings)


def coverage(data: SupplyData) -> dict:
    """Shops per barangay, plus how many shops have hours and prices. Says what we have, not what exists."""
    by_barangay: dict[str, int] = {}
    for shop in data.shops:
        by_barangay[shop.barangay] = by_barangay.get(shop.barangay, 0) + 1
    priced = {m.shop_id for m in data.menu if m.price_centavos is not None}
    return {
        "shops": len(data.shops),
        "by_barangay": dict(sorted(by_barangay.items())),
        "with_hours": sum(1 for s in data.shops if s.hours),
        "with_prices": sum(1 for s in data.shops if s.shop_id in priced),
        "barangays_with_no_shop_listed": sorted(
            name.title() for name in MAKATI_BARANGAYS if name not in {b.casefold() for b in by_barangay}
        ),
        "note": "Barangays with no shop listed mean no data yet, not no coffee.",
        "labels": sorted(data.labels),
    }

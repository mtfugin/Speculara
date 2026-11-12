"""Phase 2.4: turn loaded shop and menu rows (backend/supply.py) into supply evidence.

One observation per shop ("coffee shop listed") and one per menu item. Each keeps its own source,
date, method-derived confidence and real or illustrative label. A barangay that has no
observation here means no data yet. It is never evidence that nothing is sold there.
"""
from backend.sense.model import EvidenceStore, Observation
from backend.supply import SupplyData

LISTING_THEME = "coffee shop listed"


def supply_to_observations(data: SupplyData) -> list[Observation]:
    by_shop = {s.shop_id: s for s in data.shops}
    out = []
    for shop in data.shops:
        out.append(Observation(
            id=f"s-{shop.shop_id}", kind="supply", basis="observed", theme=LISTING_THEME, barangay=shop.barangay,
            source=shop.source, collected_at=shop.collected_at, confidence=shop.confidence,
            data_label=shop.data_label, shop_id=shop.shop_id, extra={"shop_name": shop.shop_name, "hours": shop.hours},
        ))
    for number, item in enumerate(data.menu, start=1):
        shop = by_shop[item.shop_id]
        out.append(Observation(
            id=f"s-{item.shop_id}-m{number}", kind="supply", basis="observed", theme=item.item.casefold(),
            barangay=shop.barangay, source=item.source, collected_at=item.collected_at, confidence=item.confidence,
            data_label=item.data_label, shop_id=item.shop_id,
            extra={"price_centavos": item.price_centavos},  # None means price unknown, never zero
        ))
    return out


def load_into(store: EvidenceStore, data: SupplyData) -> int:
    observations = supply_to_observations(data)
    for obs in observations:
        store.add(obs)
    return len(observations)

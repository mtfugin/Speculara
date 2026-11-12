"""Which demand frictions a piece of supply evidence can answer.

Only three frictions can be checked against shop listings and menus:
- compatibility: a menu item that serves the need (oat milk, vegan, decaf, halal and similar)
- affordability: a menu item at or under AFFORDABLE_CENTAVOS
- availability: a shop with stated opening hours
The other five frictions (discovery, accessibility, trust, quality, experience) cannot be judged
from a menu, so SENSE reports demand for them and says the supply side was not assessed.
"""
THEME_LABEL = {
    "compatibility": "dietary or drink needs", "affordability": "price", "availability": "availability",
    "discovery": "finding the shop", "accessibility": "getting there", "trust": "trust and hygiene",
    "quality": "taste and quality", "experience": "service and atmosphere",
}
AFFORDABLE_CENTAVOS = 10000  # a plain item at or under 100 pesos
CHECKABLE = ("compatibility", "affordability", "availability")
COMPATIBILITY_CUES = ("oat", "almond", "soy", "coconut milk", "plant", "vegan", "decaf", "sugar free", "sugar-free",
                      "dairy free", "dairy-free", "lactose", "gluten", "halal", "keto")


def frictions_covered(theme: str, extra: dict) -> list[str]:
    covered = set()
    text = (theme or "").casefold()
    if any(cue in text for cue in COMPATIBILITY_CUES):
        covered.add("compatibility")
    price = extra.get("price_centavos")
    if price is not None and 0 < price <= AFFORDABLE_CENTAVOS:
        covered.add("affordability")
    if extra.get("hours"):
        covered.add("availability")
    return sorted(covered)

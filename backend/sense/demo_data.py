"""Illustrative Makati comments for development, demos and tests.

Everything here is invented. No real shop, person or comment is used, and every result built on it
must be labeled illustrative. The shapes match what the collector would produce (no author).

Two sizes:
- "small": 27 comments over 4 barangays. The tests and the demo script rely on its exact shape.
- "large": 101 comments over 12 barangays, built to show every kind of result: candidate gaps, needs
  that are already covered, needs with no supply data, needs a menu cannot judge, and pairs with too
  little evidence to rank. It pairs with the *_large.csv shop and menu files.
"""
from datetime import date, timedelta

LABEL = "illustrative"

# barangay, number of comments, how the dates are spread (days back from `today`), texts to cycle through
_PLAN = (
    ("Poblacion", 10, 40, ["meron bang oat milk?", "sana may oat milk dito", "any vegan milk options? please",
                           "walang decaf dito, sana meron", "do you have lactose free milk?"]),
    ("Bel-Air", 8, 38, ["ang mahal ng kape dito", "too pricey for a student", "overpriced iced latte",
                        "mahal talaga, sobrang pricey"]),
    ("Guadalupe Nuevo", 6, 30, ["madumi ang cups, hygiene ba ito?", "legit ba to? parang scam", "fake ba yung reviews?"]),
    ("San Lorenzo", 3, 20, ["sold out na naman", "ubos na ang cold brew", "closed na pag punta ko"]),
)

_TEXTS = {
    "compatibility": ["meron bang oat milk?", "sana may oat milk dito", "any vegan milk options? please",
                      "walang decaf dito, sana meron", "do you have lactose free milk?"],
    "availability": ["sold out na naman", "ubos na ang cold brew", "closed na pag punta ko"],
    "affordability": ["ang mahal ng kape dito", "too pricey for a student", "overpriced iced latte",
                      "mahal talaga, sobrang pricey"],
    "quality": ["walang lasa ang kape", "sunog ang kape, bitter", "weak coffee, parang tubig"],
    "trust": ["madumi ang cups, hygiene ba ito?", "legit ba to? parang scam", "fake ba yung reviews?"],
    "accessibility": ["walang parking dito", "hirap puntahan", "no wifi and far from the station"],
    "experience": ["bad service, sobrang tagal", "slow service talaga", "sobrang ingay at crowded"],
    "discovery": ["saan ba yung shop? hidden", "di ko alam kung nasaan", "where is it? hidden gem pero hindi ko makita"],
}

# barangay, friction, comments, days the comments are spread over. With the large shop files this gives:
#   candidate gaps       Poblacion and Olympia (compatibility), Bel-Air (affordability)
#   covered              Poblacion (availability), San Antonio (affordability), San Lorenzo (compatibility, oat milk)
#   supply unknown       Bangkal (no shop listed there)
#   demand only          Valenzuela, Guadalupe Nuevo, Magallanes, San Lorenzo (experience), La Paz
#   insufficient         Pio del Pilar, Carmona (too few comments)
_LARGE_PLAN = (
    ("Poblacion", "compatibility", 14, 40),
    ("Poblacion", "availability", 5, 36),
    ("Bel-Air", "affordability", 12, 38),
    ("San Antonio", "affordability", 9, 35),
    ("Valenzuela", "quality", 8, 30),
    ("Guadalupe Nuevo", "trust", 7, 30),
    ("Magallanes", "accessibility", 6, 28),
    ("San Lorenzo", "experience", 9, 36),
    ("San Lorenzo", "compatibility", 6, 30),
    ("Bangkal", "compatibility", 6, 25),
    ("La Paz", "discovery", 5, 25),
    ("Olympia", "compatibility", 7, 33),
    ("Pio del Pilar", "availability", 3, 20),
    ("Carmona", "affordability", 4, 22),
)
_SOURCES = ("illustrative post A", "illustrative post B", "illustrative post C")


def illustrative_comments(today: date, size: str = "small") -> list[dict]:
    if size not in ("small", "large"):
        raise ValueError("size must be small or large")
    comments = []
    if size == "small":
        for barangay, count, span, texts in _PLAN:
            for n in range(count):
                comments.append({
                    "id": f"{barangay.casefold().replace(' ', '-')}-{n + 1}",
                    "text": texts[n % len(texts)],
                    "barangay": barangay,
                    "source": _SOURCES[n % len(_SOURCES)],
                    "collected_at": (today - timedelta(days=(n * span) // max(count - 1, 1))).isoformat(),
                })
        return comments
    for barangay, friction, count, span in _LARGE_PLAN:
        texts = _TEXTS[friction]
        for n in range(count):
            # squaring the spread puts more comments in the recent weeks, so growth shows
            back = round(span * ((count - 1 - n) / max(count - 1, 1)) ** 1.5) if count > 1 else 0
            comments.append({
                "id": f"{barangay.casefold().replace(' ', '-')}-{friction}-{n + 1}",
                "text": texts[n % len(texts)],
                "barangay": barangay,
                "source": _SOURCES[n % len(_SOURCES)],
                "collected_at": (today - timedelta(days=back)).isoformat(),
            })
    return comments

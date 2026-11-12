"""Illustrative Makati comments for development, demos and tests.

Everything here is invented. No real shop, person or comment is used, and every result built on it
must be labeled illustrative. The shapes match what the collector would produce (no author).
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
_SOURCES = ("illustrative post A", "illustrative post B", "illustrative post C")


def illustrative_comments(today: date) -> list[dict]:
    comments = []
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

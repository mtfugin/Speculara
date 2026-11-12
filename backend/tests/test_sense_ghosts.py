import unittest

from backend.sense.ghosts import find_ghosts, save_gaps_as_inferred
from backend.sense.model import EvidenceStore, Observation
from backend.sense.offerings import frictions_covered


def demand(i, theme="compatibility", barangay="Poblacion", source="comment A", conf="medium"):
    return Observation(id=i, kind="demand", basis="observed", theme=theme, barangay=barangay, source=source,
                       collected_at="2026-11-12", confidence=conf, data_label="illustrative",
                       quote="meron bang oat milk?")


def supply(i, barangay="Poblacion", shop="S1", theme="iced latte", frictions=()):
    return Observation(id=i, kind="supply", basis="observed", theme=theme, barangay=barangay, source="menu",
                       collected_at="2026-11-12", confidence="medium", data_label="illustrative", shop_id=shop,
                       extra={"frictions": list(frictions)})


def store_with(*obs):
    store = EvidenceStore()
    for o in obs:
        store.add(o)
    return store


def five_demand(**kw):
    return [demand(f"d{n}", source=f"comment {n % 3}", **kw) for n in range(5)]


class OfferingTests(unittest.TestCase):
    def test_what_each_kind_of_supply_can_answer(self):
        self.assertEqual(frictions_covered("Oat milk latte", {}), ["compatibility"])
        self.assertEqual(frictions_covered("Brewed coffee", {"price_centavos": 8000}), ["affordability"])
        self.assertEqual(frictions_covered("Brewed coffee", {"price_centavos": 15000}), [])
        self.assertEqual(frictions_covered("Brewed coffee", {"price_centavos": None}), [])  # unknown price: no claim
        self.assertEqual(frictions_covered("coffee shop listed", {"hours": "07:00-21:00"}), ["availability"])


class GhostTests(unittest.TestCase):
    def test_no_supply_data_is_unknown_never_a_gap(self):
        ghost = find_ghosts(store_with(*five_demand()))[0]
        self.assertEqual((ghost.supply_status, ghost.verdict), ("unknown", "supply unknown"))
        self.assertIn("missing data", ghost.note)

    def test_supply_that_answers_the_need_means_covered(self):
        store = store_with(*five_demand(), supply("s1", frictions=["compatibility"]))
        self.assertEqual(find_ghosts(store)[0].verdict, "covered")

    def test_supply_present_but_not_answering_is_a_candidate_gap_with_honest_wording(self):
        store = store_with(*five_demand(), supply("s1"))
        ghost = find_ghosts(store)[0]
        self.assertEqual((ghost.supply_status, ghost.verdict), ("not seen", "candidate gap"))
        self.assertEqual(ghost.supply_confidence, "low")  # only one shop listed
        self.assertIn("not proof", ghost.note)

    def test_more_listed_shops_raise_supply_confidence(self):
        shops = [supply(f"s{n}", shop=f"S{n}") for n in range(3)]
        ghost = find_ghosts(store_with(*five_demand(), *shops))[0]
        self.assertEqual(ghost.supply_confidence, "medium")

    def test_too_little_demand_is_not_called_a_gap(self):
        store = store_with(demand("d1"), demand("d2"), supply("s1"))
        self.assertEqual(find_ghosts(store)[0].verdict, "too little demand")

    def test_frictions_a_menu_cannot_judge_are_demand_only(self):
        store = store_with(*five_demand(theme="trust"), supply("s1"))
        ghost = find_ghosts(store)[0]
        self.assertEqual((ghost.supply_status, ghost.verdict), ("not assessed", "demand only"))

    def test_demand_and_supply_confidence_are_separate(self):
        ghost = find_ghosts(store_with(*five_demand(), supply("s1")))[0]
        self.assertEqual(ghost.demand_confidence, "medium")
        self.assertEqual(ghost.supply_confidence, "low")

    def test_gaps_sort_first_and_quotes_are_original_and_capped(self):
        store = store_with(*five_demand(), *five_demand(barangay="Bel-Air")[:0],
                           *[demand(f"b{n}", theme="trust", barangay="Bel-Air", source=f"c{n}") for n in range(6)],
                           supply("s1"))
        ghosts = find_ghosts(store)
        self.assertEqual(ghosts[0].verdict, "candidate gap")
        self.assertEqual(ghosts[0].quotes, ["meron bang oat milk?"] * 3)

    def test_saving_gaps_stores_inferred_evidence_tied_to_observed_demand(self):
        store = store_with(*five_demand(), supply("s1"))
        self.assertEqual(save_gaps_as_inferred(store, find_ghosts(store)), 1)
        inferred = store.inferred[0]
        self.assertEqual((inferred.model, len(inferred.derived_from)), ("demand-ghosts-v1", 5))
        self.assertEqual(inferred.confidence, "low")  # the weaker of medium demand and low supply
        self.assertEqual(len(store.observed), 6)       # observed evidence untouched
        self.assertEqual(len(store.select()), 6)       # inferred stays out of default views


if __name__ == "__main__":
    unittest.main()

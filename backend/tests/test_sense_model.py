import unittest

from backend.sense.model import EvidenceStore, Observation


def demand(i="d1", **kw):
    base = dict(id=i, kind="demand", basis="observed", theme="affordability", barangay="Poblacion",
                source="comment on a shop post", collected_at="2026-11-12", confidence="medium",
                data_label="illustrative", quote="Ang mahal ng kape dito", language="fil")
    base.update(kw)
    return Observation(**base)


class ModelTests(unittest.TestCase):
    def test_valid_demand_is_stored_as_observed(self):
        store = EvidenceStore()
        store.add(demand())
        self.assertEqual(len(store.observed), 1)
        self.assertEqual(store.inferred, [])

    def test_observed_demand_needs_its_quote(self):
        with self.assertRaises(ValueError):
            EvidenceStore().add(demand(quote=" "))

    def test_demand_theme_must_be_a_known_friction(self):
        with self.assertRaises(ValueError):
            EvidenceStore().add(demand(theme="vibes"))

    def test_personal_data_fields_are_refused(self):
        with self.assertRaises(ValueError):
            EvidenceStore().add(demand(extra={"author": "someone"}))
        self.assertFalse(hasattr(demand(), "author"))

    def test_inferred_must_name_model_and_known_observed_evidence(self):
        store = EvidenceStore()
        store.add(demand("d1"))
        with self.assertRaises(ValueError):
            store.add(demand("i1", basis="inferred"))
        with self.assertRaises(ValueError):
            store.add(demand("i1", basis="inferred", model="rules-v1", derived_from=["nope"]))
        store.add(demand("i1", basis="inferred", model="rules-v1", derived_from=["d1"]))
        self.assertEqual(len(store.inferred), 1)

    def test_observed_cannot_claim_a_model(self):
        with self.assertRaises(ValueError):
            EvidenceStore().add(demand(model="rules-v1"))

    def test_select_defaults_to_observed_only(self):
        store = EvidenceStore()
        store.add(demand("d1"))
        store.add(demand("i1", basis="inferred", model="rules-v1", derived_from=["d1"]))
        self.assertEqual([o.id for o in store.select()], ["d1"])
        self.assertEqual({o.id for o in store.select(basis="both")}, {"d1", "i1"})

    def test_duplicate_ids_and_bad_values_are_refused(self):
        store = EvidenceStore()
        store.add(demand("d1"))
        for bad in (demand("d1"), demand("d2", confidence="sure"), demand("d3", data_label="fake"),
                    demand("d4", collected_at="12/11/2026"), demand("d5", lat=14.55),
                    demand("d6", lat=40.0, lon=-74.0)):
            with self.assertRaises(ValueError):
                store.add(bad)

    def test_supply_theme_is_free_text_and_coordinates_are_optional(self):
        store = EvidenceStore()
        store.add(Observation(id="s1", kind="supply", basis="observed", theme="oat milk", barangay="San Lorenzo",
                              source="shop menu", collected_at="2026-11-12", confidence="high",
                              data_label="illustrative", shop_id="S02", lat=14.5547, lon=121.0244))
        self.assertEqual(store.select(kind="supply")[0].theme, "oat milk")

    def test_json_round_trip_keeps_the_two_lists_apart(self):
        store = EvidenceStore()
        store.add(demand("d1"))
        store.add(demand("i1", basis="inferred", model="rules-v1", derived_from=["d1"]))
        again = EvidenceStore.from_json(store.to_json())
        self.assertEqual([o.id for o in again.observed], ["d1"])
        self.assertEqual([o.id for o in again.inferred], ["i1"])
        self.assertEqual(again.labels(), {"illustrative"})


if __name__ == "__main__":
    unittest.main()

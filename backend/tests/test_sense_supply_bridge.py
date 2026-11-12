import unittest
from pathlib import Path

from backend import supply
from backend.sense.model import EvidenceStore
from backend.sense.supply_bridge import LISTING_THEME, load_into, supply_to_observations

FIXTURES = Path(__file__).parent / 'fixtures'


def sample():
    return supply.load_supply(FIXTURES / 'makati_shops_illustrative.csv', FIXTURES / 'makati_menu_illustrative.csv')


class BridgeTests(unittest.TestCase):
    def test_one_observation_per_shop_and_per_menu_item(self):
        obs = supply_to_observations(sample())
        self.assertEqual(len(obs), 4 + 4)
        self.assertEqual(sum(1 for o in obs if o.theme == LISTING_THEME), 4)

    def test_everything_is_observed_supply_with_its_label_and_confidence(self):
        for o in supply_to_observations(sample()):
            self.assertEqual((o.kind, o.basis, o.data_label), ('supply', 'observed', 'illustrative'))
        listing = {o.shop_id: o for o in supply_to_observations(sample()) if o.theme == LISTING_THEME}
        self.assertEqual(listing['S03'].confidence, 'low')
        self.assertEqual(listing['S04'].confidence, 'high')

    def test_menu_items_inherit_their_shops_barangay(self):
        latte = [o for o in supply_to_observations(sample()) if o.theme == 'iced latte'][0]
        self.assertEqual(latte.barangay, 'Poblacion')
        self.assertEqual(latte.extra['price_centavos'], 14500)

    def test_unknown_price_stays_none_not_zero(self):
        cold = [o for o in supply_to_observations(sample()) if o.theme == 'cold brew'][0]
        self.assertIsNone(cold.extra['price_centavos'])

    def test_loads_into_a_store_and_barangays_without_shops_stay_empty(self):
        store = EvidenceStore()
        self.assertEqual(load_into(store, sample()), 8)
        self.assertEqual(len(store.select(kind='supply', barangay='Urdaneta')), 0)  # no data yet, not no coffee
        self.assertEqual(len(store.select(kind='supply', barangay='poblacion')), 3)


if __name__ == '__main__':
    unittest.main()

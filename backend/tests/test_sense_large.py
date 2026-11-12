import unittest
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from backend import supply
from backend.main import app
from backend.sense.api import sense_payload
from backend.sense.demo_data import illustrative_comments
from backend.sense.pipeline import run_sense

FIXTURES = Path(__file__).parent / 'fixtures'
TODAY = date(2026, 11, 12)
client = TestClient(app)


def run_large():
    data = supply.load_supply(FIXTURES / 'makati_shops_illustrative_large.csv', FIXTURES / 'makati_menu_illustrative_large.csv')
    return run_sense(illustrative_comments(TODAY, 'large'), data, data_label='illustrative', today=TODAY)


def by_pair(result):
    d = result.dossier
    return {(o.barangay, o.theme): o for o in d['opportunities'] + d['insufficient_evidence']}


class LargeDatasetTests(unittest.TestCase):
    def test_shape_is_101_comments_over_12_barangays_and_every_comment_is_sorted(self):
        comments = illustrative_comments(TODAY, 'large')
        self.assertEqual(len(comments), 101)
        self.assertEqual(len({c['barangay'] for c in comments}), 12)
        self.assertEqual(len({c['id'] for c in comments}), 101)  # ids are unique
        self.assertEqual(run_large().unclassified, [])

    def test_the_small_dataset_is_unchanged(self):
        self.assertEqual(len(illustrative_comments(TODAY)), 27)
        self.assertEqual(len(illustrative_comments(TODAY, 'small')), 27)
        with self.assertRaises(ValueError):
            illustrative_comments(TODAY, 'huge')

    def test_it_shows_every_kind_of_result(self):
        pairs = by_pair(run_large())
        self.assertEqual(pairs[('Poblacion', 'compatibility')].verdict, 'candidate gap')
        self.assertEqual(pairs[('Olympia', 'compatibility')].verdict, 'candidate gap')
        self.assertEqual(pairs[('Bel-Air', 'affordability')].verdict, 'candidate gap')
        self.assertEqual(pairs[('San Antonio', 'affordability')].verdict, 'covered')       # a cheap item exists there
        self.assertEqual(pairs[('San Lorenzo', 'compatibility')].verdict, 'covered')       # an oat milk drink exists there
        self.assertEqual(pairs[('Bangkal', 'compatibility')].verdict, 'supply unknown')    # no shop listed in Bangkal
        self.assertEqual(pairs[('Valenzuela', 'quality')].verdict, 'demand only')          # a menu cannot judge taste
        self.assertEqual(pairs[('Carmona', 'affordability')].verdict, 'insufficient evidence')
        self.assertEqual(pairs[('Pio del Pilar', 'availability')].verdict, 'insufficient evidence')

    def test_missing_supply_is_never_called_a_gap(self):
        bangkal = [o for (b, _), o in by_pair(run_large()).items() if b == 'Bangkal']
        self.assertTrue(bangkal)
        self.assertTrue(all(o.verdict != 'candidate gap' for o in bangkal))

    def test_insufficient_pairs_have_no_rank_and_no_score(self):
        weak = run_large().dossier['insufficient_evidence']
        self.assertEqual(len(weak), 2)
        self.assertTrue(all(o.rank is None and o.score is None for o in weak))

    def test_everything_is_labeled_illustrative(self):
        result = run_large()
        self.assertEqual(result.store.labels(), {'illustrative'})
        self.assertIn('illustrative', result.dossier['headline'].casefold())


class SizeOptionTests(unittest.TestCase):
    def test_payload_size_changes_the_map_and_the_list(self):
        small, large = sense_payload(TODAY), sense_payload(TODAY, 'large')
        self.assertEqual(sum(1 for r in small['map'] if r['has_data']), 4)
        self.assertEqual(sum(1 for r in large['map'] if r['has_data']), 12)
        self.assertGreater(len(large['opportunities']), len(small['opportunities']))
        self.assertEqual(large['label'], 'illustrative')

    def test_endpoint_accepts_small_and_large_and_rejects_anything_else(self):
        self.assertEqual(client.get('/api/sense/demo').status_code, 200)
        self.assertEqual(client.get('/api/sense/demo?size=small').status_code, 200)
        big = client.get('/api/sense/demo?size=large')
        self.assertEqual(big.status_code, 200)
        self.assertEqual(sum(1 for r in big.json()['map'] if r['has_data']), 12)
        self.assertEqual(client.get('/api/sense/demo?size=huge').status_code, 422)


if __name__ == '__main__':
    unittest.main()

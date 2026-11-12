import tempfile
import unittest
from pathlib import Path

from backend import supply

FIXTURES = Path(__file__).parent / 'fixtures'
SHOPS = FIXTURES / 'makati_shops_illustrative.csv'
MENU = FIXTURES / 'makati_menu_illustrative.csv'


def write(text, name='x.csv'):
    folder = Path(tempfile.mkdtemp())
    path = folder / name
    path.write_text(text, encoding='utf-8')
    return path


HEADER = 'shop_id,shop_name,barangay,hours,source,collected_at,method,data_label,confidence\n'


class PriceTests(unittest.TestCase):
    def test_prices_become_whole_centavos(self):
        self.assertEqual(supply.price_to_centavos('145'), 14500)
        self.assertEqual(supply.price_to_centavos('95.5'), 9550)
        self.assertEqual(supply.price_to_centavos('₱1,100.25'), 110025)
        self.assertEqual(supply.price_to_centavos('PHP 80'), 8000)

    def test_blank_stays_unknown_not_zero(self):
        self.assertIsNone(supply.price_to_centavos(''))

    def test_rejects_non_prices(self):
        for bad in ('free', '12.345', '-5', '1e3'):
            with self.assertRaises(ValueError):
                supply.price_to_centavos(bad)


class LoadTests(unittest.TestCase):
    def test_loads_the_illustrative_sample(self):
        data = supply.load_supply(SHOPS, MENU)
        self.assertEqual(len(data.shops), 4)
        self.assertEqual(len(data.menu), 4)
        self.assertEqual(data.labels, {'illustrative'})
        self.assertEqual(data.warnings, [])

    def test_confidence_defaults_from_method(self):
        shops = {s.shop_id: s for s in supply.load_supply(SHOPS).shops}
        self.assertEqual(shops['S01'].confidence, 'medium')   # manual
        self.assertEqual(shops['S03'].confidence, 'low')      # inferred
        self.assertEqual(shops['S04'].confidence, 'high')     # observed

    def test_missing_hours_and_prices_stay_blank(self):
        data = supply.load_supply(SHOPS, MENU)
        self.assertIsNone({s.shop_id: s for s in data.shops}['S03'].hours)
        cold = [m for m in data.menu if m.item == 'Cold brew'][0]
        self.assertIsNone(cold.price_centavos)

    def test_unknown_barangay_is_kept_with_a_warning(self):
        path = write(HEADER + 'A1,Sample,Legazpi Village,,x,2026-11-12,manual,illustrative,\n')
        data = supply.load_supply(path)
        self.assertEqual(len(data.shops), 1)
        self.assertEqual(len(data.warnings), 1)
        self.assertIn('barangay not recognized', data.shops[0].notes)

    def test_rejects_bad_label_method_date_and_duplicates(self):
        cases = {
            'data_label': 'A1,S,Poblacion,,x,2026-11-12,manual,true,\n',
            'method': 'A1,S,Poblacion,,x,2026-11-12,guessed,real,\n',
            'collected_at': 'A1,S,Poblacion,,x,12/11/2026,manual,real,\n',
            'source': 'A1,S,Poblacion,,,2026-11-12,manual,real,\n',
            'duplicate': 'A1,S,Poblacion,,x,2026-11-12,manual,real,\nA1,T,Poblacion,,x,2026-11-12,manual,real,\n',
        }
        for key, body in cases.items():
            with self.subTest(key), self.assertRaises(ValueError) as caught:
                supply.load_supply(write(HEADER + body))
            self.assertIn(key if key != 'duplicate' else 'duplicate', str(caught.exception))

    def test_missing_column_names_the_file(self):
        with self.assertRaises(ValueError) as caught:
            supply.load_supply(write('shop_id,shop_name\nA1,S\n', 'broken.csv'))
        self.assertIn('broken.csv', str(caught.exception))

    def test_menu_row_for_unknown_shop_is_an_error(self):
        menu = write('shop_id,item,price,source,collected_at,method,data_label\nZZ,Latte,100,x,2026-11-12,manual,real\n')
        with self.assertRaises(ValueError):
            supply.load_supply(SHOPS, menu)


class CoverageTests(unittest.TestCase):
    def test_coverage_counts_what_we_have_and_says_it_is_not_what_exists(self):
        report = supply.coverage(supply.load_supply(SHOPS, MENU))
        self.assertEqual(report['shops'], 4)
        self.assertEqual(report['with_hours'], 3)
        self.assertEqual(report['with_prices'], 2)  # S04's only price is blank
        self.assertEqual(report['by_barangay']['Poblacion'], 1)
        self.assertIn('Urdaneta', report['barangays_with_no_shop_listed'])
        self.assertEqual(len(report['barangays_with_no_shop_listed']), 33 - 4)
        self.assertIn('no data yet', report['note'])


if __name__ == '__main__':
    unittest.main()

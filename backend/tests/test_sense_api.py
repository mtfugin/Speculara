import unittest
from unittest.mock import patch
from datetime import date

from fastapi.testclient import TestClient

from backend.main import app
from backend.sense.api import BARANGAYS, sense_payload

client = TestClient(app)


class SenseApiTests(unittest.TestCase):
    def test_endpoint_serves_an_illustrative_run(self):
        response = client.get('/api/sense/demo')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['label'], 'illustrative')
        self.assertIn('invented', body['notice'])
        self.assertTrue(body['opportunities'] and body['trace'])

    def test_map_lists_all_33_barangays_and_marks_no_data_apart_from_zero(self):
        rows = sense_payload(date(2026, 11, 12))['map']
        self.assertEqual(len(rows), len(BARANGAYS))
        self.assertEqual(len(rows), 33)
        by = {r['barangay']: r for r in rows}
        self.assertFalse(by['Urdaneta']['has_data'])
        self.assertTrue(by['Poblacion']['has_data'])
        self.assertIn('Pio del Pilar', by)

    def test_map_counts_comments_once_even_when_one_comment_shows_two_needs(self):
        by = {r['barangay']: r for r in sense_payload(date(2026, 11, 12))['map']}
        self.assertEqual(by['Poblacion']['demand'], 10)
        self.assertEqual(by['Bel-Air']['demand'], 8)

    def test_map_says_it_is_not_geographic_and_payload_has_no_author_fields(self):
        body = sense_payload(date(2026, 11, 12))
        self.assertIn('not a geographic map', body['map_note'])
        self.assertNotIn('author', str(body).casefold())


class SenseModelOptionTests(unittest.TestCase):
    def test_model_is_off_by_default_and_says_so(self):
        body = sense_payload(date(2026, 11, 12), 'large')
        self.assertFalse(body['agents']['model_requested'])
        self.assertEqual(body['agents']['model_steps'], [])
        self.assertIn('off', body['agents']['model_note'])
        self.assertEqual({s['mode'] for s in body['trace']}, {'rules'})

    def test_asking_for_a_model_that_is_not_configured_still_works_and_explains(self):
        with patch('backend.sense.api.default_client', return_value=None):
            body = sense_payload(date(2026, 11, 12), 'large', use_model=True)
        self.assertIn('No model is configured', body['agents']['model_note'])
        self.assertEqual(body['agents']['planner'], 'rules')
        self.assertTrue(body['opportunities'])

    def test_with_a_model_the_payload_reports_which_steps_used_it(self):
        from backend.tests.test_sense_agents import FakeModel
        body = sense_payload(date(2026, 11, 12), 'large', use_model=True, client=FakeModel())
        self.assertEqual(body['agents']['planner'], 'model')
        self.assertEqual(set(body['agents']['model_steps']), {'model reader', 'model narrator'})
        self.assertEqual(body['agents']['issues'], [])
        self.assertEqual(body['opportunities'][0]['summary_mode'], 'model')
        self.assertEqual(body['label'], 'illustrative')

    def test_endpoint_accepts_the_model_flag(self):
        with patch('backend.sense.api.default_client', return_value=None):
            self.assertEqual(client.get('/api/sense/demo?size=large&model=true').status_code, 200)
        self.assertEqual(client.get('/api/sense/demo?model=maybe').status_code, 422)


if __name__ == '__main__':
    unittest.main()

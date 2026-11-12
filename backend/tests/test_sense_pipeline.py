import json
import unittest
from datetime import date
from pathlib import Path

from backend import supply
from backend.sense.demo_data import illustrative_comments
from backend.sense.pipeline import run_sense

FIXTURES = Path(__file__).parent / 'fixtures'
TODAY = date(2026, 11, 12)


def run():
    data = supply.load_supply(FIXTURES / 'makati_shops_illustrative.csv', FIXTURES / 'makati_menu_illustrative.csv')
    return run_sense(illustrative_comments(TODAY), data, data_label='illustrative', today=TODAY)


class PipelineTests(unittest.TestCase):
    def test_every_agent_runs_in_order_and_reports_what_it_did(self):
        names = [step.agent for step in run().trace]
        self.assertEqual(names, ['friction miner', 'supply loader', 'ghost finder', 'scorer', 'dossier writer'])

    def test_the_dossier_ranks_a_gap_and_labels_the_data_illustrative(self):
        dossier = run().dossier
        first = dossier['opportunities'][0]
        self.assertEqual((first.rank, first.verdict), (1, 'candidate gap'))
        self.assertIn('illustrative', dossier['labels'])
        self.assertIn('not findings about real shops', dossier['headline'])

    def test_the_expected_stories_come_out_of_the_invented_data(self):
        by_pair = {(o.barangay, o.theme): o for o in run().dossier['opportunities'] + run().dossier['insufficient_evidence']}
        self.assertEqual(by_pair[('Poblacion', 'compatibility')].verdict, 'candidate gap')      # oat milk asked, none listed
        self.assertEqual(by_pair[('Bel-Air', 'affordability')].verdict, 'candidate gap')        # price complaints, no cheap item seen
        self.assertEqual(by_pair[('San Lorenzo', 'availability')].verdict, 'insufficient evidence')  # only 3 comments
        trust = by_pair[('Guadalupe Nuevo', 'trust')]
        self.assertIn(trust.verdict, ('demand only', 'insufficient evidence'))
        self.assertNotEqual(trust.supply_status, 'covered')

    def test_insufficient_evidence_is_listed_apart_and_never_ranked(self):
        dossier = run().dossier
        self.assertTrue(dossier['insufficient_evidence'])
        self.assertTrue(all(o.rank is None and o.score is None for o in dossier['insufficient_evidence']))

    def test_every_entry_has_original_quotes_doubts_and_one_test(self):
        for entry in run().dossier['opportunities']:
            self.assertTrue(entry.evidence and entry.uncertainty and entry.validation_test)

    def test_no_author_or_contact_data_anywhere_in_the_evidence(self):
        text = run().store.to_json()
        for word in ('author', 'username', 'profile_url', '@'):
            self.assertNotIn(word, text)

    def test_gaps_are_saved_as_inferred_evidence_apart_from_observed(self):
        result = run()
        self.assertTrue(result.store.inferred)
        self.assertTrue(all(o.basis == 'observed' for o in result.store.select()))
        json.loads(result.store.to_json())

    def test_no_evidence_gives_an_honest_insufficient_headline(self):
        data = supply.load_supply(FIXTURES / 'makati_shops_illustrative.csv')
        result = run_sense([], data, data_label='illustrative', today=TODAY)
        self.assertEqual(result.dossier['opportunities'], [])
        self.assertIn('Insufficient evidence', result.dossier['headline'])


if __name__ == '__main__':
    unittest.main()

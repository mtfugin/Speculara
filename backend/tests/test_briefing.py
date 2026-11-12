import asyncio
import unittest
from unittest.mock import patch

import pandas as pd

from backend import ai_chat, briefing
from backend.analysis import analyze


def run(coro):
    return asyncio.run(coro)


def sample_analysis():
    return analyze(pd.DataFrame({
        'date': pd.date_range('2026-01-01', periods=14).strftime('%Y-%m-%d'),
        'views': range(100, 114), 'sales': range(1, 15),
        'text': ['love it'] * 3 + [None] * 11,
    }))


class CommentReaderTests(unittest.TestCase):
    def test_rules_reader_sorts_by_intent(self):
        out = run(briefing.read_comments(['Magkano po?', 'bad quality, scam', 'love this so much', 'please restock'], use_ai=False))
        self.assertEqual(out['mode'], 'rules')
        self.assertEqual(out['intents']['question'], 1)
        self.assertEqual(out['intents']['complaint'], 1)
        self.assertEqual(out['intents']['praise'], 1)
        self.assertEqual(out['intents']['request'], 1)

    def test_ai_labels_are_validated_and_gaps_use_rules(self):
        async def fake(system, prompt, max_tokens=1000):
            return '```json\n[{"i":0,"tone":"positive","intent":"praise","theme":"Shipping speed!"},{"i":1,"tone":"bogus","intent":"question","theme":"x"}]\n```'
        with patch.object(ai_chat, 'ai_enabled', lambda: True), patch.object(ai_chat, 'generate', fake):
            out = run(briefing.read_comments(['fast delivery', 'magkano po?'], use_ai=True))
        self.assertEqual(out['mode'], 'ai')
        self.assertEqual(out['themes'][0]['theme'], 'shipping speed')
        self.assertEqual(out['intents']['question'], 1)  # bad label dropped, rule label used

    def test_ai_off_never_calls_model(self):
        async def boom(*a, **k):
            raise AssertionError('model must not be called')
        with patch.object(ai_chat, 'ai_enabled', lambda: False), patch.object(ai_chat, 'generate', boom):
            self.assertEqual(run(briefing.read_comments(['hello there'], use_ai=True))['mode'], 'rules')


class BriefTests(unittest.TestCase):
    def test_rules_brief_works_without_ai(self):
        brief = run(briefing.write_brief(sample_analysis(), use_ai=False))
        self.assertEqual(brief['mode'], 'rules')
        self.assertTrue(brief['headline'])

    def test_checker_drops_sentences_with_invented_numbers(self):
        facts = ['Views rose from 100 to 150.']
        kept, dropped = briefing.check_items([
            {'text': 'Views rose from 100 to 150.', 'facts': ['F1']},
            {'text': 'Views rose 87 percent.', 'facts': ['F1']},
            {'text': 'No citation 100.', 'facts': []},
        ], facts)
        self.assertEqual(len(kept), 1)
        self.assertEqual(dropped, 2)

    def test_ai_brief_falls_back_when_everything_fails_the_check(self):
        async def fake(system, prompt, max_tokens=1000):
            return '{"headline":"Up 999 percent","changed":[{"text":"Up 999","facts":["F1"]}],"actions":[{"text":"Do 777","facts":["F1"]}]}'
        with patch.object(ai_chat, 'ai_enabled', lambda: True), patch.object(ai_chat, 'generate', fake):
            brief = run(briefing.write_brief(sample_analysis(), use_ai=True))
        self.assertEqual(brief['mode'], 'rules')


if __name__ == '__main__':
    unittest.main()

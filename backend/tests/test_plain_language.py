import unittest
import pandas as pd
from backend.analysis import analyze, answer, report, relationship_summary, period_summary, demand_summary

class PlainLanguageTests(unittest.TestCase):
    def test_default_and_more_recommendations(self):
        result = analyze(pd.DataFrame({'views':[100,200,300,1400], 'sales':[10,20,30,1], 'post_id':list('abcd')}))
        self.assertIn(result['recommend'][0]['title'], answer('recommend', result))
        self.assertNotIn(result['recommend'][1]['title'], answer('recommend', result))
        self.assertIn(result['recommend'][1]['title'], answer('more recommendations', result))
        self.assertIn('details', result['recommend'][0])
        for question in ('recommend', 'correlation', 'forecast', 'summary'):
            self.assertNotRegex(answer(question, result), r'Pearson|Spearman|MAE|last_value|p-values')
        self.assertIn('Pearson', answer('Show Pearson statistics', result))
        self.assertIn('Full computed results', report(result))

    def test_negative_uses_real_negative_pair(self):
        result = analyze(pd.DataFrame({'views':[1,2,3,4], 'sales':[4,3,2,1]}))
        text = answer('What does negative correlation mean?', result)
        self.assertIn('not automatically bad', text)
        self.assertIn('tended to be lower', text)

    def test_zero_sales_take_priority_over_saves(self):
        result = analyze(pd.DataFrame({'sales':[0], 'saves':[9]}))
        self.assertEqual(demand_summary(result), 'The dataset records 0 sales.')

    def test_thresholds_and_small_sample(self):
        for r, strength in [(0.299,'No clear pattern'),(.3,'Some connection'),(-.7,'Strong connection')]:
            summary = relationship_summary(dict(a='views',b='sales',r=r,n=4))
            self.assertEqual(summary['strength'], strength)
            self.assertEqual(summary['note'], 'Early finding: more data could change this.')

    def test_zero_previous_period(self):
        text = period_summary('sales', dict(available=True,current_total=7, previous_total=0,absolute_change=7))
        self.assertIn('up 7', text)
        self.assertIn('There is no percentage change because the previous week had no sales.', text)

    def test_saves_answers_keep_their_metric(self):
        result = analyze(pd.DataFrame({'post_id':list('abc'), 'views':[100,200,300], 'saves':[3,4,5]}))
        self.assertIn('12 saves', answer('saves rate', result))
        self.assertIn('saves alongside', answer('best post saves', result))
        self.assertNotIn('sales', answer('best post saves', result))
        self.assertIn('cannot fetch accounts', answer('Who won election?', result))

    def test_direction_boundaries_and_text_only(self):
        for r in (0,.1,-.1):
            self.assertEqual(relationship_summary(dict(a='views',b='sales',r=r,n=10))['direction'], 'No clear pattern')
        for r in (.3,.7,1):
            self.assertEqual(relationship_summary(dict(a='views',b='sales',r=r,n=10))['direction'], 'Move together')
        for r in (-.3,-.7,-1):
            self.assertEqual(relationship_summary(dict(a='views',b='sales',r=r,n=10))['direction'], 'Move in opposite directions')
        self.assertIn('Early finding', relationship_summary(dict(a='views',b='sales',r=.7,n=9))['note'])
        self.assertNotIn('Early finding', relationship_summary(dict(a='views',b='sales',r=.7,n=10))['note'])
        self.assertIn('down 98', period_summary('sales',dict(available=True,current_total=2,previous_total=100,absolute_change=-98)))
        self.assertIn('two full weeks',period_summary('sales',dict(available=False,reason='Missing dates')))
        result=analyze(pd.DataFrame({'text':['where to buy?']}))
        self.assertIn('1 entry contains a question',demand_summary(result))

    def test_negative_comments_and_model_comparison_route_correctly(self):
        result=analyze(pd.DataFrame({'text':['good','great','bad']}))
        text=answer('negative comments',result)
        self.assertIn('negative (1 entries)',text)
        self.assertNotIn('opposite directions',text)
        self.assertIn('opposite directions',answer('What does negative mean?',result))
        result=analyze(pd.DataFrame({'date':pd.date_range('2026-01-01',periods=14),'sales':range(1,15)}))
        self.assertIn('MAE',answer('model comparison',result))

    def test_requested_intents_do_not_lose_their_subject(self):
        result = analyze(pd.DataFrame({'post_id':list('abc'), 'views':[100,200,300], 'saves':[3,4,5], 'text':['shipping','shipping','good']}))
        self.assertIn('12 saves',answer('saves per views',result))
        self.assertNotIn('12 saves',answer('sales per views',result))
        self.assertIn('leads this comparison',answer('best post saves per view',result))
        self.assertIn('shipping',answer('top words',result))
        self.assertIn('2 mentions',answer('top words',result))
        self.assertIn(result['recommend'][0]['title'],answer('What should I change next?',result))
        self.assertIn('In the latest week of your data',period_summary('sales',dict(available=True,current_total=2,previous_total=1,absolute_change=1)))

    def test_distinct_metrics_and_next_day_routing(self):
        result=analyze(pd.DataFrame({'date':pd.date_range('2026-01-01',periods=14),'views':[100]*14,'sales':range(1,15),'saves':[19]*14,'post_id':[f'p{i}' for i in range(14)]}))
        self.assertIn('266 saves',answer('saves per views',result))
        self.assertIn('leads this comparison',answer('best post saves per view',result))
        missing={**result,'ratios':{'saves_per_view':result['ratios']['saves_per_view']}}
        self.assertNotIn('266 saves',answer('sales per views',missing))
        self.assertIn('Next-day estimate',answer('next-day forecast',result))
        self.assertIn(result['recommend'][0]['title'],answer('What should I change next?',result))

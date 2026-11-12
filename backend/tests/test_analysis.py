import unittest
from io import BytesIO
import pandas as pd
from backend.analysis import analyze, parse_file, answer, report

class AnalysisTests(unittest.TestCase):
    def test_totals_normalization_and_missing_values(self):
        result = analyze(parse_file(b' Views ,Saves,Sales\n100,10,2\n200,,4\n', 'data.csv'))
        self.assertEqual(result['totals'], {'views':300.0,'saves':10.0,'sales':6.0})
        self.assertTrue(result['warnings'])
        self.assertIn('300', answer('How many views?', result))
        self.assertIn('sales', report(result).lower())

    def test_rejects_invalid_counts(self):
        for data in [b'views\n-1\n', b'views\nwrong\n', b'views\ninf\n']:
            with self.assertRaises(ValueError):
                analyze(parse_file(data, 'data.csv'))

    def test_insufficient_data_is_explicit(self):
        result = analyze(pd.DataFrame({'views':[1,1,1]}))
        self.assertFalse(result['predict']['available'])
        self.assertEqual(result['correlation'], [])
        self.assertFalse(result['sentiment']['available'])
        self.assertFalse(result['demand']['available'])

    def test_real_correlation_and_forecast(self):
        frame = pd.DataFrame({'date':pd.date_range('2026-01-01',periods=14).strftime('%Y-%m-%d'), 'views':range(100,114), 'sales':range(1,15)})
        result = analyze(frame)
        self.assertAlmostEqual(result['correlation'][0]['r'], 1)
        self.assertTrue(result['predict']['available'])
        self.assertEqual(len(result['predict']['points']),7)
        self.assertEqual(result['predict']['points'][0]['value'],15)
        self.assertIsNone(result['predict']['reason'])
        self.assertEqual(result['predict']['selected_model'], 'linear')
        self.assertEqual(result['predict']['evaluation']['train_days'], 11)
        self.assertEqual(result['predict']['evaluation']['scores'], {'linear': 0, 'last_value': 2})
        self.assertNotIn('accuracy', result['predict'])

    def test_xlsx_and_duplicate_headers(self):
        buffer = BytesIO()
        pd.DataFrame({'views':[4,8]}).to_excel(buffer,index=False)
        self.assertEqual(analyze(parse_file(buffer.getvalue(),'data.xlsx'))['rows'],2)
        with self.assertRaises(ValueError): parse_file(b'Views, views\n1,2\n','data.csv')

    def test_sentiment_is_lexicon_not_model(self):
        result = analyze(pd.DataFrame({'text':['love this','bad shipping','not good','where to buy?']}))
        self.assertEqual(result['sentiment']['counts'], {'positive':1,'neutral':1,'negative':2})  # 'not good' counts as negative now
        self.assertEqual(result['demand']['inquiries'],1)
        self.assertIn('word list',result['sentiment']['method'].lower())
        self.assertEqual(result['sentiment']['basis'],'comments')

    def test_captions_are_used_only_when_comment_text_is_missing(self):
        result = analyze(pd.DataFrame({'views':[1,2,3],'caption':['Amazing new drop','Weekend sale','Not great timing']}))
        self.assertEqual(result['sentiment']['basis'],'captions')
        self.assertFalse(result['demand']['available'])

    def test_partial_daily_target_is_not_forecast(self):
        frame = pd.DataFrame({'date':pd.date_range('2026-01-01',periods=14).strftime('%Y-%m-%d'), 'views':range(100,114), 'sales':range(1,15)})
        frame = pd.concat([frame,pd.DataFrame({'date':['2026-01-01'],'views':[3],'sales':[None]})],ignore_index=True)
        self.assertFalse(analyze(frame)['predict']['available'])

    def test_synthetic_provenance_survives_upload(self):
        result = analyze(pd.DataFrame({'views':[100],'dataset_label':['SYNTHETIC FICTIONAL DEMO']}))
        self.assertEqual(result['source_kind'],'synthetic')

    def test_missing_dates_and_gaps_do_not_get_filled(self):
        frame = pd.DataFrame({'date':pd.date_range('2026-01-01',periods=16).strftime('%Y-%m-%d'),'views':range(16)})
        self.assertFalse(analyze(frame.drop(index=5))['predict']['available'])
        frame.loc[0,'date']='bad date'
        result = analyze(frame)
        self.assertFalse(result['predict']['available'])
        self.assertTrue(any('invalid dates' in w for w in result['warnings']))

    def test_malformed_csv_width_never_silently_shifts_metrics(self):
        for content in [b'views,sales\n1,100,10\n2,200,20\n', b'views,sales\n100\n']:
            with self.assertRaises(ValueError): parse_file(content,'data.csv')

    def test_numeric_demand_explains_observed_signals(self):
        result = analyze(pd.DataFrame({'sales':[2],'saves':[10]}))
        self.assertTrue(result['demand']['available'])
        self.assertIsNone(result['demand']['reason'])
        self.assertIn('observed signals',result['demand']['notes'][0])

    def test_blank_xlsx_header_is_rejected(self):
        buffer=BytesIO()
        pd.DataFrame([[1,2]],columns=['views',None]).to_excel(buffer,index=False)
        with self.assertRaises(ValueError): parse_file(buffer.getvalue(),'data.xlsx')

class RecommendationTests(unittest.TestCase):
    def category_rows(self, second_sales=30):
        return pd.DataFrame({'category':['Low exposure']*3+['High exposure']*3,
                             'views':[400]*3+[4000]*3, 'sales':[20]*3+[second_sales]*3})

    def test_category_uses_paired_rate_not_raw_sales(self):
        items = analyze(self.category_rows())['recommend']
        category = next(item for item in items if item['title'].startswith('Test more '))
        self.assertIn('Low exposure', category['title'])
        for value in ('60 sales', '1200 views', '3 complete rows'):
            self.assertIn(value, category['details'])
        self.assertIn('matched-exposure', category['details'])

    def test_category_needs_two_eligible_categories_and_strict_winner(self):
        frames = [self.category_rows().iloc[:3], self.category_rows(200)]
        for frame in frames:
            with self.subTest(rows=len(frame)):
                self.assertFalse(any(item['title'].startswith('Test more ') for item in analyze(frame)['recommend']))

    def test_high_view_low_sales_post_experiment_and_duplicate_suppression(self):
        frame = pd.DataFrame({'post_id':['a','b','c','d'], 'views':[100,200,300,1400], 'sales':[10,20,30,1]})
        items = analyze(frame)['recommend']
        post = next(item for item in items if item['title'].startswith('Check offer and checkout for '))
        self.assertIn('d', post['title'])
        for value in ('1 sales', '1400 views', '4 eligible posts', '575'):
            self.assertIn(value, post['details'])
        frame.loc[0,'post_id']='d'
        self.assertFalse(any(item['title'].startswith('Check offer and checkout for ') for item in analyze(frame)['recommend']))

    def test_post_population_includes_beyond_ten_ranked_posts(self):
        frame = pd.DataFrame({'post_id':[f'p{i:02}' for i in range(12)],
                              'views':[100]*11+[1400], 'sales':[10]*11+[1]})
        items = analyze(frame)['recommend']
        post = next(item for item in items if item['title'].startswith('Check offer and checkout for '))
        self.assertIn('p11', post['title'])
        self.assertIn('12 eligible posts', post['details'])

    def test_post_rule_requires_population_and_exposure(self):
        for views, sales in [([100,200,1400], [10,20,1]),
                             ([100,200,300,399], [10,20,30,0]),
                             ([99,200,300,1400], [10,20,30,1]),
                             ([100,200,300,1400], [0,0,0,0])]:
            frame = pd.DataFrame({'post_id':list('abcd')[:len(views)], 'views':views, 'sales':sales})
            with self.subTest(views=views, sales=sales):
                self.assertFalse(any(item['title'].startswith('Check offer and checkout for ') for item in analyze(frame)['recommend']))

    def test_post_view_ties_choose_id_and_rules_keep_order(self):
        frame = pd.DataFrame({'post_id':['d','c','b','a','f','e'],
                              'category':['A']*3+['B']*3,
                              'views':[400,400,1400,1400,400,400],
                              'sales':[100,100,1,1,10,10], 'text':['where to buy?']*6})
        titles = [item['title'] for item in analyze(frame)['recommend']]
        self.assertEqual(titles[:3], ['Make buying easier',
                                     'Test more A content', 'Check offer and checkout for a'])
        self.assertTrue(titles[3].startswith('Compare '))
        self.assertEqual(titles[4], 'Answer observed buying questions')

    def test_text_only_guidance_has_no_numeric_ratio(self):
        for text, title in [('hello', 'Add more useful data'), ('where to buy?', 'Answer observed buying questions')]:
            items = analyze(pd.DataFrame({'text':[text]}))['recommend']
            self.assertEqual(items[0]['title'],title)
            self.assertNotIn('%', str(items))


class IntentTests(unittest.TestCase):
    def test_specific_calculations_and_reports(self):
        frame = pd.DataFrame({'date':pd.date_range('2026-01-01',periods=14).strftime('%Y-%m-%d'),'views':[100]*14,'sales':[0]*7+[1]*7,'post_id':['same']*14})
        result = analyze(frame)
        self.assertIn('7 sales / 1400 views',answer('technical sales rate',result))
        self.assertIn('excluded',answer('technical sales rate',result))
        growth = answer('technical sales growth trend',result)
        for value in ('2026-01-01','2026-01-07','2026-01-08','2026-01-14','zero'): self.assertIn(value,growth)
        self.assertIn('Repeated post IDs',answer('technical best post sales',result))
        for question in ('best post sales', 'best category sales', 'rank'):
            for limit in ('3 complete positive-view rows', '1,000 views', 'unique nonblank IDs', '100 views', 'Top 10', 'heuristics', 'not causal'):
                self.assertIn(limit, answer('technical ' + question, result))
        for value in ('linear','last_value'): self.assertIn(value,answer('technical forecast',result))
        for value in ('Ratios','Period comparisons','Rankings','Source:'): self.assertIn(value,report(result))
        self.assertIn('cannot fetch accounts',answer('Who won election?',result))
        text = analyze(pd.DataFrame({'text':['great where?']}))
        self.assertIsNone(text['sentiment']['reason'])
        self.assertIsNone(text['demand']['reason'])

    def test_correlation_words_and_report_limits(self):
        result = analyze(pd.DataFrame({'views':[1,2,3], 'sales':[1,3,2]}))
        for value in ('Pearson','Spearman','n=3','unadjusted'):
            self.assertIn(value,answer('technical correlation',result))
        for value in ('zero-view','1,000','14 UTC','n<10','last_value','holdout','lexicon','uplift'):
            self.assertIn(value,report(result))

if __name__ == '__main__': unittest.main()

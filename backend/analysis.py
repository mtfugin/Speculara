"""Stateless, deterministic analysis. Uploaded rows never persist on the server."""

import json

from backend.decisions import add_decision_fields, decision_answer, decision_report

import csv

import io

import re

import zipfile

from collections import Counter



import numpy as np

import pandas as pd



from backend.forecasting import forecast_daily



from backend.calculations import calculate_correlations, calculate_ratios, compare_periods, rank_performance



METRICS = ('views', 'likes', 'saves', 'comments', 'sales')

ALIASES = {'impressions':'views', 'purchases':'sales', 'orders':'sales', 'post_date':'date', 'timestamp':'date', 'comment':'text', 'review':'text', 'comment_text':'text', 'comment_body':'text', 'comment_content':'text', 'comments_text':'text', 'review_text':'text', 'reviews':'text', 'feedback':'text', 'customer_feedback':'text', 'message':'text', 'messages':'text', 'remarks':'text', 'remark':'text', 'reply':'text', 'replies':'text', 'post_type':'category', 'post':'post_id'}

MAX_ROWS = 20000

MAX_BYTES = 5 * 1024 * 1024






_POS = {'love','loved','loves','great','good','amazing','excellent','happy','awesome','nice','best','beautiful','perfect','wow','thanks','thank','recommend','recommended','fantastic','cute','lovely','wonderful','worth','legit','satisfied','fast','congrats','congratulations','proud','impressive','brilliant','favorite','yummy','delicious','salamat','ganda','maganda','galing','magaling','astig','sulit','solid','gusto','mabait','masarap','nindot','lami','gwapo','maayo','ganahan','mabuhay','ayos'}

_NEG = {'bad','hate','hated','poor','scam','broken','terrible','disappointed','disappointing','awful','worst','fake','slow','waste','useless','rude','late','damaged','ugly','boring','annoying','sad','angry','refund','complaint','problem','pangit','panget','sira','kadiri','bulok','bati','kapoy','nakakainis','dismaya','walang','hirap'}

_NEGATORS = {"not","never","no","dont","don't","isnt","isn't","wasnt","wasn't","cant","can't","cannot","without","hindi","di","wala","dili","indi"}

_EMOJI_POS = set('❤😍😊👍🔥🥰👏🎉😎✨💕💙💯')

_EMOJI_NEG = set('😡😠👎😢😞🤮😤💔💩😭')

_STOP = {'this','that','with','have','your','from','what','where','when','will','they','them','their','there','just','like','been','were','would','could','about','than','then','also','much','very','more','here','into','only','does','some','what','which','ang','mga','nga','kay','para','naman','lang','pero','sila','nila','siya'}


def _clean_texts(series) -> list[str]:
    return [t for t in series.dropna().astype(str).map(str.strip) if t]


def _score_text(text: str):
    """Word list score: positive words add one, negative words subtract one, and a negator just before a word flips it."""
    tokens = re.findall(r"[a-z']+", text.lower().replace('’', "'"))
    score = 0
    for i, tok in enumerate(tokens):
        value = 1 if tok in _POS else -1 if tok in _NEG else 0
        if value and any(t in _NEGATORS for t in tokens[max(0, i - 2):i]):
            value = -value
        score += value
    score += sum(1 for ch in text if ch in _EMOJI_POS) - sum(1 for ch in text if ch in _EMOJI_NEG)
    return score, [t.strip("'") for t in tokens]


def normalize_headers(headers):

    if any(pd.isna(h) or not str(h).strip() for h in headers):

        raise ValueError('Column names must be nonempty.')

    names = [ALIASES.get(re.sub(r'\W+', '_', str(h).strip().lower()).strip('_'), re.sub(r'\W+', '_', str(h).strip().lower()).strip('_')) for h in headers]

    if len(names) > 50:

        raise ValueError('Use at most 50 columns.')

    if len(names) != len(set(names)) or any(not n for n in names):

        raise ValueError('Column names must be nonempty and unique after normalization.')

    return names





def parse_file(data: bytes, filename: str) -> pd.DataFrame:

    if not data or len(data) > MAX_BYTES:

        raise ValueError('Upload a nonempty file up to 5 MB.')

    try:

        if filename.lower().endswith('.csv'):

            text = data.decode('utf-8-sig')

            reader = csv.reader(io.StringIO(text), strict=True)

            headers = next(reader)

            normalize_headers(headers)

            count = 0

            for row in reader:

                if not row: continue

                count += 1

                if len(row) != len(headers):

                    raise ValueError(f'CSV record {count + 1}: expected {len(headers)} fields, received {len(row)}.')

                if count > MAX_ROWS:

                    raise ValueError('Use at most 20,000 data rows.')

            frame = pd.read_csv(io.StringIO(text), nrows=MAX_ROWS + 1, dtype={header: 'string' for header, normalized in zip(headers, normalize_headers(headers)) if normalized == 'post_id'})

        elif filename.lower().endswith('.xlsx'):

            with zipfile.ZipFile(io.BytesIO(data)) as archive:

                if sum(z.file_size for z in archive.infolist()) > 30 * 1024 * 1024:

                    raise ValueError('Expanded workbook exceeds 30 MB.')

            from openpyxl import load_workbook

            book = load_workbook(io.BytesIO(data), read_only=True, data_only=True)

            try:

                rows = book.worksheets[0].iter_rows(values_only=True)

                headers = next(rows)

                normalize_headers(headers)

                values = []

                for row in rows:

                    if len(values) > MAX_ROWS: break

                    values.append(row)

                frame = pd.DataFrame(values, columns=headers).dropna(how='all')

            finally:

                book.close()

        else:

            raise ValueError('Supported formats: UTF-8 CSV and XLSX (first sheet).')

    except ValueError:

        raise

    except Exception as exc:

        raise ValueError('Cannot read this file. Check its format, headers and encoding.') from exc

    if frame.empty or len(frame) > MAX_ROWS or len(frame.columns) > 50:

        raise ValueError('Use 1 to 20,000 rows and at most 50 columns.')

    frame.columns = normalize_headers(frame.columns)

    return frame





def build_recommendations(df: pd.DataFrame, ratios: dict, rankings: dict, correlations: list[dict], demand: dict) -> list[dict]:

    """Suggest measured experiments only when their observed evidence is sufficient."""

    recommendations = []

    rate = ratios['sales_per_view']

    if rate['available']:

        recommendations.append({'experiment_kind':'sales', 'title':'Test the path from attention to purchase',

            'evidence':f"{rate['numerator']:g} sales / {rate['denominator']:g} views = {rate['percent']:.2f}% across {rate['n']} complete rows.",

            'action':'Review the offer and checkout link on high-view posts. Test one change and compare sales per view. This is a proxy, not attributed conversion.'})

    categories = rankings['categories']['sales_per_view']['rows']

    if len(categories) >= 2 and categories[0]['percent'] > categories[1]['percent']:

        top = categories[0]

        recommendations.append({'experiment_kind':'sales', 'title':f"Test more {top['label']} content",

            'evidence':f"{top['numerator']:g} sales / {top['views']:g} views = {top['percent']:.2f}% across {top['n']} complete rows; highest eligible category sales/view rate.",

            'action':'Run a small matched-exposure test before shifting budget. Exposure thresholds are heuristics, not statistical significance guarantees. No uplift is promised.'})

    if rate['available'] and all(column in df for column in ('post_id', 'views', 'sales')):

        labels = df['post_id'].astype('string').str.strip()

        named = labels.notna() & labels.ne('')

        if not labels[named].duplicated().any():

            # Use all eligible posts; ranking rows are display-capped at ten.

            posts = df.loc[named, ['views', 'sales']].dropna().copy()

            posts = posts.loc[posts['views'].ge(100)]

            posts['label'] = labels.loc[posts.index]

            if len(posts) >= 4 and posts['views'].sum() >= 1000:

                threshold = float(np.percentile(posts['views'], 75, method='linear'))

                candidates = posts.loc[posts['views'].ge(threshold) &

                    (posts['sales'] / posts['views'] * 100).lt(rate['percent'])]

                if not candidates.empty:

                    top = candidates.sort_values(['views', 'label'], ascending=[False, True]).iloc[0]

                    recommendations.append({'experiment_kind':'sales', 'post_id':str(top['label']), 'title':f"Check offer and checkout for {top['label']}",

                        'evidence':f"{top['sales']:g} sales / {top['views']:g} views = {top['sales']/top['views']*100:.2f}%, below paired overall {rate['percent']:.2f}% across {rate['n']} complete rows. {len(posts)} eligible posts; 75th percentile views = {threshold:g} (linear interpolation).",

                        'action':'Check the offer and buying instructions. Test one change with matched exposure; this proxy does not establish causation or promise uplift.'})

    if correlations:

        p = next((pair for pair in correlations if 'sales' in (pair['a'], pair['b'])), correlations[0])

        recommendations.append({'experiment_kind':'relationship', 'title':f"Investigate {p['a']} and {p['b']} together",'evidence':f"Pearson r = {p['r']:.3f}, n = {p['n']} complete pairs.",'action':'Inspect the underlying posts and test a plausible mechanism. Association does not establish causation; repeated dates may violate independence.'})

    if demand.get('inquiries',0):

        recommendations.append({'experiment_kind':'questions', 'title':'Answer observed buying questions','evidence':f"{demand['inquiries']} text rows contain question signals.",'action':'Review those comments and publish a buying FAQ. Verify intent manually before calling these leads.'})

    if not recommendations:

        recommendations.append({'title':'Collect decision-ready evidence','evidence':f'{len(df)} rows; available metrics: {", ".join(m for m in METRICS if m in df and df[m].notna().any()) or "text only"}.','action':'Add dated views, saves, sales and content categories. Compare like-for-like observations before changing spend.'})

    for item in recommendations:
        item['details'] = item['title'] + '. ' + item['evidence'] + ' ' + item['action']
        item['technical'] = {'finding': item['title'], 'evidence': item['evidence'], 'action': item['action']}
        if item['title'] == 'Test the path from attention to purchase':
            item['title'] = 'Make buying easier'
            item['evidence'] = f"{_count(rate['numerator'])} sales were recorded alongside {_count(rate['denominator'])} views."
            item['action'] = 'Review the offer and checkout link. Test one change and compare sales against views.'
        elif item['title'].startswith('Test more '):
            category = categories[0]
            item['evidence'] = f"{category['label']} had the highest sales compared with views: {_count(category['numerator'])} sales alongside {_count(category['views'])} views."
            item['action'] = 'Try similar content with a comparable audience before changing your budget.'
        elif item['title'].startswith('Check offer and checkout for '):
            item['evidence'] = f"{top['label']} drew {_count(top['views'])} views and {_count(top['sales'])} sales, a lower sales share than the overall dataset."
            item['action'] = 'Check the offer and buying instructions. Test one change with a comparable audience.'
        elif item['title'].startswith('Investigate '):
            item['title'] = f"Compare {p['a']} and {p['b']}"
            item['evidence'] = relationship_summary(p)['finding']
            item['action'] = 'Compare the entries and test one change. This pattern does not show cause and effect.'
        elif item['title'] == 'Answer observed buying questions':
            item['evidence'] = f"{_count(demand['inquiries'])} entries contain questions."
            item['action'] = 'Read those comments and answer recurring buying questions.'
        else:
            item['title'] = 'Add more useful data'
            item['evidence'] = f"The dataset contains {_count(len(df))} entries."
            item['action'] = 'Add dated views, sales, saves, and content categories to find a useful next step.'
    return recommendations





def analyze(frame: pd.DataFrame) -> dict:

    df = frame.copy()

    df.columns = normalize_headers(df.columns)

    preview_frame = df.copy()

    warnings = []

    labels = df['dataset_label'].dropna().astype(str) if 'dataset_label' in df else pd.Series(dtype=str)

    source_kind = 'synthetic' if len(labels) and labels.str.contains('synthetic', case=False).any() else 'uploaded'

    # No column is named like comments: use the one free-text column when the file has exactly one clear candidate.
    if 'text' not in df:
        known = set(METRICS) | {'date', 'post_id', 'category', 'region', 'dataset_label', 'type'}
        candidates = []
        for col in df.columns:
            if col in known or df[col].dtype.kind in 'biufM':
                continue
            vals = df[col].dropna().astype(str).str.strip()
            vals = vals[vals.ne('')]
            if len(vals) >= 3 and len(vals) >= 0.3 * len(df) and vals.str.len().mean() >= 20 and vals.str.contains(' ').mean() >= 0.7 and vals.nunique() >= 0.5 * len(vals):
                candidates.append(col)
        if len(candidates) == 1:
            df = df.rename(columns={candidates[0]: 'text'})
            warnings.append(f"Column '{candidates[0]}' looks like comments or reviews, so it was used for the comment check.")
    if source_kind == 'synthetic': warnings.append('Dataset includes records labeled synthetic. These are fictional examples, not observed campaign performance.')

    metrics = [m for m in METRICS if m in df]

    if not metrics and 'text' not in df:

        raise ValueError('Include views, likes, saves, comments, sales, or text. See demo files for the schema.')

    # Rows that hold only a comment's text (blank in every metric) are not observations of the metrics.
    # They are left out of metric coverage checks so a collected profile is not blocked by them.
    if metrics and 'text' in df:
        has_text = df['text'].notna() & df['text'].astype(str).str.strip().ne('')
        text_only = has_text & pd.concat([pd.to_numeric(df[m], errors='coerce') for m in metrics], axis=1).isna().all(axis=1)
    else:
        text_only = pd.Series(False, index=df.index)

    missing = {}

    for m in metrics:

        raw = df[m]

        values = pd.to_numeric(raw, errors='coerce')

        if (raw.notna() & values.isna()).any() or (values.dropna() < 0).any() or not np.isfinite(values.dropna()).all():

            raise ValueError(f'{m}: counts must be finite, nonnegative numbers; leave unknown values blank.')

        if (values.dropna() > 1e12).any():

            raise ValueError(f'{m}: each value must be at most 1 trillion.')

        df[m] = values

        missing[m] = int(values[~text_only].isna().sum())

        if missing[m]: warnings.append(f'{m}: {missing[m]} missing values excluded, not treated as zero.')

    duplicates = int(df.duplicated().sum())

    if duplicates: warnings.append(f'{duplicates} exact duplicate rows retained. Confirm they represent distinct observations.')

    totals = {m: float(df[m].sum()) for m in metrics if df[m].notna().any()}

    dated = None

    if 'date' in df:

        dates = pd.to_datetime(df['date'], errors='coerce', utc=True, format='mixed')

        if dates.isna().any(): warnings.append(f'{int(dates.isna().sum())} missing/invalid dates excluded from time analysis.')

        df['date'] = dates.dt.strftime('%Y-%m-%d')

        dated = df.dropna(subset=['date'])

    charts = {}

    for group in ('date', 'category', 'region', 'post_id'):

        if group in df:

            groups = df.dropna(subset=[group]).groupby(group, sort=True)[metrics].sum(min_count=1)

            if len(groups) > 365:

                warnings.append(f'{group} chart limited to first 365 sorted groups; totals still use all rows.')

            charts[group] = [{'label':str(k), **{m: None if pd.isna(v) else float(v) for m,v in row.items()}} for k,row in groups.head(365).iterrows()]

    correlations = calculate_correlations(df[~text_only])

    forecast = forecast_daily(df[~text_only])

    n_comments = totals.get('comments')
    sentiment = {'available':False,'reason':(f"Your data counts {n_comments:g} comments, but not the words in them. Sentiment needs the comment text itself. For a collected profile, use Sign in for comments and collect again. For a file, add one comment per row in a column named text. " if n_comments else '') + 'No comment text was found. Your file has these columns: ' + ', '.join(map(str, df.columns)) + '. Add a column named text, comment, review or feedback with one comment per row.'}

    demand = {'available':False,'reason':'Include sales, saves, or individual text to measure observed demand signals.'}

    comment_texts = _clean_texts(df['text']) if 'text' in df else []
    caption_texts = _clean_texts(df['caption']) if 'caption' in df else []
    basis = 'comments' if comment_texts else 'captions' if caption_texts else None
    texts = comment_texts or caption_texts
    if texts:
        counts = Counter({'positive':0,'neutral':0,'negative':0})
        words = Counter()
        scored = []
        inquiries = requests = 0
        for text in texts:
            score, tokens = _score_text(text)
            counts['positive' if score>0 else 'negative' if score<0 else 'neutral'] += 1
            scored.append((score, text))
            words.update(t for t in tokens if len(t)>3 and t not in _STOP)
            if basis == 'comments':
                inquiries += bool('?' in text or re.search(r'(how|where|when|magkano|pila|asa|unsa)',text,re.I))
                requests += bool(re.search(r'(restock|more|please|pabili|palihug|paorder)',text,re.I))
        examples = {
            'positive': [t[:220] for sc, t in sorted((x for x in scored if x[0] > 0), key=lambda x: -x[0])[:3]],
            'negative': [t[:220] for sc, t in sorted((x for x in scored if x[0] < 0), key=lambda x: x[0])[:3]],
        }
        notes = ['Comment text was not found, so this reads post captions only. It shows how the posts are worded, not how people reacted.'] if basis == 'captions' else []
        sentiment = {'available':True,'reason':None,'basis':basis,'notes':notes,'method':'English, Filipino and Bisaya word list with negation and emoji. Not a trained model; it misses sarcasm and context.','n':len(texts),'counts':dict(counts),'keywords':[{'word':w,'count':c} for w,c in words.most_common(12)],'examples':examples}
        if basis == 'comments':
            demand = {'available':True,'inquiries':inquiries,'requests':requests,'text_rows':len(texts),'reason':None,'notes':['Question/request text signals may overlap; they are not unique buyers or confirmed purchases.']}

    if 'sales' in totals or 'saves' in totals:

        if not demand['available']:

            demand['notes'] = ['Sales and saves are observed signals. Saves do not establish purchase intent or measure unique buyers.']

            demand['reason'] = None

        demand.update({'available':True,'sales':totals.get('sales'),'saves':totals.get('saves')})

    ratios = calculate_ratios(df[~text_only])

    periods = compare_periods(df[~text_only])

    rankings = rank_performance(df[~text_only])

    recommendations = build_recommendations(df[~text_only], ratios, rankings, correlations, demand)

    warnings.append('Rows are treated as independent records; verify grain and avoid repeated post totals across comment rows. No social account is connected.')

    comments = []
    if basis == 'comments':
        for i, (_, row) in enumerate(df[df['text'].notna()].iterrows()):
            text = str(row['text']).strip()
            if not text:
                continue
            score, _tokens = _score_text(text)
            comments.append({'id': f'c{i}', 'text': text[:2000], 'tone': 'pos' if score > 0 else 'neg' if score < 0 else 'neu', 'score': score,
                             'post_id': None if pd.isna(row.get('post_id')) else str(row.get('post_id')),
                             'post_type': None if pd.isna(row.get('category')) else str(row.get('category')),
                             'posted_at': None if pd.isna(row.get('date')) else str(row.get('date'))})
            if len(comments) >= 20000:
                break

    result = {'schema_version':2,'ratios':ratios,'periods':periods,'rankings':rankings,'source_kind':source_kind,'rows':len(df),'columns':list(df.columns),'metrics':list(totals),'missing':missing,'totals':totals,'warnings':warnings,'charts':charts,'correlation':correlations,'predict':forecast,'sentiment':sentiment,'comment_texts':[t[:300] for t in comment_texts[:150]],'comments':comments,'demand':demand,'recommend':recommendations}

    add_decision_fields(result, preview_frame, period_summary)
    return result





def technical_answer(question: str, result: dict) -> str:

    q = question.lower()

    if re.search(r'growth|period|week|change|increase|decrease',q):

        return '\n'.join(f"{k}: previous {p['previous_start']} to {p['previous_end']}; current {p['current_start']} to {p['current_end']}. " + (f"Previous {p['previous_total']}, current {p['current_total']} {k}; absolute change {p['absolute_change']} {k}; percentage change {p['percent_change'] if p['percent_change'] is not None else p['percent_change_reason']}." if p['available'] else p['reason']) for k,p in result['periods'].items()) or 'Period comparisons unavailable: need dated numeric metrics and all 14 calendar dates.'

    if re.search(r'ratio|\brate\b|conversion|per.view',q):

        return '\n'.join(f"{k}: " + (f"{r['numerator']:g} {r['numerator_metric']} / {r['denominator']:g} views = {r['percent']:g}%" if r['available'] else r['reason']) + f". {r['n']} complete rows; {r['excluded_rows']} excluded rows; {r['zero_view_rows']} zero-view rows. " + ' '.join(r['notes']) for k,r in result['ratios'].items())

    if re.search(r'rank|best.post|best.category|top.post|top.category',q):

        return '\n'.join(f"{g} {k}: " + ('; '.join(f"{r['label']}: {r['numerator']:g} / {r['views']:g} views = {r['percent']:g}%, {r['n']} complete rows" for r in item['rows']) if item['available'] else item['reason']) + f". {item['excluded_groups']} excluded groups." for g,rs in result['rankings'].items() for k,item in rs.items()) + '\nCategory rankings require at least 3 complete positive-view rows and 1,000 views; posts require unique nonblank IDs and 100 views. Top 10 results; exposure thresholds are heuristics, not significance guarantees. Rankings are not causal.'

    if re.search(r'forecast|predict|accuracy|trend|last|long|mae|model',q):

        f = result['predict']

        return (f"{f['metric']} forecast: next day {f['points'][0]['value']:g}. Selected model: {f['selected_model']}; linear MAE: {f['evaluation']['scores']['linear']}; last_value MAE: {f['evaluation']['scores']['last_value']}; holdout dates: {', '.join(f['evaluation']['holdout_dates'])}. {' '.join(f['notes'])} Held-out three-day MAE: {f['mae']:g} {f['metric']}. {f['method']} Trend lifespan is not estimated." if f['available'] else f['reason'])

    if re.search(r'correl|relat|link|pearson|spearman',q):

        pairs = result['correlation']

        return (f"Strongest absolute association: {pairs[0]['a']} and {pairs[0]['b']}, Pearson r={pairs[0]['r']}, p={pairs[0]['p']}; Spearman rho={pairs[0]['spearman_r']}, p={pairs[0]['spearman_p']}, n={pairs[0]['n']} (exploratory small sample if n<10; unadjusted p-values assume independence). Association is not causation." if pairs else 'No nonconstant numeric pairs with at least three complete rows.')

    if re.search(r'sentiment|keyword|feel|comment|word',q):

        s = result['sentiment']

        return (f"Text labels: {s['counts']}, n={s['n']}. {s['method']}" if s['available'] else s['reason'])

    if re.search(r'recommend|action|next|strategy|should',q):

        return '\n\n'.join(f"{r['title']}: {r['evidence']} {r['action']}" for r in result['recommend'])

    if re.search(r'demand|inquir|request',q):

        d = result['demand']

        return (f"Observed demand: sales={d.get('sales','not supplied')}, saves={d.get('saves','not supplied')}, question rows={d.get('inquiries','not supplied')}, request rows={d.get('requests','not supplied')}. These are signals, not unique buyers. {' '.join(d.get('notes',[]))}" if d['available'] else d['reason'])

    if re.search(r'total|view|save|sale|like|chart|summary',q):

        return 'Dataset totals: '+', '.join(f'{k}: {v:,.0f}' for k,v in result['totals'].items())+f". {result['rows']} rows. Missing counts are excluded."

    return 'Ask about totals, forecasts, correlation, sentiment, demand, or recommended actions. I can only explain the current uploaded dataset; I cannot infer causes, fetch accounts, or estimate unmeasured outcomes.'





def _count(value):
    return f"{value:,.2f}".rstrip('0').rstrip('.') if value is not None else 'unknown'


def friendly_unavailable(kind, reason=''):
    if re.search('repeated|duplicate', reason or '', re.I):
        return 'Repeated names cannot tell records apart. Give each post its own name, then compare again.'
    if kind == 'forecast': return 'Add at least 14 days of complete daily counts to estimate what comes next.'
    if kind == 'period': return 'Add complete counts for two full weeks to compare them.'
    if kind == 'sentiment': return 'Add comments or reviews to see how people feel.'
    if kind == 'relationship': return 'Add more entries with two changing counts to look for a connection.'
    if kind == 'ranking': return 'Add named posts or categories with enough views to compare them.'
    return 'Add views, sales, saves, or comments to find a useful next step.'


def relationship_summary(pair):
    magnitude = abs(pair['r'])
    strength = 'No clear pattern' if magnitude < .3 else 'Some connection' if magnitude < .7 else 'Strong connection'
    direction = 'No clear pattern' if magnitude < .3 else 'Move in opposite directions' if pair['r'] < 0 else 'Move together'
    finding = (f"{pair['a']} and {pair['b']} show no clear pattern." if magnitude < .3 else
               f"When {pair['a']} were higher, {pair['b']} tended to be {'lower' if pair['r'] < 0 else 'higher'}.")
    return dict(direction=direction, strength=strength, finding=finding, note='Early finding: more data could change this.' if pair['n'] < 10 else 'This does not show that one causes the other.')


def period_summary(metric, period):
    if not period['available']: return friendly_unavailable('period', period['reason'])
    delta = period['absolute_change'] or 0
    movement = 'the same as the previous week' if delta == 0 else f"{'up' if delta > 0 else 'down'} {_count(abs(delta))} from the previous week"
    return f"In the latest week of your data there were {_count(period['current_total'])} {metric}, {movement}." + (f" There is no percentage change because the previous week had no {metric}." if period['previous_total'] == 0 else '')


def demand_summary(result):
    for metric in ('sales', 'saves'):
        period = result['periods'].get(metric)
        if period and period['available']: return period_summary(metric, period)
        total = result['totals'].get(metric, result['demand'].get(metric))
        if total is not None: return f'The dataset records {_count(total)} {metric}.'
    questions = result['demand'].get('inquiries')
    if questions is not None: return f"{_count(questions)} {'entry contains a question' if questions == 1 else 'entries contain questions'}. Review them and answer recurring buying questions."
    return friendly_unavailable('demand')


def answer(question: str, result: dict) -> str:
    q = question.lower()
    if re.search(r'technical|pearson|spearman|p.value|mae|model|method|calculation|threshold|forecast error', q): return technical_answer(question, result)
    extra = decision_answer(question, result)
    if extra is not None: return extra
    if re.search(r'negative|correl|relat|link', q) and not re.search(r'comment|review|sentiment|feedback', q):
        pairs = result['correlation']
        pair = next((p for p in pairs if p['r'] < 0), pairs[0] if pairs else None) if 'negative' in q else pairs[0] if pairs else None
        concept = 'Negative means two counts tend to move in opposite directions; it is not automatically bad. ' if 'negative' in q else ''
        summary = relationship_summary(pair) if pair else None
        return concept + (summary['finding'] + ' ' + summary['note'] + ' Compare the entries before choosing a change.' if summary else friendly_unavailable('relationship'))
    if re.search(r'recommend|strategy|next (action|step|decision)|what (should|can) i (do|try|change)', q):
        limit = 3 if re.search(r'more|all|another|three|3', q) else 1
        return '\n\n'.join(f"{r['title']}. {r['evidence']} {r['action']}" for r in result['recommend'][:limit]) or friendly_unavailable('recommendation')
    if re.search(r'growth|period|week|change|increase|decrease', q):
        metric = next((m for m in result['metrics'] if m in q), 'sales' if 'sales' in result['periods'] else next(iter(result['periods']), None))
        return period_summary(metric, result['periods'][metric]) if metric in result['periods'] else friendly_unavailable('period')
    if re.search(r'ratio|\brate\b|conversion|per.view', q) and not re.search(r'rank|best.post|best.category|top.post|top.category', q):
        requested = next((m for m in ('sales', 'saves', 'likes', 'comments') if m in q), None)
        metric = requested or 'sales'
        ratio = result['ratios'].get(metric + '_per_view') or (None if requested else next(iter(result['ratios'].values()), None))
        return f"{_count(ratio['numerator'])} {ratio['numerator_metric']} were recorded alongside {_count(ratio['denominator'])} views ({_count(ratio['percent'])}%). Review the offer and test one change." if ratio and ratio['available'] else friendly_unavailable('ratio')
    if re.search(r'rank|best.post|best.category|top.post|top.category', q):
        group = result['rankings']['categories' if 'category' in q else 'posts']
        requested = next((m for m in ('sales', 'saves', 'likes', 'comments') if m in q), None)
        metric = requested or 'sales'
        ranking = group.get(metric + '_per_view') or ({} if requested else next(iter(group.values()), {}))
        rows = ranking.get('rows', [])
        return f"{rows[0]['label']} leads this comparison: {_count(rows[0]['numerator'])} {metric} alongside {_count(rows[0]['views'])} views. Test similar content with a comparable audience." if rows else friendly_unavailable('ranking', ranking.get('reason'))
    if re.search(r'forecast|predict|accuracy|trend|last|long', q):
        forecast = result['predict']
        return f"Next-day estimate: {_count(forecast['points'][0]['value'])} {forecast['metric']}. Compare it with the actual count tomorrow; this is an estimate, not a promise." if forecast['available'] else friendly_unavailable('forecast')
    if re.search(r'sentiment|keyword|feel|comment|word|review|feedback', q):
        sentiment = result['sentiment']
        if not sentiment['available']: return friendly_unavailable('sentiment')
        if re.search(r'keyword|top.words', q):
            words = sentiment.get('keywords', [])
            return f"The most common word is \"{words[0]['word']}\" ({_count(words[0]['count'])} mentions). Read the comments to check its context." if words else friendly_unavailable('sentiment')
        requested = next((label for label in ('negative', 'positive', 'neutral') if label in q), None)
        label, count = (requested, sentiment['counts'].get(requested, 0)) if requested else max(sentiment['counts'].items(), key=lambda item: item[1])
        prefix = 'The requested text label is' if requested else 'The most common text label is'
        return f'{prefix} {label} ({_count(count)} entries). Read a few comments to check context.'
    if re.search(r'demand|inquir|request', q): return demand_summary(result)
    if re.search(r'total|view|save|sale|like|chart|summary', q):
        metric = next((m for m in result['metrics'] if m in q), 'sales' if 'sales' in result['totals'] else next(iter(result['totals']), None))
        action = result['recommend'][0]['action'] if result['recommend'] else 'Add dated counts to compare weeks.'
        return f"The dataset records {_count(result['totals'][metric])} {metric} across {_count(result['rows'])} entries. {action}" if metric else demand_summary(result)
    if not re.search(r'recommend|action|next|strategy|should|more|another', q): return 'Ask about this dataset totals, forecasts, relationships, comments, demand, or next actions. I cannot fetch accounts or infer causes.'
    limit = 3 if re.search(r'more|all|another|three|3', q) else 1
    return '\n\n'.join(f"{r['title']}. {r['evidence']} {r['action']}" for r in result['recommend'][:limit]) or friendly_unavailable('recommendation')


CALCULATION_LIMITS = 'Ratios use paired sums, include known zero-view rows and are proxies, not attributed conversion; ratios above 100% may reflect inconsistent measurement scopes. Category rankings require 3 complete positive-view rows and 1,000 views; posts require unique nonblank IDs and 100 views. Top 10 rates, then label order; exposure thresholds are heuristics, not significance guarantees. Periods require all 14 UTC dates and complete values; invalid dates block comparison; missing dates are not zero; missing values outside the windows do not block them. A zero previous total leaves percentage change undefined, including zero-to-zero. Pearson and Spearman need 3 nonconstant complete pairs; n<10 is exploratory, p-values unadjusted and assume independence. Forecasts need 14-365 consecutive dates; linear and last_value share the final 3-date holdout, lowest unrounded MAE wins, ties favor last_value; selected model refits all dates for seven projected dates. Target priority is sales, views, saves, likes, comments. One small holdout comparison, not validated generalization performance. No seasonality, uncertainty, percentage accuracy, causal effects or promised uplift. Category tests need two eligible categories and a strict winner. Post tests need four eligible unique posts and 1,000 views, at or above the linearly interpolated 75th percentile of views with sales/view below the paired overall rate; highest views then ID wins. Text remains a limited English/Filipino lexicon; negation neutral, sarcasm/context unsupported.'





def report(result: dict, source: str = 'Current dataset') -> str:

    sections = [('Recommended decisions','recommend'),('Ratios','ratio'),('Period comparisons','growth'),('Rankings','rank'),('Forecast','forecast'),('Correlation','correlation'),('Sentiment','sentiment'),('Demand','demand')]

    return '# Speculara analysis report\n\nSource: '+source+'\nSchema version: 2\n\n'+decision_report(result)+'\n\n'+answer('summary',result)+''.join('\n\n## '+title+'\n\n'+(technical_answer(intent,result) if intent != 'recommend' else answer(intent,result)) for title,intent in sections)+'\n\n## Limitations\n\n'+CALCULATION_LIMITS+'\n'+'\n'.join('- '+w for w in result['warnings'])+'\n\n## Full computed results\n\n```json\n'+json.dumps(result,indent=2,allow_nan=False)+'\n```\n'


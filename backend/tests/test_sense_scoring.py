import unittest
from datetime import date, timedelta
from unittest import mock

from backend.sense import scoring
from backend.sense.model import EvidenceStore, Observation

TODAY = date(2026, 6, 30)
B, T = "Poblacion", "affordability"


def demand(i, d, source, conf="medium", label="real", barangay=B, theme=T):
    return Observation(id=i, kind="demand", basis="observed", theme=theme, barangay=barangay, source=source,
                       collected_at=d, confidence=conf, data_label=label, quote="invented quote")


def supply(i, theme="oat milk", barangay=B, label="real", frictions=None, d="2026-06-01"):
    return Observation(id=i, kind="supply", basis="observed", theme=theme, barangay=barangay, source="invented menu",
                       collected_at=d, confidence="high", data_label=label,
                       extra={"frictions": frictions} if frictions else {})


def store_of(*obs):
    s = EvidenceStore()
    for o in obs:
        s.add(o)
    return s


def hand_demand(label="real"):
    rows = [("06-29", "A", "high"), ("06-22", "B", "high"), ("06-15", "A", "medium"), ("06-08", "C", "low"),
            ("05-20", "A", "high"), ("05-11", "B", "medium"), ("05-25", "C", "low"),
            ("04-15", "A", "medium"), ("04-01", "B", "low")]
    return [demand(f"h{n}", f"2026-{d}", f"src {s}", c, label) for n, (d, s, c) in enumerate(rows)]


def strong_demand(barangay="Strong"):
    out = []
    for k in range(20):
        d = (TODAY - timedelta(days=k * 3)).isoformat()
        out.append(demand(f"s{barangay}{k}", d, f"src {k % 4}", "high" if k % 4 else "medium", barangay=barangay))
    return out


def weak_demand(barangay="Weak"):
    return [demand(f"w{barangay}{k}", "2026-06-20", f"src {k % 2}", "low", barangay=barangay) for k in range(5)]


class ScoringTests(unittest.TestCase):
    def test_hand_computed(self):
        s = store_of(*hand_demand(), supply("p1", theme="budget set", frictions=[T]), supply("p2"))
        r = scoring.score_pair(s, B, T, today=TODAY)
        c = r.components
        self.assertEqual(r.verdict, "score")
        self.assertAlmostEqual(c["intensity"].normalized, 9 / 20)
        self.assertEqual((c["growth"].raw > 0.33, c["growth"].status), (True, "ok"))
        self.assertAlmostEqual(c["growth"].normalized, 0.5 + (1 / 3) / 2)
        self.assertAlmostEqual(c["pain"].normalized, 3 / 9)
        self.assertAlmostEqual(c["supply"].normalized, 0.8)
        self.assertEqual(c["persistence"].raw, 9)
        self.assertAlmostEqual(c["persistence"].normalized, 1.0)
        self.assertAlmostEqual(c["independence"].normalized, 0.75)
        # 0.25*0.45 + 0.15*(2/3) + 0.15*(1/3) + 0.20*0.8 + 0.15*1 + 0.10*0.75 = 0.6475
        self.assertAlmostEqual(r.score, 64.75, places=6)
        self.assertEqual(r.confidence, "medium")

    def test_strong_beats_weak(self):
        s = store_of(*strong_demand(), *weak_demand(), supply("ps", barangay="Strong"), supply("pw", barangay="Weak"))
        strong = scoring.score_pair(s, "Strong", T, today=TODAY)
        weak = scoring.score_pair(s, "Weak", T, today=TODAY)
        self.assertEqual(weak.verdict, "score")
        self.assertGreater(strong.score, weak.score)
        self.assertEqual(strong.confidence, "high")

    def test_missing_supply_does_not_raise_score(self):
        base = hand_demand()
        none = scoring.score_pair(store_of(*base), B, T, today=TODAY)
        uncovered = scoring.score_pair(store_of(*base, supply("p2")), B, T, today=TODAY)
        covered = scoring.score_pair(store_of(*base, supply("p1", theme=T)), B, T, today=TODAY)
        self.assertEqual(none.components["supply"].status, "missing")
        self.assertEqual(none.components["supply"].effective_weight, 0.0)
        self.assertLessEqual(none.score, uncovered.score)
        self.assertGreater(uncovered.score, covered.score)
        self.assertTrue(any("Supply is missing" in x for x in none.reasons))
        # supply in another barangay does not count
        elsewhere = scoring.score_pair(store_of(*base, supply("p3", barangay="Bel-Air")), B, T, today=TODAY)
        self.assertEqual(elsewhere.components["supply"].status, "missing")

    def test_too_few_observations(self):
        r = scoring.score_pair(store_of(*weak_demand()[:4]), "Weak", T, today=TODAY)
        self.assertEqual(r.verdict, "insufficient evidence")
        self.assertIsNone(r.score)
        self.assertEqual(r.confidence, "low")
        self.assertTrue(any("Only 4 observations" in x for x in r.reasons))

    def test_one_source(self):
        obs = [demand(f"o{k}", f"2026-06-{10 + k}", "only source") for k in range(8)]
        r = scoring.score_pair(store_of(*obs), B, T, today=TODAY)
        self.assertEqual(r.verdict, "insufficient evidence")
        self.assertIsNone(r.score)
        self.assertTrue(any("independent source" in x for x in r.reasons))

    def test_no_evidence_and_too_few_components(self):
        self.assertEqual(scoring.score_pair(EvidenceStore(), B, T, today=TODAY).verdict, "insufficient evidence")
        s = store_of(*hand_demand())
        with mock.patch.object(scoring, "MIN_OK_COMPONENTS", 7):
            r = scoring.score_pair(s, B, T, today=TODAY)
        self.assertEqual(r.verdict, "insufficient evidence")
        self.assertTrue(any("components have data" in x for x in r.reasons))

    def test_weights_renormalized(self):
        # no supply and too little growth data: those two are missing
        obs = [demand(f"r{k}", f"2026-04-{k + 1:02d}", f"src {k % 2}", "high") for k in range(6)]
        r = scoring.score_pair(store_of(*obs), B, T, today=TODAY)
        c = r.components
        self.assertEqual((c["growth"].status, c["supply"].status), ("missing", "missing"))
        ok_total = 0.25 + 0.15 + 0.15 + 0.10
        self.assertAlmostEqual(c["intensity"].effective_weight, 0.25 / ok_total)
        self.assertAlmostEqual(sum(x.effective_weight for x in c.values()), 1.0)
        # six observations in six days of April fall in 2 ISO weeks (Wed 1 Apr to Mon 6 Apr)
        self.assertEqual(c["persistence"].raw, 2)
        expected = 100 * (0.25 * 0.3 + 0.15 * 1.0 + 0.15 * (2 / 8) + 0.10 * 0.5) / ok_total
        self.assertAlmostEqual(r.score, round(expected, 2), places=6)

    def test_growth_missing_with_too_little_data(self):
        obs = hand_demand()
        obs = [o for o in obs if o.collected_at != "2026-05-11" and o.collected_at != "2026-05-20"]  # earlier window: 1
        r = scoring.score_pair(store_of(*obs), B, T, today=TODAY)
        self.assertEqual(r.components["growth"].status, "missing")
        self.assertIsNone(r.components["growth"].normalized)
        self.assertIn("Not enough data", r.components["growth"].note)

    def test_illustrative_label_carried(self):
        s = store_of(*hand_demand("illustrative"))
        r = scoring.score_pair(s, B, T, today=TODAY)
        self.assertEqual(r.verdict, "score")
        self.assertIn("illustrative", r.data_labels)
        self.assertTrue(any("illustrative" in x for x in r.reasons))
        self.assertEqual(r.confidence, "low")
        real = scoring.score_pair(store_of(*hand_demand()), B, T, today=TODAY)
        self.assertNotIn("illustrative", real.data_labels)
        self.assertFalse(any("illustrative" in x for x in real.reasons))

    def test_inferred_ignored(self):
        base = hand_demand()
        plain = scoring.score_pair(store_of(*base), B, T, today=TODAY)
        s = store_of(*base)
        s.add(Observation(id="inf1", kind="demand", basis="inferred", theme=T, barangay=B, source="rule",
                          collected_at="2026-06-28", confidence="high", data_label="real", model="rule v1",
                          derived_from=["h0"]))
        self.assertEqual(scoring.score_pair(s, B, T, today=TODAY).score, plain.score)

    def test_future_observations_ignored(self):
        base = hand_demand()
        extra = demand("late", "2026-07-15", "src Z", "high")
        self.assertEqual(scoring.score_pair(store_of(*base, extra), B, T, today=TODAY).score,
                         scoring.score_pair(store_of(*base), B, T, today=TODAY).score)

    def test_score_all_order_and_determinism(self):
        obs = strong_demand() + weak_demand() + weak_demand("Tiny")[:3] + hand_demand()
        sup = [supply("ps", barangay="Strong")]
        a = scoring.score_all(store_of(*obs, *sup), today=TODAY)
        b = scoring.score_all(store_of(*reversed(obs), *sup), today=TODAY)
        self.assertEqual([(r.barangay, r.theme, r.score) for r in a], [(r.barangay, r.theme, r.score) for r in b])
        self.assertEqual(a[0].barangay, "Strong")
        verdicts = [r.verdict for r in a]
        self.assertEqual(verdicts, sorted(verdicts, key=lambda v: v == "insufficient evidence"))
        self.assertEqual(a[-1].barangay, "Tiny")
        self.assertEqual(len(a), 4)
        scores = [r.score for r in a if r.score is not None]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertEqual(scoring.score_pair(store_of(*obs), "Strong", T, today=TODAY),
                         scoring.score_pair(store_of(*obs), "Strong", T, today=TODAY))


if __name__ == "__main__":
    unittest.main()

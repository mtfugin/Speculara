"""Measure numbers checked against figures worked out by hand, through the same path a collected profile takes.

Sample: 30 days, one post a day. Day d (1 to 30) has views 100 + 5d, likes 10 + d, comments 2, and one comment text row.
Hand figures:
  views, latest 7 days (24..30): 7*100 + 5*(24+...+30 = 189) = 1645; previous 7 days (17..23, sum 140): 700 + 700 = 1400.
  change = (1645 - 1400) / 1400 = 17.5%.
  likes: current 7*10 + 189 = 259, previous 70 + 140 = 210, change 49/210 = 23.333...%.
  comments: 14 and 14, change 0%.
  views over all 30 days: 3000 + 5*465 = 5325. likes: 300 + 465 = 765. comments: 60.
  views and likes rise in step, so Pearson r = 1 and Spearman rho = 1 with n = 30.
  linear trend on views: day 31..37 = 255, 260, ..., 285.
"""
import unittest
from datetime import datetime, timezone

from backend import profile_import
from backend.analysis import analyze
from backend.app.schemas import CommentEvidence, Post
from backend.calculations import calculate_correlations

import pandas as pd


def profile_frame(days=30):
    posts = [
        Post(id=f"p{d}", type="Video", posted_at=datetime(2026, 9, d, 10, tzinfo=timezone.utc),
             likes=10 + d, comments=2, views=100 + 5 * d,
             comment_evidence=[CommentEvidence(text="how much?", source_kind="post")],
             unavailable_metrics=["shares", "saves", "sales"])
        for d in range(1, days + 1)
    ]
    return profile_import.posts_to_frame(posts)


class MeasureVerification(unittest.TestCase):
    def setUp(self):
        self.result = analyze(profile_frame())

    def test_totals(self):
        self.assertEqual(self.result["totals"], {"views": 5325.0, "likes": 765.0, "comments": 60.0})

    def test_seven_day_comparison_works_with_comment_rows_present(self):
        periods = self.result["periods"]
        self.assertTrue(periods["views"]["available"], periods["views"]["reason"])
        self.assertEqual((periods["views"]["current_total"], periods["views"]["previous_total"]), (1645.0, 1400.0))
        self.assertAlmostEqual(periods["views"]["percent_change"], 17.5, places=9)
        self.assertEqual((periods["likes"]["current_total"], periods["likes"]["previous_total"]), (259.0, 210.0))
        self.assertAlmostEqual(periods["likes"]["percent_change"], 23.3333333333, places=6)
        self.assertEqual(periods["comments"]["percent_change"], 0.0)
        self.assertEqual((periods["views"]["current_start"], periods["views"]["previous_end"]), ("2026-09-24", "2026-09-23"))

    def test_comment_rows_are_not_reported_as_missing_counts(self):
        self.assertEqual(self.result["missing"], {"views": 0, "likes": 0, "comments": 0})
        self.assertFalse([w for w in self.result["warnings"] if "missing values excluded" in w])

    def test_correlation_is_exact_for_a_straight_line(self):
        pair = next(c for c in self.result["correlation"] if {c["a"], c["b"]} == {"views", "likes"})
        self.assertEqual(pair["n"], 30)
        self.assertAlmostEqual(pair["r"], 1.0, places=4)
        self.assertAlmostEqual(pair["spearman_r"], 1.0, places=9)
        self.assertFalse(pair["small_sample"])

    def test_correlation_matches_a_hand_worked_example(self):
        # x = 1..5, y = 2,4,5,4,5: Sxy = 6, Sxx = 10, Syy = 6, r = 6 / sqrt(60) = 0.7746
        frame = pd.DataFrame({"views": [1, 2, 3, 4, 5], "likes": [2, 4, 5, 4, 5]})
        pair = calculate_correlations(frame)[0]
        self.assertAlmostEqual(pair["r"], 0.7746, places=4)
        self.assertEqual(pair["n"], 5)
        self.assertTrue(pair["small_sample"])  # fewer than 10 pairs is flagged

    def test_forecast_follows_the_straight_line(self):
        forecast = self.result["predict"]
        self.assertTrue(forecast["available"], forecast.get("reason"))
        self.assertEqual(forecast["metric"], "views")
        self.assertEqual(forecast["selected_model"], "linear")
        self.assertEqual([p["value"] for p in forecast["points"]], [255.0, 260.0, 265.0, 270.0, 275.0, 280.0, 285.0])
        self.assertEqual(forecast["points"][0]["label"], "2026-10-01")
        self.assertEqual(forecast["mae"], 0.0)
        self.assertTrue(any("not validated" in n for n in forecast["notes"]))

    def test_unknown_counts_stay_out_of_totals_and_comparisons(self):
        # one post has no counts at all: it must not count as zero, and it blocks the comparison honestly
        frame = profile_frame()
        mask = frame["post_id"] == "p28"
        frame.loc[mask, ["views", "likes", "comments"]] = None
        result = analyze(frame)
        self.assertEqual(result["totals"]["views"], 5325.0 - (100 + 5 * 28))
        self.assertEqual(result["missing"]["views"], 1)
        self.assertFalse(result["periods"]["views"]["available"])
        self.assertIn("Missing views", result["periods"]["views"]["reason"])
        self.assertFalse(result["predict"]["available"])

    def test_too_few_days_says_so(self):
        result = analyze(profile_frame(days=10))
        self.assertFalse(result["periods"]["views"]["available"])
        self.assertIn("14 calendar dates", result["periods"]["views"]["reason"])
        self.assertFalse(result["predict"]["available"])
        self.assertIn("14 to 365", result["predict"]["reason"])


if __name__ == "__main__":
    unittest.main()

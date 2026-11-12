import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import profile_import
from backend.analysis import analyze
from backend.app import collector
from backend.app.schemas import CommentEvidence, Post, ProfileInfo
from backend.main import app

client = TestClient(app)


def make_posts(days=16):
    posts = []
    for d in range(1, days + 1):
        posts.append(Post(
            id=f"p{d}", type="Video" if d % 2 else "Photo",
            posted_at=datetime(2026, 9, d, 10, tzinfo=timezone.utc),
            likes=10 + d, comments=2, views=100 + d * 5, url=f"https://www.instagram.com/p/p{d}/",
            unavailable_metrics=["saves", "sales"],
            comment_evidence=[CommentEvidence(text="love it, how much?", source_kind="post")],
        ))
    return posts


class ProfileFrameTests(unittest.TestCase):
    def test_counts_are_not_repeated_on_comment_rows(self):
        frame = profile_import.posts_to_frame(make_posts())
        result = analyze(frame)
        self.assertEqual(result["totals"]["likes"], sum(10 + d for d in range(1, 17)))
        self.assertNotIn("sales", result["totals"])  # unknown stays unknown, not zero
        self.assertNotIn("saves", result["totals"])
        self.assertEqual(result["sentiment"]["n"], 16)

    def test_unavailable_metric_is_blank(self):
        post = make_posts(1)[0]
        post.unavailable_metrics = ["views", "saves", "sales"]
        frame = profile_import.posts_to_frame([post])
        self.assertNotIn("views", frame.columns)

    def test_no_posts_is_an_error(self):
        with self.assertRaises(ValueError):
            profile_import.posts_to_frame([])

    def test_local_only_rule(self):
        origins = ["http://localhost:8443"]
        self.assertTrue(profile_import.is_local_request("127.0.0.1", "http://localhost:8443", origins))
        self.assertTrue(profile_import.is_local_request("::1", None, origins))
        self.assertFalse(profile_import.is_local_request("203.0.113.9", None, origins))
        self.assertFalse(profile_import.is_local_request("127.0.0.1", "https://evil.example", origins))


class ProfileRouteTests(unittest.TestCase):
    def test_off_by_default(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ENABLE_PROFILE_COLLECTOR", None)
            self.assertFalse(client.get("/api/health").json()["profile"])
            r = client.post("/api/profile/analyze", json={"url": "https://www.instagram.com/someone"})
            self.assertEqual(r.status_code, 403)
            self.assertEqual(client.get("/api/profile/status").status_code, 403)

    def test_rejects_non_profile_links_and_other_hosts(self):
        with patch.dict(os.environ, {"ENABLE_PROFILE_COLLECTOR": "1"}):
            for bad in ("https://example.com/x", "https://www.instagram.com/p/abc/", "ftp://instagram.com/a"):
                self.assertEqual(client.post("/api/profile/analyze", json={"url": bad}).status_code, 422, bad)

    def test_enabled_flow_returns_normal_analysis(self):
        async def fake_collect(url):
            return ProfileInfo(platform="Instagram", handle="someone", notes="Collected 16 posts."), make_posts()

        with patch.dict(os.environ, {"ENABLE_PROFILE_COLLECTOR": "1"}), \
             patch.object(collector, "collect_profile", fake_collect):
            r = client.post("/api/profile/analyze", json={"url": "https://www.instagram.com/someone"})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["schema_version"], 2)
        self.assertEqual(data["rows"], 32)
        self.assertIn("public Instagram profile", data["warnings"][0])

    def test_collector_failure_is_a_clear_error(self):
        async def boom(url):
            raise collector.CollectorError("Sign in first.", 401)

        with patch.dict(os.environ, {"ENABLE_PROFILE_COLLECTOR": "1"}), patch.object(collector, "collect_profile", boom):
            r = client.post("/api/profile/analyze", json={"url": "https://www.instagram.com/someone"})
        self.assertEqual(r.status_code, 401)
        self.assertIn("Sign in", r.json()["detail"])

    def test_normalize_records_provenance_and_keeps_unknown_blank(self):
        raw = {"posts": [
            {"ext_id": "1", "posted_at": "2026-11-01T10:00:00Z", "kind": "video", "caption": "a", "likes": 5, "comments_count": None,
             "shares": None, "views": 100, "url": "https://www.tiktok.com/@x/video/1",
             "comments": [{"text": f"c{i}"} for i in range(12)]},
            {"ext_id": "2", "posted_at": "2026-11-02T10:00:00Z", "kind": "photo", "caption": "b", "likes": 1, "comments_count": 0,
             "shares": 0, "views": None, "comments": []},
        ], "signed_in": False}
        profile, posts = collector.normalize(raw, "https://www.tiktok.com/@x", "TikTok", "x")
        self.assertEqual(posts[0].method, "playwright browser, signed out")
        self.assertTrue(posts[0].collected_at)
        self.assertEqual(posts[0].comments_seen, 12)
        self.assertEqual(len(posts[0].comment_evidence), collector.COMMENT_CAP)
        self.assertNotIn("comments", posts[0].observed_metrics)
        self.assertIn("shares", posts[1].observed_metrics)  # an observed zero is a real value
        info = profile_import.provenance(profile, posts)
        self.assertFalse(info["inferred"])
        self.assertEqual(info["metrics"]["views"], {"observed": 1, "blank": 1})
        self.assertEqual(info["metrics"]["shares"], {"observed": 1, "blank": 1})
        self.assertEqual(info["comments"], {"read": 12, "kept": 8})
        frame = profile_import.posts_to_frame(posts)
        self.assertTrue(frame.loc[frame["post_id"] == "1", "views"].notna().any())
        self.assertNotIn("zero placeholders", profile.notes)

    def test_analyze_returns_provenance(self):
        posts = make_posts()
        info = ProfileInfo(platform="Instagram", handle="x", collector="socialmonitor")

        async def fake(url):
            return info, posts

        with patch.dict(os.environ, {"ENABLE_PROFILE_COLLECTOR": "1"}), patch.object(collector, "collect_profile", fake):
            r = client.post("/api/profile/analyze", json={"url": "https://www.instagram.com/someone"})
        self.assertEqual(r.status_code, 200)
        prov = r.json()["provenance"]
        self.assertEqual(prov["posts"], 16)
        self.assertEqual(prov["source"], "Instagram")
        self.assertFalse(prov["inferred"])

    def test_worker_errors_are_told_apart(self):
        cases = {
            "the profile @nobody did not load": (404, "not_found"),
            "Collection cancelled.": (409, "cancelled"),
            "Facebook requires sign-in. Use Sign in for comments": (401, "sign_in_required"),
            "TikTok: a captcha appeared. Open sign in": (403, "blocked"),
            'TikTok answered with its "Please wait" check instead of the page': (403, "blocked"),
            "HTTP 429 too many requests": (429, "rate_limited"),
            "Collection timed out. Try a profile with fewer posts": (504, "timeout"),
            "something strange happened": (502, "failed"),
            "": (502, "failed"),
        }
        for message, (status, kind) in cases.items():
            err = collector.classify_error(message)
            self.assertEqual((err.status_code, err.kind), (status, kind), message)
            self.assertNotIn("SocialMonitor", str(err))

    def test_missing_profile_is_404_not_503(self):
        async def missing(url):
            raise collector.classify_error("the profile @nobody did not load")

        with patch.dict(os.environ, {"ENABLE_PROFILE_COLLECTOR": "1"}), patch.object(collector, "collect_profile", missing):
            r = client.post("/api/profile/analyze", json={"url": "https://www.tiktok.com/@nobody"})
        self.assertEqual(r.status_code, 404)
        self.assertIn("not found", r.json()["detail"])

    def test_cancel_returns_without_waiting_for_the_browser(self):
        import asyncio, time

        class Slow:
            def __init__(self): self.sent = []
            def poll(self): return None
            class stdin:
                @staticmethod
                def write(x): pass
                @staticmethod
                def flush(): pass
            def wait(self, timeout=None): time.sleep(5)

        collector._collection_process = Slow()
        collector._done.clear()
        try:
            started = time.time()
            with patch.object(collector._done, "wait", lambda t=None: False), patch.object(collector, "_terminate_owned_worker", lambda proc: None):
                result = asyncio.run(collector.cancel_collection())
            self.assertLess(time.time() - started, 2)
            self.assertTrue(result["cancelled"])
            self.assertFalse(result["stopped"])
        finally:
            collector._collection_process = None
            collector._done.set()


if __name__ == "__main__":
    unittest.main()

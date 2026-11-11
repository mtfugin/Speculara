import json
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import ai_chat
from backend.analysis import analyze, parse_file
from backend.main import app

client = TestClient(app)
CSV = b"date,views,likes,sales,text\n" + b"".join(
    f"2026-09-{d:02d},{100 + d * 5},{10 + d},{d % 4},call me about order #{d}\n".encode() for d in range(1, 21)
)


class FakeResponse:
    status_code = 200

    def json(self):
        return {"candidates": [{"content": {"parts": [{"text": "Views grew."}]}}]}


class FakeClient:
    sent = None

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, headers=None, json=None):
        FakeClient.sent = json
        return FakeResponse()


class AIChatTests(unittest.TestCase):
    def test_off_by_default(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ENABLE_AI_CHAT", None)
            os.environ.pop("GEMMA_API_KEY", None)
            self.assertFalse(client.get("/api/health").json()["ai"])
            r = client.post("/api/ai/chat", json={"message": "hi", "analysis": {}})
            self.assertEqual(r.status_code, 403)

    def test_needs_both_flag_and_key(self):
        with patch.dict(os.environ, {"ENABLE_AI_CHAT": "1"}):
            os.environ.pop("GEMMA_API_KEY", None)
            self.assertFalse(ai_chat.ai_enabled())
        with patch.dict(os.environ, {"GEMMA_API_KEY": "test-key"}):
            os.environ.pop("ENABLE_AI_CHAT", None)
            self.assertFalse(ai_chat.ai_enabled())

    def test_context_is_aggregate_only(self):
        result = analyze(parse_file(CSV, "data.csv"))
        result["preview"] = {"columns": ["date"], "rows": [{"date": "SECRET-ROW"}], "total_rows": 1}
        result["post_references"] = [{"post_id": "SECRET-POST", "post_url": "https://example.com/secret"}]
        text = json.dumps(ai_chat.compact_context(result), default=str)
        for leaked in ("SECRET-ROW", "SECRET-POST", "example.com/secret", "call me about order"):
            self.assertNotIn(leaked, text)
        self.assertIn("totals", text)

    def test_enabled_answer_uses_mocked_service(self):
        result = analyze(parse_file(CSV, "data.csv"))
        env = {"ENABLE_AI_CHAT": "1", "GEMMA_API_KEY": "test-key"}
        with patch.dict(os.environ, env), patch.object(ai_chat.httpx, "AsyncClient", FakeClient):
            self.assertTrue(client.get("/api/health").json()["ai"])
            r = client.post("/api/ai/chat", json={"message": "What changed?", "analysis": result})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["answer"], "Views grew.")
        sent = json.dumps(FakeClient.sent)
        self.assertNotIn("call me about order", sent)
        self.assertNotIn("test-key", sent)

    def test_rejects_empty_message(self):
        env = {"ENABLE_AI_CHAT": "1", "GEMMA_API_KEY": "test-key"}
        with patch.dict(os.environ, env):
            self.assertEqual(client.post("/api/ai/chat", json={"message": "", "analysis": {}}).status_code, 422)


if __name__ == "__main__":
    unittest.main()


class PlainTextTests(unittest.TestCase):
    def test_markdown_and_label_openers_are_removed(self):
        raw = "**Changed:** In the latest week there were 131 sales.\n**Matters:** 678 sales.\n- Try one change\n## Note"
        out = ai_chat.plain_text(raw)
        for bad in ("**", "##", "Changed:", "Matters:"):
            self.assertNotIn(bad, out)
        self.assertIn("131 sales", out)

    def test_prompt_asks_for_plain_words(self):
        self.assertIn("No asterisks", ai_chat.SYSTEM)
        self.assertIn("Do not start lines with labels", ai_chat.SYSTEM)

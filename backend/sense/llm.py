"""Language model access for SENSE agents, with the privacy rules enforced in code.

- A model is never used on data labeled "real" unless the owner sets SENSE_ALLOW_MODEL_ON_REAL=1. Sending
  real comments to an outside service is a disclosure that waits on the privacy review
  (docs/phase-2-1-scope-and-data.md). Invented ("illustrative") data is always allowed.
- Comment text is scrubbed of emails and phone numbers before it is sent.
- Comments are untrusted input. They are passed as data, the model has no tools, and every answer is
  validated by the calling agent. An answer that fails validation is dropped, never repaired.
- Everything works without a model. A missing key, a failed call or a policy block only means that step
  runs without it, and the trace says so.

It reuses the app's existing model setup (ENABLE_AI_CHAT=1 and GEMMA_API_KEY, see backend/ai_chat.py).
"""
import asyncio
import json
import os
from typing import Protocol

from backend import ai_chat
from backend.sense.friction import remove_contact_details


class ModelUnavailable(RuntimeError):
    """No model is configured, or the call failed."""


class ModelPolicyError(RuntimeError):
    """The data is not allowed to go to a model."""


class ModelClient(Protocol):
    name: str

    def complete(self, system: str, prompt: str) -> str: ...


def check_policy(labels: set[str] | frozenset[str]) -> None:
    if "real" in set(labels) and os.getenv("SENSE_ALLOW_MODEL_ON_REAL") != "1":
        raise ModelPolicyError(
            "Real data is not sent to a language model until the privacy review is done. "
            "Only illustrative data may be used with a model."
        )


def scrub(text: str) -> str:
    return remove_contact_details(text or "").strip()


class GemmaClient:
    """The app's existing optional model. Synchronous on purpose: SENSE runs in a worker thread."""

    def __init__(self) -> None:
        self.name = os.getenv("GEMMA_MODEL", "gemma-4-31b-it")

    def complete(self, system: str, prompt: str) -> str:
        try:
            return asyncio.run(ai_chat.generate(system, prompt, max_tokens=800))
        except ai_chat.AIUnavailable as exc:
            raise ModelUnavailable(str(exc)) from exc
        except Exception as exc:  # network, quota, malformed reply: the step simply runs without the model
            raise ModelUnavailable("The model call failed.") from exc


def default_client() -> ModelClient | None:
    return GemmaClient() if ai_chat.ai_enabled() else None


def parse_json(text: str):
    """Return the first JSON object or list found in a model reply, or None."""
    decoder = json.JSONDecoder()
    for start, char in enumerate(text or ""):
        if char in "[{":
            try:
                value, _ = decoder.raw_decode(text[start:])
                return value
            except ValueError:
                continue
    return None

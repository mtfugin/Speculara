"""Opt-in live check of the browser collector. Never runs in CI or in the normal tests.

Usage (from the repo root, with npm run collector:setup and collector:browser done):
    SPECULARA_LIVE_URL=https://www.tiktok.com/@someaccount .venv/Scripts/python scripts/collector-live-smoke.py

Only use an account you own or have permission to analyze, and follow the platform's rules.
Prints counts and timing only; it saves nothing and never prints comment text.
"""
import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.app import collector  # noqa: E402
from backend import profile_import  # noqa: E402


async def main() -> int:
    url = os.getenv("SPECULARA_LIVE_URL", "").strip()
    if not url:
        print("Skipped: set SPECULARA_LIVE_URL to a profile you own or have permission to analyze.")
        return 0
    if not collector.status()["installed"]:
        print("Collector not installed. Run npm run collector:setup and npm run collector:browser.")
        return 2
    started = time.time()
    try:
        profile, posts = await collector.collect_profile(url)
    except collector.CollectorError as exc:
        print(f"Collector error [{exc.kind}] {exc.status_code}: {exc}")
        return 1
    info = profile_import.provenance(profile, posts)
    print(f"OK {profile.platform} @{profile.handle}: {info['posts']} posts in {time.time() - started:.0f}s via {info['method']}")
    for metric, counts in info["metrics"].items():
        print(f"  {metric}: observed {counts['observed']}, blank {counts['blank']}")
    print(f"  comments: read {info['comments']['read']}, kept {info['comments']['kept']}")
    return 0 if info["posts"] else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

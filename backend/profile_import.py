"""Optional: analyze a public Instagram, Facebook or TikTok profile link on THIS computer.

Off unless the owner sets ENABLE_PROFILE_COLLECTOR=1. Even then, only requests from the same
computer are accepted, because it opens a browser window for sign-in and drives a collector
(integrations/socialmonitor). Collected posts are turned into the same table an upload would
produce, so every module, chart and the chat work on it unchanged. Nothing is stored.
Using it must respect each platform's terms and the account owner's consent.
"""
import os
from datetime import timezone

import pandas as pd

LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}
METRIC_FIELDS = ("views", "likes", "comments")


def collector_enabled() -> bool:
    return os.getenv("ENABLE_PROFILE_COLLECTOR") == "1"


def is_local_request(client_host, origin, allowed_origins) -> bool:
    if client_host not in LOCAL_HOSTS:
        return False
    return not origin or origin in allowed_origins


def _day(value) -> str:
    stamp = pd.Timestamp(value)
    if stamp.tzinfo is not None:
        stamp = stamp.tz_convert(timezone.utc)
    return stamp.strftime("%Y-%m-%d")


def posts_to_frame(posts) -> pd.DataFrame:
    """One row per post with its counts, then one row per comment holding only its text.

    Post totals are never repeated on comment rows (no double counting). Metrics the
    collector could not read stay blank (unknown), not zero.
    """
    rows = []
    for post in posts:
        base = {"date": _day(post.posted_at), "post_id": post.id, "post_url": post.url or None}
        unknown = set(post.unavailable_metrics)
        row = {**base, "category": post.type}
        for field in METRIC_FIELDS:
            row[field] = None if field in unknown else getattr(post, field)
        rows.append(row)
        texts = [c.text for c in post.comment_evidence] or list(post.comments_sample)
        for text in texts:
            rows.append({**base, "text": text})
    if not rows:
        raise ValueError("No posts could be collected from that profile.")
    frame = pd.DataFrame(rows).dropna(axis=1, how="all")
    return frame

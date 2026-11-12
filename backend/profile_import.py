"""Optional: analyze a public Instagram, Facebook or TikTok profile link on THIS computer.

Off unless the owner sets ENABLE_PROFILE_COLLECTOR=1. Even then, only requests from the same
computer are accepted, because it opens a browser window for sign-in and drives a collector
(integrations/socialmonitor). Collected posts are turned into the same table an upload would
produce, so every module, chart and the chat work on it unchanged. Nothing is stored.
Using it must respect each platform's terms and the account owner's consent.
"""
import base64
import os
import urllib.request
from datetime import timezone
from urllib.parse import urlparse

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
        row = {**base, "category": post.type, "caption": (post.caption or "").strip() or None}
        for field in METRIC_FIELDS:
            row[field] = None if field in unknown else getattr(post, field)
        rows.append(row)
        texts = [c.text for c in post.comment_evidence] or list(post.comments_sample)
        for text in texts:
            rows.append({**base, "category": post.type, "text": text})
    if not rows:
        raise ValueError("No posts could be collected from that profile.")
    frame = pd.DataFrame(rows).dropna(axis=1, how="all")
    return frame


def provenance(profile, posts) -> dict:
    """Where the numbers came from: source, time, method and how complete each metric is.

    Every value here was observed on the public page by the browser; nothing is model inferred.
    A blank metric means the page did not show it, which is different from zero.
    """
    n = len(posts)
    metrics = {}
    for field in ("likes", "comments", "shares", "views"):
        seen = sum(1 for post in posts if field in post.observed_metrics)
        metrics[field] = {"observed": seen, "blank": n - seen}
    stamps = sorted(post.collected_at for post in posts if post.collected_at)
    seen_comments = sum(post.comments_seen for post in posts)
    kept_comments = sum(len(post.comment_evidence) or len(post.comments_sample) for post in posts)
    return {
        "source": profile.platform,
        "handle": profile.handle,
        "collector": profile.collector,
        "method": next((post.method for post in posts if post.method), ""),
        "collected_at": stamps[-1] if stamps else None,
        "posts": n,
        "metrics": metrics,
        "comments": {"read": seen_comments, "kept": kept_comments},
        "inferred": False,
    }


IMAGE_HOSTS = ("tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "cdninstagram.com", "fbcdn.net")


def fetch_image_data_url(url: str, limit: int = 1_000_000) -> str:
    """The profile picture as a data link, fetched once so the person can download it.

    Only image links on the platforms' own picture hosts are fetched, over https, with a size limit and a short timeout.
    Any problem returns an empty string; the picture is a nicety, never a reason to fail a collection.
    """
    try:
        parsed = urlparse(url or "")
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or parsed.username or not any(host == h or host.endswith("." + h) for h in IMAGE_HOSTS):
            return ""
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "image/*"})
        with urllib.request.urlopen(request, timeout=8) as response:
            kind = response.headers.get_content_type()
            data = response.read(limit + 1)
        if not kind.startswith("image/") or len(data) > limit or not data:
            return ""
        return f"data:{kind};base64,{base64.b64encode(data).decode()}"
    except Exception:
        return ""


def profile_card(profile, picture: str) -> dict:
    return {"platform": profile.platform, "handle": profile.handle, "nickname": profile.nickname,
            "followers": profile.followers, "avatar": picture or None}


def table_for_download(frame, limit: int = 5000) -> dict:
    """The collected table as plain rows, so it can be downloaded as a file. Blank stays blank."""
    clipped = frame.head(limit)
    rows = [{key: (None if pd.isna(value) else (value.item() if hasattr(value, "item") else value)) for key, value in row.items()}
            for row in clipped.to_dict("records")]
    return {"columns": list(clipped.columns), "rows": rows, "total_rows": len(frame)}

# Phase 2.1: Scope and data decision

Status: in progress. Scope is decided. Data sources and the privacy check are not closed, so 2.1 is not done.

## Decision

- Industry: coffee shops.
- Place: all of Makati City.
- Question SENSE answers: where do people in Makati show a coffee need that nobody serves well, and how sure are we?
- Output of Stage 2: a ranked dossier that can say "insufficient evidence".

## What data SENSE needs

| Side | What | Possible source | Collected how | Status |
| --- | --- | --- | --- | --- |
| Demand | What people say about coffee shops: wishes, complaints, questions | Comments and captions on public posts of Makati coffee shop accounts | Stage 1 collector (TikTok works, others untested) | Blocked by privacy check |
| Supply | Shop name, area, hours, menu, prices | Shop's own public profile and posts; manual entry from a public listing | Collector for profile text, manual or CSV for the rest | Not started |
| Place | Barangay for each shop | Manual, from the shop's stated address | CSV | Not started |

A missing shop is never proof that nothing is served there (rule from 2.4).

## Privacy gate (must close before any real collection)

The National Privacy Commission adopted Advisory No. 2026-01 on scraping publicly available personal data (April 2026). Law firm summaries say it covers, among other points: public does not mean consent, a specific and legitimate purpose must be stated, scraping that breaks a site's terms is treated as unauthorized, and data cannot be reused for other purposes.

I read summaries only, not the advisory itself, and could not confirm how it treats research or a tool like this. Open items:

- [ ] Read the advisory text (copy: divinalaw.com NPC Advisory No. 2026-01) and write a one page reading of what applies.
- [ ] Ask a Philippine privacy lawyer whether comments from public posts may be collected for this purpose, and on what lawful basis.
- [ ] Decide what is stored: comment text with author, or text only with no author. Default until answered: text only, no author name, no profile link.
- [ ] Check each platform's terms for the exact collection we plan. TikTok signed out is the only path tested so far.
- [ ] Decide retention: how long raw comments are kept and how they are deleted.

## Decision: Stage 2 will use real data

The owner has decided SENSE needs real Makati data. The plan is to collect it in a way that keeps privacy risk low, in this order:

1. **Shop level first.** Shop name, area, hours, menu, prices, and the shop's own public post counts. No customer data. Start here for the supply side (2.4).
2. **Comments, minimized.** Only comments on public posts of shop accounts. Store the comment text, the post it came from and the date. Do not store the commenter's name, handle, picture or profile link. Drop the author in the collector, before anything is saved.
3. **Scrub on the way in.** Remove phone numbers, emails and @mentions from stored text.
4. **Purpose limit.** Used only to find coffee shop needs in Makati. Not for profiling people, not for contacting them, not for any other project.
5. **Local only, not committed.** Raw collected data stays in a git-ignored folder on this machine. Only invented data goes in the repository, tests and screenshots.
6. **Retention.** Raw comments are deleted after they are turned into themes (2.3), or after a fixed number of days, whichever comes first. Quotes kept in the dossier are short and carry no author.
7. **Pace and respect.** Slow, logged-out collection of public pages only. No account rotation, no CAPTCHA bypass, no sign-in.
8. **Records.** Each collection run logs date, source, purpose, count and what was stored, so we can answer a question about it later.

This lowers the risk. It does not decide the law. The lawyer questions below still need answers before the first real comment collection. Steps 1 and 2 of the order can be built and tested on invented data in the meantime.

### Questions for a Philippine privacy lawyer

A full brief to hand over is in `lawyer-brief-data-collection.md`. It has more questions than the six below.

1. Is collecting public comments on business accounts for market research a legitimate purpose under the Data Privacy Act and NPC Advisory No. 2026-01? What lawful basis applies?
2. Does the research exemption apply to a commercial tool?
3. If we store text only, with no author, is it still personal data?
4. Do the platforms' terms (TikTok first) change the answer? Are we "unauthorized" if their terms forbid automated collection?
5. Do we need a privacy impact assessment, a registered data processing system, or a notice, and who is the personal information controller here?
6. What retention period would you accept?

## Labeling rule

Every dataset carries one of two labels, shown on screen and in exports:

- Real: collected from a named public source, with date, method and the privacy basis.
- Illustrative: invented, shaped like real data, never presented as findings about real shops or people.

Until the privacy gate closes, all Stage 2 development uses Illustrative data. No real comments are collected, stored or committed.

## What can start now

- 2.2 Evidence model and 2.6 scoring can be built and tested on Illustrative data.
- A larger Illustrative Makati dataset (invented shops, barangays, comments in English and Filipino) is needed. No real shop or person is named in it.

## Done when

- [ ] Privacy gate items above are closed or explicitly accepted by the owner.
- [ ] Supply sources are chosen and each one is allowed.
- [ ] The labeling rule is implemented in the data model (2.2).
- [ ] The owner has signed off this page.

## Shop level files (built)

`backend/supply.py` loads two CSV files. Real files go in `backend/data/real/` (git-ignored). The invented examples are in `backend/tests/fixtures/makati_*_illustrative.csv`.

- Shops: `shop_id, shop_name, barangay, hours, source, collected_at, method, data_label, confidence`
- Menu: `shop_id, item, price, source, collected_at, method, data_label`
- `method` is observed (read from the shop's own page), manual (typed from a public listing) or inferred. It sets the default `confidence` (high, medium, low).
- `data_label` is real or illustrative. Prices are stored as whole centavos. A blank hours or price stays blank, never zero.
- An unrecognized barangay is kept with a warning. A menu row for an unlisted shop is an error.
- `coverage()` reports shops per barangay and which barangays have none listed, and says that means no data yet, not no coffee.

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

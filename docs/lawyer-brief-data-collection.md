# Brief for legal advice: collecting public social media comments for market research

**Confidential. Prepared for a Philippine privacy and technology lawyer.**
From: [owner name and contact]. Date: [date]. Tool: Speculara. Status: draft for the owner to review before sending.

## 1. What we want to do

We are building a research tool (Speculara) that looks for unmet needs in a local market. The first project is **coffee shops in Makati City**. For each barangay it asks: what do people say they want or struggle with, and does any listed shop answer it? The output is a ranked report of possible gaps, each with the evidence, the doubts, and one suggested way to test it. It can also say "insufficient evidence".

We are not building a tool to profile, track, contact or identify people. We want to learn what customers in general say about coffee shops.

**Who will receive the report:** [the owner to fill in: internal use only, a client, or public].
**Commercial purpose:** [the owner to fill in: for our own decisions, sold as a service, or other].

## 2. What data we would handle

| Data | Source | Personal data? |
| --- | --- | --- |
| Shop name, barangay, opening hours, menu, prices | The shop's own public page or a public listing, typed or collected | Usually no. A sole proprietor's shop could identify a person. |
| Public comments on a shop's posts | Public posts of shop accounts on social platforms (TikTok first) | **Yes, possibly.** A comment can carry a username, a name, or details about a person. |
| Counts (views, likes, comments) on those posts | Same posts | No |

## 3. How collection works today

- The tool opens public pages in an automated browser (Playwright) on the owner's own computer. For TikTok it works **without signing in**. Instagram and Facebook can require sign-in for comments, and we propose **not** to use signed-in collection for this project.
- It does not rotate accounts, does not solve CAPTCHAs, and does not try to get around access limits. When blocked or rate limited it stops and says so.
- Collection is slow and limited (for example the latest 10 to 40 posts of one account per run).
- During development the collector was run by hand on a small number of public TikTok profiles to test it. Nothing was stored or committed. [Owner to confirm the exact details before sending.]
- **Real data collection for this project has not started.** All Stage 2 work so far uses invented shops and comments, labelled "illustrative".

## 4. Safeguards we plan (some are built, some are not)

| Safeguard | Status |
| --- | --- |
| Drop the commenter's name, handle, picture and profile link at the moment of collection, before anything is saved | **Planned, not built** for real data. The evidence model already has no author field and refuses one. |
| Remove phone numbers, emails and @mentions from comment text | Built (in the comment sorting step), not yet applied to real data |
| Keep raw data on one computer, in a folder excluded from version control; never in tests, screenshots or the code repository | Folder exclusion built; process to be followed |
| Delete raw comments after they are turned into themes, or after a fixed number of days | **Planned**, period to be set with your advice |
| Use the data only to find coffee shop needs in Makati, not for any other purpose | Policy; to be written down |
| Keep a log of each collection run: date, source, purpose, counts, what was stored | **Planned** |
| Show short quotes in the report without names; label every dataset real or illustrative | Built |
| Do not send comments to outside AI services | Built: the optional model agents refuse real data unless the owner explicitly allows it, and strip contact details before sending. With invented data they may use a model. See `docs/sense-agents.md`. Please advise before that is ever allowed for real data. |

## 5. What the Data Privacy Act and NPC Advisory No. 2026-01 mean for this

We have read only **secondary summaries** of the advisory (law firm notes on guidelines about scraping publicly available personal data, reported as adopted in April 2026). Our understanding, which we ask you to confirm or correct:

- Personal data does not stop being protected because it is public. Public availability is not consent.
- Scraping needs a clearly defined, legitimate purpose and a lawful basis.
- Scraping can be treated as unauthorized if it breaks the law, NPC rules, or a site's terms of use.
- Data should not be reused beyond the declared purpose.
- We do not know how the advisory treats research, or a commercial research tool.

## 6. Questions for you

1. Is collecting public comments on business accounts for this market research a **legitimate purpose** under the Data Privacy Act and the advisory? Which **lawful basis** applies, and who is the personal information controller (us, or a client)?
2. Does the **research exemption** in the Act apply to a commercial research tool?
3. If we store only the comment text, with no author, date of birth or contact details, is it still **personal data**? Could a short quote be traced back to a person by searching for it, and does that change whether we may show quotes in a report?
4. Do the **platforms' terms** (TikTok first, then Instagram and Facebook) change the answer? If a platform's terms forbid automated collection, would collecting anyway be "unauthorized" under the advisory, or only a contract matter?
5. What do we need to do **before collecting**: a privacy impact assessment, registration of a data processing system, a privacy notice, a written purpose statement, a data sharing agreement with a client?
6. What **retention period** and deletion method would you accept for raw comments?
7. Does it matter that the tool runs **only on our own computer**, with no cloud storage? Does the answer change if we later host it, or share the report with a client?
8. Are there **people we should not collect from** (for example children, or comments that reveal health or religion such as halal or dietary needs), and should we exclude those comments?
9. If we only use **shop-level facts** (hours, menus, prices, post counts) and no comments, do any of the above steps apply?

## 7. What we would like back

- A short written opinion: may we proceed, and on what conditions.
- The steps and documents required before the first real collection.
- Which of our safeguards in section 4 you would change or add to.

## Attachments we can provide

- `docs/phase-2-1-scope-and-data.md` (scope, data plan and safeguards)
- `docs/phase-2-8-exit-gate.md` (what is built and what is not)
- A screenshot of the report using invented data (`docs/screenshots/sense-explorer-large.png`)
- On request: a demonstration of the tool on invented data, and the list of fields stored for each observation

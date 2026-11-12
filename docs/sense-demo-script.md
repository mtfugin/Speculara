# SENSE demo script (about 5 minutes)

Everything shown is invented. Say so at the start and keep the "Illustrative data" banner on screen.

## Setup
1. Backend: `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000` (the new code, with `/api/sense/demo`).
2. Frontend: `npm run dev`, then open `http://localhost:8443/sense.html`.

## What to say and do
1. **Open the page.** Read the headline. Point at the orange banner: "This is illustrative data. It says nothing about real shops or people."
2. **The map.** "Each tile is a Makati barangay, in alphabetical order. This is not a geographic map yet." Switch between Demand, Supply and Gaps. Point at a dashed tile: "No data is not zero demand. We show it differently on purpose."
3. **Top opportunity.** Read the card: what people said (original words, no names), the doubts, and one way to test it. Point at the two confidence lines: demand confidence and supply confidence are separate.
4. **The honest part.** Open "Insufficient evidence". "Where we have too little, we say so and give no score."
5. **A barangay.** Click Bel-Air. The list narrows to it. Click "Show all barangays".
6. **How it was made.** Open "How this was made": five steps, what went in and what came out.

## Questions to expect
- *Is this real data?* No. Real data waits on a privacy review (see `phase-2-1-scope-and-data.md`).
- *Why no street map?* Real barangay outlines need a license check. The tiles are a stand-in.
- *Does "not seen" mean nobody sells it?* No. It means not seen among the shops we have listed.

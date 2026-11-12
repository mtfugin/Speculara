"""The SENSE orchestrator: runs each stage as a named agent and records what each one did.

Each agent is a plain function with one job and a recorded input and output count, so a run can be
explained and replayed. No agent calls the network. An optional language model layer can be added to
one agent later without changing the others.

    collector (inputs)  ->  friction miner  ->  supply loader  ->  ghost finder  ->  scorer  ->  dossier writer
"""
from dataclasses import dataclass, field
from datetime import date

from backend.sense.dossier import build_dossier
from backend.sense.friction import mine_comments
from backend.sense.ghosts import find_ghosts, save_gaps_as_inferred
from backend.sense.model import EvidenceStore
from backend.sense.scoring import score_all
from backend.sense.supply_bridge import load_into
from backend.supply import SupplyData


@dataclass
class AgentStep:
    agent: str
    job: str
    received: int
    produced: int
    note: str = ""
    mode: str = "rules"      # "rules" (plain code) or "model" (a language model took part)
    decision: str = ""       # why the orchestrator ran this step now (empty for the fixed pipeline)


@dataclass
class SenseRun:
    store: EvidenceStore
    dossier: dict
    trace: list[AgentStep] = field(default_factory=list)
    unclassified: list[str] = field(default_factory=list)


def run_sense(comments: list[dict], supply: SupplyData, *, data_label: str, today: date) -> SenseRun:
    """comments: dicts with id, text, barangay, source, collected_at. data_label: real or illustrative."""
    store, trace = EvidenceStore(), []

    mined = mine_comments(comments, data_label=data_label)
    for obs in mined.observations:
        store.add(obs)
    trace.append(AgentStep("friction miner", "sort comments into the eight frictions, keep the original quote",
                           len(comments), len(mined.observations),
                           f"{len(mined.unclassified)} comment(s) matched no friction and were left unsorted"))

    loaded = load_into(store, supply)
    trace.append(AgentStep("supply loader", "turn shop and menu rows into supply evidence",
                           len(supply.shops) + len(supply.menu), loaded,
                           f"{len(supply.warnings)} warning(s) on the shop files"))

    ghosts = find_ghosts(store)
    gaps = save_gaps_as_inferred(store, ghosts)
    trace.append(AgentStep("ghost finder", "match demand against supply, keeping their confidence apart",
                           len(mined.observations), len(ghosts), f"{gaps} candidate gap(s) saved as inferred evidence"))

    scores = score_all(store, today=today)
    ranked = sum(1 for s in scores if s.verdict == "score")
    trace.append(AgentStep("scorer", "explainable score per barangay and need, or insufficient evidence",
                           len(ghosts), len(scores), f"{ranked} scored, {len(scores) - ranked} with insufficient evidence"))

    dossier = build_dossier(ghosts, scores)
    trace.append(AgentStep("dossier writer", "rank, attach quotes and doubts, suggest one validation test",
                           len(ghosts), len(dossier["opportunities"]) + len(dossier["insufficient_evidence"]),
                           dossier["headline"]))
    return SenseRun(store, dossier, trace, mined.unclassified)

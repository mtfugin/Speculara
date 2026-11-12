"""The SENSE agent orchestrator.

Seven steps run as named agents. A planner picks the next step from the steps that are READY. It cannot
invent a step, repeat one, or skip a required one. A critic runs last, checks the whole run with plain
code, and removes anything it cannot verify.

    mine      sort comments into the eight frictions (word list)
    supply    load shops and menus as supply evidence
    read      OPTIONAL model: second opinion on comments the word list left unsorted
    ghosts    match demand against supply, keeping their confidence apart
    score     explainable score per barangay and need, or "insufficient evidence"
    dossier   rank, attach quotes and doubts, suggest one test
    narrate   OPTIONAL model: a short plain summary per ranked opportunity, checked against the facts
    critic    verify quotes, labels, honesty rules and every model summary

Two planners: RulePlanner (a fixed priority order, always available) and ModelPlanner (asks a model which
ready step to run next, and falls back to the rules when the answer is not valid). Both give the same
required work; only the order of independent steps can differ.

The model is optional everywhere. With no model, a policy block (real data), or a failed call, the optional
steps are skipped and the trace says why. The result is then the same as the fixed pipeline.
"""
import json
from dataclasses import dataclass, field
from datetime import date

from backend.sense.dossier import build_dossier, template_summary
from backend.sense.friction import mine_comments, remove_contact_details
from backend.sense.ghosts import find_ghosts, save_gaps_as_inferred
from backend.sense.llm import ModelClient, ModelPolicyError, ModelUnavailable, check_policy, parse_json
from backend.sense.model import EvidenceStore
from backend.sense.model_agents import narrate, read_unclassified, validate_summary
from backend.sense.pipeline import AgentStep, SenseRun
from backend.sense.scoring import score_all
from backend.sense.supply_bridge import load_into
from backend.supply import SupplyData

PRIORITY = ("mine", "supply", "read", "ghosts", "score", "dossier", "narrate", "critic")
REQUIRED = ("mine", "supply", "ghosts", "score", "dossier", "critic")
FORBIDDEN_WORDS = ("author", "username", "profile_url", "avatar")


@dataclass
class AgentRun(SenseRun):
    issues: list[str] = field(default_factory=list)       # problems the critic found and could not fix
    fixes: list[str] = field(default_factory=list)        # things the critic removed or replaced
    model_name: str = ""
    model_note: str = ""
    planner: str = "rules"


@dataclass
class State:
    comments: list[dict]
    supply: SupplyData
    label: str
    today: date
    client: ModelClient | None
    blocked: str = ""                                      # why a model may not be used, if so
    store: EvidenceStore = field(default_factory=EvidenceStore)
    mined: object = None
    ghosts: list = field(default_factory=list)
    scores: list = field(default_factory=list)
    dossier: dict = field(default_factory=dict)
    done: set[str] = field(default_factory=set)
    trace: list[AgentStep] = field(default_factory=list)
    issues: list[str] = field(default_factory=list)
    fixes: list[str] = field(default_factory=list)
    model_note: str = ""

    @property
    def model_ok(self) -> bool:
        return self.client is not None and not self.blocked


def ready_steps(state: State) -> list[str]:
    """Steps whose inputs exist and that have not run. The planner chooses among these."""
    d = state.done
    out = []
    for step in PRIORITY:
        if step in d:
            continue
        needs = {
            "mine": set(), "supply": set(), "read": {"mine"}, "ghosts": {"mine", "supply"},
            "score": {"ghosts"}, "dossier": {"score"}, "narrate": {"dossier"},
            "critic": set(PRIORITY) - {"critic"},
        }[step]
        if needs <= d:
            out.append(step)
    return out


class RulePlanner:
    name = "rules"

    def choose(self, state: State, ready: list[str]) -> tuple[str, str]:
        return ready[0], "fixed order"


class ModelPlanner:
    """Asks a model which ready step to run next. It sees step names and counts, never comment text."""
    name = "model"
    SYSTEM = (
        "You schedule steps of a market research pipeline. Choose exactly one step from the 'ready' list. "
        "Prefer the step whose result the others need soonest. Reply with JSON only: {\"next\": string, \"why\": string}."
    )

    def __init__(self, client: ModelClient, fallback: RulePlanner | None = None) -> None:
        self.client = client
        self.fallback = fallback or RulePlanner()

    def choose(self, state: State, ready: list[str]) -> tuple[str, str]:
        if len(ready) == 1:
            return ready[0], "only one step was ready"
        facts = {"done": sorted(state.done), "ready": ready,
                 "unsorted_comments": len(getattr(state.mined, "unclassified", []) or []) if state.mined else None}
        try:
            data = parse_json(self.client.complete(self.SYSTEM, json.dumps(facts)))
        except ModelUnavailable as exc:
            name, why = self.fallback.choose(state, ready)
            return name, f"model planner unavailable ({exc}); {why}"
        choice = data.get("next") if isinstance(data, dict) else None
        if choice not in ready or (choice == "critic" and len(ready) > 1):
            name, why = self.fallback.choose(state, ready)
            return name, f"model suggestion {choice!r} rejected (not a ready step); {why}"
        reason = data.get("why") if isinstance(data.get("why"), str) else ""
        return choice, "chosen by the model" + (f": {reason[:120]}" if reason else "")


# ---- the steps ---------------------------------------------------------------------------------------

def _step_mine(s: State) -> AgentStep:
    s.mined = mine_comments(s.comments, data_label=s.label)
    for obs in s.mined.observations:
        s.store.add(obs)
    return AgentStep("friction miner", "sort comments into the eight frictions, keep the original quote",
                     len(s.comments), len(s.mined.observations),
                     f"{len(s.mined.unclassified)} comment(s) matched no friction and were left unsorted")


def _step_supply(s: State) -> AgentStep:
    n = load_into(s.store, s.supply)
    return AgentStep("supply loader", "turn shop and menu rows into supply evidence",
                     len(s.supply.shops) + len(s.supply.menu), n, f"{len(s.supply.warnings)} warning(s) on the shop files")


def _skip(agent: str, job: str, why: str) -> AgentStep:
    return AgentStep(agent, job, 0, 0, f"skipped: {why}")


def _step_read(s: State) -> AgentStep:
    job = "model second opinion on comments the word list could not sort"
    if s.client is None:
        return _skip("model reader", job, "no model configured")
    if s.blocked:
        return _skip("model reader", job, s.blocked)
    todo = list(s.mined.unclassified)
    if not todo:
        return _skip("model reader", job, "every comment was already sorted, nothing for the model to read")
    try:
        res = read_unclassified(s.client, s.comments, todo, data_label=s.label)
    except ModelPolicyError as exc:
        return _skip("model reader", job, str(exc))
    for obs in res.observations:
        try:
            s.store.add(obs)
        except ValueError as exc:   # a model reading that fails the evidence rules is dropped, not repaired
            res.rejected += 1
            s.fixes.append(f"dropped a model reading: {exc}")
    if res.note.startswith("The model was not available"):
        s.model_note = res.note
    step = AgentStep("model reader", job, res.asked, len(res.observations), res.note + (f"; {res.rejected} answer(s) rejected" if res.rejected else ""),
                     mode="model" if res.observations else "rules")
    return step


def _step_ghosts(s: State) -> AgentStep:
    s.ghosts = find_ghosts(s.store)
    gaps = save_gaps_as_inferred(s.store, s.ghosts)
    return AgentStep("ghost finder", "match demand against supply, keeping their confidence apart",
                     len(s.mined.observations), len(s.ghosts), f"{gaps} candidate gap(s) saved as inferred evidence")


def _step_score(s: State) -> AgentStep:
    s.scores = score_all(s.store, today=s.today)   # observed evidence only: model readings are never scored
    ranked = sum(1 for x in s.scores if x.verdict == "score")
    return AgentStep("scorer", "explainable score per barangay and need, or insufficient evidence",
                     len(s.ghosts), len(s.scores), f"{ranked} scored, {len(s.scores) - ranked} with insufficient evidence")


def _step_dossier(s: State) -> AgentStep:
    s.dossier = build_dossier(s.ghosts, s.scores)
    n = len(s.dossier["opportunities"]) + len(s.dossier["insufficient_evidence"])
    return AgentStep("dossier writer", "rank, attach quotes and doubts, suggest one validation test", len(s.ghosts), n,
                     s.dossier["headline"])


def _step_narrate(s: State) -> AgentStep:
    job = "model summary of each ranked opportunity, checked against the facts"
    if s.client is None:
        return _skip("model narrator", job, "no model configured")
    if s.blocked:
        return _skip("model narrator", job, s.blocked)
    ranked = s.dossier["opportunities"]
    try:
        res = narrate(s.client, ranked, data_label=s.label)
    except ModelPolicyError as exc:
        return _skip("model narrator", job, str(exc))
    for o in ranked:
        text = res.summaries.get((o.barangay, o.theme))
        if text:
            o.summary, o.summary_mode = text, "model"
    if res.note.startswith("The model was not available"):
        s.model_note = res.note
    for r in res.rejected:
        s.fixes.append(f"model summary rejected ({r})")
    return AgentStep("model narrator", job, min(len(ranked), 8), len(res.summaries), res.note,
                     mode="model" if res.summaries else "rules")


def _step_critic(s: State) -> AgentStep:
    """Plain-code review of the finished run. Fixes what it can by removing, and reports the rest."""
    said = {remove_contact_details(c["text"]).strip() for c in s.comments}
    opps = s.dossier["opportunities"] + s.dossier["insufficient_evidence"]
    for o in opps:
        for q in o.evidence:
            if q not in said:
                s.issues.append(f"{o.barangay} {o.theme}: a quote is not the original comment text")
        if o.verdict == "candidate gap" and o.supply_status in ("unknown", "not assessed"):
            s.issues.append(f"{o.barangay} {o.theme}: called a gap with supply {o.supply_status}")
        if o.verdict == "insufficient evidence" and (o.rank is not None or o.score is not None):
            s.issues.append(f"{o.barangay} {o.theme}: insufficient evidence but ranked or scored")
        if o.summary_mode == "model":
            problem = validate_summary(o.summary, o)
            if problem:
                s.fixes.append(f"{o.barangay} {o.theme}: model summary replaced ({problem})")
                o.summary, o.summary_mode = template_summary(o), "template"
    blob = s.store.to_json().casefold()
    for word in FORBIDDEN_WORDS:
        if word in blob:
            s.issues.append(f"the evidence contains the word {word!r}, which suggests personal data")
    if s.label == "illustrative" and "illustrative" not in s.dossier["headline"].casefold():
        s.issues.append("illustrative data is not labeled in the headline")
    note =f"{len(s.issues)} issue(s) found" + (f", {len(s.fixes)} fix(es) applied" if s.fixes else "") + (
        ": " + "; ".join(s.issues[:3]) if s.issues else "")
    return AgentStep("critic", "check quotes, labels, honesty rules and every model summary with plain code",
                     len(opps), len(s.issues), note)


STEPS = {"mine": _step_mine, "supply": _step_supply, "read": _step_read, "ghosts": _step_ghosts,
         "score": _step_score, "dossier": _step_dossier, "narrate": _step_narrate, "critic": _step_critic}


def run_agents(comments: list[dict], supply: SupplyData, *, data_label: str, today: date,
               client: ModelClient | None = None, planner: str = "rules") -> AgentRun:
    """Run the orchestrator. planner is "rules" or "model" (the model planner needs a client and falls back to rules)."""
    state = State(comments, supply, data_label, today, client)
    if client is not None:
        try:
            check_policy({data_label})
        except ModelPolicyError as exc:
            state.blocked = str(exc)
    use_model_planner = planner == "model" and state.model_ok
    chooser = ModelPlanner(client) if use_model_planner else RulePlanner()
    for _ in range(len(PRIORITY) + 2):          # a hard bound: every step runs at most once
        ready = ready_steps(state)
        if not ready:
            break
        name, why = chooser.choose(state, ready)
        step = STEPS[name](state)
        step.decision = f"{chooser.name} planner, chose {name} from {ready}: {why}"
        state.trace.append(step)
        state.done.add(name)
    missing = [r for r in REQUIRED if r not in state.done]
    if missing:
        state.issues.append(f"required step(s) did not run: {missing}")
    note = state.model_note or state.blocked
    return AgentRun(state.store, state.dossier, state.trace, list(state.mined.unclassified) if state.mined else [],
                    issues=state.issues, fixes=state.fixes, model_name=getattr(client, "name", "") if client else "",
                    model_note=note, planner="model" if use_model_planner else "rules")

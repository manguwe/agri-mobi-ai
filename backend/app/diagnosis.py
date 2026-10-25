"""Deterministic, evidence-based maize triage engine for AgriMobi AI.

Rule-based MVP: not a trained ML model and not a field diagnosis.

Vocabulary, weights, thresholds and follow-up questions come from
``diagnosisRules.json`` -- the SAME file the frontend engine imports -- so the
phone and the API give the same answer. Keep ``_normalize`` identical to
``normalize`` in frontend/src/services/diagnosisEngine.js.
"""
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parents[1]
KB_FILE = "knowledgeBase.json"
RULES_FILE = "diagnosisRules.json"


def data_dirs() -> list[Path]:
    """Where to look for the data files, first match wins.

    1. AGRIMOBI_DATA_DIR (set this in production)
    2. backend/app/data   (filled by `python scripts/sync_data.py`)
    3. frontend/src/data  (monorepo checkout, local development)
    """
    dirs: list[Path] = []
    if os.environ.get("AGRIMOBI_DATA_DIR"):
        dirs.append(Path(os.environ["AGRIMOBI_DATA_DIR"]))
    dirs.append(BACKEND_DIR / "app" / "data")
    dirs.append(BACKEND_DIR.parent / "frontend" / "src" / "data")
    return dirs


def _find(filename: str) -> Path:
    for directory in data_dirs():
        candidate = directory / filename
        if candidate.is_file():
            return candidate
    searched = ", ".join(str(d) for d in data_dirs())
    raise FileNotFoundError(f"{filename} not found. Searched: {searched}. Run scripts/sync_data.py or set AGRIMOBI_DATA_DIR.")


def _normalize(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value if value is not None else "").lower()).strip()


@lru_cache(maxsize=1)
def get_rules() -> dict[str, Any]:
    rules = json.loads(_find(RULES_FILE).read_text(encoding="utf-8"))
    rules["_aliases"] = {
        feature: sorted({f" {n} " for n in (_normalize(t) for t in terms) if n})
        for feature, terms in rules["aliases"].items()
    }
    return rules


@lru_cache(maxsize=1)
def get_problems() -> list[dict[str, Any]]:
    data = json.loads(_find(KB_FILE).read_text(encoding="utf-8"))
    core_ids = set(get_rules()["profiles"])
    return [p for p in data.get("problem_categories", []) if p.get("id") in core_ids]


def detect_evidence(text: str) -> dict[str, bool]:
    padded = f" {_normalize(text)} "
    return {feature: any(term in padded for term in terms) for feature, terms in get_rules()["_aliases"].items()}


def _score(problem: dict[str, Any], evidence: dict[str, bool], rules: dict[str, Any]) -> dict[str, Any]:
    profile = rules["profiles"][problem["id"]]
    matched = [f for f in profile["weights"] if evidence.get(f)]
    raw = sum(profile["weights"][f] for f in matched)
    contradictions = sum(1 for f in profile["contradictions"] if evidence.get(f))
    score = max(0, raw - contradictions * rules["thresholds"]["contradiction_penalty"])
    return {"problem": problem, "score": score, "matched": matched, "contradictions": contradictions}


def _confidence(best: dict[str, Any] | None, second: dict[str, Any] | None, t: dict[str, Any]) -> str:
    if not best or best["score"] < t["confidence_floor"]:
        return "low"
    margin = best["score"] - (second["score"] if second else 0)
    if best["score"] >= t["high"]["score"] and margin >= t["high"]["margin"]:
        return "high"
    if best["score"] >= t["medium"]["score"] and margin >= t["medium"]["margin"]:
        return "medium"
    return "low"


def _followups(evidence: dict[str, bool], best: dict[str, Any] | None, rules: dict[str, Any]) -> list[dict[str, Any]]:
    table = rules["follow_ups"]
    questions: list[dict[str, Any]] = []

    def add(key: str) -> None:
        q = table.get(key)
        if q and not any(x["id"] == q["id"] for x in questions):
            questions.append(q)

    if not evidence["streaks"] and not evidence["rust_pustules"] and not evidence["rectangular"]:
        add("streaks")
    if not evidence["insects"] and best and "Pest" in (best["problem"].get("category") or ""):
        add("insects")
    if evidence["yellow"] or evidence["rolled"] or evidence["stunting"]:
        add("moisture")
    if evidence["yellow"] and not evidence["v_shape"]:
        add("yellow")
    if evidence["dead_heart"] or evidence["stem"] or evidence["holes"]:
        add("dead_heart")
    return questions[: rules["thresholds"]["max_follow_ups"]]


def _clean_answers(answers: dict[str, Any] | None) -> dict[str, str]:
    return {str(k): str(v) for k, v in (answers or {}).items() if v is not None and str(v).strip()}


def diagnose(symptoms: str, answers: dict[str, Any] | None = None, problems: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    rules = get_rules()
    t = rules["thresholds"]
    given = _clean_answers(answers)
    has_answers = bool(given)
    evidence = detect_evidence(f"{symptoms or ''} {' '.join(given.values())}")
    items = problems if problems is not None else get_problems()
    candidates = sorted(
        (_score(p, evidence, rules) for p in items if p.get("id") in rules["profiles"]),
        key=lambda x: x["score"],
        reverse=True,
    )
    best = candidates[0] if candidates else None
    second = candidates[1] if len(candidates) > 1 else None
    confidence = _confidence(best, second, t)
    followups = _followups(evidence, best, rules) if confidence == "low" else []
    too_weak = best is None or best["score"] < t["min_candidate_score"]
    common = {
        "evidence": evidence,
        "candidates": [{"id": x["problem"]["id"], "score": x["score"]} for x in candidates[:3]],
        "engine_version": rules["version"],
    }

    if too_weak and has_answers:
        # Follow-ups were already answered and it is still unclear: stop asking, refer to an expert.
        return {"status": "needs_more_info", "needs_followup": False, "confidence": "low", "problem_id": None, "problem": None,
                "signs_to_verify": [], "guidance": "", "follow_up_questions": [], "requires_extension_support": True,
                "extension_message": rules["default_extension_message"], **common}

    if too_weak or (confidence == "low" and followups and not has_answers):
        fallback = [rules["follow_ups"]["streaks"], rules["follow_ups"]["insects"]]
        return {"status": "needs_more_info", "needs_followup": True, "confidence": "low", "problem_id": None, "problem": None,
                "signs_to_verify": [], "guidance": "", "follow_up_questions": followups or fallback,
                "requires_extension_support": False, "extension_message": "", **common}

    matched = best["problem"]
    return {"status": "possible_problem", "needs_followup": False, "confidence": confidence, "problem_id": matched["id"],
            "problem": matched.get("problem_name"), "signs_to_verify": matched.get("verification_signs", []),
            "guidance": matched.get("recommended_action", ""), "follow_up_questions": [],
            "requires_extension_support": confidence == "low",
            "extension_message": matched.get("when_to_contact_extension_worker") or rules["default_extension_message"], **common}

"""Engine tests. Run from backend/:  pytest -q

The golden cases live in frontend/tests/goldenCases.json and are ALSO asserted
by `node tests/diagnosisEngine.test.mjs`, so both suites passing means the app
and the API return the same answers.
"""
import json
from pathlib import Path

from app.diagnosis import detect_evidence, diagnose, get_problems, get_rules

GOLDEN = json.loads((Path(__file__).resolve().parents[2] / "frontend" / "tests" / "goldenCases.json").read_text(encoding="utf-8"))


def test_rules_and_knowledge_base_agree():
    assert sorted(p["id"] for p in get_problems()) == sorted(get_rules()["profiles"])


def test_golden_cases_match_frontend_expectations():
    for case in GOLDEN:
        result = diagnose(case["symptoms"], case["answers"])
        for key, expected in case["expect"].items():
            assert result[key] == expected, (case["symptoms"], case["answers"], key, result[key], expected)


def test_followup_options_are_understood():
    options = {"Dead central shoot": "dead_heart", "Stem holes/tunnels": "stem", "Wet or waterlogged": "wet", "Very dry": "dry", "Older/lower leaves": "older_leaves", "Round or powdery spots": "rust_pustules"}
    for option, feature in options.items():
        assert detect_evidence(option)[feature], option


def test_vague_input_does_not_guess():
    for text in ("my maize is sick", "the plant is robust and growing", "my old farm has yellow leaves", "the veins look pale"):
        result = diagnose(text)
        assert result["problem_id"] is None and result["needs_followup"] is True, text


def test_unclear_after_followups_refers_instead_of_looping():
    result = diagnose("something is wrong", {"insects": "No"})
    assert result["needs_followup"] is False
    assert result["requires_extension_support"] is True
    assert result["extension_message"]


def test_result_shape_matches_frontend_contract():
    result = diagnose("worms in the whorl with frass")
    for key in ("status", "needs_followup", "confidence", "problem_id", "problem", "signs_to_verify", "guidance", "follow_up_questions", "requires_extension_support", "extension_message", "evidence", "candidates", "engine_version"):
        assert key in result, key

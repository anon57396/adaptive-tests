"""Scoring utilities for adaptive-tests-py.

This module mirrors the JavaScript scoring engine in spirit: each candidate is
scored against a signature using configurable heuristics. The engine produces
both an aggregate score and a per-category breakdown that can be surfaced via a
CLI ("Lens") or logs when debugging discovery behaviour.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional


@dataclass(frozen=True)
class CandidateSnapshot:
    name: str
    type: str
    module: str
    file_path: Path
    methods: Iterable[str]
    decorators: Iterable[str]
    bases: Iterable[str]
    docstring: Optional[str]


class ScoreReport:
    """Container for aggregate score and breakdown details."""

    __slots__ = ("total", "breakdown", "details")

    def __init__(self, total: float, breakdown: Mapping[str, float], details: List[Dict[str, Any]]) -> None:
        self.total = float(total)
        self.breakdown = dict(breakdown)
        self.details = details

    def as_dict(self) -> Dict[str, Any]:
        return {
            "total": self.total,
            "breakdown": self.breakdown,
            "details": self.details,
        }


class ScoringEngine:
    def __init__(self, config: Mapping[str, Any]) -> None:
        self.config = config
        self._paths_positive = _normalise_path_scores(config.get("paths", {}).get("positive", {}))
        self._paths_negative = _normalise_path_scores(config.get("paths", {}).get("negative", {}))
        self._file_name = config.get("file_name", {})
        self._methods = config.get("methods", {})
        self._decorators = float(config.get("decorators", 0.0))
        self._bases = float(config.get("bases", 0.0))
        self._docstring = float(config.get("docstring", 0.0))
        self._module_exact = float(config.get("module_exact", 0.0))
        self._module_pattern = float(config.get("module_pattern", 0.0))
        self._extension_bonus = config.get("extension_bonus", {})

    def score(self, candidate: CandidateSnapshot, signature: Mapping[str, Any]) -> ScoreReport:
        breakdown: MutableMapping[str, float] = {}
        details: List[Dict[str, Any]] = []
        total = 0.0

        def add(category: str, amount: float, *, info: Optional[Dict[str, Any]] = None) -> None:
            nonlocal total
            if amount == 0:
                return
            total += amount
            breakdown[category] = breakdown.get(category, 0.0) + amount
            if info:
                entry = {"category": category, **info, "score": amount}
                details.append(entry)

        path_score = self._score_path(candidate.file_path)
        add("path", path_score, info={"path": candidate.file_path.as_posix()})

        ext_score = self._extension_bonus.get(candidate.file_path.suffix, 0.0)
        add("extension", ext_score, info={"extension": candidate.file_path.suffix or "<none>"})

        name_score = self._score_name(candidate.name, signature)
        if name_score == 0:
            return ScoreReport(0.0, {}, details)
        add("name", name_score, info={"candidate": candidate.name})

        type_score = self._score_type(candidate.type, signature)
        if type_score <= -999:
            return ScoreReport(0.0, {}, details)
        add("type", type_score, info={"actual": candidate.type, "expected": signature.get("type")})

        methods_score = self._score_methods(candidate, signature)
        if methods_score <= -999:
            return ScoreReport(0.0, {}, details)
        add("methods", methods_score, info={"matched": list(candidate.methods)})

        deco_score = self._score_decorators(candidate, signature)
        if deco_score <= -999:
            return ScoreReport(0.0, {}, details)
        add("decorators", deco_score, info={"found": list(candidate.decorators)})

        bases_score = self._score_bases(candidate, signature)
        if bases_score <= -999:
            return ScoreReport(0.0, {}, details)
        add("bases", bases_score, info={"found": list(candidate.bases)})

        doc_score = self._score_docstring(candidate, signature)
        add("docstring", doc_score, info={"matched": signature.get("docstring_contains")})

        module_score = self._score_module(candidate, signature)
        if module_score <= -999:
            return ScoreReport(0.0, {}, details)
        add("module", module_score, info={"module": candidate.module})

        return ScoreReport(total, breakdown, details)

    # ------------------------------------------------------------------
    # Individual scoring facets
    # ------------------------------------------------------------------
    def _score_path(self, file_path: Path) -> float:
        candidate = file_path.as_posix()
        score = 0.0
        for fragment, value in self._paths_positive:
            if fragment in candidate:
                score += value
        for fragment, value in self._paths_negative:
            if fragment in candidate:
                score += value
        return score

    def _score_name(self, candidate: str, signature: Mapping[str, Any]) -> float:
        expected = signature.get("name")
        if not expected:
            return self._file_name.get("partial", 0.0)

        if signature.get("regex"):
            flags = 0 if signature.get("case_sensitive", True) else re.IGNORECASE
            return self._file_name.get("regex", 0.0) if re.search(expected, candidate, flags) else 0.0

        candidate_cmp = candidate if signature.get("case_sensitive", True) else candidate.lower()
        expected_cmp = expected if signature.get("case_sensitive", True) else expected.lower()

        if candidate_cmp == expected_cmp:
            return self._file_name.get("exact", 0.0)
        if candidate_cmp.startswith(expected_cmp) or candidate_cmp.endswith(expected_cmp):
            return self._file_name.get("case_insensitive", 0.0)
        if expected_cmp in candidate_cmp:
            return self._file_name.get("partial", 0.0)
        return 0.0

    @staticmethod
    def _score_type(actual: str, signature: Mapping[str, Any]) -> float:
        expected = (signature.get("type") or "class").lower()
        actual = (actual or "").lower()
        if expected in {"any", "*"}:
            return 0.0
        if expected == "class" and actual != "class":
            return -1000.0
        if expected == "function" and actual not in {"function", "async_function"}:
            return -1000.0
        if expected not in {"class", "function", "any", "*"} and actual != expected:
            return -1000.0
        return 0.0

    def _score_methods(self, candidate: CandidateSnapshot, signature: Mapping[str, Any]) -> float:
        required = tuple(signature.get("methods") or ())
        if not required:
            return 0.0
        cand_methods = set(candidate.methods)
        matches = sum(1 for method in required if method in cand_methods)
        if matches != len(required):
            ratio = matches / len(required)
            if ratio < 0.5:
                return -1000.0
            penalty = float(self._methods.get("mismatch_penalty", -10.0))
            return ratio * float(self._methods.get("per_match", 3.0)) + penalty
        bonus = float(self._methods.get("all_bonus", 5.0))
        return len(required) * float(self._methods.get("per_match", 3.0)) + bonus

    def _score_decorators(self, candidate: CandidateSnapshot, signature: Mapping[str, Any]) -> float:
        required = tuple(signature.get("decorators") or ())
        if not required:
            return 0.0
        cand_decorators = set(candidate.decorators)
        if all(deco in cand_decorators for deco in required):
            return self._decorators
        return -1000.0

    def _score_bases(self, candidate: CandidateSnapshot, signature: Mapping[str, Any]) -> float:
        required = tuple(signature.get("bases") or ())
        if not required:
            return 0.0
        cand_bases = set(candidate.bases)
        if all(base in cand_bases for base in required):
            return self._bases
        return -1000.0

    def _score_docstring(self, candidate: CandidateSnapshot, signature: Mapping[str, Any]) -> float:
        fragments = tuple(fragment.lower() for fragment in (signature.get("docstring_contains") or ()))
        if not fragments or not candidate.docstring:
            return 0.0
        lower_doc = candidate.docstring.lower()
        matches = sum(1 for fragment in fragments if fragment in lower_doc)
        return matches * self._docstring

    def _score_module(self, candidate: CandidateSnapshot, signature: Mapping[str, Any]) -> float:
        module = signature.get("module")
        if module:
            return self._module_exact if candidate.module == module else -1000.0
        pattern = signature.get("module_pattern")
        if pattern and not re.search(pattern, candidate.module):
            return -1000.0
        if pattern:
            return self._module_pattern
        return 0.0


def _normalise_path_scores(values: Mapping[str, Any]) -> List[tuple[str, float]]:
    pairs: List[tuple[str, float]] = []
    for fragment, score in values.items():
        if isinstance(score, (int, float)):
            pairs.append((fragment, float(score)))
    return pairs

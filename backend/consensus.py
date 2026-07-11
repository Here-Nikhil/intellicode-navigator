from __future__ import annotations

import asyncio
import re
from difflib import SequenceMatcher

from providers import AIProviderClient, extract_recommendation
from schemas import ConsensusEngineResult, ConsensusResult


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def _score_response(text: str) -> float:
    score = 0.5
    if len(text) > 80:
        score += 0.1
    if any(kw in text.lower() for kw in ("because", "recommend", "trade-off", "pros", "cons")):
        score += 0.15
    if re.search(r"\b(use|choose|pick|prefer)\b", text, re.I):
        score += 0.1
    return min(score, 0.95)


async def run_consensus(
    client: AIProviderClient,
    question: str,
    context: str,
    max_models: int = 3,
) -> ConsensusEngineResult:
    providers = client.available_providers()[:max_models]
    if not providers:
        fallback = ConsensusResult(
            model="disha-local",
            recommendation="Configure at least one AI provider API key in Settings to run multi-model consensus.",
            confidence=0.3,
        )
        return ConsensusEngineResult(
            results=[fallback],
            winner=fallback,
            final_index=0,
            summary=fallback.recommendation,
        )

    system_prompt = (
        "You are Disha, an AI architecture planning assistant. "
        "Answer engineering trade-off questions with a single clear recommendation in 2-4 sentences. "
        "Start with 'Recommendation:' followed by your choice."
    )
    user_prompt = f"Context:\n{context}\n\nQuestion:\n{question}"

    async def query(provider: str) -> ConsensusResult:
        try:
            response = await client.complete(provider, system_prompt, user_prompt)
            recommendation = extract_recommendation(response.content)
            confidence = _score_response(response.content)
            label = {"openai": "GPT-4o", "anthropic": "Claude 3.5", "google": "Gemini 1.5"}.get(
                provider, provider
            )
            return ConsensusResult(model=label, recommendation=recommendation, confidence=confidence)
        except Exception as exc:
            return ConsensusResult(
                model=provider,
                recommendation=f"Provider unavailable: {exc}",
                confidence=0.1,
            )

    results = await asyncio.gather(*(query(p) for p in providers))
    winner_index = _pick_winner(results)
    winner = results[winner_index]
    summary = _build_summary(results, winner_index)
    return ConsensusEngineResult(
        results=results,
        winner=winner,
        final_index=winner_index,
        summary=summary,
    )


def _pick_winner(results: list[ConsensusResult]) -> int:
    if not results:
        return 0

    clusters: list[list[int]] = []
    for i, result in enumerate(results):
        placed = False
        for cluster in clusters:
            if any(_similarity(result.recommendation, results[j].recommendation) > 0.45 for j in cluster):
                cluster.append(i)
                placed = True
                break
        if not placed:
            clusters.append([i])

    best_cluster = max(clusters, key=lambda c: (len(c), sum(results[i].confidence for i in c)))
    return max(best_cluster, key=lambda i: results[i].confidence)


def _build_summary(results: list[ConsensusResult], winner_index: int) -> str:
    winner = results[winner_index]
    agreement = sum(
        1 for i, r in enumerate(results) if i != winner_index and _similarity(r.recommendation, winner.recommendation) > 0.35
    )
    if agreement >= 1:
        return f"{winner.model}'s recommendation aligns with the group consensus: {winner.recommendation}"
    return f"{winner.model} wins on confidence and specificity: {winner.recommendation}"

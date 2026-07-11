from __future__ import annotations

import json

from providers import AIProviderClient
from schemas import OrchestratorResult

SUMMARY_SYSTEM_PROMPT = """You are Disha. Compress a long architecture planning conversation into a structured JSON summary.
Return ONLY valid JSON with this shape:
{
  "overview": "one paragraph",
  "requirements": ["..."],
  "tech_stack": ["..."],
  "architecture_decisions": ["..."],
  "open_questions": ["..."],
  "recommended_tools": ["..."],
  "phase": "Requirements|Architecture|Tool Selection|Prompt Generation",
  "confidence": 0-100
}"""


async def maybe_summarize_conversation(
    messages: list[dict],
    message_count: int,
    existing_summary: dict | None,
    api_keys: dict[str, str],
) -> dict | None:
    if message_count < 20 or message_count % 20 != 0:
        return None

    client = AIProviderClient(api_keys)
    providers = client.available_providers()
    if not providers:
        return _fallback_summary(messages, existing_summary)

    transcript = "\n".join(
        f"{m['author']}: {m['content']}" for m in messages[-40:]
    )
    user_prompt = f"Existing summary (may be empty):\n{json.dumps(existing_summary or {})}\n\nConversation:\n{transcript}"

    try:
        response = await client.complete(providers[0], SUMMARY_SYSTEM_PROMPT, user_prompt)
        start = response.content.find("{")
        end = response.content.rfind("}")
        if start == -1 or end == -1:
            return _fallback_summary(messages, existing_summary)
        return json.loads(response.content[start : end + 1])
    except Exception:
        return _fallback_summary(messages, existing_summary)


def _fallback_summary(messages: list[dict], existing_summary: dict | None) -> dict:
    user_messages = [m["content"] for m in messages if m.get("author") == "user"]
    overview = user_messages[0] if user_messages else "Architecture planning session"
    return {
        "overview": overview[:500],
        "requirements": user_messages[:5],
        "tech_stack": (existing_summary or {}).get("tech_stack", []),
        "architecture_decisions": [],
        "open_questions": [],
        "recommended_tools": [],
        "phase": (existing_summary or {}).get("phase", "Architecture"),
        "confidence": min(100, len(messages) * 3),
    }

"""
AI Service — Business logic for AI-powered features.
Replaces Supabase edge functions (analyze-task-risk, generate-task-plan) with direct OpenAI calls.
"""
import json
from openai import OpenAI
from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError
from app.repositories.task_repository import TaskRepository


class AIService:
    def __init__(self, task_repo: TaskRepository):
        self._task_repo = task_repo
        settings = get_settings()
        self._client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    def _ensure_client(self):
        if not self._client:
            raise ExternalServiceError("OpenAI", "API key not configured")

    # ── Risk Analysis (replaces analyze-task-risk edge function) ──

    async def analyze_risk(
        self, task_id: int, task_title: str, metrics: dict, employee_context: dict | None = None,
    ) -> dict:
        """
        Analyze task risk using OpenAI.
        Returns: { risk_level, confidence, reasons, recommended_actions }
        """
        self._ensure_client()

        is_micro = employee_context.get("is_micro_task", False) if employee_context else False

        system_prompt = f"""You are a High-Performance Productivity Coach for a fast-paced environment.
Your goal is to keep the employee on track using urgent, human, and encouraging language.

Analyze the metrics and provide an assessment.
IMPORTANT: If this is a 'Micro-task', be extremely sensitive to time.
Avoid technical jargon like "allocated hours" or "predicted delay" in the 'reasons'.

Return strictly valid JSON only:
{{
  "risk_level": "low" | "medium" | "high",
  "confidence": 0-100,
  "reasons": ["Reason 1", "Reason 2"],
  "recommended_actions": ["Action 1", "Action 2"]
}}

Metrics:
- Task Title: "{task_title}"
- Allocated Time: {metrics.get('allocated_hours', 0) * 60} minutes
- Time Already Spent: {round(metrics.get('elapsed_hours', 0) * 60)} minutes
- Completion: {round((metrics.get('progress_ratio', 0)) * 100)}%
- Threat Level: {metrics.get('base_risk_level', 'low')}
- Is Micro-task: {is_micro}
"""

        try:
            response = self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Task: \"{task_title}\". Context: {json.dumps(employee_context or {})}"},
                ],
                temperature=0.3,
            )
            content = response.choices[0].message.content
            clean = content.replace("```json", "").replace("```", "").strip()
            analysis = json.loads(clean)
        except json.JSONDecodeError:
            analysis = {
                "risk_level": metrics.get("base_risk_level", "low"),
                "confidence": 50,
                "reasons": ["AI response could not be parsed."],
                "recommended_actions": ["Review progress manually."],
            }
        except Exception as e:
            raise ExternalServiceError("OpenAI", str(e))

        # Save snapshot to DB
        snapshot = {
            "task_id": task_id,
            "org_id": metrics.get("org_id"),
            "elapsed_hours": metrics.get("elapsed_hours", 0),
            "steps_completed": metrics.get("steps_completed", 0),
            "total_steps": metrics.get("total_steps", 0),
            "progress_ratio": metrics.get("progress_ratio", 0),
            "predicted_total_hours": metrics.get("predicted_total_hours"),
            "predicted_delay_hours": metrics.get("predicted_delay_hours"),
            "risk_level": analysis["risk_level"],
            "confidence": analysis["confidence"],
            "reasons": analysis.get("reasons", []),
            "recommended_actions": analysis.get("recommended_actions", []),
            "model_used": "gpt-4o-mini",
            "raw_ai_response": analysis,
        }
        await self._task_repo.insert_risk_snapshot(snapshot)

        return {"metrics": metrics, "analysis": analysis}

    # ── Task Planning (replaces generate-task-plan edge function) ──

    async def generate_plan(
        self, title: str, description: str, skills: list[str] | None = None,
        task_type: str = "General",
    ) -> dict:
        """
        Generate an AI-powered task execution plan.
        Returns: { suggested_plan, ai_metadata }
        """
        self._ensure_client()

        # Fetch context from similar past tasks
        context_tasks = await self._task_repo.get_similar_task_context(skills or [])
        context_str = "No previous similar tasks found."
        if context_tasks:
            context_str = "Here are examples of how similar tasks were structured in the past:\n"
            for t in context_tasks:
                context_str += f"- Task: \"{t.get('title')}\" with tags: {t.get('skill_tags', [])}\n"

        system_prompt = """You are a Senior Technical Project Manager.
Your goal is to break down a software task into granular execution steps.

RULES:
1. Return ONLY valid JSON. No markdown.
2. Phases must be one of: 'requirement_refiner', 'design_guidance', 'build_guidance', 'acceptance_criteria', 'deployment'.
3. Each step MUST have a duration of EITHER 2 or 4 hours.
4. Max 8 total steps across all phases.
5. Include a 'risk' level (low/medium/high) for each step.

OUTPUT SCHEMA:
{
  "suggested_plan": [
    { "phase": "design_guidance", "title": "Create DB Schema", "duration": 4, "risk": "medium", "note": "Check foreign keys" }
  ],
  "ai_metadata": {
    "overall_risks": ["Risk 1"],
    "assumptions": ["Assumption 1"],
    "model": "gpt-4o-mini"
  }
}"""

        user_prompt = f"""TASK: {title}
DESCRIPTION: {description}
SKILLS: {', '.join(skills or [])}
TYPE: {task_type}

CONTEXT FROM HISTORY:
{context_str}

Generate a detailed execution plan."""

        try:
            response = self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
            )
            content = response.choices[0].message.content
            clean = content.replace("```json", "").replace("```", "").strip()
            plan = json.loads(clean)

            # Validate step durations
            if plan.get("suggested_plan"):
                for step in plan["suggested_plan"]:
                    if step.get("duration") not in (2, 4):
                        step["duration"] = 4

            return plan
        except json.JSONDecodeError:
            raise ExternalServiceError("OpenAI", "AI returned invalid JSON format")
        except Exception as e:
            raise ExternalServiceError("OpenAI", str(e))

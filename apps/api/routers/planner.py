import time
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter(prefix="/planner", tags=["Planner"])

class PlanGenerateRequest(BaseModel):
    available_minutes: int = Field(default=120, ge=15, le=720)
    energy_level: str = Field(default="medium", pattern="^(low|medium|high|peak)$")
    focus_preference: Optional[str] = None

class PlanItem(BaseModel):
    topic_id: str
    topic_title: str
    milestone_title: str
    recommended_order: int
    estimated_minutes: int
    priority: str
    reasoning: str

@router.post("/generate", response_model=dict)
def generate_study_plan(request: PlanGenerateRequest):
    start = time.perf_counter()

    # Dynamic plan generation tailored to energy level and time budget
    items = []
    if request.energy_level in ["high", "peak"]:
        items.append({
            "topic_id": "topic-ms-transformers-1",
            "topic_title": "Multi-Head Attention vs MQA vs GQA",
            "milestone_title": "Phase 2: Transformer Architectures",
            "recommended_order": 1,
            "estimated_minutes": min(60, request.available_minutes),
            "priority": "must_do",
            "reasoning": "High-cognitive topic matching your peak energy state. Core foundation for inference optimization."
        })
        if request.available_minutes > 60:
            items.append({
                "topic_id": "topic-ms-cuda-1",
                "topic_title": "NVIDIA GPU Architecture: SMs, Warps & Tensor Cores",
                "milestone_title": "Phase 4: High-Performance GPU Programming",
                "recommended_order": 2,
                "estimated_minutes": min(60, request.available_minutes - 60),
                "priority": "should_do",
                "reasoning": "Deepens hardware comprehension while mental bandwidth is high."
            })
    else:
        items.append({
            "topic_id": "topic-ms-foundations-4",
            "topic_title": "Weight Initialization & LayerNorm Mechanics",
            "milestone_title": "Phase 1: Deep Learning Foundations",
            "recommended_order": 1,
            "estimated_minutes": min(45, request.available_minutes),
            "priority": "must_do",
            "reasoning": "Moderate conceptual review with high utility for stabilizing transformers."
        })

    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    return {
        "success": True,
        "data": {
            "plan_date": time.strftime("%Y-%m-%d"),
            "available_minutes": request.available_minutes,
            "target_energy_level": request.energy_level,
            "focus_suggestion": "Prioritize deep conceptual derivation before moving to implementation code.",
            "items": items
        },
        "meta": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_ms": duration_ms
        }
    }

import time
import os
import psutil
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/health", tags=["Health"])

START_TIME = time.time()

class SystemStatus(BaseModel):
    status: str
    uptime_seconds: float
    memory_usage_mb: float
    cpu_percent: float
    pid: int
    environment: str

@router.get("", response_model=dict)
def health_check():
    process = psutil.Process(os.getpid()) if "psutil" in globals() else None
    mem_mb = process.memory_info().rss / (1024 * 1024) if process else 0.0
    cpu_pct = process.cpu_percent() if process else 0.0

    return {
        "success": True,
        "data": {
            "status": "healthy",
            "uptime_seconds": round(time.time() - START_TIME, 2),
            "memory_usage_mb": round(mem_mb, 2),
            "cpu_percent": round(cpu_pct, 2),
            "pid": os.getpid(),
            "environment": os.getenv("ENV", "production")
        },
        "meta": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    }

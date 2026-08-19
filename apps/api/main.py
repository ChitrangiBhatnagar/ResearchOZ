import logging
import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers.health import router as health_router
from routers.planner import router as planner_router
from routers.research import router as research_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ"
)
logger = logging.getLogger("ResearchOS.API")

app = FastAPI(
    title="ResearchOS Sidecar API",
    version="0.1.0",
    description="Offline-first AI orchestration, paper parsing, and study planner sidecar service."
)

# CORS configuration for Electron / local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "app://."],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(planner_router, prefix="/api/v1")
app.include_router(research_router, prefix="/api/v1")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming Request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Completed Request: {request.method} {request.url.path} - Status: {response.status_code}")
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal service error occurred."
            },
            "meta": {
                "timestamp": logging.Formatter().formatTime(logging.makeLogRecord({}))
            }
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8765))
    logger.info(f"Starting ResearchOS FastAPI Sidecar on port {port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

import time

from fastapi import APIRouter, Query

from services.embeddings_service import index_all_papers, semantic_search
from services.ollama_service import ollama_available

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/semantic")
def search_semantic(q: str = Query(..., min_length=2), limit: int = Query(10, ge=1, le=50)):
    start = time.perf_counter()
    results = semantic_search(q, limit=limit)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    return {
        "success": True,
        "data": {"query": q, "results": results, "total": len(results)},
        "meta": {
            "duration_ms": duration_ms,
            "ollama_available": ollama_available(),
            "mode": "semantic" if ollama_available() else "keyword_fallback",
        },
    }


@router.post("/index")
def reindex_embeddings():
    start = time.perf_counter()
    stats = index_all_papers()
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    return {
        "success": True,
        "data": stats,
        "meta": {"duration_ms": duration_ms},
    }

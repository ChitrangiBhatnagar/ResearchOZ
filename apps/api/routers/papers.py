import base64
import logging

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from services.db import get_paper
from services.pdf_service import ensure_pdf, extract_sections, get_page_count, render_page_png

logger = logging.getLogger("ResearchOS.PapersRouter")
router = APIRouter(prefix="/papers", tags=["Papers"])


@router.post("/{paper_id}/prepare")
def prepare_paper(paper_id: str):
    try:
        path = ensure_pdf(paper_id)
        sections = extract_sections(paper_id)
        pages = get_page_count(paper_id)
        return {
            "success": True,
            "data": {
                "paper_id": paper_id,
                "local_path": str(path),
                "page_count": pages,
                "sections": len(sections),
            },
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("prepare failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{paper_id}/meta")
def paper_meta(paper_id: str):
    paper = get_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    try:
        pages = get_page_count(paper_id)
    except Exception:
        pages = 0
    return {"success": True, "data": {"paper": paper, "page_count": pages}}


@router.get("/{paper_id}/pages/{page_number}")
def render_page(
    paper_id: str,
    page_number: int,
    scale: float = Query(2.0, ge=0.5, le=4.0),
):
    try:
        png = render_page_png(paper_id, page_number, scale=scale)
        return Response(content=png, media_type="image/png")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{paper_id}/pages/{page_number}/base64")
def render_page_b64(paper_id: str, page_number: int, scale: float = Query(2.0, ge=0.5, le=4.0)):
    try:
        png = render_page_png(paper_id, page_number, scale=scale)
        return {
            "success": True,
            "data": {
                "page": page_number,
                "mime": "image/png",
                "base64": base64.b64encode(png).decode("ascii"),
            },
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{paper_id}/extract")
def extract_paper_sections(paper_id: str):
    try:
        sections = extract_sections(paper_id)
        return {"success": True, "data": {"sections": sections}}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

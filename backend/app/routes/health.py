"""
Health check route.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "talentops-backend"}

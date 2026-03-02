"""
TalentOps Backend — FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import TalentOpsException, exception_to_http

# Import all route modules
from app.routes import (
    health, profiles, tasks, messaging,
    notifications, storage, attendance,
    payroll, leave, announcements, ai,
)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="TalentOps Backend",
        description="SOLID-architecture FastAPI backend for TalentOps HR platform",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # ── CORS ──────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", include_in_schema=False)
    async def root():
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/docs")

    # ── Global Exception Handler ──────────────────────────
    @app.exception_handler(TalentOpsException)
    async def talent_ops_exception_handler(request: Request, exc: TalentOpsException):
        http_exc = exception_to_http(exc)
        return JSONResponse(
            status_code=http_exc.status_code,
            content={"detail": http_exc.detail},
        )

    # ── Register Routes ───────────────────────────────────
    app.include_router(health.router)
    app.include_router(profiles.router)
    app.include_router(tasks.router)
    app.include_router(messaging.router)
    app.include_router(notifications.router)
    app.include_router(storage.router)
    app.include_router(attendance.router)
    app.include_router(payroll.router)
    app.include_router(leave.router)
    app.include_router(announcements.router)
    app.include_router(ai.router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

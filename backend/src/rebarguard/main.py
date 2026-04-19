from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rebarguard.config import get_settings
from rebarguard.routers import demo, inspections, projects, quick, regulations


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    yield


app = FastAPI(
    title="RebarGuard API",
    description="Multi-agent AI inspector for reinforced-concrete construction (Hermes + Kimi-VL).",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "rebarguard", "version": "0.1.0"}


app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(inspections.router, prefix="/api/inspections", tags=["inspections"])
app.include_router(quick.router, prefix="/api/quick", tags=["quick"])
app.include_router(regulations.router, prefix="/api/regulations", tags=["regulations"])
app.include_router(demo.router, prefix="/api/demo", tags=["demo"])

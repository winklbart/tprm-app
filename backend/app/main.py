from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.assessments import public_router as assessments_public_router
from app.api.v1.assessments import router as assessments_router
from app.api.v1.assets import router as assets_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.health import router as health_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.risks import router as risks_router
from app.api.v1.security import router as security_router
from app.api.v1.vendors import router as vendors_router
from app.core.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    yield


app = FastAPI(title="TPRM Hub API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(vendors_router, prefix="/api/v1")
app.include_router(assets_router, prefix="/api/v1")
app.include_router(risks_router, prefix="/api/v1")
app.include_router(assessments_router, prefix="/api/v1")
app.include_router(assessments_public_router, prefix="/api/v1")
app.include_router(security_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(audit_logs_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")

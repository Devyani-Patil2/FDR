from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import (
    auth_router, institution_router, deposit_router, document_router,
    verification_router, task_router, release_router, audit_router,
    dashboard_router,
)
from scheduler import start_scheduler, shutdown_scheduler

# Create tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="FDR GUARDIAN",
    description="Intelligent Security Deposit & FDR Lifecycle Management Portal",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router.router)
app.include_router(institution_router.router)
app.include_router(deposit_router.router)
app.include_router(document_router.router)
app.include_router(verification_router.router)
app.include_router(task_router.router)
app.include_router(release_router.router)
app.include_router(audit_router.router)
app.include_router(dashboard_router.router)


@app.get("/")
def root():
    return {
        "name": "FDR GUARDIAN API",
        "version": "1.0.0",
        "description": "Intelligent Security Deposit & FDR Lifecycle Management Portal",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}

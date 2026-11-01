import logging
import os
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import Base, engine
from app.routers import auth, repo, endpoint, chat, report
# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("autodoc")
# Auto-create database tables on startup (especially helpful for out-of-the-box SQLite usage)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database tables: {str(e)}")
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Source Code Intelligence Platform backend engine.",
    version="1.0.0"
)
# Same-origin Vercel routing does not need CORS. These origins cover
# local Vite (`npm run dev`) and `vercel dev` talking to FastAPI directly.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:80",
    "http://localhost",
    "http://localhost:3000",
]
origins.extend(
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
)
for env_key in ("VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_BRANCH_URL", "VERCEL_URL"):
    host = os.getenv(env_key)
    if not host:
        continue
    origin = host if host.startswith("http") else f"https://{host}"
    if origin not in origins:
        origins.append(origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(repo.router, prefix=settings.API_V1_STR)
app.include_router(endpoint.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(report.router, prefix=settings.API_V1_STR)
# Global Exceptions Catch-all
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please consult the system administrators."}
    )
@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

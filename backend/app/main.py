import mimetypes
import os
from pathlib import Path

# Fix MIME types for Windows (Python maps .js -> text/plain)
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .database import engine, Base
from .routers import tickets, clients, documents, ai_assistant, reports, equipment_routes, tasks_routes, inspections_routes, nosql_routes, metrics, backup, auth, admin_reports, efficiency
from .services.metrics_service import metrics_collector

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Система учета регистрации заявок", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(clients.router)
app.include_router(documents.router)
app.include_router(ai_assistant.router)
app.include_router(reports.router)
app.include_router(equipment_routes.router)
app.include_router(tasks_routes.router)
app.include_router(inspections_routes.router)
app.include_router(nosql_routes.router)
app.include_router(metrics.router)
app.include_router(backup.router)
app.include_router(auth.router)
app.include_router(admin_reports.router)
app.include_router(efficiency.router)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    import time
    method = request.method
    metrics_collector.inc(method)
    start = time.time()
    try:
        response = await call_next(request)
        return response
    except Exception:
        metrics_collector.inc_error()
        raise
    finally:
        ms = (time.time() - start) * 1000
        metrics_collector.add_duration(ms)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ticket-registration-system"}


# Find frontend build directory
# Search multiple locations: cwd-relative, __file__-relative, and bundled
frontend_dir = None
search_paths = [
    Path("../frontend/dist"),           # dev: from backend/
    Path("frontend_dist"),              # dev/pre-build: from backend/
    Path(__file__).parent.parent / "frontend" / "dist",  # dev: from app/
    Path(__file__).parent.parent / "frontend_dist",      # bundled in backend/
    Path(__file__).parent / "frontend_dist",             # bundled in app/
]
for candidate in search_paths:
    candidate = candidate.resolve()
    if candidate.exists() and (candidate / "index.html").exists():
        frontend_dir = candidate
        print(f"[OK] Frontend found at: {frontend_dir}")
        break

if frontend_dir:
    # Mount static assets directory
    assets_dir = frontend_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # SPA catch-all: serve file if exists, otherwise index.html
    @app.get("/{rest_of_path:path}")
    def spa_fallback(rest_of_path: str):
        if rest_of_path.startswith("api/") or rest_of_path.startswith("uploads/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        # Try to serve actual file
        filepath = frontend_dir / rest_of_path
        if filepath.exists() and filepath.is_file():
            return FileResponse(str(filepath))

        # SPA fallback - serve index.html for client-side routing
        index_path = frontend_dir / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path), media_type="text/html")

        return JSONResponse({"detail": "Not Found"}, status_code=404)

    if os.path.exists("uploads"):
        app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
else:
    if os.path.exists("uploads"):
        app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

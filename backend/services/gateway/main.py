import os
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="API Gateway", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

SERVICES = {
    "equipment": os.getenv("EQUIPMENT_SERVICE", "http://equipment:8001"),
    "tasks": os.getenv("TASKS_SERVICE", "http://tasks:8002"),
    "checklists": os.getenv("CHECKLISTS_SERVICE", "http://checklists:8003"),
    "main": os.getenv("MAIN_SERVICE", "http://main:8000"),
}

ROUTES = {
    "/api/equipment": "equipment",
    "/api/maintenance": "equipment",
    "/api/reminders": "equipment",
    "/api/tasks": "tasks",
    "/api/inspections": "checklists",
    "/api/warranty-checks": "checklists",
}

async def proxy(target: str, path: str, request: Request):
    url = f"{target}{path}"
    params = dict(request.query_params)
    headers = {k: v for k, v in request.headers.items()
               if k.lower() not in ("host", "content-length")}
    body = await request.body()
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.request(
                method=request.method, url=url,
                params=params, headers=headers, content=body
            )
            return Response(content=resp.content, status_code=resp.status_code,
                headers=dict(resp.headers))
        except httpx.ConnectError:
            return JSONResponse({"error": f"Service {target} unavailable"}, status_code=503)

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def api_router(path: str, request: Request):
    for prefix, service_name in ROUTES.items():
        if request.url.path.startswith(prefix):
            target = SERVICES[service_name]
            subpath = request.url.path[len("/api"):]
            return await proxy(target, subpath, request)
    target = SERVICES["main"]
    subpath = request.url.path
    return await proxy(target, subpath, request)

@app.get("/health")
def health():
    return {"service": "gateway", "status": "ok", "routes": list(ROUTES.keys())}

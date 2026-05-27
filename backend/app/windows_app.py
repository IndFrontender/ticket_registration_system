#!/usr/bin/env python3
"""
Windows/Linux/macOS application entry point for Система учета регистрации заявок.
Bundles backend API + frontend static files into a single executable.
Handles frozen (PyInstaller) mode gracefully.
"""
import sys
import os
import webbrowser
import threading
import time
import socket
import mimetypes
from pathlib import Path

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')


def get_app_root():
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent.parent.resolve()


def get_data_dir():
    if getattr(sys, 'frozen', False):
        if sys.platform == 'win32':
            base = Path(os.environ.get('LOCALAPPDATA', Path.home() / 'AppData' / 'Local'))
        elif sys.platform == 'darwin':
            base = Path.home() / 'Library' / 'Application Support'
        else:
            base = Path.home() / '.local' / 'share'
        data_dir = base / 'TicketSystem'
    else:
        data_dir = get_app_root() / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


APP_ROOT = get_app_root()
DATA_DIR = get_data_dir()
DB_PATH = DATA_DIR / 'ticket_system.db'
UPLOAD_DIR = DATA_DIR / 'uploads'
STATIC_DIR = APP_ROOT / 'frontend_dist'
LOG_DIR = DATA_DIR / 'logs'

os.environ.setdefault('DATABASE_URL', f'sqlite:///{DB_PATH}')

if not sys.stdout:
    sys.stdout = open(os.devnull, 'w')
if not sys.stderr:
    sys.stderr = open(os.devnull, 'w')


def ensure_dirs():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(('127.0.0.1', port)) == 0


def get_process_on_port(port):
    import subprocess
    try:
        if sys.platform == 'win32':
            result = subprocess.run(
                f'netstat -ano | findstr ":{port} "',
                shell=True, capture_output=True, text=True, timeout=3
            )
            for line in result.stdout.splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and 'LISTENING' in line:
                    pid = parts[-1]
                    name = subprocess.run(
                        f'tasklist /fi "PID eq {pid}" /nh',
                        shell=True, capture_output=True, text=True, timeout=3
                    ).stdout.strip()
                    return int(pid), name
        else:
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True, text=True, timeout=3
            )
            if result.stdout.strip():
                pid = int(result.stdout.strip().split('\n')[0])
                return pid, f'process_{pid}'
    except Exception:
        pass
    return None, None


def kill_process(pid):
    import subprocess
    try:
        if sys.platform == 'win32':
            subprocess.run(f'taskkill /PID {pid} /F', shell=True, capture_output=True, timeout=3)
        else:
            subprocess.run(['kill', '-9', str(pid)], capture_output=True, timeout=3)
        return True
    except Exception:
        return False


def free_port(port):
    pid, name = get_process_on_port(port)
    if pid is None:
        return True
    if name and ('python' in name.lower() or 'TicketSystem' in name.lower() or 'process_' in name):
        if kill_process(pid):
            time.sleep(1)
            return not is_port_open(port)
    return False


def create_app():
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse, JSONResponse
    from app.services.metrics_service import metrics_collector

    if getattr(sys, 'frozen', False):
        sys.path.insert(0, sys._MEIPASS)

    from app.database import engine, Base
    from app.routers import (
        tickets, clients, documents, ai_assistant, reports,
        equipment_routes, tasks_routes, inspections_routes,
        nosql_routes, metrics, backup, auth,
        admin_reports, efficiency,
    )

    Base.metadata.create_all(bind=engine)

    app = FastAPI(title='Система учета регистрации заявок', version='1.0.0')

    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
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
        import time as time_mod
        method = request.method
        metrics_collector.inc(method)
        start = time_mod.time()
        try:
            response = await call_next(request)
            return response
        except Exception:
            metrics_collector.inc_error()
            raise
        finally:
            ms = (time_mod.time() - start) * 1000
            metrics_collector.add_duration(ms)

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'service': 'ticket-registration-system'}

    if UPLOAD_DIR.exists():
        app.mount('/uploads', StaticFiles(directory=str(UPLOAD_DIR)), name='uploads')

    if STATIC_DIR.exists() and (STATIC_DIR / 'index.html').exists():
        assets_dir = STATIC_DIR / 'assets'
        if assets_dir.exists():
            app.mount('/assets', StaticFiles(directory=str(assets_dir)), name='assets')

        @app.get('/{rest:path}')
        def spa_handler(rest: str):
            if rest.startswith('api/') or rest.startswith('uploads/'):
                return JSONResponse({'detail': 'Not Found'}, status_code=404)
            filepath = STATIC_DIR / rest
            if filepath.exists() and filepath.is_file():
                return FileResponse(str(filepath))
            return FileResponse(str(STATIC_DIR / 'index.html'), media_type='text/html')

    return app


def show_error(msg):
    try:
        if sys.platform == 'win32':
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, msg, 'Ticket System Error', 0x10)
        else:
            print(f'[ERROR] {msg}')
    except Exception:
        print(f'[ERROR] {msg}')


def try_start(app, host, port):
    import uvicorn
    log_config = {
        'version': 1, 'disable_existing_loggers': False,
        'formatters': {
            'default': {'format': '%(asctime)s | %(levelname)-8s | %(message)s'},
            'access': {'format': '%(asctime)s | %(levelname)-8s | %(message)s'},
        },
        'handlers': {
            'default': {'formatter': 'default', 'class': 'logging.StreamHandler', 'stream': 'ext://sys.stdout'},
            'access': {'formatter': 'access', 'class': 'logging.StreamHandler', 'stream': 'ext://sys.stdout'},
        },
        'loggers': {
            'uvicorn': {'handlers': ['default'], 'level': 'INFO'},
            'uvicorn.error': {'handlers': ['default'], 'level': 'INFO'},
            'uvicorn.access': {'handlers': ['access'], 'level': 'INFO'},
        },
    }
    config = uvicorn.Config(
        app=app, host=host, port=port,
        log_level='info', log_config=log_config, reload=False,
    )
    server = uvicorn.Server(config)
    server.run()


def main():
    host = '127.0.0.1'
    port = 8000

    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if arg.startswith('--port='):
                port = int(arg.split('=')[1])

    ensure_dirs()
    app = create_app()

    if is_port_open(port):
        pid, name = get_process_on_port(port)
        if pid and name and ('python' in name.lower() or 'TicketSystem' in name.lower()):
            print(f'[..] Killing stale process on port {port} (PID {pid})...')
            kill_process(pid)
            time.sleep(1)

    if is_port_open(port):
        for fallback in [8001, 8002, 8003, 8080]:
            if not is_port_open(fallback):
                port = fallback
                print(f'[INFO] Using port {port} (8000 was busy)')
                break
        else:
            show_error(
                'Port 8000 is already in use by another application.\n\n'
                'Please close the other application or use --port=XXXX\n'
                'to specify a different port.'
            )
            return

    print(f'Запуск Системы учета регистрации заявок...')
    print(f'  Data: {DATA_DIR}')
    print(f'  Web:  http://{host}:{port}')
    print(f'  API:  http://{host}:{port}/api/health')

    threading.Thread(target=lambda: _open_browser(host, port), daemon=True).start()

    try:
        try_start(app, host, port)
    except KeyboardInterrupt:
        pass
    except Exception as e:
        show_error(f'Application error:\n{e}')
        raise


def _open_browser(host, port):
    time.sleep(2.5)
    try:
        webbrowser.open(f'http://{host}:{port}')
    except Exception:
        pass


if __name__ == '__main__':
    main()

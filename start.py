#!/usr/bin/env python3
"""
Система учета регистрации заявок — Cross-platform launcher.
Single process: uvicorn serves both API and pre-built frontend.
Usage:  python start.py
        python start.py --port 8080
        python start.py --no-browser
"""
import os, sys, time, webbrowser, platform, signal, argparse, subprocess
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = PROJECT_DIR / "backend"
FRONTEND_DIR = PROJECT_DIR / "frontend"
STANDALONE = PROJECT_DIR / "standalone.py"

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
NC = "\033[0m"

processes = []


def printc(color, msg):
    print(f"{color}{msg}{NC}")


def check_command(name, hint):
    try:
        if platform.system() == "Windows":
            subprocess.run(f"where {name}", shell=True, capture_output=True, check=True)
        else:
            subprocess.run(f"which {name}", shell=True, capture_output=True, check=True)
        printc(GREEN, f"  [OK] {name}")
        return True
    except subprocess.CalledProcessError:
        printc(RED, f"  [ERROR] {name} not found. {hint}")
        return False


def install_deps():
    printc(CYAN, "\n[..] Installing Python dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r",
                    str(BACKEND_DIR / "requirements.txt"), "--quiet"])
    printc(GREEN, "  [OK] Python dependencies")

    if (FRONTEND_DIR / "node_modules").exists():
        return
    printc(CYAN, "[..] Installing frontend dependencies...")
    npm = "npm.cmd" if platform.system() == "Windows" else "npm"
    subprocess.run([npm, "install", "--silent"], cwd=FRONTEND_DIR)


def build_frontend():
    dist_dir = FRONTEND_DIR / "dist"
    if dist_dir.exists() and (dist_dir / "index.html").exists():
        printc(GREEN, "  [OK] Frontend already built")
        return True
    printc(CYAN, "[..] Building frontend (this may take a minute)...")
    npm = "npm.cmd" if platform.system() == "Windows" else "npm"
    res = subprocess.run([npm, "run", "build"], cwd=FRONTEND_DIR)
    if res.returncode == 0 and (dist_dir / "index.html").exists():
        printc(GREEN, "  [OK] Frontend built")
        return True
    printc(RED, "  [ERROR] Frontend build failed")
    return False


def start():
    parser = argparse.ArgumentParser(description="Система учета регистрации заявок")
    parser.add_argument("--port", type=int, default=8000, help="Port to run on")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser")
    parser.add_argument("--host", default="0.0.0.0", help="Bind address")
    args = parser.parse_args()

    printc(CYAN, "=" * 50)
    printc(CYAN, "  Система учета регистрации заявок")
    printc(CYAN, f"  Platform: {platform.system()} {platform.release()}")
    printc(CYAN, f"  Version:  1.0.0")
    printc(CYAN, "=" * 50)

    py_ok = check_command("python" if platform.system() == "Windows" else "python3",
                          "Install Python 3.10+ from python.org")
    node_ok = check_command("node", "Install Node.js 18+ from nodejs.org")
    if not py_ok or not node_ok:
        input("\nPress Enter to exit...")
        return

    printc(GREEN, f"\n  Python: {sys.version.split()[0]}")
    try:
        node_v = subprocess.run("node --version", shell=True, capture_output=True, text=True).stdout.strip()
        printc(GREEN, f"  Node.js: {node_v}")
    except: pass

    install_deps()
    if not build_frontend():
        input("Press Enter to exit...")
        return

    # Kill stale process on port
    port = args.port
    if platform.system() == "Windows":
        try:
            out = subprocess.run(f'netstat -ano | findstr ":{port} "', shell=True,
                                 capture_output=True, text=True)
            for line in out.stdout.splitlines():
                if "LISTENING" in line:
                    pid = line.strip().split()[-1]
                    subprocess.run(f"taskkill /PID {pid} /F", shell=True, capture_output=True)
                    printc(YELLOW, f"  [!] Killed stale process PID {pid}")
                    time.sleep(1)
        except: pass

    # Start uvicorn with frontend serving
    printc(CYAN, f"\n[..] Starting server on http://{args.host}:{port}...")
    cmd = [sys.executable, "-m", "uvicorn", "app.main:app",
           "--host", args.host, "--port", str(port), "--log-level", "info"]

    if platform.system() == "Windows":
        proc = subprocess.Popen(cmd, cwd=BACKEND_DIR)
    else:
        proc = subprocess.Popen(cmd, cwd=BACKEND_DIR)
    processes.append(proc)
    time.sleep(3)

    if proc.poll() is not None:
        printc(RED, "  [ERROR] Server failed to start")
        sys.exit(1)

    printc(GREEN, f"  [OK] Server running on http://{args.host}:{port}")

    url = f"http://localhost:{port}"
    printc(GREEN, "\n" + "=" * 50)
    printc(GREEN, f"  WEB UI:      {url}")
    printc(GREEN, f"  API Docs:    {url}/docs")
    printc(GREEN, f"  Metrics:     {url}/metrics")
    printc(GREEN, f"  Analytics:   {url}/analytics")
    printc(GREEN, "=" * 50)

    if not args.no_browser:
        time.sleep(1)
        webbrowser.open(url)

    print("\nPress Ctrl+C to stop")

    def cleanup(signum=None, frame=None):
        printc(CYAN, "\n[..] Stopping...")
        for p in processes:
            if platform.system() == "Windows":
                subprocess.run(f"taskkill /PID {p.pid} /F", shell=True, capture_output=True)
            else:
                p.terminate()
                try: p.wait(timeout=5)
                except: p.kill()
        printc(GREEN, "[OK] Stopped")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    start()

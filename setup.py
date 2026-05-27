#!/usr/bin/env python3
"""
Автономный установщик системы регистрации заявок.
Устанавливает все зависимости и создаёт ярлыки для запуска.
"""

import os
import sys
import subprocess
import platform
import shutil

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))


def run(cmd, cwd=None):
    print(f"  > {cmd}")
    subprocess.run(cmd, shell=True, cwd=cwd, check=True)


def main():
    print("=" * 50)
    print("  Установка системы регистрации заявок")
    print(f"  Платформа: {platform.system()}")
    print("=" * 50)

    system = platform.system()

    # Python deps
    print("\n[1/3] Установка Python-зависимостей...")
    req_path = os.path.join(PROJECT_DIR, "backend", "requirements.txt")
    run(f"{sys.executable} -m pip install -r \"{req_path}\" --quiet")

    # Node deps
    print("\n[2/3] Установка Node.js-зависимостей...")
    npm = "npm.cmd" if system == "Windows" else "npm"
    frontend_dir = os.path.join(PROJECT_DIR, "frontend")
    run(f"{npm} install --silent", cwd=frontend_dir)

    # Ярлыки
    print("\n[3/3] Создание ярлыков для запуска...")
    if system == "Windows":
        _create_windows_shortcuts()
    elif system == "Darwin":
        _make_executable()
    elif system == "Linux":
        _make_executable()
        _create_linux_desktop()

    print("\n" + "=" * 50)
    print("  Установка завершена!")
    print()
    print("  Запуск:")
    if system == "Windows":
        print("    • Ярлык на рабочем столе: 'Запуск заявок'")
        print("    • Или: python start.py")
        print("    • Через Docker: scripts\\start_windows_docker.bat")
    elif system == "Darwin":
        print("    • Ярлык: дважды щёлкните start_macos.command")
        print("    • Или: python3 start.py")
        print("    • Через Docker: bash scripts/start_docker.sh")
    else:
        print("    • Ярлык в меню приложений")
        print("    • Или: python3 start.py")
        print("    • Через Docker: bash scripts/start_docker.sh")
    print()
    print("  Веб-интерфейс после запуска: http://localhost:3000")
    print("=" * 50)


def _create_windows_shortcuts():
    try:
        import winshell
        from win32com.client import Dispatch

        desktop = winshell.desktop()
        shortcut_path = os.path.join(desktop, "Запуск заявок.lnk")
        shell = Dispatch("WScript.Shell")
        shortcut = shell.CreateShortCut(shortcut_path)
        shortcut.TargetPath = sys.executable
        shortcut.Arguments = f"\"{os.path.join(PROJECT_DIR, 'start.py')}\""
        shortcut.WorkingDirectory = PROJECT_DIR
        shortcut.Description = "Система регистрации заявок"
        shortcut.Save()
        print("  [OK] Ярлык создан на рабочем столе")
    except ImportError:
        print("  [!!] Для создания ярлыка установите: pip install winshell pywin32")
        _create_windows_bat_shortcut()


def _create_windows_bat_shortcut():
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    bat_path = os.path.join(desktop, "Запуск заявок.bat")
    with open(bat_path, "w") as f:
        f.write(f'@echo off\n"{sys.executable}" "{os.path.join(PROJECT_DIR, "start.py")}"\npause\n')
    print(f"  [OK] Ярлык создан: {bat_path}")


def _make_executable():
    scripts = [
        "scripts/start_linux.sh",
        "scripts/start_macos.sh",
        "scripts/start_docker.sh",
        "start_macos.command",
    ]
    for s in scripts:
        path = os.path.join(PROJECT_DIR, s)
        if os.path.exists(path):
            os.chmod(path, 0o755)
    print("  [OK] Скрипты помечены как исполняемые")


def _create_linux_desktop():
    desktop_dir = os.path.join(os.path.expanduser("~"), ".local", "share", "applications")
    os.makedirs(desktop_dir, exist_ok=True)
    desktop_path = os.path.join(desktop_dir, "ticket-system.desktop")
    with open(desktop_path, "w") as f:
        f.write(f"""[Desktop Entry]
Name=Система учета регистрации заявок
Comment=Система регистрации заявок системного администратора
Exec={sys.executable} {os.path.join(PROJECT_DIR, 'start.py')}
Path={PROJECT_DIR}
Terminal=true
Type=Application
Categories=Utility;
""")
    os.chmod(desktop_path, 0o755)
    print(f"  [OK] Ярлык создан: {desktop_path}")


if __name__ == "__main__":
    main()

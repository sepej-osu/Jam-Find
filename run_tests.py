#!/usr/bin/env python3
"""Boot backend/frontend, run Playwright tests, and tear down services."""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
PLAYWRIGHT_DIR = FRONTEND_DIR / "tests"


def resolve_node_command(name: str) -> str:
    """Resolve npm/npx across OSes, including Windows .cmd executables."""
    candidates = [name]
    if os.name == "nt":
        candidates = [f"{name}.cmd", f"{name}.exe", name]

    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    raise FileNotFoundError(
        f"Could not find '{name}' in PATH. Please install Node.js and ensure npm/npx are available."
    )


def get_backend_python() -> str:
    """Use the existing backend venv Python and fail fast if missing."""
    win_venv_python = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    unix_venv_python = BACKEND_DIR / "venv" / "bin" / "python"

    if win_venv_python.exists():
        return str(win_venv_python)
    if unix_venv_python.exists():
        return str(unix_venv_python)
    raise FileNotFoundError(
        "Existing backend venv not found. Expected one of: "
        f"{win_venv_python} or {unix_venv_python}"
    )


def run_cmd(cmd: list[str], cwd: Path) -> None:
    print(f"[setup] Running: {' '.join(cmd)} (cwd={cwd})")
    subprocess.run(cmd, cwd=str(cwd), check=True)


def popen_cmd(cmd: list[str], cwd: Path) -> subprocess.Popen:
    creationflags = 0
    kwargs: dict[str, object] = {}
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
    else:
        kwargs["start_new_session"] = True

    print(f"[start] {' '.join(cmd)} (cwd={cwd})")
    return subprocess.Popen(
        cmd,
        cwd=str(cwd),
        creationflags=creationflags,
        **kwargs,
    )


def wait_for_http(url: str, timeout_seconds: int = 120) -> None:
    print(f"[wait] Waiting for {url}")
    deadline = time.time() + timeout_seconds
    last_err = ""

    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as resp:
                if 200 <= resp.status < 500:
                    print(f"[ready] {url} responded with HTTP {resp.status}")
                    return
        except urllib.error.URLError as exc:
            last_err = str(exc)
        except Exception as exc:  # pragma: no cover
            last_err = str(exc)

        time.sleep(1)

    raise TimeoutError(f"Timed out waiting for {url}. Last error: {last_err}")


def terminate_process(proc: subprocess.Popen | None, name: str) -> None:
    if proc is None or proc.poll() is not None:
        return

    print(f"[stop] Stopping {name} (pid={proc.pid})")
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
    except Exception as exc:  # pragma: no cover
        print(f"[warn] Failed to stop {name}: {exc}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start backend/frontend, run Playwright tests, then shut down."
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="Install backend/frontend dependencies before starting services.",
    )
    parser.add_argument(
        "--frontend-port",
        type=int,
        default=5173,
        help="Frontend port for Vite dev server.",
    )
    parser.add_argument(
        "--backend-url",
        default="http://127.0.0.1:8000/health",
        help="Backend health URL to wait for.",
    )
    parser.add_argument(
        "--frontend-url",
        default="http://127.0.0.1:5173/login",
        help="Frontend URL to wait for.",
    )
    parser.add_argument(
        "--playwright-args",
        nargs=argparse.REMAINDER,
        default=[],
        help="Extra args forwarded to 'npx playwright test'.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    backend_python = get_backend_python()
    npm_cmd = resolve_node_command("npm")
    npx_cmd = resolve_node_command("npx")
    backend_proc: subprocess.Popen | None = None
    frontend_proc: subprocess.Popen | None = None

    try:
        print(f"[info] Backend Python: {backend_python}")
        print(f"[info] npm: {npm_cmd}")
        print(f"[info] npx: {npx_cmd}")

        if args.install:
            run_cmd([backend_python, "-m", "pip", "install", "-r", "requirements.txt"], BACKEND_DIR)
            run_cmd([npm_cmd, "install"], FRONTEND_DIR)
            run_cmd([npm_cmd, "install"], PLAYWRIGHT_DIR)
            run_cmd([npx_cmd, "playwright", "install"], PLAYWRIGHT_DIR)

        backend_proc = popen_cmd([backend_python, "main.py"], BACKEND_DIR)
        frontend_proc = popen_cmd(
            [
                npm_cmd,
                "run",
                "dev",
                "--",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.frontend_port),
                "--strictPort",
            ],
            FRONTEND_DIR,
        )

        wait_for_http(args.backend_url)
        wait_for_http(args.frontend_url)

        test_cmd = [npx_cmd, "playwright", "test", *args.playwright_args]
        print(f"[test] Running: {' '.join(test_cmd)}")
        result = subprocess.run(test_cmd, cwd=str(PLAYWRIGHT_DIR), check=False)
        return result.returncode
    except KeyboardInterrupt:
        print("\n[info] Interrupted by user.")
        return 130
    except Exception as exc:
        print(f"[error] {exc}")
        return 1
    finally:
        terminate_process(frontend_proc, "frontend")
        terminate_process(backend_proc, "backend")


if __name__ == "__main__":
    raise SystemExit(main())

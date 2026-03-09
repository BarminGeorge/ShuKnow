#!/usr/bin/env python3
"""Validate OpenAPI spec by comparing generated spec with docs/openapi.yaml."""

import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional


DIFF_TOOL = "oasdiff"
SPEC_ENDPOINT = "http://localhost:5209/swagger/v1/swagger.yaml"
MAX_WAIT_SECONDS = 30
POLL_INTERVAL_SECONDS = 0.5


class ValidationError(Exception):
    """Raised when validation fails."""
    pass


def check_tool_installed(tool: str) -> None:
    """Check if required CLI tool is installed."""
    if not shutil.which(tool):
        raise ValidationError(
            f"'{tool}' is not installed. "
            f"Install it from: https://github.com/Tufin/oasdiff"
        )


def wait_for_server(url: str, timeout: float, interval: float) -> None:
    """Poll server until it responds or timeout."""
    elapsed = 0.0
    while elapsed < timeout:
        try:
            urllib.request.urlopen(url, timeout=2)
            return
        except (urllib.error.URLError, TimeoutError, ConnectionRefusedError):
            time.sleep(interval)
            elapsed += interval
    raise ValidationError(f"Server did not start within {timeout} seconds")


def fetch_spec(url: str, output_path: Path) -> None:
    """Download spec from URL to file."""
    try:
        urllib.request.urlretrieve(url, output_path)
    except urllib.error.URLError as e:
        raise ValidationError(f"Failed to fetch spec: {e}")


def run_diff_tool(temp_spec: Path, docs_spec: Path, cwd: Path) -> int:
    """Run diff tool and return exit code."""
    result = subprocess.run(
        [DIFF_TOOL, "breaking", str(temp_spec), str(docs_spec)],
        cwd=cwd,
        shell=True,
    )
    return result.returncode


def main() -> int:
    # Resolve paths
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    docs_spec = root_dir / "docs" / "openapi.yaml"
    temp_spec = root_dir / "tmp" / "openapi.yaml"
    host_dir = root_dir / "backend" / "ShuKnow.Host"

    # Ensure tmp directory exists
    temp_spec.parent.mkdir(exist_ok=True)

    # Check prerequisites
    try:
        check_tool_installed(DIFF_TOOL)
    except ValidationError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    print("Starting backend to generate OpenAPI...")
    process = subprocess.Popen(
        ["dotnet", "run", "--launch-profile", "http"],
        cwd=host_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        print("Waiting for server...")
        try:
            wait_for_server(SPEC_ENDPOINT, MAX_WAIT_SECONDS, POLL_INTERVAL_SECONDS)
        except ValidationError as e:
            print(f"Error: {e}", file=sys.stderr)
            return 1

        print("Fetching OpenAPI spec...")
        try:
            fetch_spec(SPEC_ENDPOINT, temp_spec)
        except ValidationError as e:
            print(f"Error: {e}", file=sys.stderr)
            return 1

        print("Comparing with docs/openapi.yaml...")
        return run_diff_tool(temp_spec, docs_spec, root_dir)

    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    sys.exit(main())

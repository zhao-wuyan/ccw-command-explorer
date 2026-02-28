#!/usr/bin/env python3
"""
Simple update script for ccw-help skill.
Runs analyze_commands.py to regenerate command index.
"""

import sys
import subprocess
from pathlib import Path

BASE_DIR = Path("D:/Claude_dms3/.claude")
SKILL_DIR = BASE_DIR / "skills" / "ccw-help"
ANALYZE_SCRIPT = SKILL_DIR / "scripts" / "analyze_commands.py"

def run_update():
    """Run command analysis update."""
    try:
        result = subprocess.run(
            [sys.executable, str(ANALYZE_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=30
        )

        print(result.stdout)
        return result.returncode == 0

    except Exception as e:
        print(f"Error running update: {e}")
        return False

if __name__ == '__main__':
    success = run_update()
    sys.exit(0 if success else 1)

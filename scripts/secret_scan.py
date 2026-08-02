import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

IGNORED_DIRS = {
    ".git",
    ".clerk",
    ".next",
    ".venv",
    "__pycache__",
    "node_modules",
}

IGNORED_FILES = {
    ".env",
    ".env.local",
    "package-lock.json",
    "secret_scan.py",
}

PATTERNS = [
    re.compile(r"\bsk_(test|live)_[A-Za-z0-9_\-]{12,}\b"),
    re.compile(r"\bpk_(test|live)_[A-Za-z0-9_\-]{12,}\b"),
    re.compile(r"faithful-treefrog", re.IGNORECASE),
    re.compile(r"CLERK_SECRET_KEY\s*=\s*sk_", re.IGNORECASE),
    re.compile(r"UPSTASH_REDIS_REST_TOKEN\s*=\s*(?!replace-with)[A-Za-z0-9_\-]{12,}", re.IGNORECASE),
    re.compile(r"DefaultEndpointsProtocol=.*AccountKey=", re.IGNORECASE),
    re.compile(r"AZURE_BLOB_CONNECTION_STRING\s*=\s*(?!replace-with)[^\s]+", re.IGNORECASE),
]


def should_skip(path: Path) -> bool:
    relative_parts = path.relative_to(ROOT).parts
    if any(part in IGNORED_DIRS for part in relative_parts):
        return True
    if path.name in IGNORED_FILES:
        return True
    if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".pdf", ".zip"}:
        return True
    return False


def main() -> int:
    findings: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or should_skip(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for line_number, line in enumerate(text.splitlines(), start=1):
            for pattern in PATTERNS:
                if pattern.search(line):
                    findings.append(f"{path.relative_to(ROOT)}:{line_number}: possible secret matched {pattern.pattern}")

    if findings:
        print("Secret scan failed:")
        for finding in findings:
            print(f"- {finding}")
        return 1

    print("Secret scan passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

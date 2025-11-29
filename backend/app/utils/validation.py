from __future__ import annotations


def normalize_name(name: str) -> str:
    return " ".join(part.capitalize() for part in name.strip().split()) or name.strip()

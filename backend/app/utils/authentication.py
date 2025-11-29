from __future__ import annotations

import hashlib
import secrets


def hash_password(raw_password: str) -> str:
    salt = secrets.token_hex(8)
    digest = hashlib.sha256(f"{salt}{raw_password}".encode("utf-8")).hexdigest()
    return f"{salt}${digest}"


def verify_password(raw_password: str, stored: str) -> bool:
    try:
        salt, stored_digest = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.sha256(f"{salt}{raw_password}".encode("utf-8")).hexdigest()
    return secrets.compare_digest(candidate, stored_digest)

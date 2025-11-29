from __future__ import annotations

import logging

logger = logging.getLogger("signup_app.notification")


def notify_admin(message: str) -> None:
    """Pretend to notify an admin about important events."""
    logger.info("Admin notification: %s", message)

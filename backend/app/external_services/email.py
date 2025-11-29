from __future__ import annotations

import logging

logger = logging.getLogger("signup_app.email")


def send_welcome_email(recipient: str) -> None:
    """Pretend to send a welcome email to the user."""
    logger.info("Sending welcome email to %s", recipient)

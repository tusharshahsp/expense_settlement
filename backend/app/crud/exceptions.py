from __future__ import annotations


class DuplicateEmailError(Exception):
    """Raised when a signup is attempted for an existing email."""


class InvalidCredentialsError(Exception):
    """Raised when login credentials are incorrect."""


class UserNotFoundError(Exception):
    """Raised when a user id does not exist in storage."""


class GroupNotFoundError(Exception):
    """Raised when a group cannot be found."""


class GroupOwnershipError(Exception):
    """Raised when a requester is not allowed to modify a group."""


class GroupMembershipError(Exception):
    """Raised when a payer or user is not part of a group."""


class ExpenseNotFoundError(Exception):
    """Raised when an expense cannot be located for a group."""


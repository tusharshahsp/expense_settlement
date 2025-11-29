from __future__ import annotations

from typing import Optional

from mysql.connector import pooling
from mysql.connector.connection import MySQLConnection

from .config import get_settings

_settings = get_settings()
_connection_pool: Optional[pooling.MySQLConnectionPool] = None


def get_connection_pool() -> pooling.MySQLConnectionPool:
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pooling.MySQLConnectionPool(
            pool_name="signup_pool",
            pool_size=_settings.db_pool_size,
            autocommit=False,
            host=_settings.db_host,
            port=_settings.db_port,
            user=_settings.db_user,
            password=_settings.db_password,
            database=_settings.db_name,
        )
    return _connection_pool


def get_connection() -> MySQLConnection:
    return get_connection_pool().get_connection()

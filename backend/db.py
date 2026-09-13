"""Client Turso (libSQL) + bootstrap dello schema."""
import os

import libsql_client
from dotenv import load_dotenv

load_dotenv()

# In locale si può usare "file:local.db" senza token.
DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "file:local.db")
AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS auto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        targa TEXT NOT NULL,
        modello TEXT,
        anno INTEGER,
        attiva INTEGER NOT NULL DEFAULT 1
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS scadenza (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auto_id INTEGER NOT NULL REFERENCES auto(id),
        tipo TEXT NOT NULL,
        data_esecuzione TEXT,
        km_esecuzione INTEGER,
        data_prossima_scadenza TEXT NOT NULL,
        costo REAL,
        note TEXT,
        reminder_inviato INTEGER NOT NULL DEFAULT 0
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_scadenza_data ON scadenza(data_prossima_scadenza)",
]


def client():
    """Nuovo client libSQL. Da usare come context manager async."""
    return libsql_client.create_client(url=DATABASE_URL, auth_token=AUTH_TOKEN)


async def execute(sql: str, args: list | None = None):
    async with client() as c:
        return await c.execute(sql, args or [])


async def init_db():
    async with client() as c:
        for stmt in SCHEMA:
            await c.execute(stmt)


def rows_to_dicts(rs) -> list[dict]:
    return [dict(zip(rs.columns, row)) for row in rs.rows]
